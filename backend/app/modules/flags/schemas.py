from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import FlagCategory, FlagStatus


class FlagCreate(BaseModel):
    entity_type: str = Field(min_length=1, max_length=64)
    entity_id: UUID
    category: FlagCategory
    comment: str = Field(min_length=30, max_length=2000)


class FlagUpdate(BaseModel):
    status: FlagStatus
    resolution: str = Field(min_length=10, max_length=2000)


class FlagRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    raised_by: UUID
    role: str
    entity_type: str
    entity_id: UUID
    category: FlagCategory
    status: FlagStatus
    comment: str
    resolved_by: UUID | None
    resolved_at: datetime | None
    resolution: str | None
    created_at: datetime
    updated_at: datetime


class FlagListParams(BaseModel):
    status: FlagStatus | None = None
    entity_type: str | None = None
    raised_by: UUID | None = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
