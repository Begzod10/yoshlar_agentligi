from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import CROSS_DISTRICT_ROLES, UserRole
from app.core.deps import CurrentUser
from app.modules.plans.models import Plan
from app.modules.youth.models import Youth
from app.utils.pagination import PageParams


class PlansRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, plan_id: UUID) -> Plan | None:
        stmt = select(Plan).where(Plan.id == plan_id, Plan.deleted_at.is_(None))
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def add(self, plan: Plan) -> Plan:
        self._session.add(plan)
        await self._session.flush()
        return plan

    async def list_for_scope(
        self,
        actor: CurrentUser,
        *,
        youth_id: UUID | None = None,
        status: str | None = None,
        params: PageParams,
    ) -> tuple[list[Plan], int]:
        base = (
            select(Plan)
            .join(Youth, Youth.id == Plan.youth_id)
            .where(Plan.deleted_at.is_(None), Youth.deleted_at.is_(None))
        )
        if actor.role in CROSS_DISTRICT_ROLES:
            pass
        elif actor.role == UserRole.TASHKILOT_DIREKTORI:
            base = base.where(Youth.district_id == actor.district_id)
        elif actor.role == UserRole.MASUL_HODIM:
            base = base.where(Youth.masul_id == actor.masul_id)

        if youth_id is not None:
            base = base.where(Plan.youth_id == youth_id)
        if status is not None:
            base = base.where(Plan.status == status)

        total = (
            await self._session.execute(
                select(func.count()).select_from(base.subquery())
            )
        ).scalar_one()
        items = (
            (
                await self._session.execute(
                    base.order_by(Plan.created_at.desc())
                    .offset(params.offset)
                    .limit(params.limit)
                )
            )
            .scalars()
            .all()
        )
        return list(items), int(total)
