from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.constants import CROSS_DISTRICT_ROLES, UserRole
from app.core.deps import CurrentUser
from app.modules.youth.models import Youth
from app.utils.pagination import PageParams


class YouthRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, youth_id: UUID) -> Youth | None:
        stmt = (
            select(Youth)
            .options(selectinload(Youth.masul))
            .where(Youth.id == youth_id, Youth.deleted_at.is_(None))
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def add(self, youth: Youth) -> Youth:
        self._session.add(youth)
        await self._session.flush()
        return youth

    async def list_for_scope(
        self,
        actor: CurrentUser,
        *,
        district_id: str | None = None,
        masul_id: UUID | None = None,
        status: str | None = None,
        search: str | None = None,
        params: PageParams,
    ) -> tuple[list[Youth], int]:
        base = select(Youth).options(selectinload(Youth.masul)).where(Youth.deleted_at.is_(None))

        if actor.role in CROSS_DISTRICT_ROLES:
            if district_id is not None:
                base = base.where(Youth.district_id == district_id)
            if masul_id is not None:
                base = base.where(Youth.masul_id == masul_id)
        elif actor.role == UserRole.TASHKILOT_DIREKTORI:
            base = base.where(Youth.district_id == actor.district_id)
            if masul_id is not None:
                base = base.where(Youth.masul_id == masul_id)
        elif actor.role == UserRole.MASUL_HODIM:
            # masul_hodim sees only youth where they are the assigned masul,
            # joined via the user's own caseworker record. The link is
            # users.id <-> masullar.id (1-1 by seed) in v1.
            base = base.where(Youth.masul_id == actor.masul_id)

        if status is not None:
            base = base.where(Youth.status == status)
        if search:
            pattern = f"%{search.lower()}%"
            base = base.where(func.lower(Youth.full_name).like(pattern))

        total = (
            await self._session.execute(
                select(func.count()).select_from(base.subquery())
            )
        ).scalar_one()
        items = (
            (
                await self._session.execute(
                    base.order_by(Youth.created_at.desc())
                    .offset(params.offset)
                    .limit(params.limit)
                )
            )
            .scalars()
            .all()
        )
        return list(items), int(total)
