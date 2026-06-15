from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.core.audit_context import AuditDep
from app.core.constants import UserRole
from app.core.deps import CurrentUser, DbSession
from app.middleware.rbac import require_role
from app.modules.masullar.repository import MasullarRepository
from app.modules.youth.repository import YouthRepository
from app.modules.youth.schemas import (
    YouthAssignMasul,
    YouthCreate,
    YouthRead,
    YouthStatusUpdate,
    YouthUpdate,
    YouthUpdateByMasul,
)
from app.modules.youth.service import YouthService
from app.utils.pagination import Page, PageParams

router = APIRouter(prefix="/api/youth", tags=["youth"])

_ROLES = (
    UserRole.ADMIN,
    UserRole.DIREKTOR,
    UserRole.TASHKILOT_DIREKTORI,
    UserRole.MASUL_HODIM,
    UserRole.MODERATOR,
)
_WRITE_ROLES = (
    UserRole.ADMIN,
    UserRole.DIREKTOR,
    UserRole.TASHKILOT_DIREKTORI,
    UserRole.MASUL_HODIM,
)
Access = Annotated[CurrentUser, Depends(require_role(*_ROLES))]
WriteAccess = Annotated[CurrentUser, Depends(require_role(*_WRITE_ROLES))]


def _service(session: DbSession) -> YouthService:
    return YouthService(YouthRepository(session), MasullarRepository(session))


@router.get("", response_model=Page[YouthRead])
async def list_youth(
    current: Access,
    session: DbSession,
    district_id: str | None = Query(default=None),
    masul_id: UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1, max_length=255),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=1000),
) -> Page[YouthRead]:
    params = PageParams(page=page, limit=limit)
    items, total = await YouthRepository(session).list_for_scope(
        current,
        district_id=district_id,
        masul_id=masul_id,
        status=status,
        search=search,
        params=params,
    )
    return Page.build(
        items=[YouthRead.model_validate(y) for y in items], total=total, params=params
    )


@router.post("", response_model=YouthRead, status_code=status.HTTP_201_CREATED)
async def create_youth(
    payload: YouthCreate, current: WriteAccess, session: DbSession, audit: AuditDep
) -> YouthRead:
    youth = await _service(session).create(current, payload)
    youth_id = youth.id
    await session.commit()
    youth = await YouthRepository(session).get_by_id(youth_id)
    await audit.record("youth.create", "youth", youth_id, after=YouthRead.model_validate(youth).model_dump(mode="json"))
    await session.commit()
    return YouthRead.model_validate(youth)


@router.get("/{youth_id}", response_model=YouthRead)
async def get_youth(
    youth_id: UUID, current: Access, session: DbSession
) -> YouthRead:
    youth = await _service(session).get(current, youth_id)
    return YouthRead.model_validate(youth)


@router.patch("/{youth_id}", response_model=YouthRead)
async def update_youth(
    youth_id: UUID,
    payload: YouthUpdate,
    current: WriteAccess,
    session: DbSession,
    audit: AuditDep,
) -> YouthRead:
    # masul_hodim is restricted to YouthUpdateByMasul (only contact + notes)
    effective: YouthUpdate | YouthUpdateByMasul = payload
    if current.role == UserRole.MASUL_HODIM:
        effective = YouthUpdateByMasul(
            **payload.model_dump(include={"contact", "notes"}, exclude_unset=True)
        )
    await _service(session).update(current, youth_id, effective)
    await session.commit()
    youth = await YouthRepository(session).get_by_id(youth_id)
    await audit.record(
        "youth.update", "youth", youth_id,
        before=effective.model_dump(exclude_unset=True, mode="json"),
        after=YouthRead.model_validate(youth).model_dump(mode="json"),
    )
    await session.commit()
    return YouthRead.model_validate(youth)


@router.post("/{youth_id}/assign-masul", response_model=YouthRead)
async def assign_masul(
    youth_id: UUID,
    payload: YouthAssignMasul,
    current: WriteAccess,
    session: DbSession,
    audit: AuditDep,
) -> YouthRead:
    await _service(session).assign_masul(current, youth_id, payload.masul_id)
    await session.commit()
    youth = await YouthRepository(session).get_by_id(youth_id)
    await audit.record("youth.assign_masul", "youth", youth_id, after={"masul_id": str(payload.masul_id)})
    await session.commit()
    return YouthRead.model_validate(youth)


@router.post("/{youth_id}/status", response_model=YouthRead)
async def set_youth_status(
    youth_id: UUID,
    payload: YouthStatusUpdate,
    current: WriteAccess,
    session: DbSession,
    audit: AuditDep,
) -> YouthRead:
    await _service(session).set_status(current, youth_id, payload.status)
    await session.commit()
    youth = await YouthRepository(session).get_by_id(youth_id)
    await audit.record("youth.set_status", "youth", youth_id, after={"status": payload.status.value})
    await session.commit()
    return YouthRead.model_validate(youth)


@router.delete("/{youth_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_youth(
    youth_id: UUID, current: WriteAccess, session: DbSession, audit: AuditDep
) -> None:
    await _service(session).soft_delete(current, youth_id)
    await audit.record("youth.delete", "youth", youth_id)
    await session.commit()
