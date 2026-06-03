from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.constants import UserRole
from app.core.deps import CurrentUser, DbSession
from app.middleware.rbac import require_role
from app.modules.monitoring.schemas import (
    DistrictRatingRow,
    MasulRatingRow,
    MonitoringOverview,
    OrgRatingRow,
)
from app.modules.monitoring.service import MonitoringService, Period

router = APIRouter(prefix="/api/monitoring", tags=["monitoring"])

_ROLES = (UserRole.ADMIN, UserRole.DIREKTOR, UserRole.MODERATOR)
Access = Annotated[CurrentUser, Depends(require_role(*_ROLES))]


def _svc(session: DbSession) -> MonitoringService:
    return MonitoringService(session)


@router.get("/overview", response_model=MonitoringOverview)
async def overview(
    _: Access,
    session: DbSession,
    period: Period = Query(default="month"),
) -> MonitoringOverview:
    data = await _svc(session).overview(period)
    return MonitoringOverview(**data)


@router.get("/districts", response_model=list[DistrictRatingRow])
async def district_ratings(
    _: Access,
    session: DbSession,
    period: Period = Query(default="month"),
) -> list[DistrictRatingRow]:
    rows = await _svc(session).district_ratings(period)
    return [DistrictRatingRow(**r) for r in rows]


@router.get("/organizations", response_model=list[OrgRatingRow])
async def org_ratings(
    _: Access,
    session: DbSession,
    period: Period = Query(default="month"),
) -> list[OrgRatingRow]:
    rows = await _svc(session).org_ratings(period)
    return [OrgRatingRow(**r) for r in rows]


@router.get("/masullar", response_model=list[MasulRatingRow])
async def masul_ratings(
    _: Access,
    session: DbSession,
    period: Period = Query(default="month"),
) -> list[MasulRatingRow]:
    rows = await _svc(session).masul_ratings(period)
    return [MasulRatingRow(**r) for r in rows]
