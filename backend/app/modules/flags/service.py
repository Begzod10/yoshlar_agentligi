from datetime import UTC, datetime
from uuid import UUID

from app.core.deps import CurrentUser
from app.core.exceptions import NotFoundError
from app.modules.flags.models import Flag
from app.modules.flags.repository import FlagsRepository
from app.modules.flags.schemas import FlagCreate, FlagStatus, FlagUpdate


class FlagsService:
    def __init__(self, repo: FlagsRepository) -> None:
        self._repo = repo

    async def create(self, actor: CurrentUser, payload: FlagCreate) -> Flag:
        flag = Flag(
            raised_by=actor.id,
            role=actor.role.value,
            entity_type=payload.entity_type,
            entity_id=payload.entity_id,
            category=payload.category.value,
            comment=payload.comment,
            status=FlagStatus.OPEN.value,
        )
        return await self._repo.add(flag)

    async def get(self, flag_id: UUID) -> Flag:
        flag = await self._repo.get_by_id(flag_id)
        if flag is None:
            raise NotFoundError("flag_not_found")
        return flag

    async def update(
        self, actor: CurrentUser, flag_id: UUID, payload: FlagUpdate
    ) -> Flag:
        flag = await self.get(flag_id)
        flag.status = payload.status.value
        flag.resolution = payload.resolution
        if payload.status in (FlagStatus.RESOLVED, FlagStatus.DISMISSED):
            flag.resolved_by = actor.id
            flag.resolved_at = datetime.now(tz=UTC)
        else:
            flag.resolved_by = None
            flag.resolved_at = None
        return flag
