import os
import uuid as uuid_lib
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status

from app.core.audit_context import AuditDep
from app.core.config import get_settings
from app.core.constants import MeetingAttendance, UserRole
from app.core.deps import CurrentUser, DbSession
from app.middleware.rbac import require_role
from app.modules.meetings.repository import MeetingsRepository
from app.modules.meetings.schemas import MeetingCreate, MeetingRead, MeetingUpdate
from app.modules.meetings.service import MeetingsService
from app.modules.youth.repository import YouthRepository
from app.utils.pagination import Page, PageParams

router = APIRouter(prefix="/api/meetings", tags=["meetings"])

_ROLES = (
    UserRole.ADMIN,
    UserRole.DIREKTOR,
    UserRole.TASHKILOT_DIREKTORI,
    UserRole.MASUL_HODIM,
)
Access = Annotated[CurrentUser, Depends(require_role(*_ROLES))]


def _service(session: DbSession) -> MeetingsService:
    return MeetingsService(MeetingsRepository(session), YouthRepository(session))


@router.get("", response_model=Page[MeetingRead])
async def list_meetings(
    current: Access,
    session: DbSession,
    youth_id: UUID | None = Query(default=None),
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[MeetingRead]:
    params = PageParams(page=page, limit=limit)
    items, total = await MeetingsRepository(session).list_for_scope(
        current, youth_id=youth_id, from_=from_, to=to, params=params
    )
    return Page.build(
        items=[MeetingRead.model_validate(m) for m in items], total=total, params=params
    )


@router.post("", response_model=MeetingRead, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    payload: MeetingCreate, current: Access, session: DbSession, audit: AuditDep
) -> MeetingRead:
    meeting = await _service(session).create(current, payload)
    meeting_id = meeting.id
    await session.commit()
    meeting = await MeetingsRepository(session).get_by_id(meeting_id)
    await audit.record("meeting.create", "meeting", meeting_id, after=MeetingRead.model_validate(meeting).model_dump(mode="json"))
    await session.commit()
    return MeetingRead.model_validate(meeting)


@router.get("/{meeting_id}", response_model=MeetingRead)
async def get_meeting(
    meeting_id: UUID, current: Access, session: DbSession
) -> MeetingRead:
    meeting = await _service(session).get(current, meeting_id)
    return MeetingRead.model_validate(meeting)


@router.patch("/{meeting_id}", response_model=MeetingRead)
async def update_meeting(
    meeting_id: UUID,
    payload: MeetingUpdate,
    current: Access,
    session: DbSession,
    audit: AuditDep,
) -> MeetingRead:
    await _service(session).update(current, meeting_id, payload)
    await session.commit()
    meeting = await MeetingsRepository(session).get_by_id(meeting_id)
    await audit.record(
        "meeting.update", "meeting", meeting_id,
        before=payload.model_dump(exclude_unset=True, mode="json"),
        after=MeetingRead.model_validate(meeting).model_dump(mode="json"),
    )
    await session.commit()
    return MeetingRead.model_validate(meeting)


@router.patch("/{meeting_id}/attendance", response_model=MeetingRead)
async def update_attendance(
    meeting_id: UUID,
    current: Access,
    session: DbSession,
    audit: AuditDep,
    attendance_status: Annotated[MeetingAttendance, Form(alias="attendanceStatus")],
    status: Annotated[str, Form(alias="status")],
    attendance_notes: Annotated[str | None, Form(alias="attendanceNotes")] = None,
    rescheduled_date: Annotated[str | None, Form(alias="rescheduledDate")] = None,
    rescheduled_time: Annotated[str | None, Form(alias="rescheduledTime")] = None,
    attachment: Annotated[UploadFile | None, File(alias="attachment")] = None,
) -> MeetingRead:
    new_scheduled_at = None
    if attendance_status == MeetingAttendance.RESCHEDULED:
        if rescheduled_date and rescheduled_time:
            new_scheduled_at = datetime.fromisoformat(
                f"{rescheduled_date}T{rescheduled_time}:00"
            )

    attachment_info = None
    if attachment and attachment.filename:
        settings = get_settings()
        folder = os.path.join(settings.media_dir, "meetings", str(meeting_id))
        os.makedirs(folder, exist_ok=True)
        ext = os.path.splitext(attachment.filename)[1]
        saved_name = f"{uuid_lib.uuid4()}{ext}"
        saved_path = os.path.join(folder, saved_name)
        content = await attachment.read()
        with open(saved_path, "wb") as f:
            f.write(content)
        attachment_info = {
            "filename": attachment.filename,
            "path": f"/media/meetings/{meeting_id}/{saved_name}",
            "size": len(content),
            "content_type": attachment.content_type,
        }

    meeting = await _service(session).update_attendance(
        current,
        meeting_id,
        attendance_status=attendance_status,
        attendance_notes=attendance_notes,
        new_scheduled_at=new_scheduled_at,
        attachment=attachment_info,
    )
    await audit.record(
        "meeting.update_attendance", "meeting", meeting_id,
        after={
            "attendanceStatus": attendance_status,
            "status": status,
            "attendanceNotes": attendance_notes,
            "rescheduledDate": rescheduled_date,
            "rescheduledTime": rescheduled_time,
            "attachment": attachment_info,
        },
    )
    await session.commit()
    await session.refresh(meeting)
    return MeetingRead.model_validate(meeting)


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meeting(
    meeting_id: UUID, current: Access, session: DbSession, audit: AuditDep
) -> None:
    await _service(session).soft_delete(current, meeting_id)
    await audit.record("meeting.delete", "meeting", meeting_id)
    await session.commit()
