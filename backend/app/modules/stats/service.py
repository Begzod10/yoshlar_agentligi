from sqlalchemy import case, cast, func, select, Float
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import MeetingAttendance, PlanStatus, YouthStatus
from app.modules.masullar.models import Masul
from app.modules.meetings.models import Meeting
from app.modules.organizations.models import Organization
from app.modules.plans.models import Plan
from app.modules.stats.schemas import AgencyStats, CompareResult, DistrictStatsRow, TrendPoint
from app.modules.youth.models import Youth


class StatsService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def agency_stats(self) -> AgencyStats:
        youth_q = select(
            func.count(Youth.id).label("total"),
            func.count().filter(Youth.status == YouthStatus.ACTIVE).label("active"),
            func.count().filter(Youth.status == YouthStatus.GRADUATED).label("graduated"),
            func.count().filter(Youth.status == YouthStatus.REMOVED).label("removed"),
        )
        yr = (await self._session.execute(youth_q)).one()

        org_count = (await self._session.execute(select(func.count(Organization.id)))).scalar_one()
        masul_count = (await self._session.execute(select(func.count(Masul.id)))).scalar_one()

        plan_q = select(
            func.count(Plan.id).label("total"),
            func.count().filter(Plan.status == PlanStatus.COMPLETED).label("completed"),
            func.count().filter(Plan.status == PlanStatus.IN_PROGRESS).label("in_progress"),
        )
        pr = (await self._session.execute(plan_q)).one()

        meeting_q = select(
            func.count(Meeting.id).label("total"),
            func.count().filter(Meeting.attendance_status == MeetingAttendance.ATTENDED).label("attended"),
        )
        mr = (await self._session.execute(meeting_q)).one()

        return AgencyStats(
            total_youth=yr.total,
            active_youth=yr.active,
            graduated_youth=yr.graduated,
            removed_youth=yr.removed,
            total_organizations=org_count,
            total_masullar=masul_count,
            total_plans=pr.total,
            completed_plans=pr.completed,
            in_progress_plans=pr.in_progress,
            total_meetings=mr.total,
            attended_meetings=mr.attended,
        )

    async def district_stats(self, district_ids: list[str] | None = None) -> list[DistrictStatsRow]:
        youth_q = (
            select(
                Youth.district_id,
                func.count(Youth.id).label("total"),
                func.count().filter(Youth.status == YouthStatus.ACTIVE).label("active"),
                func.count().filter(Youth.status == YouthStatus.GRADUATED).label("graduated"),
            )
            .group_by(Youth.district_id)
        )
        if district_ids:
            youth_q = youth_q.where(Youth.district_id.in_(district_ids))
        youth_rows = {r.district_id: r for r in (await self._session.execute(youth_q)).all()}

        org_q = select(Organization.district_id, func.count(Organization.id).label("cnt")).group_by(Organization.district_id)
        if district_ids:
            org_q = org_q.where(Organization.district_id.in_(district_ids))
        org_rows = {r.district_id: r.cnt for r in (await self._session.execute(org_q)).all()}

        masul_q = select(Masul.district_id, func.count(Masul.id).label("cnt")).group_by(Masul.district_id)
        if district_ids:
            masul_q = masul_q.where(Masul.district_id.in_(district_ids))
        masul_rows = {r.district_id: r.cnt for r in (await self._session.execute(masul_q)).all()}

        plan_q = (
            select(
                Youth.district_id,
                func.count(Plan.id).label("total"),
                func.count().filter(Plan.status == PlanStatus.COMPLETED).label("completed"),
            )
            .select_from(Plan)
            .join(Youth, Plan.youth_id == Youth.id)
            .group_by(Youth.district_id)
        )
        if district_ids:
            plan_q = plan_q.where(Youth.district_id.in_(district_ids))
        plan_rows = {r.district_id: r for r in (await self._session.execute(plan_q)).all()}

        meeting_q = (
            select(Youth.district_id, func.count(Meeting.id).label("total"))
            .select_from(Meeting)
            .join(Youth, Meeting.youth_id == Youth.id)
            .group_by(Youth.district_id)
        )
        if district_ids:
            meeting_q = meeting_q.where(Youth.district_id.in_(district_ids))
        meeting_rows = {r.district_id: r.total for r in (await self._session.execute(meeting_q)).all()}

        all_districts = set(youth_rows) | set(org_rows) | set(masul_rows) | set(plan_rows) | set(meeting_rows)
        if district_ids:
            all_districts = all_districts & set(district_ids)

        results = []
        for d in sorted(all_districts):
            yr = youth_rows.get(d)
            pr = plan_rows.get(d)
            total_plans = pr.total if pr else 0
            completed_plans = pr.completed if pr else 0
            results.append(DistrictStatsRow(
                district_id=d,
                total_youth=yr.total if yr else 0,
                active_youth=yr.active if yr else 0,
                graduated_youth=yr.graduated if yr else 0,
                total_organizations=org_rows.get(d, 0),
                total_masullar=masul_rows.get(d, 0),
                total_plans=total_plans,
                completed_plans=completed_plans,
                total_meetings=meeting_rows.get(d, 0),
                completion_rate=round((completed_plans / total_plans * 100) if total_plans else 0, 1),
            ))
        return results

    async def compare(self, district_a: str, district_b: str) -> list[CompareResult]:
        rows = await self.district_stats(district_ids=[district_a, district_b])
        return [
            CompareResult(
                district_id=r.district_id,
                total_youth=r.total_youth,
                active_youth=r.active_youth,
                total_plans=r.total_plans,
                completed_plans=r.completed_plans,
                completion_rate=r.completion_rate,
                total_meetings=r.total_meetings,
            )
            for r in rows
        ]

    async def trends(self, metric: str, granularity: str = "month") -> list[TrendPoint]:
        if metric == "youth":
            model, date_col = Youth, Youth.created_at
        elif metric == "plans":
            model, date_col = Plan, Plan.created_at
        elif metric == "meetings":
            model, date_col = Meeting, Meeting.created_at
        else:
            return []

        trunc = func.date_trunc(granularity, date_col)
        stmt = (
            select(trunc.label("period"), func.count(model.id).label("value"))
            .group_by(trunc)
            .order_by(trunc)
        )
        rows = (await self._session.execute(stmt)).all()
        return [TrendPoint(period=str(r.period), value=r.value) for r in rows]
