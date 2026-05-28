from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.masullar.models import Masul


class MasullarRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, masul_id: UUID) -> Masul | None:
        stmt = select(Masul).where(Masul.id == masul_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        district_id: str | None = None,
        organization_id: UUID | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Masul], int]:
        base = select(Masul)
        count_base = select(func.count(Masul.id))

        if district_id is not None:
            base = base.where(Masul.district_id == district_id)
            count_base = count_base.where(Masul.district_id == district_id)
        if organization_id is not None:
            base = base.where(Masul.organization_id == organization_id)
            count_base = count_base.where(Masul.organization_id == organization_id)
        if search:
            pattern = f"%{search}%"
            base = base.where(Masul.full_name.ilike(pattern))
            count_base = count_base.where(Masul.full_name.ilike(pattern))

        total = (await self._session.execute(count_base)).scalar_one()
        stmt = base.order_by(Masul.full_name).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), total

    async def add(self, masul: Masul) -> Masul:
        self._session.add(masul)
        await self._session.flush()
        return masul

    async def delete(self, masul: Masul) -> None:
        await self._session.delete(masul)
