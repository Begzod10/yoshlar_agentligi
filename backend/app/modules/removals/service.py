from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UserRole, YouthStatus
from app.core.deps import CurrentUser
from app.core.exceptions import (
    AppError,
    DistrictMismatchError,
    ForbiddenError,
    NotFoundError,
)
from app.modules.youth.models import Youth
from app.modules.youth.repository import YouthRepository


class IllegalTransitionError(AppError):
    status_code = 409
    code = "illegal_transition"


class RemovalsService:
    def __init__(self, session: AsyncSession, youth: YouthRepository) -> None:
        self._session = session
        self._youth = youth

    async def propose(
        self, actor: CurrentUser, youth_id: UUID, reason: str
    ) -> Youth:
        if actor.role != UserRole.TASHKILOT_DIREKTORI:
            raise ForbiddenError("only_tashkilot_direktori_can_propose")
        youth = await self._youth.get_by_id(youth_id)
        if youth is None:
            raise NotFoundError("youth_not_found")
        if actor.district_id != youth.district_id:
            raise DistrictMismatchError()
        if youth.status != YouthStatus.ACTIVE:
            raise IllegalTransitionError("youth_not_active")
        if youth.removal_proposal is not None:
            raise IllegalTransitionError("proposal_already_exists")
        youth.removal_proposal = {
            "status": "pending",
            "reason": reason,
            "proposedBy": str(actor.id),
            "proposedAt": datetime.now(tz=UTC).isoformat(),
        }
        return youth

    async def approve(self, actor: CurrentUser, youth_id: UUID) -> Youth:
        if actor.role not in (UserRole.ADMIN, UserRole.DIREKTOR):
            raise ForbiddenError("only_admin_or_direktor_can_approve")
        youth = await self._youth.get_by_id(youth_id)
        if youth is None:
            raise NotFoundError("youth_not_found")
        if youth.removal_proposal is None:
            raise IllegalTransitionError("no_proposal")
        youth.status = YouthStatus.REMOVED
        youth.removal_proposal = None
        return youth

    async def reject(
        self, actor: CurrentUser, youth_id: UUID, comment: str
    ) -> Youth:
        if actor.role not in (UserRole.ADMIN, UserRole.DIREKTOR):
            raise ForbiddenError("only_admin_or_direktor_can_reject")
        youth = await self._youth.get_by_id(youth_id)
        if youth is None:
            raise NotFoundError("youth_not_found")
        if youth.removal_proposal is None:
            raise IllegalTransitionError("no_proposal")
        # We discard the proposal; the rejection comment lives in audit_log.
        youth.removal_proposal = None
        return youth

    async def list_pending(self) -> list[Youth]:
        stmt = (
            select(Youth)
            .where(
                Youth.deleted_at.is_(None),
                Youth.removal_proposal.is_not(None),
            )
            .order_by(Youth.updated_at.desc())
        )
        return list((await self._session.execute(stmt)).scalars().all())
