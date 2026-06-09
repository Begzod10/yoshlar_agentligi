"""add_email_to_masullar

Revision ID: 9cfff8119071
Revises: b0d54a0c3c76
Create Date: 2026-06-09 12:45:23.901403
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '9cfff8119071'
down_revision: Union[str, None] = 'b0d54a0c3c76'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('masullar', sa.Column('email', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('masullar', 'email')
