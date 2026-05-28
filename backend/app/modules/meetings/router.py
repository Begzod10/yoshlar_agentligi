from uuid import UUID

from fastapi import APIRouter, Query, status

from app.core.constants import UserRole
from app.core.deps import CurrentUserDep, DbSession
from app.core.exceptions import ForbiddenError, NotFoundError
from app.modules.audit.service import record_audit
from app.modules.meetings.models import Meeting
from app.modules.meetings.repository import MeetingsRepository
from app.modules.meetings.schemas import AttendanceUpdate, MeetingCreate, MeetingRead, MeetingUpdate

router = APIRouter(prefix="/api/meetings", tags=["meetings"])

ALLOWED_ROLES = frozenset({UserRole.ADMIN, UserRole.DIREKTOR, UserRole.TASHKILOT_DIREKTORI, UserRole.MASUL_HODIM})


@router.get("")
async def list_meetings(
    session: DbSession,
    user: CurrentUserDep,
    youth_id: UUID | None = None,
    district_id: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    if user.role not in ALLOWED_ROLES:
        raise ForbiddenError("role_not_allowed")

    effective_district = district_id
    effective_masul: UUID | None = None

    if user.role == UserRole.TASHKILOT_DIREKTORI:
        effective_district = user.district_id
    elif user.role == UserRole.MASUL_HODIM:
        effective_masul = user.id

    repo = MeetingsRepository(session)
    offset = (page - 1) * limit
    rows, total = await repo.list(
        youth_id=youth_id, masul_id=effective_masul,
        district_id=effective_district,
        offset=offset, limit=limit,
    )
    return {
        "data": [MeetingRead.model_validate(m) for m in rows],
        "meta": {"total": total, "page": page, "limit": limit},
    }


@router.post("", response_model=MeetingRead, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    body: MeetingCreate, session: DbSession, user: CurrentUserDep,
) -> MeetingRead:
    if user.role not in ALLOWED_ROLES:
        raise ForbiddenError("role_not_allowed")

    meeting = Meeting(
        youth_id=body.youth_id,
        masul_id=body.masul_id,
        scheduled_at=body.scheduled_at,
        type=body.type,
        location=body.location,
        agenda=body.agenda,
    )
    repo = MeetingsRepository(session)
    await repo.add(meeting)
    await record_audit(session, user=user, action="meeting.create", entity_type="meeting", entity_id=meeting.id)
    await session.commit()
    return MeetingRead.model_validate(meeting)


@router.get("/{meeting_id}", response_model=MeetingRead)
async def get_meeting(
    meeting_id: UUID, session: DbSession, user: CurrentUserDep,
) -> MeetingRead:
    if user.role not in ALLOWED_ROLES:
        raise ForbiddenError("role_not_allowed")
    meeting = await MeetingsRepository(session).get_by_id(meeting_id)
    if meeting is None:
        raise NotFoundError("meeting_not_found")
    return MeetingRead.model_validate(meeting)


@router.patch("/{meeting_id}", response_model=MeetingRead)
async def update_meeting(
    meeting_id: UUID, body: MeetingUpdate, session: DbSession, user: CurrentUserDep,
) -> MeetingRead:
    if user.role not in ALLOWED_ROLES:
        raise ForbiddenError("role_not_allowed")

    repo = MeetingsRepository(session)
    meeting = await repo.get_by_id(meeting_id)
    if meeting is None:
        raise NotFoundError("meeting_not_found")

    updates = body.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(meeting, k, v)

    await record_audit(session, user=user, action="meeting.update", entity_type="meeting", entity_id=meeting.id, after=updates)
    await session.commit()
    return MeetingRead.model_validate(meeting)


@router.patch("/{meeting_id}/attendance", response_model=MeetingRead)
async def update_attendance(
    meeting_id: UUID, body: AttendanceUpdate, session: DbSession, user: CurrentUserDep,
) -> MeetingRead:
    if user.role not in ALLOWED_ROLES:
        raise ForbiddenError("role_not_allowed")

    repo = MeetingsRepository(session)
    meeting = await repo.get_by_id(meeting_id)
    if meeting is None:
        raise NotFoundError("meeting_not_found")

    meeting.attendance_status = body.attendance_status
    meeting.attendance_notes = body.attendance_notes

    await record_audit(
        session, user=user, action="meeting.attendance",
        entity_type="meeting", entity_id=meeting.id,
        after={"attendance_status": body.attendance_status.value},
    )
    await session.commit()
    return MeetingRead.model_validate(meeting)


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meeting(
    meeting_id: UUID, session: DbSession, user: CurrentUserDep,
) -> None:
    if user.role not in ALLOWED_ROLES:
        raise ForbiddenError("role_not_allowed")

    repo = MeetingsRepository(session)
    meeting = await repo.get_by_id(meeting_id)
    if meeting is None:
        raise NotFoundError("meeting_not_found")

    await record_audit(session, user=user, action="meeting.delete", entity_type="meeting", entity_id=meeting.id)
    await repo.delete(meeting)
    await session.commit()
