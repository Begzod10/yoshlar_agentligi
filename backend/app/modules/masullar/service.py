from datetime import UTC, datetime
from uuid import UUID

from app.core.constants import CROSS_DISTRICT_ROLES, UserRole
from app.core.deps import CurrentUser
from app.core.exceptions import DistrictMismatchError, ForbiddenError, NotFoundError
from app.modules.masullar.models import Masul
from app.modules.masullar.repository import MasullarRepository
from app.modules.masullar.schemas import MasulCreate, MasulUpdate


class MasullarService:
    def __init__(self, repo: MasullarRepository) -> None:
        self._repo = repo

    @staticmethod
    def _enforce_district(actor: CurrentUser, target_district: str) -> None:
        if actor.role in CROSS_DISTRICT_ROLES:
            return
        if actor.role != UserRole.TASHKILOT_DIREKTORI:
            raise ForbiddenError("role_not_allowed")
        if actor.district_id != target_district:
            raise DistrictMismatchError()

    async def create(self, actor: CurrentUser, payload: MasulCreate) -> Masul:
        district = payload.district_id
        if actor.role == UserRole.TASHKILOT_DIREKTORI:
            district = actor.district_id or district
        self._enforce_district(actor, district)
        masul = Masul(
            full_name=payload.full_name,
            district_id=district,
            organization_id=payload.organization_id,
            phone=payload.phone,
            position=payload.position,
        )
        return await self._repo.add(masul)

    async def get(self, actor: CurrentUser, masul_id: UUID) -> Masul:
        masul = await self._repo.get_by_id(masul_id)
        if masul is None:
            raise NotFoundError("masul_not_found")
        self._enforce_district(actor, masul.district_id)
        return masul

    async def update(
        self, actor: CurrentUser, masul_id: UUID, payload: MasulUpdate
    ) -> Masul:
        masul = await self.get(actor, masul_id)
        for key, value in payload.model_dump(exclude_unset=True, by_alias=False).items():
            setattr(masul, key, value)
        return masul

    async def soft_delete(self, actor: CurrentUser, masul_id: UUID) -> None:
        masul = await self.get(actor, masul_id)
        masul.deleted_at = datetime.now(tz=UTC)
