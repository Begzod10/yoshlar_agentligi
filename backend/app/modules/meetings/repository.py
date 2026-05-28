from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.meetings.models import Meeting
from app.modules.youth.models import Youth


class MeetingsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, meeting_id: UUID) -> Meeting | None:
        stmt = select(Meeting).where(Meeting.id == meeting_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        youth_id: UUID | None = None,
        masul_id: UUID | None = None,
        district_id: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Meeting], int]:
        base = select(Meeting)
        count_base = select(func.count(Meeting.id))

        if district_id is not None:
            base = base.join(Youth, Meeting.youth_id == Youth.id).where(Youth.district_id == district_id)
            count_base = count_base.join(Youth, Meeting.youth_id == Youth.id).where(Youth.district_id == district_id)
        if youth_id is not None:
            base = base.where(Meeting.youth_id == youth_id)
            count_base = count_base.where(Meeting.youth_id == youth_id)
        if masul_id is not None:
            base = base.where(Meeting.masul_id == masul_id)
            count_base = count_base.where(Meeting.masul_id == masul_id)

        total = (await self._session.execute(count_base)).scalar_one()
        stmt = base.order_by(Meeting.scheduled_at.desc()).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all()), total

    async def add(self, meeting: Meeting) -> Meeting:
        self._session.add(meeting)
        await self._session.flush()
        return meeting

    async def delete(self, meeting: Meeting) -> None:
        await self._session.delete(meeting)
