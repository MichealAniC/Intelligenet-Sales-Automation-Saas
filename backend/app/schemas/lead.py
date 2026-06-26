from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.enums import (
    CompanySizeCategory,
    EstimatedBudget,
    FollowUpStatus,
    LeadSource,
    LeadStatus,
    PurchaseTimeline,
    SeniorityLevel,
    LeadLifecycleState,
)

try:
    from pydantic import model_validator
except Exception:
    model_validator = None


class LeadCreate(BaseModel):
    full_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr
    phone_number: str
    job_title: str
    seniority_level: SeniorityLevel
    department: str
    country: str
    company_name: str
    company_industry: str
    company_size_category: CompanySizeCategory
    company_size_range: str
    estimated_annual_revenue: Decimal
    lead_source: LeadSource
    date_captured: date
    website_visits: int
    pages_viewed: int
    average_time_on_site: float
    email_open_rate: float
    email_click_rate: float
    webinar_attendance: bool
    last_interaction_days: int
    meeting_scheduled: bool
    follow_up_status: FollowUpStatus
    estimated_budget: EstimatedBudget
    purchase_timeline: PurchaseTimeline
    lead_status: LeadStatus | None = None
    lifecycle_state: LeadLifecycleState = LeadLifecycleState.ACTIVE
    next_followup_date: datetime | None = None

    if model_validator is not None:

        @model_validator(mode="after")
        def _normalize_names(self) -> "LeadCreate":
            full_name = (self.full_name or "").strip()
            first_name = (self.first_name or "").strip()
            last_name = (self.last_name or "").strip()

            if not full_name:
                full_name = f"{first_name} {last_name}".strip()

            if not first_name and full_name:
                parts = [p for p in full_name.split(" ") if p]
                if parts:
                    first_name = parts[0]
                    last_name = " ".join(parts[1:]).strip()

            self.full_name = full_name.strip()
            self.first_name = first_name.strip() or "Unknown"
            self.last_name = last_name.strip() or "Unknown"
            return self


class LeadUpdate(BaseModel):
    full_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone_number: str | None = None
    job_title: str | None = None
    seniority_level: SeniorityLevel | None = None
    department: str | None = None
    country: str | None = None
    company_name: str | None = None
    company_industry: str | None = None
    company_size_category: CompanySizeCategory | None = None
    company_size_range: str | None = None
    estimated_annual_revenue: Decimal | None = None
    lead_source: LeadSource | None = None
    date_captured: date | None = None
    website_visits: int | None = None
    pages_viewed: int | None = None
    average_time_on_site: float | None = None
    email_open_rate: float | None = None
    email_click_rate: float | None = None
    webinar_attendance: bool | None = None
    last_interaction_days: int | None = None
    meeting_scheduled: bool | None = None
    follow_up_status: FollowUpStatus | None = None
    estimated_budget: EstimatedBudget | None = None
    purchase_timeline: PurchaseTimeline | None = None
    lead_status: LeadStatus | None = None
    lifecycle_state: LeadLifecycleState | None = None
    next_followup_date: datetime | None = None
    converted: bool | None = None


class LeadPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lead_id: str
    full_name: str
    first_name: str
    last_name: str
    email: EmailStr
    phone_number: str
    job_title: str
    seniority_level: SeniorityLevel
    department: str
    country: str
    company_name: str
    company_industry: str
    company_size_category: CompanySizeCategory
    company_size_range: str
    estimated_annual_revenue: Decimal
    lead_source: LeadSource
    date_captured: date
    website_visits: int
    pages_viewed: int
    average_time_on_site: float
    email_open_rate: float
    email_click_rate: float
    webinar_attendance: bool
    last_interaction_days: int
    meeting_scheduled: bool
    follow_up_status: FollowUpStatus
    estimated_budget: EstimatedBudget
    purchase_timeline: PurchaseTimeline
    lead_status: LeadStatus
    lifecycle_state: LeadLifecycleState
    next_followup_date: datetime | None
    converted: bool
    created_at: datetime
