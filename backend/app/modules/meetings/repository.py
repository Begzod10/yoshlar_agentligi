from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.constants import CROSS_DISTRICT_ROLES, UserRole
from app.core.deps import CurrentUser
from app.modules.meetings.models import Meeting
from app.modules.youth.models import Youth
from app.utils.pagination import PageParams


class MeetingsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, meeting_id: UUID) -> Meeting | None:
        stmt = (
            select(Meeting)
            .options(selectinload(Meeting.masul), selectinload(Meeting.youth))
            .where(Meeting.id == meeting_id, Meeting.deleted_at.is_(None))
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def add(self, meeting: Meeting) -> Meeting:
        self._session.add(meeting)
        await self._session.flush()
        return meeting

    async def list_for_scope(
        self,
        actor: CurrentUser,
        *,
        youth_id: UUID | None = None,
        from_: datetime | None = None,
        to: datetime | None = None,
        params: PageParams,
    ) -> tuple[list[Meeting], int]:
        base = (
            select(Meeting)
            .options(selectinload(Meeting.masul), selectinload(Meeting.youth))
            .join(Youth, Youth.id == Meeting.youth_id)
            .where(Meeting.deleted_at.is_(None), Youth.deleted_at.is_(None))
        )
        if actor.role in CROSS_DISTRICT_ROLES:
            pass
        elif actor.role == UserRole.TASHKILOT_DIREKTORI:
            base = base.where(Youth.district_id == actor.district_id)
        elif actor.role == UserRole.MASUL_HODIM:
            base = base.where(Youth.masul_id == actor.masul_id)

        if youth_id is not None:
            base = base.where(Meeting.youth_id == youth_id)
        if from_ is not None:
            base = base.where(Meeting.scheduled_at >= from_)
        if to is not None:
            base = base.where(Meeting.scheduled_at <= to)

        total = (
            await self._session.execute(
                select(func.count()).select_from(base.subquery())
            )
        ).scalar_one()
        items = (
            (
                await self._session.execute(
                    base.order_by(Meeting.scheduled_at.desc())
                    .offset(params.offset)
                    .limit(params.limit)
                )
            )
            .scalars()
            .all()
        )
        return list(items), int(total)

    async def find_same_day_for_youth(
        self, youth_id: UUID, scheduled_at: datetime
    ) -> Meeting | None:
        day_start = scheduled_at.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start.replace(hour=23, minute=59, second=59, microsecond=999999)
        stmt = select(Meeting).where(
            and_(
                Meeting.youth_id == youth_id,
                Meeting.scheduled_at >= day_start,
                Meeting.scheduled_at <= day_end,
                Meeting.deleted_at.is_(None),
            )
        )
        return (await self._session.execute(stmt)).scalars().first()
