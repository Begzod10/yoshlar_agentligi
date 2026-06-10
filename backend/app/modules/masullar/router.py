from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.core.audit_context import AuditDep
from app.core.constants import UserRole
from app.core.deps import CurrentUser, CurrentUserDep, DbSession
from app.middleware.rbac import require_role
from app.modules.masullar.repository import MasullarRepository
from app.modules.masullar.schemas import MasulCreate, MasulRead, MasulUpdate
from app.modules.masullar.service import MasullarService
from app.utils.pagination import Page, PageParams

router = APIRouter(prefix="/api/masullar", tags=["masullar"])

_WRITE_ROLES = (UserRole.ADMIN, UserRole.DIREKTOR, UserRole.TASHKILOT_DIREKTORI)
Access = Annotated[CurrentUser, Depends(require_role(*_WRITE_ROLES))]


def _service(session: DbSession) -> MasullarService:
    return MasullarService(MasullarRepository(session))


@router.get("", response_model=Page[MasulRead])
async def list_masullar(
    current: CurrentUserDep,
    session: DbSession,
    district_id: str | None = Query(default=None),
    organization_id: UUID | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1, max_length=255),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[MasulRead]:
    # tashkilot_direktori and masul_hodim forced to own district
    if current.role in (UserRole.TASHKILOT_DIREKTORI, UserRole.MASUL_HODIM):
        district_id = current.district_id
    params = PageParams(page=page, limit=limit)
    items, total = await MasullarRepository(session).list(
        district_id=district_id,
        organization_id=organization_id,
        search=search,
        params=params,
    )
    return Page.build(
        items=[MasulRead.model_validate(m) for m in items], total=total, params=params
    )


@router.post("", response_model=MasulRead, status_code=status.HTTP_201_CREATED)
async def create_masul(
    payload: MasulCreate, current: Access, session: DbSession, audit: AuditDep
) -> MasulRead:
    masul = await _service(session).create(current, payload)
    await audit.record(
        "masul.create", "masul", masul.id,
        after=MasulRead.model_validate(masul).model_dump(mode="json"),
    )
    await session.commit()
    return MasulRead.model_validate(masul)


@router.get("/{masul_id}", response_model=MasulRead)
async def get_masul(masul_id: UUID, current: Access, session: DbSession) -> MasulRead:
    masul = await _service(session).get(current, masul_id)
    return MasulRead.model_validate(masul)


@router.patch("/{masul_id}", response_model=MasulRead)
async def update_masul(
    masul_id: UUID,
    payload: MasulUpdate,
    current: Access,
    session: DbSession,
    audit: AuditDep,
) -> MasulRead:
    masul = await _service(session).update(current, masul_id, payload)
    await audit.record(
        "masul.update", "masul", masul_id,
        before=payload.model_dump(exclude_unset=True, mode="json"),
        after=MasulRead.model_validate(masul).model_dump(mode="json"),
    )
    await session.commit()
    return MasulRead.model_validate(masul)


@router.delete("/{masul_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_masul(
    masul_id: UUID, current: Access, session: DbSession, audit: AuditDep
) -> None:
    await _service(session).soft_delete(current, masul_id)
    await audit.record("masul.delete", "masul", masul_id)
    await session.commit()
