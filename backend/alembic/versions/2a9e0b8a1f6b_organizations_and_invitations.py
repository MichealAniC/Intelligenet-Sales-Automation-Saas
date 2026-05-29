"""organizations and invitations

Revision ID: 2a9e0b8a1f6b
Revises: 67275511a730
Create Date: 2026-05-26

"""

from __future__ import annotations

import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "2a9e0b8a1f6b"
down_revision: Union[str, Sequence[str], None] = "67275511a730"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    user_role = postgresql.ENUM("Admin", "Sales", name="user_role", create_type=False)

    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.add_column("users", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index("ix_users_organization_id", "users", ["organization_id"])
    op.create_foreign_key(
        "fk_users_organization_id",
        "users",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.add_column("leads", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index("ix_leads_organization_id", "leads", ["organization_id"])
    op.create_foreign_key(
        "fk_leads_organization_id",
        "leads",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.add_column(
        "lead_scores", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_index("ix_lead_scores_organization_id", "lead_scores", ["organization_id"])
    op.create_foreign_key(
        "fk_lead_scores_organization_id",
        "lead_scores",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.add_column(
        "lead_assignments",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_lead_assignments_organization_id", "lead_assignments", ["organization_id"])
    op.create_foreign_key(
        "fk_lead_assignments_organization_id",
        "lead_assignments",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.create_table(
        "invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column("token_hash", sa.String(), nullable=False),
        sa.Column(
            "invited_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_invitations_organization_id", "invitations", ["organization_id"])
    op.create_index("ix_invitations_email", "invitations", ["email"])
    op.create_index("ix_invitations_token_hash", "invitations", ["token_hash"])

    default_org_id = uuid.uuid4()
    op.bulk_insert(
        sa.table(
            "organizations",
            sa.column("id", postgresql.UUID(as_uuid=True)),
            sa.column("name", sa.String()),
        ),
        [{"id": default_org_id, "name": "Default Organization"}],
    )

    op.execute(
        sa.text("UPDATE users SET organization_id = :org_id WHERE organization_id IS NULL").bindparams(
            org_id=default_org_id
        )
    )
    op.execute(
        sa.text("UPDATE leads SET organization_id = :org_id WHERE organization_id IS NULL").bindparams(
            org_id=default_org_id
        )
    )
    op.execute(
        sa.text(
            "UPDATE lead_scores SET organization_id = :org_id WHERE organization_id IS NULL"
        ).bindparams(org_id=default_org_id)
    )
    op.execute(
        sa.text(
            "UPDATE lead_assignments SET organization_id = :org_id WHERE organization_id IS NULL"
        ).bindparams(org_id=default_org_id)
    )

    op.alter_column("users", "organization_id", nullable=False)
    op.alter_column("leads", "organization_id", nullable=False)
    op.alter_column("lead_scores", "organization_id", nullable=False)
    op.alter_column("lead_assignments", "organization_id", nullable=False)


def downgrade() -> None:
    op.alter_column("lead_assignments", "organization_id", nullable=True)
    op.alter_column("lead_scores", "organization_id", nullable=True)
    op.alter_column("leads", "organization_id", nullable=True)
    op.alter_column("users", "organization_id", nullable=True)

    op.drop_index("ix_invitations_token_hash", table_name="invitations")
    op.drop_index("ix_invitations_email", table_name="invitations")
    op.drop_index("ix_invitations_organization_id", table_name="invitations")
    op.drop_table("invitations")

    op.drop_constraint("fk_lead_assignments_organization_id", "lead_assignments", type_="foreignkey")
    op.drop_index("ix_lead_assignments_organization_id", table_name="lead_assignments")
    op.drop_column("lead_assignments", "organization_id")

    op.drop_constraint("fk_lead_scores_organization_id", "lead_scores", type_="foreignkey")
    op.drop_index("ix_lead_scores_organization_id", table_name="lead_scores")
    op.drop_column("lead_scores", "organization_id")

    op.drop_constraint("fk_leads_organization_id", "leads", type_="foreignkey")
    op.drop_index("ix_leads_organization_id", table_name="leads")
    op.drop_column("leads", "organization_id")

    op.drop_constraint("fk_users_organization_id", "users", type_="foreignkey")
    op.drop_index("ix_users_organization_id", table_name="users")
    op.drop_column("users", "organization_id")

    op.drop_table("organizations")
