from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UserRole
from app.core.deps import CurrentUserDep, DbSession
from app.core.exceptions import ForbiddenError
from app.modules.audit.models import AuditLog
from app.modules.reports.service import ReportsService

router = APIRouter(prefix="/api/reports", tags=["reports"])

ALLOWED_ROLES = frozenset({UserRole.ADMIN, UserRole.DIREKTOR, UserRole.MODERATOR})

_REPORT_TYPES = Literal["youth", "organizations", "masullar", "plans", "meetings"]


async def _has_recent_pii_reveal(session: AsyncSession, user_id: UUID) -> bool:
    cutoff = datetime.now(tz=UTC) - timedelta(minutes=5)
    stmt = (
        select(AuditLog.id)
        .where(
            AuditLog.user_id == user_id,
            AuditLog.action == "pii.reveal",
            AuditLog.created_at >= cutoff,
        )
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none() is not None


@router.get("/agency.csv")
async def agency_csv(
    session: DbSession,
    user: CurrentUserDep,
    report: _REPORT_TYPES = Query("youth"),
    include_pii: bool = Query(False),
    district_id: str | None = Query(None),
) -> StreamingResponse:
    if user.role not in ALLOWED_ROLES:
        raise ForbiddenError("role_not_allowed")

    if include_pii and not await _has_recent_pii_reveal(session, user.id):
        raise ForbiddenError("pii_reveal_required")

    svc = ReportsService(session)
    filename = f"{report}_report.csv"

    if report == "youth":
        stream = svc.agency_youth_csv(include_pii=include_pii)
    elif report == "organizations":
        stream = svc.organizations_csv(district_id=district_id)
    elif report == "masullar":
        stream = svc.masullar_csv(district_id=district_id)
    elif report == "plans":
        stream = svc.plans_csv(district_id=district_id, include_pii=include_pii)
    else:
        stream = svc.meetings_csv(district_id=district_id, include_pii=include_pii)

    return StreamingResponse(
        stream,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
