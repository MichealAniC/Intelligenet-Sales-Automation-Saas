"""initial schema

Revision ID: 67275511a730
Revises: 
Create Date: 2026-05-21 15:22:06.209874

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '67275511a730'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    user_role = postgresql.ENUM("Admin", "Sales", name="user_role", create_type=False)
    seniority_level = postgresql.ENUM(
        "C-Suite",
        "VP",
        "Director",
        "Manager",
        "Staff",
        name="seniority_level",
        create_type=False,
    )
    company_size_category = postgresql.ENUM(
        "Startup",
        "SMB",
        "Mid-Market",
        "Enterprise",
        name="company_size_category",
        create_type=False,
    )
    lead_source = postgresql.ENUM(
        "LinkedIn",
        "Webinar",
        "Referral",
        "Cold Email",
        "Website",
        "Paid Ads",
        "Events",
        name="lead_source",
        create_type=False,
    )
    follow_up_status = postgresql.ENUM(
        "Positive",
        "Neutral",
        "Negative",
        "No Response",
        name="follow_up_status",
        create_type=False,
    )
    estimated_budget = postgresql.ENUM(
        "Low",
        "Medium",
        "High",
        name="estimated_budget",
        create_type=False,
    )
    purchase_timeline = postgresql.ENUM(
        "Immediate",
        "1-3 Months",
        "3-6 Months",
        "Future",
        name="purchase_timeline",
        create_type=False,
    )
    lead_category = postgresql.ENUM("Hot", "Warm", "Cold", name="lead_category", create_type=False)
    assignment_status = postgresql.ENUM(
        "Assigned",
        "In Progress",
        "Completed",
        name="assignment_status",
        create_type=False,
    )

    bind = op.get_bind()
    user_role.create(bind, checkfirst=True)
    seniority_level.create(bind, checkfirst=True)
    company_size_category.create(bind, checkfirst=True)
    lead_source.create(bind, checkfirst=True)
    follow_up_status.create(bind, checkfirst=True)
    estimated_budget.create(bind, checkfirst=True)
    purchase_timeline.create(bind, checkfirst=True)
    lead_category.create(bind, checkfirst=True)
    assignment_status.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("staff_id", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("staff_id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_staff_id", "users", ["staff_id"])
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "leads",
        sa.Column("lead_id", sa.String(), primary_key=True, nullable=False),
        sa.Column("first_name", sa.String(), nullable=False),
        sa.Column("last_name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("phone_number", sa.String(), nullable=False),
        sa.Column("job_title", sa.String(), nullable=False),
        sa.Column("seniority_level", seniority_level, nullable=False),
        sa.Column("department", sa.String(), nullable=False),
        sa.Column("country", sa.String(), nullable=False),
        sa.Column("company_name", sa.String(), nullable=False),
        sa.Column("company_industry", sa.String(), nullable=False),
        sa.Column("company_size_category", company_size_category, nullable=False),
        sa.Column("company_size_range", sa.String(), nullable=False),
        sa.Column("estimated_annual_revenue", sa.Numeric(18, 2), nullable=False),
        sa.Column("lead_source", lead_source, nullable=False),
        sa.Column("date_captured", sa.Date(), nullable=False),
        sa.Column("website_visits", sa.Integer(), nullable=False),
        sa.Column("pages_viewed", sa.Integer(), nullable=False),
        sa.Column("average_time_on_site", sa.Float(), nullable=False),
        sa.Column("email_open_rate", sa.Float(), nullable=False),
        sa.Column("email_click_rate", sa.Float(), nullable=False),
        sa.Column("webinar_attendance", sa.Boolean(), nullable=False),
        sa.Column("last_interaction_days", sa.Integer(), nullable=False),
        sa.Column("meeting_scheduled", sa.Boolean(), nullable=False),
        sa.Column("follow_up_status", follow_up_status, nullable=False),
        sa.Column("estimated_budget", estimated_budget, nullable=False),
        sa.Column("purchase_timeline", purchase_timeline, nullable=False),
        sa.Column("converted", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_leads_email", "leads", ["email"])

    op.create_table(
        "lead_scores",
        sa.Column(
            "score_id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False
        ),
        sa.Column(
            "lead_id",
            sa.String(),
            sa.ForeignKey("leads.lead_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("score_value", sa.Integer(), nullable=False),
        sa.Column("score_category", lead_category, nullable=False),
        sa.Column("prediction_probability", sa.Float(), nullable=False),
        sa.Column("prediction_result", sa.Boolean(), nullable=False),
        sa.Column("model_name", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_lead_scores_lead_id", "lead_scores", ["lead_id"])

    op.create_table(
        "lead_assignments",
        sa.Column(
            "assignment_id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "lead_id",
            sa.String(),
            sa.ForeignKey("leads.lead_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "assigned_to",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "assigned_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("assignment_priority", lead_category, nullable=False),
        sa.Column("assignment_status", assignment_status, nullable=False),
        sa.Column(
            "assignment_date",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_lead_assignments_lead_id", "lead_assignments", ["lead_id"])
    op.create_index(
        "ix_lead_assignments_assigned_to", "lead_assignments", ["assigned_to"]
    )


def downgrade() -> None:
    op.drop_index("ix_lead_assignments_assigned_to", table_name="lead_assignments")
    op.drop_index("ix_lead_assignments_lead_id", table_name="lead_assignments")
    op.drop_table("lead_assignments")

    op.drop_index("ix_lead_scores_lead_id", table_name="lead_scores")
    op.drop_table("lead_scores")

    op.drop_index("ix_leads_email", table_name="leads")
    op.drop_table("leads")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_staff_id", table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    sa.Enum("Assigned", "In Progress", "Completed", name="assignment_status").drop(
        bind, checkfirst=True
    )
    sa.Enum("Hot", "Warm", "Cold", name="lead_category").drop(bind, checkfirst=True)
    sa.Enum("Immediate", "1-3 Months", "3-6 Months", "Future", name="purchase_timeline").drop(
        bind, checkfirst=True
    )
    sa.Enum("Low", "Medium", "High", name="estimated_budget").drop(bind, checkfirst=True)
    sa.Enum("Positive", "Neutral", "Negative", "No Response", name="follow_up_status").drop(
        bind, checkfirst=True
    )
    sa.Enum(
        "LinkedIn",
        "Webinar",
        "Referral",
        "Cold Email",
        "Website",
        "Paid Ads",
        "Events",
        name="lead_source",
    ).drop(bind, checkfirst=True)
    sa.Enum(
        "Startup", "SMB", "Mid-Market", "Enterprise", name="company_size_category"
    ).drop(bind, checkfirst=True)
    sa.Enum("C-Suite", "VP", "Director", "Manager", "Staff", name="seniority_level").drop(
        bind, checkfirst=True
    )
    sa.Enum("Admin", "Sales", name="user_role").drop(bind, checkfirst=True)
