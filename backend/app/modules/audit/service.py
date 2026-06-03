from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UserRole
from app.core.deps import CurrentUser
from app.modules.audit.models import AuditLog
from app.modules.audit.repository import AuditRepository


class AuditService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = AuditRepository(session)

    async def record(
        self,
        actor: CurrentUser,
        *,
        action: str,
        entity_type: str,
        entity_id: UUID | None = None,
        before: dict[str, Any] | None = None,
        after: dict[str, Any] | None = None,
        request_id: str | None = None,
        ip: str | None = None,
        user_agent: str | None = None,
    ) -> AuditLog:
        role_str = (
            actor.role.value if isinstance(actor.role, UserRole) else str(actor.role)
        )
        entry = AuditLog(
            user_id=actor.id,
            role=role_str,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before=before,
            after=after,
            request_id=request_id,
            ip=ip,
            user_agent=user_agent,
        )
        return await self._repo.add(entry)
