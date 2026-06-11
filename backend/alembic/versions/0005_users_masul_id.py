"""users.masul_id column

Revision ID: 0005_users_masul_id
Revises: 0004_profile_extensions
Create Date: 2026-06-10 00:00:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_users_masul_id"
down_revision: Union[str, None] = "0004_profile_extensions"
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
