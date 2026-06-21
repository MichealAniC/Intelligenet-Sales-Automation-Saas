"""add profile_status and flip auto_assignment default

Revision ID: b5c8d2e4f608
Revises: a3b7c9e1f204
Create Date: 2026-06-16
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "b5c8d2e4f608"
down_revision: Union[str, Sequence[str], None] = "a3b7c9e1f204"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create profile_status ENUM type
    profile_status_enum = postgresql.ENUM(
        "Pending Configuration",
        "Active",
        "Disabled",
        name="profile_status",
        create_type=False,
    )
    bind = op.get_bind()
    profile_status_enum.create(bind, checkfirst=True)

    # 2. Add profile_status column to users
    op.add_column(
        "users",
        sa.Column(
            "profile_status",
            profile_status_enum,
            nullable=False,
            server_default="Pending Configuration",
        ),
    )

    # 3. Flip auto_assignment_enabled default from true → false
    op.alter_column(
        "users",
        "auto_assignment_enabled",
        server_default=sa.text("false"),
    )

    # 4. Set all existing users to profile_status = 'Pending Configuration'
    op.execute("UPDATE users SET profile_status = 'Pending Configuration'")

    # 5. Set all existing users auto_assignment_enabled = false
    op.execute("UPDATE users SET auto_assignment_enabled = false")


def downgrade() -> None:
    op.alter_column(
        "users",
        "auto_assignment_enabled",
        server_default=sa.text("true"),
    )
    op.drop_column("users", "profile_status")
    bind = op.get_bind()
    postgresql.ENUM(name="profile_status").drop(bind, checkfirst=True)
