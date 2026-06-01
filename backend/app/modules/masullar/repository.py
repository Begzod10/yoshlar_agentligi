from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.masullar.models import Masul
from app.modules.organizations.models import Organization
from app.modules.youth.models import Youth


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
    ) -> tuple[list[dict], int]:
        """
        Har bir masul uchun qo'shimcha:
          - assigned_youth_count : o'ziga biriktirilgan active yoshlar soni
          - organization_name    : tashkilot nomi
        """
        # youth count subquery
        youth_count_sq = (
            select(
                Youth.masul_id,
                func.count(Youth.id).label("youth_count"),
            )
            .where(Youth.masul_id.is_not(None))
            .group_by(Youth.masul_id)
            .subquery()
        )

        # asosiy query — Masul + Organization JOIN + youth count LEFT JOIN
        base = (
            select(
                Masul,
                Organization.name.label("organization_name"),
                func.coalesce(youth_count_sq.c.youth_count, 0).label("assigned_youth_count"),
            )
            .join(Organization, Masul.organization_id == Organization.id)
            .outerjoin(youth_count_sq, Masul.id == youth_count_sq.c.masul_id)
        )

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
        rows = (await self._session.execute(stmt)).all()

        # har bir row: (Masul obj, organization_name str, assigned_youth_count int)
        result = []
        for masul_obj, org_name, youth_count in rows:
            result.append({
                "masul": masul_obj,
                "organization_name": org_name,
                "assigned_youth_count": youth_count,
            })

        return result, total

    async def add(self, masul: Masul) -> Masul:
        self._session.add(masul)
        await self._session.flush()
        return masul

    async def delete(self, masul: Masul) -> None:
        await self._session.delete(masul)