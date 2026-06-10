"""Admin reports — admin.md §2.3 ("Export any report (CSV/PDF)").

Admin can request PII-enabled exports unconditionally; regular /api/reports
gates `?include_pii=true` on role and PII reveal window.
"""

from datetime import datetime

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.core.deps import DbSession
from app.middleware.rbac import RequireAdmin
from app.modules.reports.service import ReportsService

router = APIRouter(prefix="/reports", tags=["admin/reports"])


@router.get("/agency.csv")
async def agency_csv(
    _: RequireAdmin,
    session: DbSession,
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = Query(default=None),
    include_pii: bool = Query(default=True),
) -> StreamingResponse:
    return StreamingResponse(
        ReportsService(session).agency_youth_csv(
            from_=from_, to=to, include_pii=include_pii
        ),
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="admin-agency-youth.csv"'
        },
    )


@router.get("/district/{district_id}.csv")
async def district_csv(
    district_id: str,
    _: RequireAdmin,
    session: DbSession,
    include_pii: bool = Query(default=True),
) -> StreamingResponse:
    return StreamingResponse(
        ReportsService(session).district_youth_csv(
            district_id, include_pii=include_pii
        ),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="admin-district-{district_id}.csv"'
        },
    )
