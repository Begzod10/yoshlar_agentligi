from datetime import UTC, datetime
from uuid import UUID

from app.core.constants import CROSS_DISTRICT_ROLES, UserRole, YouthStatus
from app.core.deps import CurrentUser
from app.core.exceptions import (
    DistrictMismatchError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
    YouthNotAssignedError,
)
from app.modules.masullar.repository import MasullarRepository
from app.modules.youth.models import Youth
from app.modules.youth.repository import YouthRepository
from app.modules.youth.schemas import (
    YouthCreate,
    YouthUpdate,
    YouthUpdateByMasul,
)


class YouthService:
    def __init__(
        self, repo: YouthRepository, masullar: MasullarRepository | None = None
    ) -> None:
        self._repo = repo
        self._masullar = masullar

    @staticmethod
    def _assert_visible(actor: CurrentUser, youth: Youth) -> None:
        if actor.role in CROSS_DISTRICT_ROLES:
            return
        if actor.role == UserRole.TASHKILOT_DIREKTORI:
            if actor.district_id != youth.district_id:
                raise DistrictMismatchError()
            return
        if actor.role == UserRole.MASUL_HODIM:
            if youth.masul_id != actor.masul_id:
                raise YouthNotAssignedError()
            return
        raise ForbiddenError("role_not_allowed")

    async def create(self, actor: CurrentUser, payload: YouthCreate) -> Youth:
        if actor.role == UserRole.MASUL_HODIM:
            raise ForbiddenError("masul_hodim_cannot_create_youth")

        district = payload.district_id
        if actor.role == UserRole.TASHKILOT_DIREKTORI:
            district = actor.district_id or district

        if (
            actor.role == UserRole.TASHKILOT_DIREKTORI
            and district != actor.district_id
        ):
            raise DistrictMismatchError()

        if payload.masul_id is not None and self._masullar is not None:
            await self._validate_masul_assignment(payload.masul_id, district)

        youth = Youth(
            full_name=payload.full_name,
            district_id=district,
            masul_id=payload.masul_id,
            organization_id=payload.organization_id,
            status=YouthStatus.ACTIVE,
            contact=payload.contact,
            date_of_birth=payload.date_of_birth,
            address=payload.address,
            notes=payload.notes,
        )
        return await self._repo.add(youth)

    async def get(self, actor: CurrentUser, youth_id: UUID) -> Youth:
        youth = await self._repo.get_by_id(youth_id)
        if youth is None:
            raise NotFoundError("youth_not_found")
        self._assert_visible(actor, youth)
        return youth

    async def update(
        self,
        actor: CurrentUser,
        youth_id: UUID,
        payload: YouthUpdate | YouthUpdateByMasul,
    ) -> Youth:
        youth = await self.get(actor, youth_id)
        data = payload.model_dump(exclude_unset=True, by_alias=False)
        if (
            "masul_id" in data
            and data["masul_id"] is not None
            and self._masullar is not None
        ):
            await self._validate_masul_assignment(data["masul_id"], youth.district_id)
        for key, value in data.items():
            setattr(youth, key, value)
        return youth

    async def set_status(
        self, actor: CurrentUser, youth_id: UUID, status: YouthStatus
    ) -> Youth:
        if actor.role not in (UserRole.ADMIN, UserRole.DIREKTOR):
            raise ForbiddenError("role_not_allowed")
        youth = await self.get(actor, youth_id)
        youth.status = status
        return youth

    async def assign_masul(
        self, actor: CurrentUser, youth_id: UUID, masul_id: UUID
    ) -> Youth:
        youth = await self.get(actor, youth_id)
        if actor.role == UserRole.MASUL_HODIM:
            raise ForbiddenError("role_not_allowed")
        if self._masullar is not None:
            await self._validate_masul_assignment(masul_id, youth.district_id)
        youth.masul_id = masul_id
        return youth

    async def soft_delete(self, actor: CurrentUser, youth_id: UUID) -> None:
        if actor.role not in (UserRole.ADMIN, UserRole.DIREKTOR):
            raise ForbiddenError("role_not_allowed")
        youth = await self.get(actor, youth_id)
        youth.deleted_at = datetime.now(tz=UTC)

    async def _validate_masul_assignment(
        self, masul_id: UUID, youth_district: str
    ) -> None:
        assert self._masullar is not None
        masul = await self._masullar.get_by_id(masul_id)
        if masul is None:
            raise ValidationError("masul_not_found")
        if masul.district_id != youth_district:
            raise ValidationError("masul_district_mismatch")
