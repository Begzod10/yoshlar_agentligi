"""merge_heads

Revision ID: b0d54a0c3c76
Revises: 0002_all_domain_tables, 0004_profile_extensions
Create Date: 2026-06-09 12:45:15.160371
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b0d54a0c3c76'
down_revision: Union[str, None] = ('0002_all_domain_tables', '0004_profile_extensions')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
