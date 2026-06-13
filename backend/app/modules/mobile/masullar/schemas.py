from datetime import date, datetime
from typing import Any
from uuid import UUID

from app.core.base_schema import CamelModel


# ── profile & stats ───────────────────────────────────────────────────────────

class MobileMasulProfile(CamelModel):
    id: UUID
    full_name: str
    district_id: str
    organization_id: UUID | None
    phone: str | None
    email: str | None
    position: str | None
    youth_count: int
    created_at: datetime


class MobileMasulStats(CamelModel):
    total_youth: int
    active: int
    graduated: int
    removed: int
    plans_active: int
    meetings_upcoming: int


# ── youth cards & detail ──────────────────────────────────────────────────────

class MobileYouthCard(CamelModel):
    """Lightweight card for list views."""
    id: UUID
    full_name: str
    status: str
    category: str | None
    contact: str | None
    date_of_birth: date | None


class MobileYouthDetail(CamelModel):
    """Full youth detail for the masul_hodim."""
    id: UUID
    full_name: str
    district_id: str
    status: str
    category: str | None
    contact: str | None
    date_of_birth: date | None
    address: str | None
    notes: str | None
    removal_proposal: dict[str, Any] | None
    masul_id: UUID | None
    organization_id: UUID | None
    created_at: datetime


# ── meetings ──────────────────────────────────────────────────────────────────

class MobileMeetingCard(CamelModel):
    """Lightweight card for list & upcoming views."""
    id: UUID
    youth_id: UUID
    youth_name: str
    scheduled_at: datetime
    type: str | None
    location: str | None
    attendance_status: str


class MobileMeetingDetail(CamelModel):
    """Full meeting detail with youth name."""
    id: UUID
    youth_id: UUID
    youth_name: str | None
    masul_id: UUID | None
    scheduled_at: datetime
    type: str | None
    location: str | None
    agenda: str | None
    attendance_status: str
    attendance_notes: str | None
    attachments: list[dict[str, Any]]
    created_at: datetime


# ── plans ─────────────────────────────────────────────────────────────────────

class MobilePlanCard(CamelModel):
    """Lightweight card for list views."""
    id: UUID
    youth_id: UUID
    youth_name: str
    title: str
    status: str
    progress: int
    end_date: date | None


class MobilePlanDetail(CamelModel):
    """Full plan detail with milestones and youth name."""
    id: UUID
    youth_id: UUID
    youth_name: str | None
    masul_id: UUID | None
    title: str
    goal: str | None
    milestones: list[dict[str, Any]]
    status: str
    progress: int
    notes: str | None
    attachments: list[dict[str, Any]]
    start_date: date | None
    end_date: date | None
    created_at: datetime
