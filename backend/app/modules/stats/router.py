from typing import Literal

from fastapi import APIRouter, Query

from app.core.constants import UserRole
from app.core.deps import CurrentUserDep, DbSession
from app.core.exceptions import ForbiddenError
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
from app.modules.stats.service import StatsService

router = APIRouter(prefix="/api/stats", tags=["stats"])

ALLOWED_ROLES = frozenset({UserRole.ADMIN, UserRole.DIREKTOR, UserRole.MODERATOR})
ALLOWED_WITH_OWN_DISTRICT = ALLOWED_ROLES | {UserRole.TASHKILOT_DIREKTORI}


def _check_agency_access(user: CurrentUserDep) -> None:
    if user.role not in ALLOWED_ROLES:
        raise ForbiddenError("role_not_allowed")


@router.get("/agency", response_model=AgencyStats)
async def agency_stats(session: DbSession, user: CurrentUserDep) -> AgencyStats:
    _check_agency_access(user)
    return await StatsService(session).agency_stats()


@router.get("/districts", response_model=list[DistrictStatsRow])
async def district_stats(
    session: DbSession,
    user: CurrentUserDep,
    district_ids: str | None = Query(None, description="Comma-separated district names"),
) -> list[DistrictStatsRow]:
    if user.role not in ALLOWED_WITH_OWN_DISTRICT:
        raise ForbiddenError("role_not_allowed")

    ids: list[str] | None = None
    if user.role == UserRole.TASHKILOT_DIREKTORI:
        ids = [user.district_id] if user.district_id else []
    elif district_ids:
        ids = [d.strip() for d in district_ids.split(",") if d.strip()]

    return await StatsService(session).district_stats(district_ids=ids)


@router.get("/compare", response_model=list[CompareResult])
async def compare_districts(
    session: DbSession,
    user: CurrentUserDep,
    a: str = Query(..., description="First district"),
    b: str = Query(..., description="Second district"),
) -> list[CompareResult]:
    _check_agency_access(user)
    return await StatsService(session).compare(a, b)


@router.get("/trends", response_model=list[TrendPoint])
async def trends(
    session: DbSession,
    user: CurrentUserDep,
    metric: Literal["youth", "plans", "meetings"] = Query(...),
    granularity: Literal["day", "week", "month", "year"] = Query("month"),
) -> list[TrendPoint]:
    _check_agency_access(user)
    return await StatsService(session).trends(metric, granularity)


@router.get("/categories", response_model=list[CategoryStat])
async def stats_by_category(session: DbSession, user: CurrentUserDep) -> list[CategoryStat]:
    _check_agency_access(user)
    return await StatsService(session).by_category()


@router.get("/top-yoshlar", response_model=list[TopYoshRow])
async def top_yoshlar(
    session: DbSession,
    user: CurrentUserDep,
    limit: int = Query(10, ge=1, le=100),
) -> list[TopYoshRow]:
    _check_agency_access(user)
    return await StatsService(session).top_yoshlar(limit)


@router.get("/recent-activity", response_model=list[RecentActivityRow])
async def recent_activity(
    session: DbSession,
    user: CurrentUserDep,
    limit: int = Query(20, ge=1, le=100),
) -> list[RecentActivityRow]:
    _check_agency_access(user)
    return await StatsService(session).recent_activity(limit)


@router.get("/ai-insights", response_model=list[AiInsight])
async def ai_insights(session: DbSession, user: CurrentUserDep) -> list[AiInsight]:
    _check_agency_access(user)
    return await StatsService(session).ai_insights()
