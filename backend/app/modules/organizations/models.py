from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, new_uuid


class Organization(Base, TimestampMixin):
    __tablename__ = "organizations"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    district_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    head_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
