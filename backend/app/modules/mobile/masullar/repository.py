from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import MeetingAttendance, PlanStatus, YouthStatus
from app.modules.masullar.models import Masul
from app.modules.meetings.models import Meeting
from app.modules.plans.models import Plan
from app.modules.youth.models import Youth


class MobileMasullarRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_masul_by_id(self, masul_id: UUID) -> Masul | None:
        stmt = select(Masul).where(Masul.id == masul_id, Masul.deleted_at.is_(None))
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def count_youth(self, masul_id: UUID) -> int:
        result = await self._session.execute(
            select(func.count(Youth.id)).where(
                Youth.masul_id == masul_id,
                Youth.deleted_at.is_(None),
            )
        )
        return int(result.scalar_one())

    async def get_youth_list(
        self,
        masul_id: UUID,
        *,
        status: str | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Youth], int]:
        base = select(Youth).where(Youth.masul_id == masul_id, Youth.deleted_at.is_(None))
        if status:
            base = base.where(Youth.status == status)
        if search:
            base = base.where(func.lower(Youth.full_name).like(f"%{search.lower()}%"))

        total = (
            await self._session.execute(select(func.count()).select_from(base.subquery()))
        ).scalar_one()
        items = (
            (
                await self._session.execute(
                    base.order_by(Youth.created_at.desc()).offset(offset).limit(limit)
                )
            )
            .scalars()
            .all()
        )
        return list(items), int(total)

    async def get_stats(self, masul_id: UUID) -> dict[str, int]:
        now = datetime.now(tz=UTC)

        counts = (
            await self._session.execute(
                select(Youth.status, func.count(Youth.id))
                .where(Youth.masul_id == masul_id, Youth.deleted_at.is_(None))
                .group_by(Youth.status)
            )
        ).all()
        status_map: dict[str, int] = {str(row[0]): int(row[1]) for row in counts}

        plans_active = (
            await self._session.execute(
                select(func.count(Plan.id)).where(
                    Plan.masul_id == masul_id,
                    Plan.status == PlanStatus.IN_PROGRESS,
                    Plan.deleted_at.is_(None),
                )
            )
        ).scalar_one()

        meetings_upcoming = (
            await self._session.execute(
                select(func.count(Meeting.id)).where(
                    Meeting.masul_id == masul_id,
                    Meeting.scheduled_at >= now,
                    Meeting.attendance_status == MeetingAttendance.SCHEDULED,
                    Meeting.deleted_at.is_(None),
                )
            )
        ).scalar_one()

        return {
            "total_youth": sum(status_map.values()),
            "active": status_map.get(YouthStatus.ACTIVE, 0),
            "graduated": status_map.get(YouthStatus.GRADUATED, 0),
            "removed": status_map.get(YouthStatus.REMOVED, 0),
            "plans_active": int(plans_active),
            "meetings_upcoming": int(meetings_upcoming),
        }

    async def get_meetings_list(
        self,
        masul_id: UUID,
        *,
        youth_id: UUID | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[tuple[Meeting, str]], int]:
        base = (
            select(Meeting, Youth.full_name)
            .join(Youth, Meeting.youth_id == Youth.id)
            .where(Meeting.masul_id == masul_id, Meeting.deleted_at.is_(None))
        )
        count_base = select(Meeting).where(
            Meeting.masul_id == masul_id, Meeting.deleted_at.is_(None)
        )
        if youth_id is not None:
            base = base.where(Meeting.youth_id == youth_id)
            count_base = count_base.where(Meeting.youth_id == youth_id)

        total = (
            await self._session.execute(
                select(func.count()).select_from(count_base.subquery())
            )
        ).scalar_one()
        rows = (
            await self._session.execute(
                base.order_by(Meeting.scheduled_at.desc()).offset(offset).limit(limit)
            )
        ).all()
        return [(row[0], row[1]) for row in rows], int(total)

    async def get_upcoming_meetings(
        self, masul_id: UUID, *, days: int = 7
    ) -> list[tuple[Meeting, str]]:
        now = datetime.now(tz=UTC)
        until = now + timedelta(days=days)
        rows = (
            await self._session.execute(
                select(Meeting, Youth.full_name)
                .join(Youth, Meeting.youth_id == Youth.id)
                .where(
                    Meeting.masul_id == masul_id,
                    Meeting.scheduled_at.between(now, until),
                    Meeting.attendance_status == MeetingAttendance.SCHEDULED,
                    Meeting.deleted_at.is_(None),
                )
                .order_by(Meeting.scheduled_at.asc())
            )
        ).all()
        return [(row[0], row[1]) for row in rows]

    async def get_plans(
        self,
        masul_id: UUID,
        *,
        status: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[tuple[Plan, str]], int]:
        base = (
            select(Plan, Youth.full_name)
            .join(Youth, Plan.youth_id == Youth.id)
            .where(Plan.masul_id == masul_id, Plan.deleted_at.is_(None))
        )
        count_base = select(Plan).where(
            Plan.masul_id == masul_id, Plan.deleted_at.is_(None)
        )
        if status:
            base = base.where(Plan.status == status)
            count_base = count_base.where(Plan.status == status)

        total = (
            await self._session.execute(
                select(func.count()).select_from(count_base.subquery())
            )
        ).scalar_one()
        rows = (
            await self._session.execute(
                base.order_by(Plan.created_at.desc()).offset(offset).limit(limit)
            )
        ).all()
        return [(row[0], row[1]) for row in rows], int(total)
