"""add tasks table

Revision ID: 987654321abc
Revises: b5c8d2e4f608
Create Date: 2026-06-25
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "987654321abc"
down_revision: Union[str, Sequence[str], None] = "b5c8d2e4f608"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ENUM types
    task_priority_enum = postgresql.ENUM(
        "Low",
        "Medium",
        "High",
        name="task_priority",
        create_type=False,
    )
    task_status_enum = postgresql.ENUM(
        "Pending",
        "Completed",
        "Canceled",
        name="task_status",
        create_type=False,
    )

    bind = op.get_bind()
    task_priority_enum.create(bind, checkfirst=True)
    task_status_enum.create(bind, checkfirst=True)

    # Create tasks table
    op.create_table(
        "tasks",
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lead_id", sa.String(), nullable=True),
        sa.Column("assigned_user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("priority", task_priority_enum, nullable=False),
        sa.Column("status", task_status_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["assigned_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.lead_id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("task_id"),
    )


def downgrade() -> None:
    op.drop_table("tasks")
    bind = op.get_bind()
    postgresql.ENUM(name="task_priority").drop(bind, checkfirst=True)
    postgresql.ENUM(name="task_status").drop(bind, checkfirst=True)