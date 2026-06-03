from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import MeetingAttendance


class MeetingCreate(BaseModel):
    youth_id: UUID
    masul_id: UUID
    scheduled_at: datetime
    type: str | None = Field(default=None, max_length=64)
    location: str | None = Field(default=None, max_length=255)
    agenda: str | None = Field(default=None, max_length=2000)


class MeetingUpdate(BaseModel):
    scheduled_at: datetime | None = None
    type: str | None = Field(default=None, max_length=64)
    location: str | None = Field(default=None, max_length=255)
    agenda: str | None = Field(default=None, max_length=2000)
    attendance_status: MeetingAttendance | None = None
    attendance_notes: str | None = Field(default=None, max_length=2000)


class AttendanceUpdate(BaseModel):
    attendance_status: MeetingAttendance
    attendance_notes: str | None = Field(default=None, max_length=2000)


class MeetingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    youth_id: UUID
    masul_id: UUID
    scheduled_at: datetime
    type: str | None
    location: str | None
    agenda: str | None
    attendance_status: MeetingAttendance
    attendance_notes: str | None
    attachments: list | None
    created_at: datetime
    updated_at: datetime