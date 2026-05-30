from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.modules.audit.models import AuditLog


async def record_audit(
    session: AsyncSession,
    *,
    user: CurrentUser,
    action: str,
    entity_type: str,
    entity_id: UUID | None = None,
    before: dict | None = None,
    after: dict | None = None,
    request_id: str | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        user_id=user.id,
        role=user.role.value,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before=before,
        after=after,
        request_id=request_id,
        ip=ip,
        user_agent=user_agent,
    )
    session.add(entry)
    await session.flush()
    return entry


async def list_audit_logs(
    session: AsyncSession,
    *,
    actor: UUID | None = None,
    action: str | None = None,
    entity_type: str | None = None,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[AuditLog], int]:
    base = select(AuditLog)
    count_base = select(func.count(AuditLog.id))

    if actor is not None:
        base = base.where(AuditLog.user_id == actor)
        count_base = count_base.where(AuditLog.user_id == actor)
    if action is not None:
        base = base.where(AuditLog.action == action)
        count_base = count_base.where(AuditLog.action == action)
    if entity_type is not None:
        base = base.where(AuditLog.entity_type == entity_type)
        count_base = count_base.where(AuditLog.entity_type == entity_type)

    total = (await session.execute(count_base)).scalar_one()
    stmt = base.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    rows = (await session.execute(stmt)).scalars().all()
    return list(rows), total
