from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.core.base_schema import CamelModel
from app.core.constants import YouthStatus


class AgencyStats(BaseModel):
    total_youth: int
    active_youth: int
    graduated_youth: int
    removed_youth: int
    total_organizations: int
    total_masullar: int
    total_plans: int
    completed_plans: int
    in_progress_plans: int
    total_meetings: int
    attended_meetings: int


class DistrictStatsRow(BaseModel):
    district_id: str
    total_youth: int
    active_youth: int
    graduated_youth: int
    total_organizations: int
    total_masullar: int
    total_plans: int
    completed_plans: int
    total_meetings: int
    completion_rate: float


class CompareResult(BaseModel):
    district_id: str
    total_youth: int
    active_youth: int
    total_plans: int
    completed_plans: int
    completion_rate: float
    total_meetings: int


class TrendPoint(BaseModel):
    period: str
    value: int


class CategoryStat(CamelModel):
    category: str
    total_youth: int


class TopYoshRow(CamelModel):
    id: UUID
    full_name: str
    district_id: str
    organization_id: UUID | None
    masul_id: UUID | None
    status: YouthStatus
    total_plans: int
    completed_plans: int
    total_meetings: int
    attended_meetings: int
    ai_score: float
    ai_comment: str | None = None


class RecentActivityRow(CamelModel):
    id: UUID
    user_id: UUID
    role: str
    action: str
    entity_type: str
    entity_id: UUID | None
    created_at: datetime


class AiInsight(CamelModel):
    type: str
    text: str
