from uuid import UUID

from app.core.base_schema import CamelModel, schema_example


class DistrictRatingRow(CamelModel):
    model_config = schema_example(
        {
            "rank": 1,
            "districtId": "Bekobod tumani",
            "totalYouth": 4,
            "totalMasullar": 4,
            "totalPlans": 8,
            "totalMeetings": 12,
            "bajarilishPct": 50.0,
            "aiBall": 0.0,
            "umumiyBall": 28.0,
        }
    )
    rank: int
    district_id: str
    total_youth: int
    total_masullar: int
    total_plans: int
    total_meetings: int
    bajarilish_pct: float
    ai_ball: float
    umumiy_ball: float


class OrgRatingRow(CamelModel):
    model_config = schema_example(
        {
            "rank": 1,
            "id": "3ef0d8f4-2d03-4ca3-93c5-a444a69ea1ff",
            "name": "Bekobod tumani 5-maktab",
            "districtId": "Bekobod tumani",
            "totalMasullar": 2,
            "totalYouth": 10,
            "totalPlans": 18,
            "bajarilishPct": 55.5,
            "aiBall": 42.0,
        }
    )
    rank: int
    id: UUID
    name: str
    district_id: str
    total_masullar: int
    total_youth: int
    total_plans: int
    bajarilish_pct: float
    ai_ball: float


class MasulRatingRow(CamelModel):
    model_config = schema_example(
        {
            "rank": 1,
            "id": "eb33f00f-cfd4-4800-a4a2-260f0a26eefb",
            "fullName": "Aliyev Bobur Anvarovich",
            "districtId": "Bekobod tumani",
            "organizationId": None,
            "totalYouth": 5,
            "totalPlans": 9,
            "totalMeetings": 14,
            "bajarilishPct": 44.4,
            "aiBall": 38.0,
        }
    )
    rank: int
    id: UUID
    full_name: str
    district_id: str
    organization_id: UUID | None
    total_youth: int
    total_plans: int
    total_meetings: int
    bajarilish_pct: float
    ai_ball: float


class MonitoringOverview(CamelModel):
    model_config = schema_example(
        {
            "totalYouth": 5,
            "totalDistricts": 14,
            "avgBajarilishPct": 4.0,
            "totalMasullar": 4,
        }
    )
    total_youth: int
    total_districts: int
    avg_bajarilish_pct: float
    total_masullar: int
