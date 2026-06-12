"""add masul_id to users table

Revision ID: 0006_users_masul_id
Revises: 0005_plan_notes_attachments
Create Date: 2026-06-10 12:00:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_users_masul_id"
down_revision: Union[str, None] = "0002_all_domain_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "masul_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("masullar.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_users_masul_id", "users", ["masul_id"])


def downgrade() -> None:
    op.drop_index("ix_users_masul_id", table_name="users")
    op.drop_column("users", "masul_id")
