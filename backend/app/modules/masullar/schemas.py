from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class MasulCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    district_id: str = Field(min_length=1, max_length=64)
    organization_id: UUID
    phone: str | None = Field(default=None, max_length=32)
    email: str | None = Field(default=None, max_length=255)


class MasulUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    email: str | None = Field(default=None, max_length=255)


class MasulRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    district_id: str
    organization_id: UUID
    organization_name: str | None = None
    assigned_youth_count: int = 0
    phone: str | None
    email: str | None
    created_at: datetime
    updated_at: datetime
