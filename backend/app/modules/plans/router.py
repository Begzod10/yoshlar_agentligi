from uuid import UUID

from fastapi import APIRouter, Query, status

from app.core.constants import CROSS_DISTRICT_ROLES, PlanStatus, UserRole
from app.core.deps import CurrentUserDep, DbSession
from app.core.exceptions import ForbiddenError, NotFoundError
from app.modules.audit.service import record_audit
from app.modules.plans.models import Plan
from app.modules.plans.repository import PlansRepository
from app.modules.plans.schemas import PlanCreate, PlanRead, PlanUpdate
from app.modules.youth.repository import YouthRepository

router = APIRouter(prefix="/api/plans", tags=["plans"])

ALLOWED_ROLES = frozenset({UserRole.ADMIN, UserRole.DIREKTOR, UserRole.TASHKILOT_DIREKTORI, UserRole.MASUL_HODIM})
DELETE_ROLES = frozenset({UserRole.ADMIN, UserRole.DIREKTOR, UserRole.TASHKILOT_DIREKTORI})


def _check_plan_scope(user: CurrentUserDep, plan: Plan) -> None:
    """masul_hodim faqat o'ziga biriktirilgan yoshlarning rejalarini ko'ra oladi."""
    if user.role in CROSS_DISTRICT_ROLES:
        return
    if user.role == UserRole.TASHKILOT_DIREKTORI:
        # district check youth orqali (list da filter qilingan, get da tekshiramiz)
        return
    if user.role == UserRole.MASUL_HODIM:
        if str(plan.masul_id) != str(user.id):
            raise ForbiddenError(code="youth_not_assigned")
        return
    raise ForbiddenError(code="role_not_allowed")


@router.get("")
async def list_plans(
        session: DbSession,
        user: CurrentUserDep,
        youth_id: UUID | None = None,
        plan_status: PlanStatus | None = Query(None, alias="status"),
        district_id: str | None = None,
        page: int = Query(1, ge=1),
        limit: int = Query(20, ge=1, le=100),
) -> dict:
    if user.role not in ALLOWED_ROLES:
        raise ForbiddenError(code="role_not_allowed")

    effective_district = district_id
    effective_masul: UUID | None = None

    if user.role == UserRole.TASHKILOT_DIREKTORI:
        effective_district = user.district_id
    elif user.role == UserRole.MASUL_HODIM:
        # masul_hodim faqat o'zining masul_id'siga biriktirilgan rejalarni ko'radi
        effective_masul = user.id

    repo = PlansRepository(session)
    offset = (page - 1) * limit
    rows, total = await repo.list(
        youth_id=youth_id, masul_id=effective_masul,
        district_id=effective_district, status=plan_status,
        offset=offset, limit=limit,
    )
    return {
        "data": [PlanRead.model_validate(p) for p in rows],
        "meta": {"total": total, "page": page, "limit": limit},
    }


@router.post("", response_model=PlanRead, status_code=status.HTTP_201_CREATED)
async def create_plan(
        body: PlanCreate, session: DbSession, user: CurrentUserDep,
) -> PlanRead:
    if user.role not in ALLOWED_ROLES:
        raise ForbiddenError(code="role_not_allowed")

    # masul_hodim faqat o'ziga biriktirilgan yoshlar uchun reja yarata oladi
    youth_repo = YouthRepository(session)
    youth = await youth_repo.get_by_id(body.youth_id)
    if youth is None:
        raise NotFoundError(code="youth_not_found")

    if user.role == UserRole.MASUL_HODIM:
        if youth.masul_id is None or str(youth.masul_id) != str(user.id):
            raise ForbiddenError(code="youth_not_assigned")
    elif user.role == UserRole.TASHKILOT_DIREKTORI:
        if youth.district_id != user.district_id:
            raise ForbiddenError(code="district_mismatch")

    plan = Plan(
        youth_id=body.youth_id,
        masul_id=body.masul_id,
        title=body.title,
        goal=body.goal,
        milestones=body.milestones,
        status=body.status,
        start_date=body.start_date,
        end_date=body.end_date,
    )
    repo = PlansRepository(session)
    await repo.add(plan)
    await record_audit(session, user=user, action="plan.create", entity_type="plan", entity_id=plan.id)
    await session.commit()
    return PlanRead.model_validate(plan)


@router.get("/{plan_id}", response_model=PlanRead)
async def get_plan(
        plan_id: UUID, session: DbSession, user: CurrentUserDep,
) -> PlanRead:
    if user.role not in ALLOWED_ROLES:
        raise ForbiddenError(code="role_not_allowed")
    plan = await PlansRepository(session).get_by_id(plan_id)
    if plan is None:
        raise NotFoundError(code="plan_not_found")
    _check_plan_scope(user, plan)
    return PlanRead.model_validate(plan)


@router.patch("/{plan_id}", response_model=PlanRead)
async def update_plan(
        plan_id: UUID, body: PlanUpdate, session: DbSession, user: CurrentUserDep,
) -> PlanRead:
    if user.role not in ALLOWED_ROLES:
        raise ForbiddenError(code="role_not_allowed")

    repo = PlansRepository(session)
    plan = await repo.get_by_id(plan_id)
    if plan is None:
        raise NotFoundError(code="plan_not_found")

    _check_plan_scope(user, plan)

    # youth_id va masul_id immutable — hech qachon o'zgartirish mumkin emas
    updates = body.model_dump(exclude_unset=True)
    updates.pop("youth_id", None)
    updates.pop("masul_id", None)

    for k, v in updates.items():
        setattr(plan, k, v)

    await record_audit(session, user=user, action="plan.update", entity_type="plan", entity_id=plan.id, after=updates)
    await session.commit()
    return PlanRead.model_validate(plan)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
        plan_id: UUID, session: DbSession, user: CurrentUserDep,
) -> None:
    # masul_hodim delete qila olmaydi
    if user.role not in DELETE_ROLES:
        raise ForbiddenError(code="role_not_allowed")

    repo = PlansRepository(session)
    plan = await repo.get_by_id(plan_id)
    if plan is None:
        raise NotFoundError(code="plan_not_found")

    # tashkilot_direktori faqat o'z district yoshlarining rejalarini o'chira oladi
    if user.role == UserRole.TASHKILOT_DIREKTORI:
        youth_repo = YouthRepository(session)
        youth = await youth_repo.get_by_id(plan.youth_id)
        if youth and youth.district_id != user.district_id:
            raise ForbiddenError(code="district_mismatch")

    await record_audit(session, user=user, action="plan.delete", entity_type="plan", entity_id=plan.id)
    await repo.delete(plan)
    await session.commit()