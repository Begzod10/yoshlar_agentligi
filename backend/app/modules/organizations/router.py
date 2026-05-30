from uuid import UUID

from fastapi import APIRouter, Query, status

from app.core.constants import UserRole
from app.core.deps import CurrentUserDep, DbSession
from app.core.exceptions import ForbiddenError, NotFoundError
from app.modules.audit.service import record_audit
from app.modules.organizations.models import Organization
from app.modules.organizations.repository import OrganizationsRepository
from app.modules.organizations.schemas import OrganizationCreate, OrganizationRead, OrganizationUpdate

router = APIRouter(prefix="/api/organizations", tags=["organizations"])

ALLOWED_READERS = frozenset({UserRole.ADMIN, UserRole.DIREKTOR, UserRole.MODERATOR})
ALLOWED_WRITERS = frozenset({UserRole.ADMIN, UserRole.DIREKTOR})


@router.get("")
async def list_organizations(
    session: DbSession,
    user: CurrentUserDep,
    district_id: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    if user.role not in ALLOWED_READERS:
        raise ForbiddenError("role_not_allowed")

    repo = OrganizationsRepository(session)
    offset = (page - 1) * limit
    orgs, total = await repo.list(
        district_id=district_id,
        search=search,
        offset=offset,
        limit=limit,
    )
    return {
        "data": [OrganizationRead.model_validate(o) for o in orgs],
        "meta": {"total": total, "page": page, "limit": limit},
    }


@router.get("/{org_id}", response_model=OrganizationRead)
async def get_organization(
    org_id: UUID,
    session: DbSession,
    user: CurrentUserDep,
) -> OrganizationRead:
    if user.role not in ALLOWED_READERS:
        raise ForbiddenError("role_not_allowed")

    repo = OrganizationsRepository(session)
    org = await repo.get_by_id(org_id)
    if org is None:
        raise NotFoundError("organization_not_found")
    return OrganizationRead.model_validate(org)


@router.post("", response_model=OrganizationRead, status_code=status.HTTP_201_CREATED)
async def create_organization(
    body: OrganizationCreate,
    session: DbSession,
    user: CurrentUserDep,
) -> OrganizationRead:
    if user.role not in ALLOWED_WRITERS:
        raise ForbiddenError("role_not_allowed")

    org = Organization(
        name=body.name,
        district_id=body.district_id,
        type=body.type,
        contact_phone=body.contact_phone,
        address=body.address,
        director_name=body.director_name,
    )
    repo = OrganizationsRepository(session)
    await repo.add(org)
    await record_audit(session, user=user, action="organization.create", entity_type="organization", entity_id=org.id)
    await session.commit()
    return OrganizationRead.model_validate(org)


@router.patch("/{org_id}", response_model=OrganizationRead)
async def update_organization(
    org_id: UUID,
    body: OrganizationUpdate,
    session: DbSession,
    user: CurrentUserDep,
) -> OrganizationRead:
    if user.role not in ALLOWED_WRITERS:
        raise ForbiddenError("role_not_allowed")

    repo = OrganizationsRepository(session)
    org = await repo.get_by_id(org_id)
    if org is None:
        raise NotFoundError("organization_not_found")

    updates = body.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(org, k, v)

    await record_audit(session, user=user, action="organization.update", entity_type="organization", entity_id=org.id, after=updates)
    await session.commit()
    return OrganizationRead.model_validate(org)


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    org_id: UUID,
    session: DbSession,
    user: CurrentUserDep,
) -> None:
    if user.role not in ALLOWED_WRITERS:
        raise ForbiddenError("role_not_allowed")

    repo = OrganizationsRepository(session)
    org = await repo.get_by_id(org_id)
    if org is None:
        raise NotFoundError("organization_not_found")

    await record_audit(session, user=user, action="organization.delete", entity_type="organization", entity_id=org.id)
    await repo.delete(org)
    await session.commit()
