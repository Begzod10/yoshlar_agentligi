from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.audit_context import AuditDep
from app.core.constants import UserRole
from app.core.deps import CurrentUser, DbSession
from app.middleware.rbac import require_role
from app.modules.removals.schemas import (
    PendingRemovalRead,
    ProposeRemoval,
    RejectRemoval,
)
from app.modules.removals.service import RemovalsService
from app.modules.youth.repository import YouthRepository
from app.modules.youth.schemas import YouthRead

router = APIRouter(tags=["removals"])

AdminOrDirektor = Annotated[
    CurrentUser, Depends(require_role(UserRole.ADMIN, UserRole.DIREKTOR))
]
TashkilotDirektori = Annotated[
    CurrentUser, Depends(require_role(UserRole.TASHKILOT_DIREKTORI))
]


def _service(session: DbSession) -> RemovalsService:
    return RemovalsService(session, YouthRepository(session))


@router.post("/api/youth/{youth_id}/propose-removal", response_model=YouthRead)
async def propose_removal(
    youth_id: UUID,
    payload: ProposeRemoval,
    current: TashkilotDirektori,
    session: DbSession,
    audit: AuditDep,
) -> YouthRead:
    youth = await _service(session).propose(current, youth_id, payload.reason)
    await audit.record(
        "youth.propose_removal", "youth", youth_id,
        after={"reason": payload.reason},
    )
    await session.commit()
    return YouthRead.model_validate(youth)


@router.post("/api/youth/{youth_id}/approve-removal", response_model=YouthRead)
async def approve_removal(
    youth_id: UUID,
    current: AdminOrDirektor,
    session: DbSession,
    audit: AuditDep,
) -> YouthRead:
    youth = await _service(session).approve(current, youth_id)
    await audit.record("youth.approve_removal", "youth", youth_id)
    await session.commit()
    return YouthRead.model_validate(youth)


@router.post("/api/youth/{youth_id}/reject-removal", response_model=YouthRead)
async def reject_removal(
    youth_id: UUID,
    payload: RejectRemoval,
    current: AdminOrDirektor,
    session: DbSession,
    audit: AuditDep,
) -> YouthRead:
    youth = await _service(session).reject(current, youth_id, payload.comment)
    await audit.record(
        "youth.reject_removal", "youth", youth_id,
        after={"comment": payload.comment},
    )
    await session.commit()
    return YouthRead.model_validate(youth)


@router.get("/api/removals", response_model=list[PendingRemovalRead])
async def list_pending_removals(
    _: AdminOrDirektor, session: DbSession
) -> list[PendingRemovalRead]:
    youths = await _service(session).list_pending()
    return [
        PendingRemovalRead(
            youth_id=y.id,
            full_name=y.full_name,
            district_id=y.district_id,
            proposal=y.removal_proposal or {},
        )
        for y in youths
    ]
