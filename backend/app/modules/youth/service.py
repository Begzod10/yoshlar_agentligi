from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import CROSS_DISTRICT_ROLES, UserRole, YouthStatus
from app.core.deps import CurrentUser
from app.core.exceptions import (
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.modules.audit.service import record_audit
from app.modules.masullar.repository import MasullarRepository
from app.modules.youth.models import Youth
from app.modules.youth.repository import YouthRepository
from app.modules.youth.schemas import (
    AssignMasulRequest,
    ProposeRemovalRequest,
    RejectRemovalRequest,
    YouthCreate,
    YouthRead,
    YouthUpdate,
    YouthUpdateByMasul,
)

CRUD_ROLES = frozenset({UserRole.ADMIN, UserRole.DIREKTOR, UserRole.TASHKILOT_DIREKTORI})
APPROVE_ROLES = frozenset({UserRole.ADMIN, UserRole.DIREKTOR})


class YouthService:
    def __init__(self, session: AsyncSession, repo: YouthRepository) -> None:
        self._session = session
        self._repo = repo

    # ── helpers ──────────────────────────────────────────────────────

    def _check_scope(self, user: CurrentUser, youth: Youth) -> None:
        if user.role in CROSS_DISTRICT_ROLES:
            return
        if user.role == UserRole.TASHKILOT_DIREKTORI:
            if user.district_id != youth.district_id:
                raise ForbiddenError(code="district_mismatch")
            return
        if user.role == UserRole.MASUL_HODIM:
            if youth.masul_id is None or str(youth.masul_id) != str(user.id):
                raise ForbiddenError(code="youth_not_assigned")
            return
        raise ForbiddenError(code="role_not_allowed")

    async def _flush_refresh(self, youth: Youth) -> YouthRead:
        """flush → DB triggerlar ishlaydi (updated_at), refresh → ob'ekt yangilanadi."""
        await self._session.flush()
        await self._session.refresh(youth)
        return YouthRead.model_validate(youth)

    # ── CRUD ─────────────────────────────────────────────────────────

    async def create(self, data: YouthCreate, user: CurrentUser) -> YouthRead:
        if user.role == UserRole.MASUL_HODIM:
            raise ForbiddenError(code="role_not_allowed")
        if user.role not in CRUD_ROLES:
            raise ForbiddenError(code="role_not_allowed")

        district = data.district_id
        if user.role == UserRole.TASHKILOT_DIREKTORI:
            district = user.district_id or district

        youth = Youth(
            full_name=data.full_name,
            birth_date=data.birth_date,
            district_id=district,
            masul_id=data.masul_id,
            organization_id=data.organization_id,
            category=data.category,
            contact=data.contact,
            notes=data.notes,
        )
        await self._repo.add(youth)
        await record_audit(
            self._session, user=user, action="youth.create",
            entity_type="youth", entity_id=youth.id,
            after={"full_name": youth.full_name, "district_id": youth.district_id},
        )
        return await self._flush_refresh(youth)

    async def get(self, youth_id: UUID, user: CurrentUser) -> YouthRead:
        youth = await self._repo.get_by_id(youth_id)
        if youth is None:
            raise NotFoundError(code="youth_not_found")
        self._check_scope(user, youth)
        return YouthRead.model_validate(youth)

    async def list(
            self, user: CurrentUser, *,
            district_id: str | None = None,
            status: YouthStatus | None = None,
            search: str | None = None,
            page: int = 1, limit: int = 20,
    ) -> dict:
        if user.role == UserRole.MODERATOR:
            raise ForbiddenError(code="role_not_allowed")

        effective_district = district_id
        effective_masul: UUID | None = None

        if user.role == UserRole.TASHKILOT_DIREKTORI:
            effective_district = user.district_id
        elif user.role == UserRole.MASUL_HODIM:
            effective_masul = user.id

        offset = (page - 1) * limit
        rows, total = await self._repo.list(
            district_id=effective_district,
            masul_id=effective_masul,
            status=status,
            search=search,
            offset=offset, limit=limit,
        )
        return {
            "data": [YouthRead.model_validate(y) for y in rows],
            "meta": {"total": total, "page": page, "limit": limit},
        }

    async def update(self, youth_id: UUID, data: YouthUpdate | YouthUpdateByMasul, user: CurrentUser) -> YouthRead:
        youth = await self._repo.get_by_id(youth_id)
        if youth is None:
            raise NotFoundError(code="youth_not_found")
        self._check_scope(user, youth)

        if user.role == UserRole.MASUL_HODIM and not isinstance(data, YouthUpdateByMasul):
            raise ForbiddenError(code="limited_update_fields")

        before = {"full_name": youth.full_name}
        updates = data.model_dump(exclude_unset=True)
        for k, v in updates.items():
            setattr(youth, k, v)

        await record_audit(
            self._session, user=user, action="youth.update",
            entity_type="youth", entity_id=youth.id,
            before=before, after=updates,
        )
        return await self._flush_refresh(youth)

    async def delete(self, youth_id: UUID, user: CurrentUser) -> None:
        if user.role not in CRUD_ROLES:
            raise ForbiddenError(code="role_not_allowed")

        youth = await self._repo.get_by_id(youth_id)
        if youth is None:
            raise NotFoundError(code="youth_not_found")
        self._check_scope(user, youth)

        await record_audit(
            self._session, user=user, action="youth.delete",
            entity_type="youth", entity_id=youth.id,
            before={"full_name": youth.full_name, "district_id": youth.district_id},
        )
        await self._repo.delete(youth)

    # ── assign masul ─────────────────────────────────────────────────

    async def assign_masul(self, youth_id: UUID, data: AssignMasulRequest, user: CurrentUser) -> YouthRead:
        youth = await self._repo.get_by_id(youth_id)
        if youth is None:
            raise NotFoundError(code="youth_not_found")
        self._check_scope(user, youth)

        masul_repo = MasullarRepository(self._session)
        masul = await masul_repo.get_by_id(data.masul_id)
        if masul is None:
            raise NotFoundError(code="masul_not_found")

        if masul.district_id != youth.district_id:
            if data.override and user.role in APPROVE_ROLES:
                await record_audit(
                    self._session, user=user, action="youth.assign.override",
                    entity_type="youth", entity_id=youth.id,
                    after={"masul_id": str(masul.id), "masul_district": masul.district_id,
                           "youth_district": youth.district_id},
                )
            else:
                raise ValidationError(code="district_mismatch_youth_masul")

        youth.masul_id = masul.id
        youth.organization_id = masul.organization_id

        await record_audit(
            self._session, user=user, action="youth.assign_masul",
            entity_type="youth", entity_id=youth.id,
            after={"masul_id": str(masul.id)},
        )
        return await self._flush_refresh(youth)

    # ── status change ────────────────────────────────────────────────

    async def change_status(self, youth_id: UUID, new_status: YouthStatus, user: CurrentUser,
                            reason: str | None = None) -> YouthRead:
        if user.role not in APPROVE_ROLES:
            raise ForbiddenError(code="role_not_allowed")

        youth = await self._repo.get_by_id(youth_id)
        if youth is None:
            raise NotFoundError(code="youth_not_found")

        old_status = youth.status
        youth.status = new_status

        await record_audit(
            self._session, user=user, action=f"youth.status.{new_status.value}",
            entity_type="youth", entity_id=youth.id,
            before={"status": old_status}, after={"status": new_status.value, "reason": reason},
        )
        return await self._flush_refresh(youth)

    # ── removal workflow ─────────────────────────────────────────────

    async def propose_removal(self, youth_id: UUID, data: ProposeRemovalRequest, user: CurrentUser) -> YouthRead:
        if user.role != UserRole.TASHKILOT_DIREKTORI:
            raise ForbiddenError(code="only_tashkilot_direktori")

        youth = await self._repo.get_by_id(youth_id)
        if youth is None:
            raise NotFoundError(code="youth_not_found")
        if user.district_id != youth.district_id:
            raise ForbiddenError(code="district_mismatch")
        if youth.removal_proposal is not None:
            raise ValidationError(code="removal_already_proposed")

        youth.removal_proposal = {
            "proposed_by": str(user.id),
            "reason": data.reason,
            "proposed_at": datetime.now(tz=UTC).isoformat(),
            "status": "pending",
        }

        await record_audit(
            self._session, user=user, action="youth.propose_removal",
            entity_type="youth", entity_id=youth.id,
            after=youth.removal_proposal,
        )
        return await self._flush_refresh(youth)

    async def approve_removal(self, youth_id: UUID, user: CurrentUser) -> YouthRead:
        if user.role not in APPROVE_ROLES:
            raise ForbiddenError(code="role_not_allowed")

        youth = await self._repo.get_by_id(youth_id)
        if youth is None:
            raise NotFoundError(code="youth_not_found")
        if youth.removal_proposal is None or youth.removal_proposal.get("status") != "pending":
            raise ValidationError(code="no_pending_proposal")

        youth.status = YouthStatus.REMOVED
        youth.removal_proposal = {
            **youth.removal_proposal,
            "status": "approved",
            "reviewed_by": str(user.id),
            "reviewed_at": datetime.now(tz=UTC).isoformat(),
        }

        await record_audit(
            self._session, user=user, action="youth.approve_removal",
            entity_type="youth", entity_id=youth.id,
            after={"status": "removed", "proposal": youth.removal_proposal},
        )
        return await self._flush_refresh(youth)

    async def reject_removal(self, youth_id: UUID, data: RejectRemovalRequest, user: CurrentUser) -> YouthRead:
        if user.role not in APPROVE_ROLES:
            raise ForbiddenError(code="role_not_allowed")

        youth = await self._repo.get_by_id(youth_id)
        if youth is None:
            raise NotFoundError(code="youth_not_found")
        if youth.removal_proposal is None or youth.removal_proposal.get("status") != "pending":
            raise ValidationError(code="no_pending_proposal")

        youth.removal_proposal = {
            **youth.removal_proposal,
            "status": "rejected",
            "reviewed_by": str(user.id),
            "reviewed_at": datetime.now(tz=UTC).isoformat(),
            "reviewer_comment": data.comment,
        }

        await record_audit(
            self._session, user=user, action="youth.reject_removal",
            entity_type="youth", entity_id=youth.id,
            after={"proposal": youth.removal_proposal},
        )
        return await self._flush_refresh(youth)

    async def list_pending_removals(self, user: CurrentUser, *, page: int = 1, limit: int = 20) -> dict:
        if user.role not in APPROVE_ROLES:
            raise ForbiddenError(code="role_not_allowed")

        offset = (page - 1) * limit
        rows, total = await self._repo.list_pending_removals(offset=offset, limit=limit)
        return {
            "data": [YouthRead.model_validate(y) for y in rows],
            "meta": {"total": total, "page": page, "limit": limit},
        }