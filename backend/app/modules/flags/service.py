from datetime import UTC, datetime
from uuid import UUID

from app.core.constants import FlagStatus, UserRole
from app.core.deps import CurrentUser
from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.modules.flags.models import Flag
from app.modules.flags.repository import FlagsRepository
from app.modules.flags.schemas import FlagCreate, FlagListParams, FlagRead, FlagUpdate

ALLOWED_WRITERS = frozenset({UserRole.ADMIN, UserRole.DIREKTOR, UserRole.MODERATOR})


class FlagsService:
    def __init__(self, repo: FlagsRepository) -> None:
        self._repo = repo

    async def create_flag(self, data: FlagCreate, user: CurrentUser) -> FlagRead:
        if user.role not in ALLOWED_WRITERS:
            raise ForbiddenError("role_not_allowed")

        flag = Flag(
            raised_by=user.id,
            role=user.role.value,
            entity_type=data.entity_type,
            entity_id=data.entity_id,
            category=data.category,
            comment=data.comment,
        )
        await self._repo.add(flag)
        return FlagRead.model_validate(flag)

    async def list_flags(self, params: FlagListParams, user: CurrentUser) -> dict:
        if user.role not in ALLOWED_WRITERS:
            raise ForbiddenError("role_not_allowed")

        offset = (params.page - 1) * params.limit
        flags, total = await self._repo.list(
            status=params.status,
            entity_type=params.entity_type,
            raised_by=params.raised_by,
            offset=offset,
            limit=params.limit,
        )
        return {
            "data": [FlagRead.model_validate(f) for f in flags],
            "meta": {"total": total, "page": params.page, "limit": params.limit},
        }

    async def update_flag(self, flag_id: UUID, data: FlagUpdate, user: CurrentUser) -> FlagRead:
        flag = await self._repo.get_by_id(flag_id)
        if flag is None:
            raise NotFoundError("flag_not_found")

        can_resolve = (
            user.role in {UserRole.ADMIN, UserRole.DIREKTOR}
            or flag.raised_by == user.id
        )
        if not can_resolve:
            raise ForbiddenError("not_flag_owner_or_admin")

        if flag.status != FlagStatus.OPEN:
            raise ValidationError("flag_already_resolved")

        flag.status = data.status
        flag.resolution = data.resolution
        flag.resolved_by = user.id
        flag.resolved_at = datetime.now(tz=UTC)
        return FlagRead.model_validate(flag)

    async def get_flag(self, flag_id: UUID, user: CurrentUser) -> FlagRead:
        if user.role not in ALLOWED_WRITERS:
            raise ForbiddenError("role_not_allowed")

        flag = await self._repo.get_by_id(flag_id)
        if flag is None:
            raise NotFoundError("flag_not_found")
        return FlagRead.model_validate(flag)
