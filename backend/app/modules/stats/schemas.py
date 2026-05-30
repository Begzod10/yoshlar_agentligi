from pydantic import BaseModel


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
