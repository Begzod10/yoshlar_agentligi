from datetime import UTC, datetime
from uuid import UUID

from app.core.exceptions import NotFoundError
from app.modules.organizations.models import Organization
from app.modules.organizations.repository import OrganizationsRepository
from app.modules.organizations.schemas import OrganizationCreate, OrganizationUpdate


class OrganizationsService:
    def __init__(self, repo: OrganizationsRepository) -> None:
        self._repo = repo

    async def create(self, payload: OrganizationCreate) -> Organization:
        org = Organization(**payload.model_dump(by_alias=False))
        return await self._repo.add(org)

    async def get(self, org_id: UUID) -> Organization:
        org = await self._repo.get_by_id(org_id)
        if org is None:
            raise NotFoundError("organization_not_found")
        return org

    async def update(self, org_id: UUID, payload: OrganizationUpdate) -> Organization:
        org = await self.get(org_id)
        for key, value in payload.model_dump(exclude_unset=True, by_alias=False).items():
            setattr(org, key, value)
        return org

    async def soft_delete(self, org_id: UUID) -> None:
        org = await self.get(org_id)
        org.deleted_at = datetime.now(tz=UTC)
