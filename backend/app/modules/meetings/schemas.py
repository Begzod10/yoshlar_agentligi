from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from app.core.base_schema import CamelModel, schema_example
from app.core.constants import MeetingAttendance


class MeetingBase(CamelModel):
    youth_id: UUID
    scheduled_at: datetime
    type: str | None = Field(default=None, max_length=64)
    location: str | None = Field(default=None, max_length=255)
    agenda: str | None = Field(default=None, max_length=2000)


class MeetingCreate(MeetingBase):
    model_config = schema_example(
        {
            "youthId": "6d41303a-29eb-4589-b80f-a60f27367e71",
            "scheduledAt": "2026-06-15T10:00:00Z",
            "type": "consultation",
            "location": "Bekobod tumani yoshlar markazi",
            "agenda": "Oylik baholash va keyingi qadamlarni belgilash",
        }
    )


class MeetingUpdate(CamelModel):
    model_config = schema_example(
        {
            "scheduledAt": "2026-06-22T14:00:00Z",
            "location": "Onlayn (Zoom)",
            "agenda": "Vaqt va joy o'zgardi",
        }
    )
    scheduled_at: datetime | None = None
    type: str | None = Field(default=None, max_length=64)
    location: str | None = Field(default=None, max_length=255)
    agenda: str | None = Field(default=None, max_length=2000)
    attendance_status: MeetingAttendance | None = None
    attendance_notes: str | None = Field(default=None, max_length=2000)


class AttendanceUpdate(CamelModel):
    model_config = schema_example(
        {
            "attendanceStatus": "attended",
            "attendanceNotes": "Yosh keldi, faol qatnashdi. Maqsadlar yangilandi.",
        }
    )
    attendance_status: MeetingAttendance
    attendance_notes: str | None = Field(default=None, max_length=2000)


class MeetingRead(CamelModel):
    model_config = schema_example(
        {
            "id": "2fe27ca2-1234-5678-9abc-def012345678",
            "youthId": "6d41303a-29eb-4589-b80f-a60f27367e71",
            "masulId": "eb33f00f-cfd4-4800-a4a2-260f0a26eefb",
            "scheduledAt": "2026-06-15T10:00:00Z",
            "type": "consultation",
            "location": "Bekobod tumani yoshlar markazi",
            "agenda": "Oylik baholash",
            "attendanceStatus": "scheduled",
            "attendanceNotes": None,
            "attachments": [],
            "createdAt": "2026-05-28T08:00:00Z",
        }
    )
    id: UUID
    youth_id: UUID
    masul_id: UUID | None
    scheduled_at: datetime
    type: str | None
    location: str | None
    agenda: str | None
    attendance_status: MeetingAttendance
    attendance_notes: str | None
    attachments: list[dict[str, Any]]
    created_at: datetime
    updated_at: datetime
