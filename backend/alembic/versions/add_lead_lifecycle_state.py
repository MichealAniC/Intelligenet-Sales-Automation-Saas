"""Add lead lifecycle state and next followup date

Revision ID: add_lead_lifecycle_state
Revises: add_activities_table_123
Create Date: 2026-06-25
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_lead_lifecycle_state'
down_revision: Union[str, Sequence[str], None] = 'add_activities_table_123'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum type
    lead_lifecycle_state_enum = postgresql.ENUM(
        'ACTIVE', 'NURTURING', 'CLOSED_WON', 'CLOSED_LOST',
        name='lead_lifecycle_state'
    )
    bind = op.get_bind()
    lead_lifecycle_state_enum.create(bind, checkfirst=True)

    # Add new columns to leads table
    op.add_column('leads', sa.Column('lifecycle_state', lead_lifecycle_state_enum, nullable=True))
    op.add_column('leads', sa.Column('next_followup_date', sa.DateTime(timezone=True), nullable=True))

    # Set default value to ACTIVE for existing rows
    op.execute("UPDATE leads SET lifecycle_state = 'ACTIVE' WHERE lifecycle_state IS NULL")

    # Make lifecycle_state NOT NULL
    op.alter_column('leads', 'lifecycle_state', nullable=False)


def downgrade() -> None:
    op.drop_column('leads', 'next_followup_date')
    op.drop_column('leads', 'lifecycle_state')
    bind = op.get_bind()
    postgresql.ENUM(name='lead_lifecycle_state').drop(bind, checkfirst=True)
