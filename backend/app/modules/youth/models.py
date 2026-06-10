from datetime import date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import YouthStatus
from app.db.base import Base, TimestampMixin, new_uuid


class Youth(Base, TimestampMixin):
    __tablename__ = "youth"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=new_uuid)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    district_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    masul_id: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("masullar.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    organization_id: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    status: Mapped[YouthStatus] = mapped_column(
        String(32), nullable=False, default=YouthStatus.ACTIVE, index=True
    )
    category: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    contact: Mapped[str | None] = mapped_column(String(64), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date(), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    removal_proposal: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    masul: Mapped["Masul | None"] = relationship(  # type: ignore[name-defined]
        "Masul", foreign_keys=[masul_id], lazy="raise"
    )

    @property
    def masul_name(self) -> str | None:
        return self.masul.full_name if self.masul is not None else None
