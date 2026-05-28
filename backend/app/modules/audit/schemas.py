from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    role: str
    action: str
    entity_type: str
    entity_id: UUID | None
    before: dict | None
    after: dict | None
    request_id: str | None
    ip: str | None
    user_agent: str | None
    created_at: datetime


class PiiRevealRequest(BaseModel):
    entity_type: str = Field(min_length=1, max_length=64)
    entity_id: UUID
    reason: str = Field(min_length=30, max_length=2000)
