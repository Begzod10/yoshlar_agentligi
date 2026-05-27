from datetime import date
from uuid import UUID

from sqlalchemy import Date, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.constants import YouthStatus
from app.db.base import Base, TimestampMixin, new_uuid


class Youth(Base, TimestampMixin):
    __tablename__ = "youth"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=new_uuid)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    district_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    masul_id: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("masullar.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    organization_id: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=True
    )
    status: Mapped[YouthStatus] = mapped_column(String(32), nullable=False, default=YouthStatus.ACTIVE, index=True)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    contact: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    removal_proposal: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
