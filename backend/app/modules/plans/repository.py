from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import PlanStatus
from app.modules.plans.models import Plan
from app.modules.youth.models import Youth


class PlansRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, plan_id: UUID) -> Plan | None:
        stmt = select(Plan).where(Plan.id == plan_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        youth_id: UUID | None = None,
        masul_id: UUID | None = None,
        district_id: str | None = None,
        status: PlanStatus | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Plan], int]:
        base = select(Plan)
        count_base = select(func.count(Plan.id))

        if district_id is not None:
            base = base.join(Youth, Plan.youth_id == Youth.id).where(Youth.district_id == district_id)
            count_base = count_base.join(Youth, Plan.youth_id == Youth.id).where(Youth.district_id == district_id)
        if youth_id is not None:
            base = base.where(Plan.youth_id == youth_id)
            count_base = count_base.where(Plan.youth_id == youth_id)
        if masul_id is not None:
            base = base.where(Plan.masul_id == masul_id)
            count_base = count_base.where(Plan.masul_id == masul_id)
        if status is not None:
            base = base.where(Plan.status == status)
            count_base = count_base.where(Plan.status == status)

        total = (await self._session.execute(count_base)).scalar_one()
        stmt = base.order_by(Plan.created_at.desc()).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), total

    async def add(self, plan: Plan) -> Plan:
        self._session.add(plan)
        await self._session.flush()
        return plan

    async def delete(self, plan: Plan) -> None:
        await self._session.delete(plan)
