from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import Field

from app.core.base_schema import CamelModel, schema_example


class FlagCategory(StrEnum):
    DATA_QUALITY = "data_quality"
    SUSPECTED_FRAUD = "suspected_fraud"
    SAFEGUARDING = "safeguarding"
    OTHER = "other"


class FlagStatus(StrEnum):
    OPEN = "open"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


class FlagCreate(CamelModel):
    model_config = schema_example(
        {
            "entityType": "youth",
            "entityId": "6d41303a-29eb-4589-b80f-a60f27367e71",
            "category": "data_quality",
            "comment": "Yoshning telefon raqami noto'g'ri kiritilgan va ishlamayapti. Qayta tekshirish kerak.",
        }
    )
    entity_type: str = Field(min_length=1, max_length=64)
    entity_id: UUID
    category: FlagCategory
    comment: str = Field(min_length=30, max_length=2000)


class FlagUpdate(CamelModel):
    model_config = schema_example(
        {
            "status": "resolved",
            "resolution": "Telefon raqam mas'ul tomonidan tasdiqlandi va to'g'rilandi.",
        }
    )
    status: FlagStatus
    resolution: str | None = Field(default=None, max_length=2000)


class FlagRead(CamelModel):
    model_config = schema_example(
        {
            "id": "a64c9f97-1234-5678-9abc-def012345678",
            "raisedBy": "c9080de6-2345-6789-abcd-ef0123456789",
            "role": "moderator",
            "entityType": "youth",
            "entityId": "6d41303a-29eb-4589-b80f-a60f27367e71",
            "category": "data_quality",
            "comment": "Yoshning telefon raqami noto'g'ri kiritilgan...",
            "status": "open",
            "resolvedBy": None,
            "resolvedAt": None,
            "resolution": None,
            "createdAt": "2026-05-28T08:00:00Z",
        }
    )
    id: UUID
    raised_by: UUID
    role: str
    entity_type: str
    entity_id: UUID
    category: str
    comment: str
    status: str
    resolved_by: UUID | None
    resolved_at: datetime | None
    resolution: str | None
    created_at: datetime
