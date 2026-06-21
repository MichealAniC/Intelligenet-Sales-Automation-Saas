"""prescriptive lead routing – user profile attributes

Revision ID: a3b7c9e1f204
Revises: 8f4c0e2d9c1a
Create Date: 2026-06-08

"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "a3b7c9e1f204"
down_revision: Union[str, Sequence[str], None] = "8f4c0e2d9c1a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create custom ENUM types
    sales_profile_enum = postgresql.ENUM(
        "Junior Sales Rep",
        "Senior Sales Rep",
        "Industry Specialist",
        "Top Performer",
        name="sales_profile",
        create_type=False,
    )
    availability_status_enum = postgresql.ENUM(
        "Available",
        "Busy",
        "On Leave",
        "Inactive",
        name="availability_status",
        create_type=False,
    )

    bind = op.get_bind()
    sales_profile_enum.create(bind, checkfirst=True)
    availability_status_enum.create(bind, checkfirst=True)

    # Add columns to users table
    op.add_column(
        "users",
        sa.Column("sales_profile", sales_profile_enum, nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "availability_status",
            availability_status_enum,
            nullable=False,
            server_default="Available",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "performance_rating",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "industry_specializations",
            postgresql.ARRAY(sa.String()),
            nullable=False,
            server_default="{}",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "auto_assignment_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "auto_assignment_enabled")
    op.drop_column("users", "industry_specializations")
    op.drop_column("users", "performance_rating")
    op.drop_column("users", "availability_status")
    op.drop_column("users", "sales_profile")

    bind = op.get_bind()
    postgresql.ENUM(name="availability_status").drop(bind, checkfirst=True)
    postgresql.ENUM(name="sales_profile").drop(bind, checkfirst=True)
