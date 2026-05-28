from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import YouthStatus


class YouthCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    birth_date: date | None = None
    district_id: str = Field(min_length=1, max_length=64)
    masul_id: UUID | None = None
    organization_id: UUID | None = None
    category: str | None = Field(default=None, max_length=64)
    contact: str | None = Field(default=None, max_length=255)
    notes: dict | None = None


class YouthUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    birth_date: date | None = None
    category: str | None = Field(default=None, max_length=64)
    contact: str | None = Field(default=None, max_length=255)
    notes: dict | None = None
    organization_id: UUID | None = None


class YouthUpdateByMasul(BaseModel):
    """Masul hodim can only update notes and contact."""
    contact: str | None = Field(default=None, max_length=255)
    notes: dict | None = None


class YouthRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    birth_date: date | None
    district_id: str
    masul_id: UUID | None
    organization_id: UUID | None
    status: YouthStatus
    category: str | None
    contact: str | None
    notes: dict | None
    removal_proposal: dict | None
    created_at: datetime
    updated_at: datetime


class AssignMasulRequest(BaseModel):
    masul_id: UUID
    override: bool = False


class StatusChangeRequest(BaseModel):
    status: YouthStatus
    reason: str | None = Field(default=None, max_length=2000)


class ProposeRemovalRequest(BaseModel):
    reason: str = Field(min_length=20, max_length=2000)


class ApproveRemovalRequest(BaseModel):
    pass


class RejectRemovalRequest(BaseModel):
    comment: str = Field(min_length=10, max_length=2000)
