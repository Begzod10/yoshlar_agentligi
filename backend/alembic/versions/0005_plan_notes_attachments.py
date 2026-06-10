"""add notes and attachments to plans

Revision ID: 0005_plan_notes_attachments
Revises: 0004_profile_extensions
Create Date: 2026-06-10
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0005_plan_notes_attachments"
down_revision = "0004_profile_extensions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("plans", sa.Column("notes", sa.String(2000), nullable=True))
    op.add_column(
        "plans",
        sa.Column(
            "attachments",
            JSONB,
            nullable=False,
            server_default="[]",
        ),
    )


def downgrade() -> None:
    op.drop_column("plans", "attachments")
    op.drop_column("plans", "notes")
