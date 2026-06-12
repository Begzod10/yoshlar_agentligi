from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.core.audit_context import AuditDep
from app.core.constants import UserRole
from app.core.deps import CurrentUser, DbSession
from app.core.exceptions import NotFoundError
from app.middleware.rbac import require_role
from app.modules.meetings.repository import MeetingsRepository
from app.modules.meetings.schemas import AttendanceUpdate, MeetingCreate, MeetingUpdate
from app.modules.meetings.service import MeetingsService
from app.modules.mobile.masullar.repository import MobileMasullarRepository
from app.modules.mobile.masullar.schemas import (
    MobileMasulProfile,
    MobileMasulStats,
    MobileMeetingCard,
    MobileMeetingDetail,
    MobilePlanCard,
    MobilePlanDetail,
    MobileYouthCard,
    MobileYouthDetail,
)
from app.modules.plans.repository import PlansRepository
from app.modules.plans.schemas import PlanCreate, PlanProgressUpdate, PlanUpdate
from app.modules.plans.service import PlansService
from app.modules.youth.repository import YouthRepository
from app.modules.youth.schemas import YouthUpdateByMasul
from app.modules.youth.service import YouthService
from app.utils.pagination import Page, PageParams

router = APIRouter(prefix="/api/mobile/masullar", tags=["mobile-masullar"])

MasulHodimAccess = Annotated[CurrentUser, Depends(require_role(UserRole.MASUL_HODIM))]


# ── helpers ───────────────────────────────────────────────────────────────────

def _require_masul_id(current: CurrentUser) -> UUID:
    if current.masul_id is None:
        raise NotFoundError("masul_record_not_found")
    return current.masul_id


# ── profile & stats ───────────────────────────────────────────────────────────

@router.get("/me", response_model=MobileMasulProfile)
async def get_my_profile(current: MasulHodimAccess, session: DbSession) -> MobileMasulProfile:
    masul_id = _require_masul_id(current)
    repo = MobileMasullarRepository(session)
    masul = await repo.get_masul_by_id(masul_id)
    if masul is None:
        raise NotFoundError("masul_record_not_found")
    youth_count = await repo.count_youth(masul.id)
    return MobileMasulProfile(
        id=masul.id,
        full_name=masul.full_name,
        district_id=masul.district_id,
        organization_id=masul.organization_id,
        phone=masul.phone,
        email=masul.email,
        position=masul.position,
        youth_count=youth_count,
        created_at=masul.created_at,
    )


@router.get("/me/stats", response_model=MobileMasulStats)
async def get_my_stats(current: MasulHodimAccess, session: DbSession) -> MobileMasulStats:
    masul_id = _require_masul_id(current)
    data = await MobileMasullarRepository(session).get_stats(masul_id)
    return MobileMasulStats(**data)


# ── youth ─────────────────────────────────────────────────────────────────────

@router.get("/me/youth", response_model=Page[MobileYouthCard])
async def get_my_youth(
    current: MasulHodimAccess,
    session: DbSession,
    status: str | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1, max_length=255),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> Page[MobileYouthCard]:
    masul_id = _require_masul_id(current)
    params = PageParams(page=page, limit=limit)
    items, total = await MobileMasullarRepository(session).get_youth_list(
        masul_id,
        status=status,
        search=search,
        offset=params.offset,
        limit=params.limit,
    )
    return Page.build(
        items=[
            MobileYouthCard(
                id=y.id,
                full_name=y.full_name,
                status=y.status,
                category=y.category,
                contact=y.contact,
                date_of_birth=y.date_of_birth,
            )
            for y in items
        ],
        total=total,
        params=params,
    )


@router.get("/me/youth/{youth_id}", response_model=MobileYouthDetail)
async def get_youth_detail(
    youth_id: UUID,
    current: MasulHodimAccess,
    session: DbSession,
) -> MobileYouthDetail:
    youth = await YouthService(YouthRepository(session)).get(current, youth_id)
    return MobileYouthDetail(
        id=youth.id,
        full_name=youth.full_name,
        district_id=youth.district_id,
        status=youth.status,
        category=youth.category,
        contact=youth.contact,
        date_of_birth=youth.date_of_birth,
        address=youth.address,
        notes=youth.notes,
        removal_proposal=youth.removal_proposal,
        masul_id=youth.masul_id,
        organization_id=youth.organization_id,
        created_at=youth.created_at,
    )


@router.patch("/me/youth/{youth_id}", response_model=MobileYouthDetail)
async def update_youth(
    youth_id: UUID,
    payload: YouthUpdateByMasul,
    current: MasulHodimAccess,
    session: DbSession,
    audit: AuditDep,
) -> MobileYouthDetail:
    svc = YouthService(YouthRepository(session))
    youth = await svc.update(current, youth_id, payload)
    await audit.record(
        "youth.update_contact", "youth", youth_id,
        after={"contact": payload.contact, "notes": payload.notes},
    )
    await session.commit()
    return MobileYouthDetail(
        id=youth.id,
        full_name=youth.full_name,
        district_id=youth.district_id,
        status=youth.status,
        category=youth.category,
        contact=youth.contact,
        date_of_birth=youth.date_of_birth,
        address=youth.address,
        notes=youth.notes,
        removal_proposal=youth.removal_proposal,
        masul_id=youth.masul_id,
        organization_id=youth.organization_id,
        created_at=youth.created_at,
    )


# ── plans ─────────────────────────────────────────────────────────────────────

def _plans_svc(session: DbSession) -> PlansService:
    return PlansService(PlansRepository(session), YouthRepository(session))


@router.get("/me/plans", response_model=Page[MobilePlanCard])
async def get_my_plans(
    current: MasulHodimAccess,
    session: DbSession,
    status: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> Page[MobilePlanCard]:
    masul_id = _require_masul_id(current)
    params = PageParams(page=page, limit=limit)
    rows, total = await MobileMasullarRepository(session).get_plans(
        masul_id,
        status=status,
        offset=params.offset,
        limit=params.limit,
    )
    return Page.build(
        items=[
            MobilePlanCard(
                id=p.id,
                youth_id=p.youth_id,
                youth_name=youth_name,
                title=p.title,
                status=p.status,
                progress=p.progress,
                end_date=p.end_date,
            )
            for p, youth_name in rows
        ],
        total=total,
        params=params,
    )


@router.post("/me/plans", response_model=MobilePlanDetail, status_code=status.HTTP_201_CREATED)
async def create_plan(
    payload: PlanCreate,
    current: MasulHodimAccess,
    session: DbSession,
    audit: AuditDep,
) -> MobilePlanDetail:
    plan = await _plans_svc(session).create(current, payload)
    youth = await YouthRepository(session).get_by_id(plan.youth_id)
    await audit.record(
        "plan.create", "plan", plan.id,
        after={"title": plan.title, "youthId": str(plan.youth_id)},
    )
    await session.commit()
    return MobilePlanDetail(
        id=plan.id,
        youth_id=plan.youth_id,
        youth_name=youth.full_name if youth else None,
        masul_id=plan.masul_id,
        title=plan.title,
        goal=plan.goal,
        milestones=plan.milestones,
        status=plan.status,
        progress=plan.progress,
        notes=plan.notes,
        attachments=plan.attachments,
        start_date=plan.start_date,
        end_date=plan.end_date,
        created_at=plan.created_at,
    )


@router.get("/me/plans/{plan_id}", response_model=MobilePlanDetail)
async def get_plan_detail(
    plan_id: UUID,
    current: MasulHodimAccess,
    session: DbSession,
) -> MobilePlanDetail:
    plan = await _plans_svc(session).get(current, plan_id)
    youth = await YouthRepository(session).get_by_id(plan.youth_id)
    return MobilePlanDetail(
        id=plan.id,
        youth_id=plan.youth_id,
        youth_name=youth.full_name if youth else None,
        masul_id=plan.masul_id,
        title=plan.title,
        goal=plan.goal,
        milestones=plan.milestones,
        status=plan.status,
        progress=plan.progress,
        notes=plan.notes,
        attachments=plan.attachments,
        start_date=plan.start_date,
        end_date=plan.end_date,
        created_at=plan.created_at,
    )


@router.patch("/me/plans/{plan_id}", response_model=MobilePlanDetail)
async def update_plan(
    plan_id: UUID,
    payload: PlanUpdate,
    current: MasulHodimAccess,
    session: DbSession,
    audit: AuditDep,
) -> MobilePlanDetail:
    plan = await _plans_svc(session).update(current, plan_id, payload)
    youth = await YouthRepository(session).get_by_id(plan.youth_id)
    await audit.record(
        "plan.update", "plan", plan_id,
        after=payload.model_dump(exclude_unset=True, mode="json"),
    )
    await session.commit()
    return MobilePlanDetail(
        id=plan.id,
        youth_id=plan.youth_id,
        youth_name=youth.full_name if youth else None,
        masul_id=plan.masul_id,
        title=plan.title,
        goal=plan.goal,
        milestones=plan.milestones,
        status=plan.status,
        progress=plan.progress,
        notes=plan.notes,
        attachments=plan.attachments,
        start_date=plan.start_date,
        end_date=plan.end_date,
        created_at=plan.created_at,
    )


@router.patch("/me/plans/{plan_id}/progress", response_model=MobilePlanDetail)
async def update_plan_progress(
    plan_id: UUID,
    payload: PlanProgressUpdate,
    current: MasulHodimAccess,
    session: DbSession,
    audit: AuditDep,
) -> MobilePlanDetail:
    plan = await _plans_svc(session).update_progress(current, plan_id, payload)
    youth = await YouthRepository(session).get_by_id(plan.youth_id)
    await audit.record(
        "plan.progress_update", "plan", plan_id,
        after=payload.model_dump(exclude_unset=True, mode="json"),
    )
    await session.commit()
    return MobilePlanDetail(
        id=plan.id,
        youth_id=plan.youth_id,
        youth_name=youth.full_name if youth else None,
        masul_id=plan.masul_id,
        title=plan.title,
        goal=plan.goal,
        milestones=plan.milestones,
        status=plan.status,
        progress=plan.progress,
        notes=plan.notes,
        attachments=plan.attachments,
        start_date=plan.start_date,
        end_date=plan.end_date,
        created_at=plan.created_at,
    )


# ── meetings ──────────────────────────────────────────────────────────────────

def _meetings_svc(session: DbSession) -> MeetingsService:
    return MeetingsService(MeetingsRepository(session), YouthRepository(session))


@router.get("/me/meetings/upcoming", response_model=list[MobileMeetingCard])
async def get_upcoming_meetings(
    current: MasulHodimAccess,
    session: DbSession,
    days: int = Query(default=7, ge=1, le=30),
) -> list[MobileMeetingCard]:
    masul_id = _require_masul_id(current)
    rows = await MobileMasullarRepository(session).get_upcoming_meetings(masul_id, days=days)
    return [
        MobileMeetingCard(
            id=m.id,
            youth_id=m.youth_id,
            youth_name=youth_name,
            scheduled_at=m.scheduled_at,
            type=m.type,
            location=m.location,
            attendance_status=m.attendance_status,
        )
        for m, youth_name in rows
    ]


@router.get("/me/meetings", response_model=Page[MobileMeetingCard])
async def get_my_meetings(
    current: MasulHodimAccess,
    session: DbSession,
    youth_id: UUID | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
) -> Page[MobileMeetingCard]:
    masul_id = _require_masul_id(current)
    params = PageParams(page=page, limit=limit)
    rows, total = await MobileMasullarRepository(session).get_meetings_list(
        masul_id,
        youth_id=youth_id,
        offset=params.offset,
        limit=params.limit,
    )
    return Page.build(
        items=[
            MobileMeetingCard(
                id=m.id,
                youth_id=m.youth_id,
                youth_name=youth_name,
                scheduled_at=m.scheduled_at,
                type=m.type,
                location=m.location,
                attendance_status=m.attendance_status,
            )
            for m, youth_name in rows
        ],
        total=total,
        params=params,
    )


@router.post("/me/meetings", response_model=MobileMeetingDetail, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    payload: MeetingCreate,
    current: MasulHodimAccess,
    session: DbSession,
    audit: AuditDep,
) -> MobileMeetingDetail:
    meeting = await _meetings_svc(session).create(current, payload)
    youth = await YouthRepository(session).get_by_id(meeting.youth_id)
    await audit.record(
        "meeting.create", "meeting", meeting.id,
        after={"youthId": str(meeting.youth_id), "scheduledAt": meeting.scheduled_at.isoformat()},
    )
    await session.commit()
    return MobileMeetingDetail(
        id=meeting.id,
        youth_id=meeting.youth_id,
        youth_name=youth.full_name if youth else None,
        masul_id=meeting.masul_id,
        scheduled_at=meeting.scheduled_at,
        type=meeting.type,
        location=meeting.location,
        agenda=meeting.agenda,
        attendance_status=meeting.attendance_status,
        attendance_notes=meeting.attendance_notes,
        attachments=meeting.attachments,
        created_at=meeting.created_at,
    )


@router.get("/me/meetings/{meeting_id}", response_model=MobileMeetingDetail)
async def get_meeting_detail(
    meeting_id: UUID,
    current: MasulHodimAccess,
    session: DbSession,
) -> MobileMeetingDetail:
    meeting = await _meetings_svc(session).get(current, meeting_id)
    youth = await YouthRepository(session).get_by_id(meeting.youth_id)
    return MobileMeetingDetail(
        id=meeting.id,
        youth_id=meeting.youth_id,
        youth_name=youth.full_name if youth else None,
        masul_id=meeting.masul_id,
        scheduled_at=meeting.scheduled_at,
        type=meeting.type,
        location=meeting.location,
        agenda=meeting.agenda,
        attendance_status=meeting.attendance_status,
        attendance_notes=meeting.attendance_notes,
        attachments=meeting.attachments,
        created_at=meeting.created_at,
    )


@router.patch("/me/meetings/{meeting_id}", response_model=MobileMeetingDetail)
async def update_meeting(
    meeting_id: UUID,
    payload: MeetingUpdate,
    current: MasulHodimAccess,
    session: DbSession,
    audit: AuditDep,
) -> MobileMeetingDetail:
    meeting = await _meetings_svc(session).update(current, meeting_id, payload)
    youth = await YouthRepository(session).get_by_id(meeting.youth_id)
    await audit.record(
        "meeting.update", "meeting", meeting_id,
        after=payload.model_dump(exclude_unset=True, mode="json"),
    )
    await session.commit()
    return MobileMeetingDetail(
        id=meeting.id,
        youth_id=meeting.youth_id,
        youth_name=youth.full_name if youth else None,
        masul_id=meeting.masul_id,
        scheduled_at=meeting.scheduled_at,
        type=meeting.type,
        location=meeting.location,
        agenda=meeting.agenda,
        attendance_status=meeting.attendance_status,
        attendance_notes=meeting.attendance_notes,
        attachments=meeting.attachments,
        created_at=meeting.created_at,
    )


@router.patch("/me/meetings/{meeting_id}/attendance", response_model=MobileMeetingDetail)
async def update_attendance(
    meeting_id: UUID,
    payload: AttendanceUpdate,
    current: MasulHodimAccess,
    session: DbSession,
    audit: AuditDep,
) -> MobileMeetingDetail:
    meeting = await _meetings_svc(session).update_attendance(
        current,
        meeting_id,
        attendance_status=payload.attendance_status,
        attendance_notes=payload.attendance_notes,
    )
    youth = await YouthRepository(session).get_by_id(meeting.youth_id)
    await audit.record(
        "meeting.attendance", "meeting", meeting_id,
        after=payload.model_dump(mode="json"),
    )
    await session.commit()
    return MobileMeetingDetail(
        id=meeting.id,
        youth_id=meeting.youth_id,
        youth_name=youth.full_name if youth else None,
        masul_id=meeting.masul_id,
        scheduled_at=meeting.scheduled_at,
        type=meeting.type,
        location=meeting.location,
        agenda=meeting.agenda,
        attendance_status=meeting.attendance_status,
        attendance_notes=meeting.attendance_notes,
        attachments=meeting.attachments,
        created_at=meeting.created_at,
    )
