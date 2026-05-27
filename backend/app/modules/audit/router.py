from uuid import UUID

from fastapi import APIRouter, Query, Request, status

from app.core.deps import CurrentUserDep, DbSession
from app.core.exceptions import ForbiddenError
from app.core.constants import UserRole
from app.modules.audit.schemas import AuditLogRead, PiiRevealRequest
from app.modules.audit.service import list_audit_logs, record_audit

router = APIRouter(prefix="/api", tags=["audit"])

PII_ALLOWED_ROLES = frozenset({UserRole.ADMIN, UserRole.DIREKTOR, UserRole.MODERATOR})


@router.get("/audit-log")
async def get_audit_log(
    session: DbSession,
    user: CurrentUserDep,
    actor: UUID | None = None,
    action: str | None = None,
    entity_type: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
) -> dict:
    if user.role != UserRole.ADMIN:
        raise ForbiddenError("admin_only")

    offset = (page - 1) * limit
    rows, total = await list_audit_logs(
        session, actor=actor, action=action, entity_type=entity_type,
        offset=offset, limit=limit,
    )
    return {
        "data": [AuditLogRead.model_validate(r) for r in rows],
        "meta": {"total": total, "page": page, "limit": limit},
    }


@router.post("/pii/reveal", status_code=status.HTTP_200_OK)
async def pii_reveal(
    body: PiiRevealRequest,
    session: DbSession,
    user: CurrentUserDep,
    request: Request,
) -> dict[str, str]:
    if user.role not in PII_ALLOWED_ROLES:
        raise ForbiddenError("role_not_allowed")

    await record_audit(
        session,
        user=user,
        action="pii.reveal",
        entity_type=body.entity_type,
        entity_id=body.entity_id,
        after={"reason": body.reason},
        request_id=request.headers.get("X-Request-ID"),
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent"),
    )
    await session.commit()
    return {"status": "revealed"}
