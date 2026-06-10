from datetime import UTC, datetime
from uuid import UUID

from app.core.constants import CROSS_DISTRICT_ROLES, PlanStatus, UserRole
from app.core.deps import CurrentUser
from app.core.exceptions import (
    DistrictMismatchError,
    ForbiddenError,
    NotFoundError,
    YouthNotAssignedError,
)
from app.modules.plans.models import Plan
from app.modules.plans.repository import PlansRepository
from app.modules.plans.schemas import PlanCreate, PlanUpdate
from app.modules.youth.models import Youth
from app.modules.youth.repository import YouthRepository


class PlansService:
    def __init__(self, repo: PlansRepository, youth: YouthRepository) -> None:
        self._repo = repo
        self._youth = youth

    @staticmethod
    def _assert_can_touch_youth(actor: CurrentUser, youth: Youth) -> None:
        if actor.role in CROSS_DISTRICT_ROLES:
            return
        if actor.role == UserRole.TASHKILOT_DIREKTORI:
            if actor.district_id != youth.district_id:
                raise DistrictMismatchError()
            return
        if actor.role == UserRole.MASUL_HODIM:
            if youth.masul_id != actor.masul_id:
                raise YouthNotAssignedError()
            return
        raise ForbiddenError("role_not_allowed")

    async def create(self, actor: CurrentUser, payload: PlanCreate) -> Plan:
        youth = await self._youth.get_by_id(payload.youth_id)
        if youth is None:
            raise NotFoundError("youth_not_found")
        self._assert_can_touch_youth(actor, youth)

        plan = Plan(
            youth_id=youth.id,
            masul_id=youth.masul_id,
            title=payload.title,
            goal=payload.goal,
            milestones=[m.model_dump(mode="json") for m in payload.milestones],
            status=PlanStatus.DRAFT,
            progress=0,
            start_date=payload.start_date,
            end_date=payload.end_date,
        )
        return await self._repo.add(plan)

    async def get(self, actor: CurrentUser, plan_id: UUID) -> Plan:
        plan = await self._repo.get_by_id(plan_id)
        if plan is None:
            raise NotFoundError("plan_not_found")
        youth = await self._youth.get_by_id(plan.youth_id)
        if youth is None:
            raise NotFoundError("youth_not_found")
        self._assert_can_touch_youth(actor, youth)
        return plan

    async def update(
        self, actor: CurrentUser, plan_id: UUID, payload: PlanUpdate
    ) -> Plan:
        plan = await self.get(actor, plan_id)
        data = payload.model_dump(exclude_unset=True, by_alias=False)
        # milestones go to JSONB — store with camelCase keys (wire format).
        if payload.milestones is not None:
            data["milestones"] = [m.model_dump(mode="json") for m in payload.milestones]
        for key, value in data.items():
            setattr(plan, key, value)
        return plan

    async def soft_delete(self, actor: CurrentUser, plan_id: UUID) -> None:
        if actor.role not in (
            UserRole.ADMIN,
            UserRole.DIREKTOR,
            UserRole.TASHKILOT_DIREKTORI,
        ):
            raise ForbiddenError("role_not_allowed")
        plan = await self.get(actor, plan_id)
        plan.deleted_at = datetime.now(tz=UTC)
