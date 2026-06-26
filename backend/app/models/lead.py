from __future__ import annotations

from decimal import Decimal
from datetime import date, datetime

import uuid

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import (
    CompanySizeCategory,
    EstimatedBudget,
    FollowUpStatus,
    LeadSource,
    LeadStatus,
    PurchaseTimeline,
    SeniorityLevel,
)
from app.models.utils import enum_values


class Lead(Base):
    __tablename__ = "leads"

    lead_id: Mapped[str] = mapped_column(String, primary_key=True)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(String)
    first_name: Mapped[str] = mapped_column(String)
    last_name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, index=True)
    phone_number: Mapped[str] = mapped_column(String)
    job_title: Mapped[str] = mapped_column(String)
    seniority_level: Mapped[SeniorityLevel] = mapped_column(
        Enum(SeniorityLevel, name="seniority_level", values_callable=enum_values)
    )
    department: Mapped[str] = mapped_column(String)
    country: Mapped[str] = mapped_column(String)
    company_name: Mapped[str] = mapped_column(String)
    company_industry: Mapped[str] = mapped_column(String)
    company_size_category: Mapped[CompanySizeCategory] = mapped_column(
        Enum(CompanySizeCategory, name="company_size_category", values_callable=enum_values)
    )
    company_size_range: Mapped[str] = mapped_column(String)
    estimated_annual_revenue: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    lead_source: Mapped[LeadSource] = mapped_column(
        Enum(LeadSource, name="lead_source", values_callable=enum_values)
    )
    date_captured: Mapped[date] = mapped_column(Date)
    website_visits: Mapped[int] = mapped_column(Integer)
    pages_viewed: Mapped[int] = mapped_column(Integer)
    average_time_on_site: Mapped[float] = mapped_column(Float)
    email_open_rate: Mapped[float] = mapped_column(Float)
    email_click_rate: Mapped[float] = mapped_column(Float)
    webinar_attendance: Mapped[bool] = mapped_column(Boolean)
    last_interaction_days: Mapped[int] = mapped_column(Integer)
    meeting_scheduled: Mapped[bool] = mapped_column(Boolean)
    follow_up_status: Mapped[FollowUpStatus] = mapped_column(
        Enum(FollowUpStatus, name="follow_up_status", values_callable=enum_values)
    )
    estimated_budget: Mapped[EstimatedBudget] = mapped_column(
        Enum(EstimatedBudget, name="estimated_budget", values_callable=enum_values)
    )
    purchase_timeline: Mapped[PurchaseTimeline] = mapped_column(
        Enum(PurchaseTimeline, name="purchase_timeline", values_callable=enum_values)
    )
    lead_status: Mapped[LeadStatus] = mapped_column(
        Enum(LeadStatus, name="lead_status", values_callable=enum_values)
    )
    import_batch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lead_import_batches.id", ondelete="SET NULL"),
        nullable=True,
    )
    raw_data: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    converted: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    scores = relationship("LeadScore", back_populates="lead", cascade="all, delete-orphan")
    assignments = relationship(
        "LeadAssignment", back_populates="lead", cascade="all, delete-orphan"
    )
    events = relationship("LeadEvent", back_populates="lead", cascade="all, delete-orphan")
    notes = relationship("LeadNote", back_populates="lead", cascade="all, delete-orphan")
    tag_links = relationship("LeadTagLink", back_populates="lead", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="lead", cascade="all, delete-orphan")
    import_batch = relationship("LeadImportBatch", back_populates="leads")
