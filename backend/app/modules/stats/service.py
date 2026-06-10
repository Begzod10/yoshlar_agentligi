from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import MeetingAttendance, PlanStatus, YouthStatus
from app.modules.masullar.models import Masul
from app.modules.meetings.models import Meeting
from app.modules.organizations.models import Organization
from app.modules.plans.models import Plan
from app.modules.audit.models import AuditLog
from app.modules.stats.schemas import (
    AgencyStats,
    AiInsight,
    CategoryStat,
    CompareResult,
    DistrictStatsRow,
    RecentActivityRow,
    TopYoshRow,
    TrendPoint,
)
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
        ).where(Youth.deleted_at.is_(None))
        yr = (await self._session.execute(youth_q)).one()

        org_count = (await self._session.execute(
            select(func.count(Organization.id)).where(Organization.deleted_at.is_(None))
        )).scalar_one()
        masul_count = (await self._session.execute(
            select(func.count(Masul.id)).where(Masul.deleted_at.is_(None))
        )).scalar_one()

        plan_q = select(
            func.count(Plan.id).label("total"),
            func.count().filter(Plan.status == PlanStatus.COMPLETED).label("completed"),
            func.count().filter(Plan.status == PlanStatus.IN_PROGRESS).label("in_progress"),
        ).where(Plan.deleted_at.is_(None))
        pr = (await self._session.execute(plan_q)).one()

        meeting_q = select(
            func.count(Meeting.id).label("total"),
            func.count().filter(Meeting.attendance_status == MeetingAttendance.ATTENDED).label("attended"),
        ).where(Meeting.deleted_at.is_(None))
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
            .where(Youth.deleted_at.is_(None))
            .group_by(Youth.district_id)
        )
        if district_ids:
            youth_q = youth_q.where(Youth.district_id.in_(district_ids))
        youth_rows = {r.district_id: r for r in (await self._session.execute(youth_q)).all()}

        org_q = (
            select(Organization.district_id, func.count(Organization.id).label("cnt"))
            .where(Organization.deleted_at.is_(None))
            .group_by(Organization.district_id)
        )
        if district_ids:
            org_q = org_q.where(Organization.district_id.in_(district_ids))
        org_rows = {r.district_id: r.cnt for r in (await self._session.execute(org_q)).all()}

        masul_q = (
            select(Masul.district_id, func.count(Masul.id).label("cnt"))
            .where(Masul.deleted_at.is_(None))
            .group_by(Masul.district_id)
        )
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
        _VALID_GRANULARITY = {"day", "week", "month", "year"}
        if granularity not in _VALID_GRANULARITY:
            granularity = "month"

        if metric == "youth":
            model, date_col, deleted_col = Youth, Youth.created_at, Youth.deleted_at
        elif metric == "plans":
            model, date_col, deleted_col = Plan, Plan.created_at, Plan.deleted_at
        elif metric == "meetings":
            model, date_col, deleted_col = Meeting, Meeting.scheduled_at, Meeting.deleted_at
        else:
            return []

        trunc = func.date_trunc(granularity, date_col)
        stmt = (
            select(trunc.label("period"), func.count(model.id).label("value"))
            .where(deleted_col.is_(None))
            .group_by(trunc)
            .order_by(trunc)
        )
        rows = (await self._session.execute(stmt)).all()
        return [TrendPoint(period=str(r.period), value=r.value) for r in rows]

    async def by_category(self) -> list[CategoryStat]:
        stmt = (
            select(
                Organization.type.label("category"),
                func.count(Youth.id).label("total_youth"),
            )
            .select_from(Youth)
            .join(Organization, Youth.organization_id == Organization.id, isouter=True)
            .where(Youth.deleted_at.is_(None))
            .group_by(Organization.type)
            .order_by(func.count(Youth.id).desc())
        )
        rows = (await self._session.execute(stmt)).all()
        return [
            CategoryStat(category=r.category or "Noma'lum", total_youth=r.total_youth)
            for r in rows
        ]

    async def top_yoshlar(self, limit: int = 10) -> list[TopYoshRow]:
        plan_total_q = (
            select(Plan.youth_id, func.count(Plan.id).label("total"))
            .where(Plan.deleted_at.is_(None))
            .group_by(Plan.youth_id)
            .subquery()
        )
        plan_done_q = (
            select(Plan.youth_id, func.count(Plan.id).label("done"))
            .where(Plan.deleted_at.is_(None), Plan.status == PlanStatus.COMPLETED)
            .group_by(Plan.youth_id)
            .subquery()
        )
        meeting_total_q = (
            select(Meeting.youth_id, func.count(Meeting.id).label("total"))
            .where(Meeting.deleted_at.is_(None))
            .group_by(Meeting.youth_id)
            .subquery()
        )
        meeting_done_q = (
            select(Meeting.youth_id, func.count(Meeting.id).label("done"))
            .where(Meeting.deleted_at.is_(None), Meeting.attendance_status == MeetingAttendance.ATTENDED)
            .group_by(Meeting.youth_id)
            .subquery()
        )

        stmt = (
            select(
                Youth,
                func.coalesce(plan_total_q.c.total, 0).label("total_plans"),
                func.coalesce(plan_done_q.c.done, 0).label("completed_plans"),
                func.coalesce(meeting_total_q.c.total, 0).label("total_meetings"),
                func.coalesce(meeting_done_q.c.done, 0).label("attended_meetings"),
            )
            .where(Youth.deleted_at.is_(None))
            .outerjoin(plan_total_q, Youth.id == plan_total_q.c.youth_id)
            .outerjoin(plan_done_q, Youth.id == plan_done_q.c.youth_id)
            .outerjoin(meeting_total_q, Youth.id == meeting_total_q.c.youth_id)
            .outerjoin(meeting_done_q, Youth.id == meeting_done_q.c.youth_id)
        )
        rows = (await self._session.execute(stmt)).all()

        # Build rows with formula fallback scores
        raw_rows = []
        for r in rows:
            y = r[0]
            tp, cp, tm, am = r[1], r[2], r[3], r[4]
            plan_score = (cp / tp * 60) if tp else 0
            meet_score = (am / tm * 40) if tm else 0
            formula_score = round((plan_score + meet_score) * 100) / 100
            raw_rows.append({
                "youth": y,
                "tp": tp, "cp": cp, "tm": tm, "am": am,
                "formula_score": formula_score,
            })

        # AI scoring
        from app.modules.ai.service import AiService
        ai_input = [
            {
                "id": str(r["youth"].id),
                "name": r["youth"].full_name,
                "plan_pct": round(r["cp"] / r["tp"] * 100, 1) if r["tp"] else 0,
                "meet_pct": round(r["am"] / r["tm"] * 100, 1) if r["tm"] else 0,
                "district": r["youth"].district_id,
            }
            for r in raw_rows
        ]
        ai_scores = await AiService().score_entities("yosh (youth)", ai_input)

        results = []
        for r in raw_rows:
            y = r["youth"]
            ai_score = ai_scores.get(str(y.id), r["formula_score"])
            results.append(TopYoshRow(
                id=y.id,
                full_name=y.full_name,
                district_id=y.district_id,
                organization_id=y.organization_id,
                masul_id=y.masul_id,
                status=y.status,
                total_plans=r["tp"],
                completed_plans=r["cp"],
                total_meetings=r["tm"],
                attended_meetings=r["am"],
                ai_score=ai_score,
            ))

        results.sort(key=lambda x: x.ai_score, reverse=True)
        return results[:limit]

    async def recent_activity(self, limit: int = 20) -> list[RecentActivityRow]:
        stmt = (
            select(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
        )
        rows = (await self._session.execute(stmt)).scalars().all()
        return [
            RecentActivityRow(
                id=r.id,
                user_id=r.user_id,
                role=r.role,
                action=r.action,
                entity_type=r.entity_type,
                entity_id=r.entity_id,
                created_at=r.created_at,
            )
            for r in rows
        ]

    async def ai_insights(self) -> list[AiInsight]:
        from app.modules.ai.service import AiService
        stats = await self.agency_stats()
        return await AiService().generate_insights(stats)
