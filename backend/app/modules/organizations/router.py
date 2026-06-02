from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.core.audit_context import AuditDep
from app.core.constants import UserRole
from app.core.deps import CurrentUser, CurrentUserDep, DbSession
from app.core.exceptions import ForbiddenError
from app.middleware.rbac import require_role
from app.modules.organizations.repository import OrganizationsRepository
from app.modules.organizations.schemas import (
    OrganizationCreate,
    OrganizationRead,
    OrganizationUpdate,
)
from app.modules.organizations.service import OrganizationsService
from app.utils.pagination import Page, PageParams

router = APIRouter(prefix="/api/organizations", tags=["organizations"])

_READERS = (UserRole.ADMIN, UserRole.DIREKTOR, UserRole.MODERATOR)
_WRITERS = (UserRole.ADMIN, UserRole.DIREKTOR)

ReadAccess = Annotated[CurrentUser, Depends(require_role(*_READERS))]
WriteAccess = Annotated[CurrentUser, Depends(require_role(*_WRITERS))]


def _service(session: DbSession) -> OrganizationsService:
    return OrganizationsService(OrganizationsRepository(session))


@router.get("", response_model=Page[OrganizationRead])
async def list_organizations(
    current: ReadAccess,
    session: DbSession,
    district_id: str | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1, max_length=255),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=200),
) -> Page[OrganizationRead]:
    params = PageParams(page=page, limit=limit)
    items, total = await OrganizationsRepository(session).list(
        district_id=district_id, search=search, params=params
    )
    return Page.build(
        items=[OrganizationRead.model_validate(o) for o in items],
        total=total,
        params=params,
    )


@router.post("", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
async def create_organization(
    payload: OrganizationCreate, _: WriteAccess, session: DbSession, audit: AuditDep
) -> OrganizationRead:
    org = await _service(session).create(payload)
    after = OrganizationRead.model_validate(org).model_dump(mode="json")
    await audit.record("organization.create", "organization", org.id, after=after)
    await session.commit()
    return OrganizationRead.model_validate(org)


@router.get("/{org_id}", response_model=OrganizationRead)
async def get_organization(
    org_id: UUID, _: ReadAccess, session: DbSession
) -> OrganizationRead:
    org = await _service(session).get(org_id)
    return OrganizationRead.model_validate(org)


@router.patch("/{org_id}", response_model=OrganizationRead)
async def update_organization(
    org_id: UUID,
    payload: OrganizationUpdate,
    _: WriteAccess,
    session: DbSession,
    audit: AuditDep,
) -> OrganizationRead:
    org = await _service(session).update(org_id, payload)
    await audit.record(
        "organization.update", "organization", org_id,
        before=payload.model_dump(exclude_unset=True, mode="json"),
        after=OrganizationRead.model_validate(org).model_dump(mode="json"),
    )
    await session.commit()
    return OrganizationRead.model_validate(org)


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    org_id: UUID,
    _: WriteAccess,
    session: DbSession,
    audit: AuditDep,
    confirm: bool = Query(default=False),
) -> None:
    if not confirm:
        raise ForbiddenError("confirm_required")
    await _service(session).soft_delete(org_id)
    await audit.record("organization.delete", "organization", org_id)
    await session.commit()
