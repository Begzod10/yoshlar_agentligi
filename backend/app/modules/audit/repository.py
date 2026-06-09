from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.audit.models import AuditLog
from app.utils.pagination import PageParams


class AuditRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def add(self, entry: AuditLog) -> AuditLog:
        self._session.add(entry)
        await self._session.flush()
        return entry

    async def list(
        self,
        *,
        actor: UUID | None = None,
        action: str | None = None,
        entity_type: str | None = None,
        from_: datetime | None = None,
        to: datetime | None = None,
        params: PageParams,
    ) -> tuple[list[AuditLog], int]:
        base = select(AuditLog)
        if actor is not None:
            base = base.where(AuditLog.user_id == actor)
        if action is not None:
            base = base.where(AuditLog.action == action)
        if entity_type is not None:
            base = base.where(AuditLog.entity_type == entity_type)
        if from_ is not None:
            base = base.where(AuditLog.created_at >= from_)
        if to is not None:
            base = base.where(AuditLog.created_at <= to)

        total = (
            await self._session.execute(
                select(func.count()).select_from(base.subquery())
            )
        ).scalar_one()
        items = (
            (
                await self._session.execute(
                    base.order_by(AuditLog.created_at.desc())
                    .offset(params.offset)
                    .limit(params.limit)
                )
            )
            .scalars()
            .all()
        )
        return list(items), int(total)
