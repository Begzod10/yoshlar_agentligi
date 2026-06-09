from datetime import UTC, datetime
from uuid import UUID

from app.core.constants import CROSS_DISTRICT_ROLES, UserRole
from app.core.deps import CurrentUser
from app.core.exceptions import ConflictError, DistrictMismatchError, ForbiddenError, NotFoundError
from app.core.security import hash_password
from app.modules.masullar.models import Masul
from app.modules.masullar.repository import MasullarRepository
from app.modules.masullar.schemas import MasulCreate, MasulPasswordReset, MasulUpdate
from app.modules.users.models import User


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

        if payload.email:
            from sqlalchemy import select
            existing = (await self._repo._session.execute(
                select(User).where(User.email == payload.email)
            )).scalar_one_or_none()
            if existing:
                raise ConflictError("email_already_taken")

        masul = Masul(
            full_name=payload.full_name,
            district_id=district,
            organization_id=payload.organization_id,
            phone=payload.phone,
            email=payload.email,
            position=payload.position,
        )
        self._repo._session.add(masul)
        await self._repo._session.flush()

        user = User(
            email=payload.email,
            password_hash=hash_password(payload.password),
            full_name=payload.full_name,
            role=UserRole.MASUL_HODIM,
            district_id=district,
            phone=payload.phone,
            masul_id=masul.id,
        )
        self._repo._session.add(user)
        await self._repo._session.flush()

        return masul

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

    async def reset_password(
        self, actor: CurrentUser, masul_id: UUID, payload: MasulPasswordReset
    ) -> None:
        from sqlalchemy import select
        masul = await self.get(actor, masul_id)
        user = (await self._repo._session.execute(
            select(User).where(User.masul_id == masul.id, User.deleted_at.is_(None))
        )).scalar_one_or_none()
        if user is None:
            raise NotFoundError("masul_user_not_found")
        user.password_hash = hash_password(payload.new_password)

    async def soft_delete(self, actor: CurrentUser, masul_id: UUID) -> None:
        from sqlalchemy import select, func
        from app.modules.youth.models import Youth
        masul = await self.get(actor, masul_id)
        linked = (await self._repo._session.execute(
            select(func.count(Youth.id)).where(
                Youth.masul_id == masul_id,
                Youth.deleted_at.is_(None),
            )
        )).scalar_one()
        if linked > 0:
            from app.core.exceptions import ConflictError
            raise ConflictError(f"masul_has_{linked}_active_youth")
        masul.deleted_at = datetime.now(tz=UTC)
