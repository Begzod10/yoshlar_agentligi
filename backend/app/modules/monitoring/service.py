from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import MeetingAttendance, PlanStatus, YouthStatus
from app.modules.masullar.models import Masul
from app.modules.meetings.models import Meeting
from app.modules.organizations.models import Organization
from app.modules.plans.models import Plan
from app.modules.youth.models import Youth

Period = Literal["week", "month", "quarter", "year", "all"]

_PERIOD_DAYS: dict[str, int] = {
    "week": 7,
    "month": 30,
    "quarter": 90,
    "year": 365,
}


def _period_start(period: Period) -> datetime | None:
    if period == "all":
        return None
    days = _PERIOD_DAYS[period]
    return datetime.now(tz=timezone.utc) - timedelta(days=days)


def _umumiy_ball(total_youth: int, total_masullar: int, bajarilish: float, ai_ball: float) -> float:
    """Composite score: youth×4 + masullar×2 + bajarilish%×0.08 + ai_ball%×0.14"""
    return round(
        total_youth * 4 + total_masullar * 2 + bajarilish * 0.08 + ai_ball * 0.14,
        1,
    )


class MonitoringService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def overview(self, period: Period = "month") -> dict:
        since = _period_start(period)

        total_youth = (
            await self._session.execute(
                select(func.count()).where(Youth.deleted_at.is_(None))
            )
        ).scalar_one()

        total_districts = (
            await self._session.execute(
                select(func.count(func.distinct(Youth.district_id))).where(
                    Youth.deleted_at.is_(None)
                )
            )
        ).scalar_one()

        total_masullar = (
            await self._session.execute(
                select(func.count()).where(Masul.deleted_at.is_(None))
            )
        ).scalar_one()

        plans_q = select(Plan).where(Plan.deleted_at.is_(None))
        if since:
            plans_q = plans_q.where(Plan.created_at >= since)

        total_plans = (
            await self._session.execute(
                select(func.count()).select_from(plans_q.subquery())
            )
        ).scalar_one()

        completed_plans = (
            await self._session.execute(
                select(func.count()).select_from(
                    plans_q.where(Plan.status == PlanStatus.COMPLETED).subquery()
                )
            )
        ).scalar_one()

        avg_bajarilish = (
            round(completed_plans / total_plans * 100, 1) if total_plans else 0.0
        )

        return {
            "total_youth": int(total_youth),
            "total_districts": int(total_districts),
            "avg_bajarilish_pct": avg_bajarilish,
            "total_masullar": int(total_masullar),
        }

    async def district_ratings(self, period: Period = "month") -> list[dict]:
        since = _period_start(period)

        # Youth counts per district (all-time)
        youth_rows = (
            await self._session.execute(
                select(Youth.district_id, func.count().label("cnt"))
                .where(Youth.deleted_at.is_(None))
                .group_by(Youth.district_id)
            )
        ).all()
        youth_by_district = {r.district_id: int(r.cnt) for r in youth_rows}

        # Masullar counts per district
        masul_rows = (
            await self._session.execute(
                select(Masul.district_id, func.count().label("cnt"))
                .where(Masul.deleted_at.is_(None))
                .group_by(Masul.district_id)
            )
        ).all()
        masullar_by_district = {r.district_id: int(r.cnt) for r in masul_rows}

        # Plans per district (period-filtered)
        plans_stmt = (
            select(Youth.district_id, func.count().label("cnt"))
            .select_from(Plan)
            .join(Youth, Youth.id == Plan.youth_id)
            .where(Plan.deleted_at.is_(None))
        )
        if since:
            plans_stmt = plans_stmt.where(Plan.created_at >= since)
        plans_stmt = plans_stmt.group_by(Youth.district_id)
        plans_rows = (await self._session.execute(plans_stmt)).all()
        plans_by_district = {r.district_id: int(r.cnt) for r in plans_rows}

        # Completed plans per district (period-filtered)
        completed_stmt = (
            select(Youth.district_id, func.count().label("cnt"))
            .select_from(Plan)
            .join(Youth, Youth.id == Plan.youth_id)
            .where(Plan.deleted_at.is_(None), Plan.status == PlanStatus.COMPLETED)
        )
        if since:
            completed_stmt = completed_stmt.where(Plan.created_at >= since)
        completed_stmt = completed_stmt.group_by(Youth.district_id)
        completed_rows = (await self._session.execute(completed_stmt)).all()
        completed_by_district = {r.district_id: int(r.cnt) for r in completed_rows}

        # Meetings per district
        meetings_stmt = (
            select(Youth.district_id, func.count().label("cnt"))
            .select_from(Meeting)
            .join(Youth, Youth.id == Meeting.youth_id)
            .where(Meeting.deleted_at.is_(None))
        )
        if since:
            meetings_stmt = meetings_stmt.where(Meeting.scheduled_at >= since)
        meetings_stmt = meetings_stmt.group_by(Youth.district_id)
        meeting_rows = (await self._session.execute(meetings_stmt)).all()
        meetings_by_district = {r.district_id: int(r.cnt) for r in meeting_rows}

        # Attended meetings per district
        attended_stmt = (
            select(Youth.district_id, func.count().label("cnt"))
            .select_from(Meeting)
            .join(Youth, Youth.id == Meeting.youth_id)
            .where(
                Meeting.deleted_at.is_(None),
                Meeting.attendance_status == MeetingAttendance.ATTENDED,
            )
        )
        if since:
            attended_stmt = attended_stmt.where(Meeting.scheduled_at >= since)
        attended_stmt = attended_stmt.group_by(Youth.district_id)
        attended_rows = (await self._session.execute(attended_stmt)).all()
        attended_by_district = {r.district_id: int(r.cnt) for r in attended_rows}

        all_districts = set(youth_by_district) | set(masullar_by_district)

        # Build raw rows with formula fallback scores
        rows_data = []
        for district_id in all_districts:
            youth_cnt = youth_by_district.get(district_id, 0)
            masul_cnt = masullar_by_district.get(district_id, 0)
            plan_cnt = plans_by_district.get(district_id, 0)
            completed_cnt = completed_by_district.get(district_id, 0)
            meeting_cnt = meetings_by_district.get(district_id, 0)
            attended_cnt = attended_by_district.get(district_id, 0)

            bajarilish = round(completed_cnt / plan_cnt * 100, 1) if plan_cnt else 0.0
            plan_pct = completed_cnt / plan_cnt if plan_cnt else 0.0
            meet_pct = attended_cnt / meeting_cnt if meeting_cnt else 0.0
            formula_ball = round(plan_pct * 60 + meet_pct * 40, 1)

            rows_data.append({
                "district_id": district_id,
                "total_youth": youth_cnt,
                "total_masullar": masul_cnt,
                "total_plans": plan_cnt,
                "total_meetings": meeting_cnt,
                "bajarilish_pct": bajarilish,
                "_plan_pct": plan_pct,
                "_meet_pct": meet_pct,
                "_formula_ball": formula_ball,
            })

        # AI scoring — pass condensed data, fallback to formula on failure
        from app.modules.ai.service import AiService
        ai_input = [
            {
                "id": r["district_id"],
                "plan_pct": round(r["_plan_pct"] * 100, 1),
                "meet_pct": round(r["_meet_pct"] * 100, 1),
                "youth": r["total_youth"],
                "masullar": r["total_masullar"],
            }
            for r in rows_data
        ]
        ai_scores = await AiService().score_entities("tuman (district)", ai_input)

        results = []
        for r in rows_data:
            ai_result = ai_scores.get(r["district_id"])
            ai_ball = ai_result[0] if ai_result else r["_formula_ball"]
            ai_comment = ai_result[1] if ai_result else None
            results.append({
                "district_id": r["district_id"],
                "total_youth": r["total_youth"],
                "total_masullar": r["total_masullar"],
                "total_plans": r["total_plans"],
                "total_meetings": r["total_meetings"],
                "bajarilish_pct": r["bajarilish_pct"],
                "ai_ball": ai_ball,
                "ai_comment": ai_comment,
                "umumiy_ball": _umumiy_ball(r["total_youth"], r["total_masullar"], r["bajarilish_pct"], ai_ball),
            })

        results.sort(key=lambda r: r["umumiy_ball"], reverse=True)
        for i, row in enumerate(results, 1):
            row["rank"] = i

        return results

    async def org_ratings(self, period: Period = "month") -> list[dict]:
        since = _period_start(period)

        # All orgs
        orgs = (
            await self._session.execute(
                select(Organization).where(Organization.deleted_at.is_(None))
            )
        ).scalars().all()

        org_ids = [o.id for o in orgs]
        if not org_ids:
            return []

        # Youth per org
        youth_rows = (
            await self._session.execute(
                select(Youth.organization_id, func.count().label("cnt"))
                .where(Youth.deleted_at.is_(None), Youth.organization_id.in_(org_ids))
                .group_by(Youth.organization_id)
            )
        ).all()
        youth_by_org = {r.organization_id: int(r.cnt) for r in youth_rows}

        # Masullar per org
        masul_rows = (
            await self._session.execute(
                select(Masul.organization_id, func.count().label("cnt"))
                .where(Masul.deleted_at.is_(None), Masul.organization_id.in_(org_ids))
                .group_by(Masul.organization_id)
            )
        ).all()
        masullar_by_org = {r.organization_id: int(r.cnt) for r in masul_rows}

        # Plans per org (period-filtered)
        plans_stmt = (
            select(Youth.organization_id, func.count().label("cnt"))
            .select_from(Plan)
            .join(Youth, Youth.id == Plan.youth_id)
            .where(Plan.deleted_at.is_(None), Youth.organization_id.in_(org_ids))
        )
        if since:
            plans_stmt = plans_stmt.where(Plan.created_at >= since)
        plans_stmt = plans_stmt.group_by(Youth.organization_id)
        plans_by_org = {
            r.organization_id: int(r.cnt)
            for r in (await self._session.execute(plans_stmt)).all()
        }

        completed_stmt = (
            select(Youth.organization_id, func.count().label("cnt"))
            .select_from(Plan)
            .join(Youth, Youth.id == Plan.youth_id)
            .where(
                Plan.deleted_at.is_(None),
                Plan.status == PlanStatus.COMPLETED,
                Youth.organization_id.in_(org_ids),
            )
        )
        if since:
            completed_stmt = completed_stmt.where(Plan.created_at >= since)
        completed_stmt = completed_stmt.group_by(Youth.organization_id)
        completed_by_org = {
            r.organization_id: int(r.cnt)
            for r in (await self._session.execute(completed_stmt)).all()
        }

        rows_data = []
        for org in orgs:
            youth_cnt = youth_by_org.get(org.id, 0)
            masul_cnt = masullar_by_org.get(org.id, 0)
            plan_cnt = plans_by_org.get(org.id, 0)
            completed_cnt = completed_by_org.get(org.id, 0)

            bajarilish = round(completed_cnt / plan_cnt * 100, 1) if plan_cnt else 0.0
            plan_pct = completed_cnt / plan_cnt if plan_cnt else 0.0
            formula_ball = round(plan_pct * 100, 1)

            rows_data.append({
                "id": org.id,
                "name": org.name,
                "district_id": org.district_id,
                "total_masullar": masul_cnt,
                "total_youth": youth_cnt,
                "total_plans": plan_cnt,
                "bajarilish_pct": bajarilish,
                "_plan_pct": plan_pct,
                "_formula_ball": formula_ball,
            })

        from app.modules.ai.service import AiService
        ai_input = [
            {
                "id": str(r["id"]),
                "name": r["name"],
                "plan_pct": round(r["_plan_pct"] * 100, 1),
                "youth": r["total_youth"],
                "masullar": r["total_masullar"],
            }
            for r in rows_data
        ]
        ai_scores = await AiService().score_entities("tashkilot (organization)", ai_input)

        results = []
        for r in rows_data:
            ai_result = ai_scores.get(str(r["id"]))
            ai_ball = ai_result[0] if ai_result else r["_formula_ball"]
            ai_comment = ai_result[1] if ai_result else None
            results.append({
                "id": r["id"],
                "name": r["name"],
                "district_id": r["district_id"],
                "total_masullar": r["total_masullar"],
                "total_youth": r["total_youth"],
                "total_plans": r["total_plans"],
                "bajarilish_pct": r["bajarilish_pct"],
                "ai_ball": ai_ball,
                "ai_comment": ai_comment,
            })

        results.sort(key=lambda r: (r["ai_ball"], r["total_youth"]), reverse=True)
        for i, row in enumerate(results, 1):
            row["rank"] = i

        return results

    async def masul_ratings(self, period: Period = "month") -> list[dict]:
        since = _period_start(period)

        masullar = (
            await self._session.execute(
                select(Masul).where(Masul.deleted_at.is_(None))
            )
        ).scalars().all()

        masul_ids = [m.id for m in masullar]
        if not masul_ids:
            return []

        # Youth per masul
        youth_rows = (
            await self._session.execute(
                select(Youth.masul_id, func.count().label("cnt"))
                .where(Youth.deleted_at.is_(None), Youth.masul_id.in_(masul_ids))
                .group_by(Youth.masul_id)
            )
        ).all()
        youth_by_masul = {r.masul_id: int(r.cnt) for r in youth_rows}

        # Plans per masul (period-filtered)
        plans_stmt = (
            select(Plan.masul_id, func.count().label("cnt"))
            .where(Plan.deleted_at.is_(None), Plan.masul_id.in_(masul_ids))
        )
        if since:
            plans_stmt = plans_stmt.where(Plan.created_at >= since)
        plans_stmt = plans_stmt.group_by(Plan.masul_id)
        plans_by_masul = {
            r.masul_id: int(r.cnt)
            for r in (await self._session.execute(plans_stmt)).all()
        }

        completed_stmt = (
            select(Plan.masul_id, func.count().label("cnt"))
            .where(
                Plan.deleted_at.is_(None),
                Plan.status == PlanStatus.COMPLETED,
                Plan.masul_id.in_(masul_ids),
            )
        )
        if since:
            completed_stmt = completed_stmt.where(Plan.created_at >= since)
        completed_stmt = completed_stmt.group_by(Plan.masul_id)
        completed_by_masul = {
            r.masul_id: int(r.cnt)
            for r in (await self._session.execute(completed_stmt)).all()
        }

        # Meetings per masul
        meetings_stmt = (
            select(Meeting.masul_id, func.count().label("cnt"))
            .where(Meeting.deleted_at.is_(None), Meeting.masul_id.in_(masul_ids))
        )
        if since:
            meetings_stmt = meetings_stmt.where(Meeting.scheduled_at >= since)
        meetings_stmt = meetings_stmt.group_by(Meeting.masul_id)
        meetings_by_masul = {
            r.masul_id: int(r.cnt)
            for r in (await self._session.execute(meetings_stmt)).all()
        }

        attended_stmt = (
            select(Meeting.masul_id, func.count().label("cnt"))
            .where(
                Meeting.deleted_at.is_(None),
                Meeting.attendance_status == MeetingAttendance.ATTENDED,
                Meeting.masul_id.in_(masul_ids),
            )
        )
        if since:
            attended_stmt = attended_stmt.where(Meeting.scheduled_at >= since)
        attended_stmt = attended_stmt.group_by(Meeting.masul_id)
        attended_by_masul = {
            r.masul_id: int(r.cnt)
            for r in (await self._session.execute(attended_stmt)).all()
        }

        rows_data = []
        for masul in masullar:
            youth_cnt = youth_by_masul.get(masul.id, 0)
            plan_cnt = plans_by_masul.get(masul.id, 0)
            completed_cnt = completed_by_masul.get(masul.id, 0)
            meeting_cnt = meetings_by_masul.get(masul.id, 0)
            attended_cnt = attended_by_masul.get(masul.id, 0)

            bajarilish = round(completed_cnt / plan_cnt * 100, 1) if plan_cnt else 0.0
            plan_pct = completed_cnt / plan_cnt if plan_cnt else 0.0
            meet_pct = attended_cnt / meeting_cnt if meeting_cnt else 0.0
            formula_ball = round(plan_pct * 60 + meet_pct * 40, 1)

            rows_data.append({
                "id": masul.id,
                "full_name": masul.full_name,
                "district_id": masul.district_id,
                "organization_id": masul.organization_id,
                "total_youth": youth_cnt,
                "total_plans": plan_cnt,
                "total_meetings": meeting_cnt,
                "bajarilish_pct": bajarilish,
                "_plan_pct": plan_pct,
                "_meet_pct": meet_pct,
                "_formula_ball": formula_ball,
            })

        from app.modules.ai.service import AiService
        ai_input = [
            {
                "id": str(r["id"]),
                "name": r["full_name"],
                "plan_pct": round(r["_plan_pct"] * 100, 1),
                "meet_pct": round(r["_meet_pct"] * 100, 1),
                "youth": r["total_youth"],
            }
            for r in rows_data
        ]
        ai_scores = await AiService().score_entities("mas'ul (supervisor)", ai_input)

        results = []
        for r in rows_data:
            ai_result = ai_scores.get(str(r["id"]))
            ai_ball = ai_result[0] if ai_result else r["_formula_ball"]
            ai_comment = ai_result[1] if ai_result else None
            results.append({
                "id": r["id"],
                "full_name": r["full_name"],
                "district_id": r["district_id"],
                "organization_id": r["organization_id"],
                "total_youth": r["total_youth"],
                "total_plans": r["total_plans"],
                "total_meetings": r["total_meetings"],
                "bajarilish_pct": r["bajarilish_pct"],
                "ai_ball": ai_ball,
                "ai_comment": ai_comment,
            })

        results.sort(key=lambda r: (r["ai_ball"], r["total_youth"]), reverse=True)
        for i, row in enumerate(results, 1):
            row["rank"] = i

        return results
