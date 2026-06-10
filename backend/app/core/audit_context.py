"""Per-request audit recorder.

Routes inject `AuditDep` and call `await audit.record(...)` for every
mutation before committing the session. The recorder bundles the actor
identity with the request envelope (IP, user-agent, request_id) so the
audit row is reconstructable from the log.
"""

from typing import Annotated, Any
from uuid import UUID

from fastapi import Depends, Request

from app.core.deps import CurrentUser, CurrentUserDep, DbSession
from app.modules.audit.service import AuditService


class AuditRecorder:
    def __init__(
        self, session: Any, user: CurrentUser, request: Request
    ) -> None:
        self._service = AuditService(session)
        self._user = user
        self._request_id = request.headers.get("X-Request-ID")
        self._ip = request.client.host if request.client else None
        self._user_agent = request.headers.get("User-Agent")

    async def record(
        self,
        action: str,
        entity_type: str,
        entity_id: UUID | None = None,
        *,
        before: dict[str, Any] | None = None,
        after: dict[str, Any] | None = None,
    ) -> None:
        await self._service.record(
            self._user,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before=before,
            after=after,
            request_id=self._request_id,
            ip=self._ip,
            user_agent=self._user_agent,
        )


async def get_audit_recorder(
    request: Request,
    current: CurrentUserDep,
    session: DbSession,
) -> AuditRecorder:
    return AuditRecorder(session, current, request)


AuditDep = Annotated[AuditRecorder, Depends(get_audit_recorder)]
