import csv
import io
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UserRole
from app.core.deps import CurrentUserDep, DbSession
from app.core.exceptions import ForbiddenError
from app.modules.audit.models import AuditLog
from app.modules.youth.models import Youth

router = APIRouter(prefix="/api/reports", tags=["reports"])

ALLOWED_ROLES = frozenset({UserRole.ADMIN, UserRole.DIREKTOR, UserRole.MODERATOR})


def _anonymize_name(name: str) -> str:
    parts = name.split()
    if not parts:
        return "***"
    return " ".join(p[0] + "." for p in parts)


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
    include_pii: bool = Query(False),
    district_id: str | None = None,
) -> StreamingResponse:
    if user.role not in ALLOWED_ROLES:
        raise ForbiddenError("role_not_allowed")

    if include_pii:
        if not await _has_recent_pii_reveal(session, user.id):
            raise ForbiddenError("pii_reveal_required")

    stmt = select(Youth)
    if district_id:
        stmt = stmt.where(Youth.district_id == district_id)
    stmt = stmt.order_by(Youth.district_id, Youth.full_name)
    result = await session.execute(stmt)
    rows = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Ism", "Tuman", "Status", "Kategoriya", "Yaratilgan"])

    for y in rows:
        name = y.full_name if include_pii else _anonymize_name(y.full_name)
        writer.writerow([
            str(y.id),
            name,
            y.district_id,
            y.status,
            y.category or "",
            y.created_at.isoformat() if y.created_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=agency_report.csv"},
    )
