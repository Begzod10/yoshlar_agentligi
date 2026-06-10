from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import field_validator

from app.core.base_schema import CamelModel, schema_example


class AuditLogRead(CamelModel):
    model_config = schema_example(
        {
            "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
            "userId": "f6ba5d45-3cbe-424b-ae33-1c40a6a75b4f",
            "role": "admin",
            "action": "youth.approve_removal",
            "entityType": "youth",
            "entityId": "6d41303a-29eb-4589-b80f-a60f27367e71",
            "before": None,
            "after": {"status": "removed"},
            "requestId": "0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d",
            "ip": "127.0.0.1",
            "userAgent": "Mozilla/5.0 (...)",
            "createdAt": "2026-05-28T08:16:32.456789Z",
        }
    )

    id: UUID
    user_id: UUID
    role: str
    action: str
    entity_type: str
    entity_id: UUID | None
    before: dict[str, Any] | None
    after: dict[str, Any] | None
    request_id: str | None
    ip: str | None
    user_agent: str | None
    created_at: datetime

    @field_validator("ip", mode="before")
    @classmethod
    def _coerce_ip(cls, v: object) -> str | None:
        return None if v is None else str(v)
