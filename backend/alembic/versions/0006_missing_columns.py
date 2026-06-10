"""add missing columns: masullar.email, youth.category

Revision ID: 0006_missing_columns
Revises: 0005_users_masul_id
Create Date: 2026-06-10 00:00:00
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_missing_columns"
down_revision: Union[str, None] = "0005_users_masul_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("masullar", sa.Column("email", sa.String(255), nullable=True))
    op.add_column("youth", sa.Column("category", sa.String(128), nullable=True))
    op.create_index("ix_youth_category", "youth", ["category"])


def downgrade() -> None:
    op.drop_index("ix_youth_category", table_name="youth")
    op.drop_column("youth", "category")
    op.drop_column("masullar", "email")
