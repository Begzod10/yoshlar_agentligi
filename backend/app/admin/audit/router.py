"""Admin audit log — admin.md §3.3.

Read-only feed of every mutating action across the system.
"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Query

from app.core.deps import DbSession
from app.middleware.rbac import RequireAdmin
from app.modules.audit.repository import AuditRepository
from app.modules.audit.schemas import AuditLogRead
from app.utils.pagination import Page, PageParams

router = APIRouter(prefix="/audit-log", tags=["admin/audit"])


@router.get("", response_model=Page[AuditLogRead])
async def list_audit_log(
    _: RequireAdmin,
    session: DbSession,
    actor: UUID | None = Query(default=None),
    action: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[AuditLogRead]:
    params = PageParams(page=page, limit=limit)
    items, total = await AuditRepository(session).list(
        actor=actor,
        action=action,
        entity_type=entity_type,
        from_=from_,
        to=to,
        params=params,
    )
    return Page.build(
        items=[AuditLogRead.model_validate(a) for a in items],
        total=total,
        params=params,
    )
