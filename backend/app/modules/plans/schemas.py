from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.core.base_schema import CamelModel, schema_example
from app.core.constants import PlanStatus
from app.modules.youth.schemas import YouthBrief


class Milestone(CamelModel):
    model_config = schema_example(
        {
            "title": "Test markazidan ro'yxatdan o'tish",
            "done": False,
            "dueDate": "2026-04-01",
            "notes": "DTM hujjatlarini topshirish",
        }
    )
    title: str = Field(min_length=1, max_length=255)
    done: bool = False
    due_date: date | None = None
    notes: str | None = Field(default=None, max_length=500)


class PlanBase(CamelModel):
    youth_id: UUID
    title: str = Field(min_length=2, max_length=255)
    goal: str | None = Field(default=None, max_length=2000)
    milestones: list[Milestone] = Field(default_factory=list)
    start_date: date | None = None
    end_date: date | None = None


class PlanCreate(PlanBase):
    model_config = schema_example(
        {
            "youthId": "6d41303a-29eb-4589-b80f-a60f27367e71",
            "title": "Universitetga tayyorgarlik",
            "goal": "Yoshni 2027-yilgi davlat testiga tayyorlash",
            "milestones": [
                {
                    "title": "Test markazidan ro'yxatdan o'tish",
                    "done": False,
                    "dueDate": "2026-04-01",
                },
                {
                    "title": "Repetitor bilan keladi",
                    "done": False,
                    "dueDate": "2026-09-01",
                },
            ],
            "startDate": "2026-06-01",
            "endDate": "2027-07-30",
        }
    )


class PlanUpdate(CamelModel):
    model_config = schema_example(
        {"status": "in_progress", "progress": 35, "title": "Yangilangan reja sarlavhasi"}
    )
    title: str | None = Field(default=None, min_length=2, max_length=255)
    goal: str | None = Field(default=None, max_length=2000)
    milestones: list[Milestone] | None = None
    status: PlanStatus | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    start_date: date | None = None
    end_date: date | None = None


class PlanProgressUpdate(CamelModel):
    model_config = schema_example(
        {"progress": 50, "status": "in_progress", "notes": "2-bosqich bajarildi"}
    )
    progress: int | None = Field(default=None, ge=0, le=100)
    status: PlanStatus | None = None
    notes: str | None = Field(default=None, max_length=2000)


class PlanRead(CamelModel):
    model_config = schema_example(
        {
            "id": "9a8b7c6d-5e4f-3a2b-1c0d-987654321abc",
            "youthId": "6d41303a-29eb-4589-b80f-a60f27367e71",
            "masulId": "eb33f00f-cfd4-4800-a4a2-260f0a26eefb",
            "title": "Universitetga tayyorgarlik",
            "goal": "Davlat testiga tayyorlash",
            "milestones": [
                {"title": "Ro'yxatdan o'tish", "done": True, "dueDate": "2026-04-01"}
            ],
            "status": "in_progress",
            "progress": 25,
            "startDate": "2026-06-01",
            "endDate": "2027-07-30",
            "createdAt": "2026-05-28T08:00:00Z",
        }
    )
    id: UUID
    youth_id: UUID
    masul_id: UUID | None
    masul_name: str | None = None
    title: str
    goal: str | None
    milestones: list[dict[str, Any]]
    status: PlanStatus
    progress: int
    notes: str | None
    attachments: list[dict[str, Any]]
    youth: YouthBrief | None = None
    start_date: date | None
    end_date: date | None
    created_at: datetime
