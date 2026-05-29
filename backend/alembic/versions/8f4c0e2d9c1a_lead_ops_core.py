"""lead ops core

Revision ID: 8f4c0e2d9c1a
Revises: 2a9e0b8a1f6b
Create Date: 2026-05-28

"""

from __future__ import annotations

import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "8f4c0e2d9c1a"
down_revision: Union[str, Sequence[str], None] = "2a9e0b8a1f6b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    lead_status = postgresql.ENUM(
        "New",
        "Contacted",
        "Qualified",
        "Unqualified",
        "Converted",
        "Archived",
        name="lead_status",
        create_type=False,
    )

    bind = op.get_bind()
    lead_status.create(bind, checkfirst=True)

    op.execute(sa.text("CREATE SEQUENCE IF NOT EXISTS lead_id_seq"))
    op.execute(sa.text("DROP TABLE IF EXISTS lead_import_batches CASCADE"))

    op.create_table(
        "lead_import_batches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("batch_code", sa.String(), nullable=False),
        sa.Column("filename", sa.String(), nullable=True),
        sa.Column(
            "imported_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.Column("imported_count", sa.Integer(), nullable=False),
        sa.Column("updated_count", sa.Integer(), nullable=False),
        sa.Column("skipped_duplicate_count", sa.Integer(), nullable=False),
        sa.Column("failed_count", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("organization_id", "batch_code", name="uq_batch_code_per_org"),
    )
    op.create_index(
        "ix_lead_import_batches_organization_id", "lead_import_batches", ["organization_id"]
    )
    op.create_index("ix_lead_import_batches_batch_code", "lead_import_batches", ["batch_code"])

    op.create_table(
        "lead_import_batch_counters",
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column("batch_date", sa.Date(), primary_key=True, nullable=False),
        sa.Column("counter", sa.Integer(), nullable=False),
    )

    op.add_column("leads", sa.Column("full_name", sa.String(), nullable=True))
    op.add_column("leads", sa.Column("lead_status", lead_status, nullable=True))
    op.add_column("leads", sa.Column("import_batch_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("leads", sa.Column("raw_data", postgresql.JSONB(), nullable=True))
    op.add_column(
        "leads",
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.add_column("leads", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("leads", sa.Column("deleted_by", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("leads", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("leads", sa.Column("archived_by", postgresql.UUID(as_uuid=True), nullable=True))

    op.create_foreign_key(
        "fk_leads_import_batch_id",
        "leads",
        "lead_import_batches",
        ["import_batch_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_leads_is_deleted", "leads", ["is_deleted"])
    op.create_index("ix_leads_lead_status", "leads", ["lead_status"])

    op.execute(
        sa.text(
            "UPDATE leads SET full_name = trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')) "
            "WHERE full_name IS NULL"
        )
    )
    op.execute(sa.text("UPDATE leads SET lead_status = 'New' WHERE lead_status IS NULL"))
    op.alter_column("leads", "full_name", nullable=False)
    op.alter_column("leads", "lead_status", nullable=False)

    op.create_foreign_key(
        "fk_leads_deleted_by",
        "leads",
        "users",
        ["deleted_by"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_leads_archived_by",
        "leads",
        "users",
        ["archived_by"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "lead_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "lead_id",
            sa.String(),
            sa.ForeignKey("leads.lead_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "actor_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "batch_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lead_import_batches.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("data", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_lead_events_organization_id", "lead_events", ["organization_id"])
    op.create_index("ix_lead_events_lead_id", "lead_events", ["lead_id"])
    op.create_index("ix_lead_events_created_at", "lead_events", ["created_at"])

    op.create_table(
        "lead_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "lead_id",
            sa.String(),
            sa.ForeignKey("leads.lead_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_lead_notes_organization_id", "lead_notes", ["organization_id"])
    op.create_index("ix_lead_notes_lead_id", "lead_notes", ["lead_id"])

    op.create_table(
        "lead_tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("organization_id", "name", name="uq_lead_tag_name_per_org"),
    )
    op.create_index("ix_lead_tags_organization_id", "lead_tags", ["organization_id"])

    op.create_table(
        "lead_tag_links",
        sa.Column(
            "lead_id",
            sa.String(),
            sa.ForeignKey("leads.lead_id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "tag_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lead_tags.id", ondelete="CASCADE"),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("lead_tag_links")
    op.drop_index("ix_lead_tags_organization_id", table_name="lead_tags")
    op.drop_table("lead_tags")

    op.drop_index("ix_lead_notes_lead_id", table_name="lead_notes")
    op.drop_index("ix_lead_notes_organization_id", table_name="lead_notes")
    op.drop_table("lead_notes")

    op.drop_index("ix_lead_events_created_at", table_name="lead_events")
    op.drop_index("ix_lead_events_lead_id", table_name="lead_events")
    op.drop_index("ix_lead_events_organization_id", table_name="lead_events")
    op.drop_table("lead_events")

    op.drop_constraint("fk_leads_archived_by", "leads", type_="foreignkey")
    op.drop_constraint("fk_leads_deleted_by", "leads", type_="foreignkey")
    op.drop_constraint("fk_leads_import_batch_id", "leads", type_="foreignkey")
    op.drop_index("ix_leads_lead_status", table_name="leads")
    op.drop_index("ix_leads_is_deleted", table_name="leads")
    op.drop_column("leads", "archived_by")
    op.drop_column("leads", "archived_at")
    op.drop_column("leads", "deleted_by")
    op.drop_column("leads", "deleted_at")
    op.drop_column("leads", "is_deleted")
    op.drop_column("leads", "raw_data")
    op.drop_column("leads", "import_batch_id")
    op.drop_column("leads", "lead_status")
    op.drop_column("leads", "full_name")

    op.drop_table("lead_import_batch_counters")
    op.drop_index("ix_lead_import_batches_batch_code", table_name="lead_import_batches")
    op.drop_index("ix_lead_import_batches_organization_id", table_name="lead_import_batches")
    op.drop_table("lead_import_batches")

    op.execute(sa.text("DROP SEQUENCE IF EXISTS lead_id_seq"))

    bind = op.get_bind()
    postgresql.ENUM(name="lead_status").drop(bind, checkfirst=True)
