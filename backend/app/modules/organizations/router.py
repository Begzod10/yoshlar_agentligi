from uuid import UUID

from fastapi import APIRouter, Query

from app.core.constants import UserRole
from app.core.deps import CurrentUserDep, DbSession
from app.core.exceptions import ForbiddenError, NotFoundError
from app.modules.organizations.repository import OrganizationsRepository
from app.modules.organizations.schemas import OrganizationRead

router = APIRouter(prefix="/api/organizations", tags=["organizations"])

ALLOWED_READERS = frozenset({UserRole.ADMIN, UserRole.DIREKTOR, UserRole.MODERATOR})


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
