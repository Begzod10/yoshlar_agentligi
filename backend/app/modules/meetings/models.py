from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PgUUID
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import MeetingAttendance
from app.db.base import Base, TimestampMixin, new_uuid


class Meeting(Base, TimestampMixin):
    __tablename__ = "meetings"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=new_uuid)
    youth_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("youth.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    masul_id: Mapped[UUID | None] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("masullar.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    agenda: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    attendance_status: Mapped[MeetingAttendance] = mapped_column(
        String(32), nullable=False, default=MeetingAttendance.SCHEDULED
    )
    attendance_notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    attachments: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    masul: Mapped["Masul | None"] = relationship(  # type: ignore[name-defined]
        "Masul", foreign_keys=[masul_id], lazy="raise"
    )
    youth: Mapped["Youth"] = relationship(  # type: ignore[name-defined]
        "Youth", foreign_keys=[youth_id], lazy="raise"
    )

    @property
    def masul_name(self) -> str | None:
        if "masul" in sa_inspect(self).unloaded:
            return None
        return self.masul.full_name if self.masul is not None else None
