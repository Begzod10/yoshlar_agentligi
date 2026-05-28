from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OrganizationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    district_id: str
    type: str | None
    contact_phone: str | None
    address: str | None
    director_name: str
    created_at: datetime
    updated_at: datetime


class OrganizationListParams(BaseModel):
    district_id: str | None = None
    search: str | None = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
