from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import PlanStatus


class PlanCreate(BaseModel):
    youth_id: UUID
    masul_id: UUID
    title: str = Field(min_length=2, max_length=255)
    goal: str | None = Field(default=None, max_length=1000)
    milestones: list | None = None
    status: PlanStatus = PlanStatus.DRAFT
    start_date: date
    end_date: date


class PlanUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    goal: str | None = Field(default=None, max_length=1000)
    milestones: list | None = None
    status: PlanStatus | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    end_date: date | None = None


class PlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    youth_id: UUID
    masul_id: UUID
    title: str
    goal: str | None
    milestones: list | None
    status: PlanStatus
    progress: int
    start_date: date
    end_date: date
    created_at: datetime
    updated_at: datetime
