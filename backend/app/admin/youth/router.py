"""Admin youth overrides — admin.md §3.4.

Cross-district mutations that the regular `/api/youth/*` rejects. Every
call here should produce an audit_log entry tagged with override=true.
"""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Query

from app.core.audit_context import AuditDep
from app.core.base_schema import CamelModel, schema_example
from app.core.constants import YouthStatus
from app.core.deps import DbSession
from app.core.exceptions import NotFoundError, ValidationError
from app.middleware.rbac import RequireAdmin
from app.modules.masullar.repository import MasullarRepository
from app.modules.youth.repository import YouthRepository
from app.modules.youth.schemas import YouthRead

router = APIRouter(prefix="/youth", tags=["admin/youth"])


class ForceAssignMasul(CamelModel):
    model_config = schema_example(
        {
            "masulId": "eb33f00f-cfd4-4800-a4a2-260f0a26eefb",
            "overrideDistrict": True,
        }
    )
    masul_id: UUID
    override_district: bool = False


class ForceStatus(CamelModel):
    model_config = schema_example({"status": "removed"})
    status: YouthStatus


@router.post("/{youth_id}/force-assign-masul", response_model=YouthRead)
async def force_assign_masul(
    youth_id: UUID,
    payload: ForceAssignMasul,
    _: RequireAdmin,
    session: DbSession,
    audit: AuditDep,
) -> YouthRead:
    youth_repo = YouthRepository(session)
    masul_repo = MasullarRepository(session)
    youth = await youth_repo.get_by_id(youth_id)
    if youth is None:
        raise NotFoundError("youth_not_found")
    masul = await masul_repo.get_by_id(payload.masul_id)
    if masul is None:
        raise ValidationError("masul_not_found")
    if (
        masul.district_id != youth.district_id
        and not payload.override_district
    ):
        raise ValidationError("masul_district_mismatch_pass_override")
    youth.masul_id = masul.id
    await audit.record(
        "youth.force_assign_masul", "youth", youth_id,
        after={
            "masul_id": str(payload.masul_id),
            "override_district": payload.override_district,
        },
    )
    await session.commit()
    return YouthRead.model_validate(youth)


@router.post("/{youth_id}/force-status", response_model=YouthRead)
async def force_status(
    youth_id: UUID,
    payload: ForceStatus,
    _: RequireAdmin,
    session: DbSession,
    audit: AuditDep,
) -> YouthRead:
    youth = await YouthRepository(session).get_by_id(youth_id)
    if youth is None:
        raise NotFoundError("youth_not_found")
    youth.status = payload.status
    # Clear any pending removal proposal if we're directly transitioning.
    youth.removal_proposal = None
    await audit.record(
        "youth.force_status", "youth", youth_id,
        after={"status": payload.status.value},
    )
    await session.commit()
    return YouthRead.model_validate(youth)


@router.post("/{youth_id}/restore", response_model=YouthRead)
async def restore_youth(
    youth_id: UUID,
    _: RequireAdmin,
    session: DbSession,
    audit: AuditDep,
) -> YouthRead:
    youth = await YouthRepository(session).get_by_id(youth_id)
    if youth is None:
        raise NotFoundError("youth_not_found")
    youth.deleted_at = None
    youth.status = YouthStatus.ACTIVE
    await audit.record("youth.restore", "youth", youth_id)
    await session.commit()
    return YouthRead.model_validate(youth)
