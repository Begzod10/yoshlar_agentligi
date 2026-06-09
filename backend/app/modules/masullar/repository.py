from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.masullar.models import Masul
from app.utils.pagination import PageParams


class MasullarRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, masul_id: UUID) -> Masul | None:
        stmt = select(Masul).where(Masul.id == masul_id, Masul.deleted_at.is_(None))
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def add(self, masul: Masul) -> Masul:
        self._session.add(masul)
        await self._session.flush()
        return masul

    async def list(
        self,
        *,
        district_id: str | None = None,
        organization_id: UUID | None = None,
        search: str | None = None,
        params: PageParams,
    ) -> tuple[list[Masul], int]:
        base = select(Masul).where(Masul.deleted_at.is_(None))
        if district_id is not None:
            base = base.where(Masul.district_id == district_id)
        if organization_id is not None:
            base = base.where(Masul.organization_id == organization_id)
        if search:
            pattern = f"%{search.lower()}%"
            base = base.where(func.lower(Masul.full_name).like(pattern))

        total = (
            await self._session.execute(
                select(func.count()).select_from(base.subquery())
            )
        ).scalar_one()
        items = (
            (
                await self._session.execute(
                    base.order_by(Masul.created_at.desc())
                    .offset(params.offset)
                    .limit(params.limit)
                )
            )
            .scalars()
            .all()
        )
        return list(items), int(total)
