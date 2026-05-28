from datetime import date
from uuid import UUID

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.constants import PlanStatus
from app.db.base import Base, TimestampMixin, new_uuid


class Plan(Base, TimestampMixin):
    __tablename__ = "plans"

    id: Mapped[UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=new_uuid)
    youth_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("youth.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    masul_id: Mapped[UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("masullar.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    goal: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    milestones: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[PlanStatus] = mapped_column(String(32), nullable=False, default=PlanStatus.DRAFT, index=True)
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
