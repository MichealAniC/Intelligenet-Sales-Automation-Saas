"""add activities table

Revision ID: add_activities_table_123
Revises: 987654321abc
Create Date: 2026-06-25
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "add_activities_table_123"
down_revision: Union[str, Sequence[str], None] = "987654321abc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ENUM types
    activity_type_enum = postgresql.ENUM(
        "Call",
        "Email",
        "Meeting",
        "Note",
        name="activity_type",
        create_type=False,
    )
    activity_outcome_enum = postgresql.ENUM(
        "Left Message",
        "Connected",
        "No Answer",
        "Completed",
        "Scheduled",
        name="activity_outcome",
        create_type=False,
    )

    bind = op.get_bind()
    activity_type_enum.create(bind, checkfirst=True)
    activity_outcome_enum.create(bind, checkfirst=True)

    # Create activities table
    op.create_table(
        "activities",
        sa.Column("activity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lead_id", sa.String(), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("activity_type", activity_type_enum, nullable=False),
        sa.Column("outcome", activity_outcome_enum, nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.lead_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("activity_id"),
    )


def downgrade() -> None:
    op.drop_table("activities")
    bind = op.get_bind()
    postgresql.ENUM(name="activity_type").drop(bind, checkfirst=True)
    postgresql.ENUM(name="activity_outcome").drop(bind, checkfirst=True)
