from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.organizations.models import Organization
from app.utils.pagination import PageParams


class OrganizationsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, org_id: UUID) -> Organization | None:
        stmt = select(Organization).where(
            Organization.id == org_id, Organization.deleted_at.is_(None)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def add(self, org: Organization) -> Organization:
        self._session.add(org)
        await self._session.flush()
        return org

    async def list(
        self,
        *,
        district_id: str | None = None,
        search: str | None = None,
        params: PageParams,
    ) -> tuple[list[Organization], int]:
        base = select(Organization).where(Organization.deleted_at.is_(None))
        if district_id is not None:
            base = base.where(Organization.district_id == district_id)
        if search:
            pattern = f"%{search.lower()}%"
            base = base.where(func.lower(Organization.name).like(pattern))

        total_stmt = select(func.count()).select_from(base.subquery())
        total = (await self._session.execute(total_stmt)).scalar_one()

        items_stmt = (
            base.order_by(Organization.created_at.desc())
            .offset(params.offset)
            .limit(params.limit)
        )
        items = (await self._session.execute(items_stmt)).scalars().all()
        return list(items), int(total)
