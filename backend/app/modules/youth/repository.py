from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import YouthStatus
from app.modules.youth.models import Youth


class YouthRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, youth_id: UUID) -> Youth | None:
        stmt = select(Youth).where(Youth.id == youth_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        district_id: str | None = None,
        masul_id: UUID | None = None,
        status: YouthStatus | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Youth], int]:
        base = select(Youth)
        count_base = select(func.count(Youth.id))

        if district_id is not None:
            base = base.where(Youth.district_id == district_id)
            count_base = count_base.where(Youth.district_id == district_id)
        if masul_id is not None:
            base = base.where(Youth.masul_id == masul_id)
            count_base = count_base.where(Youth.masul_id == masul_id)
        if status is not None:
            base = base.where(Youth.status == status)
            count_base = count_base.where(Youth.status == status)
        if search:
            pattern = f"%{search}%"
            base = base.where(Youth.full_name.ilike(pattern))
            count_base = count_base.where(Youth.full_name.ilike(pattern))

        total = (await self._session.execute(count_base)).scalar_one()
        stmt = base.order_by(Youth.created_at.desc()).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), total

    async def list_pending_removals(
        self, *, offset: int = 0, limit: int = 20
    ) -> tuple[list[Youth], int]:
        from sqlalchemy import text
        condition = Youth.removal_proposal.isnot(None)
        base = select(Youth).where(condition)
        count_base = select(func.count(Youth.id)).where(condition)

        total = (await self._session.execute(count_base)).scalar_one()
        stmt = base.order_by(Youth.updated_at.desc()).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), total

    async def add(self, youth: Youth) -> Youth:
        self._session.add(youth)
        await self._session.flush()
        return youth

    async def delete(self, youth: Youth) -> None:
        await self._session.delete(youth)
