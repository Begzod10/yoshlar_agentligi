from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.organizations.models import Organization


class OrganizationsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, org_id: UUID) -> Organization | None:
        stmt = select(Organization).where(Organization.id == org_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        district_id: str | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Organization], int]:
        base = select(Organization)
        count_base = select(func.count(Organization.id))

        if district_id is not None:
            base = base.where(Organization.district_id == district_id)
            count_base = count_base.where(Organization.district_id == district_id)
        if search:
            pattern = f"%{search}%"
            base = base.where(Organization.name.ilike(pattern))
            count_base = count_base.where(Organization.name.ilike(pattern))

        total = (await self._session.execute(count_base)).scalar_one()
        stmt = base.order_by(Organization.name).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), total

    async def add(self, org: Organization) -> Organization:
        self._session.add(org)
        await self._session.flush()
        return org

    async def delete(self, org: Organization) -> None:
        await self._session.delete(org)
