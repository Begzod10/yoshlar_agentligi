"""organizations, masullar, youth, plans, meetings, flags, audit_log

Revision ID: 0002_all_domain_tables
Revises: 0001_initial_users
Create Date: 2026-05-27 12:00:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_all_domain_tables"
down_revision: Union[str, None] = "0001_initial_users"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- organizations ---
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("district_id", sa.String(64), nullable=False),
        sa.Column("type", sa.String(64), nullable=True),
        sa.Column("contact_phone", sa.String(32), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("director_name", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_organizations_district_id", "organizations", ["district_id"])

    # --- masullar ---
    op.create_table(
        "masullar",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("district_id", sa.String(64), nullable=False),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("phone", sa.String(32), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_masullar_district_id", "masullar", ["district_id"])

    # --- youth ---
    op.create_table(
        "youth",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("birth_date", sa.Date, nullable=True),
        sa.Column("district_id", sa.String(64), nullable=False),
        sa.Column(
            "masul_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("masullar.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("status", sa.String(32), nullable=False, server_default="active"),
        sa.Column("category", sa.String(64), nullable=True),
        sa.Column("contact", sa.String(255), nullable=True),
        sa.Column("notes", postgresql.JSONB, nullable=True),
        sa.Column("removal_proposal", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_youth_district_id", "youth", ["district_id"])
    op.create_index("ix_youth_masul_id", "youth", ["masul_id"])
    op.create_index("ix_youth_status", "youth", ["status"])

    # --- plans ---
    op.create_table(
        "plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "youth_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("youth.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "masul_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("masullar.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("goal", sa.String(1000), nullable=True),
        sa.Column("milestones", postgresql.JSONB, nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
        sa.Column("progress", sa.Integer, nullable=False, server_default="0"),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("end_date", sa.Date, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_plans_youth_id", "plans", ["youth_id"])
    op.create_index("ix_plans_masul_id", "plans", ["masul_id"])
    op.create_index("ix_plans_status", "plans", ["status"])

    # --- meetings ---
    op.create_table(
        "meetings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "youth_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("youth.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "masul_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("masullar.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("type", sa.String(64), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("agenda", sa.String(2000), nullable=True),
        sa.Column("attendance_status", sa.String(32), nullable=False, server_default="scheduled"),
        sa.Column("attendance_notes", sa.String(2000), nullable=True),
        sa.Column("attachments", postgresql.JSONB, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_meetings_youth_id", "meetings", ["youth_id"])
    op.create_index("ix_meetings_masul_id", "meetings", ["masul_id"])

    # --- flags ---
    op.create_table(
        "flags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "raised_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("entity_type", sa.String(64), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("category", sa.String(32), nullable=False),
        sa.Column("comment", sa.String(2000), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="open"),
        sa.Column(
            "resolved_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution", sa.String(2000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_flags_raised_by", "flags", ["raised_by"])
    op.create_index("ix_flags_entity_type", "flags", ["entity_type"])
    op.create_index("ix_flags_entity_id", "flags", ["entity_id"])
    op.create_index("ix_flags_status", "flags", ["status"])

    # --- audit_log ---
    op.create_table(
        "audit_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("role", sa.String(32), nullable=False),
        sa.Column("action", sa.String(128), nullable=False),
        sa.Column("entity_type", sa.String(64), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("before", postgresql.JSONB, nullable=True),
        sa.Column("after", postgresql.JSONB, nullable=True),
        sa.Column("request_id", sa.String(64), nullable=True),
        sa.Column("ip", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_log_user_id_created", "audit_log", ["user_id", sa.text("created_at DESC")])
    op.create_index("ix_audit_log_entity", "audit_log", ["entity_type", "entity_id"])
    op.create_index("ix_audit_log_action", "audit_log", ["action", sa.text("created_at DESC")])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("flags")
    op.drop_table("meetings")
    op.drop_table("plans")
    op.drop_table("youth")
    op.drop_table("masullar")
    op.drop_table("organizations")
