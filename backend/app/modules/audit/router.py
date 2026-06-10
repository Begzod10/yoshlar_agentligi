from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.constants import UserRole
from app.core.deps import CurrentUser, DbSession
from app.middleware.rbac import require_role
from app.modules.audit.repository import AuditRepository
from app.modules.audit.schemas import AuditLogRead
from app.utils.pagination import Page, PageParams

router = APIRouter(prefix="/api", tags=["audit"])

AdminOnly = Annotated[CurrentUser, Depends(require_role(UserRole.ADMIN, UserRole.MODERATOR))]


@router.get("/audit-log", response_model=Page[AuditLogRead])
async def get_audit_log(
    _: AdminOnly,
    session: DbSession,
    actor: UUID | None = Query(default=None),
    action: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
) -> Page[AuditLogRead]:
    params = PageParams(page=page, limit=limit)
    repo = AuditRepository(session)
    items, total = await repo.list(
        actor=actor, action=action, entity_type=entity_type, params=params
    )
    return Page.build(
        items=[AuditLogRead.model_validate(r) for r in items],
        total=total,
        params=params,
    )
