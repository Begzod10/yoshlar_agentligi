from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import FlagStatus
from app.modules.flags.models import Flag


class FlagsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, flag_id: UUID) -> Flag | None:
        stmt = select(Flag).where(Flag.id == flag_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        status: FlagStatus | None = None,
        entity_type: str | None = None,
        raised_by: UUID | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Flag], int]:
        base = select(Flag)
        count_base = select(func.count(Flag.id))

        if status is not None:
            base = base.where(Flag.status == status)
            count_base = count_base.where(Flag.status == status)
        if entity_type is not None:
            base = base.where(Flag.entity_type == entity_type)
            count_base = count_base.where(Flag.entity_type == entity_type)
        if raised_by is not None:
            base = base.where(Flag.raised_by == raised_by)
            count_base = count_base.where(Flag.raised_by == raised_by)

        total = (await self._session.execute(count_base)).scalar_one()
        stmt = base.order_by(Flag.created_at.desc()).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), total

    async def add(self, flag: Flag) -> Flag:
        self._session.add(flag)
        await self._session.flush()
        return flag
