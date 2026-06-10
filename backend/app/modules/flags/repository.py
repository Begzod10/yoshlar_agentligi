from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.flags.models import Flag
from app.utils.pagination import PageParams


class FlagsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, flag_id: UUID) -> Flag | None:
        stmt = select(Flag).where(Flag.id == flag_id)
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def add(self, flag: Flag) -> Flag:
        self._session.add(flag)
        await self._session.flush()
        return flag

    async def list(
        self,
        *,
        status: str | None = None,
        entity_type: str | None = None,
        raised_by: UUID | None = None,
        params: PageParams,
    ) -> tuple[list[Flag], int]:
        base = select(Flag)
        if status is not None:
            base = base.where(Flag.status == status)
        if entity_type is not None:
            base = base.where(Flag.entity_type == entity_type)
        if raised_by is not None:
            base = base.where(Flag.raised_by == raised_by)

        total = (
            await self._session.execute(
                select(func.count()).select_from(base.subquery())
            )
        ).scalar_one()
        items = (
            (
                await self._session.execute(
                    base.order_by(Flag.created_at.desc())
                    .offset(params.offset)
                    .limit(params.limit)
                )
            )
            .scalars()
            .all()
        )
        return list(items), int(total)
