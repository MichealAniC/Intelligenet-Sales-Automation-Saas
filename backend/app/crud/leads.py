from __future__ import annotations

from decimal import Decimal

import sqlalchemy as sa
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lead import Lead
from app.models.lead_assignment import LeadAssignment
from app.models.enums import LeadStatus
from app.schemas.lead import LeadCreate


def generate_lead_id(db: Session) -> str:
    n = db.execute(sa.text("SELECT nextval('lead_id_seq')")).scalar_one()
    return f"LD-{int(n):06d}"


def create_lead(
    db: Session,
    *,
    organization_id,
    payload: LeadCreate,
    import_batch_id=None,
    raw_data: dict[str, object] | None = None,
) -> Lead:
    lead = Lead(
        lead_id=generate_lead_id(db),
        organization_id=organization_id,
        full_name=str(payload.full_name),
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=str(payload.email),
        phone_number=payload.phone_number,
        job_title=payload.job_title,
        seniority_level=payload.seniority_level,
        department=payload.department,
        country=payload.country,
        company_name=payload.company_name,
        company_industry=payload.company_industry,
        company_size_category=payload.company_size_category,
        company_size_range=payload.company_size_range,
        estimated_annual_revenue=Decimal(payload.estimated_annual_revenue),
        lead_source=payload.lead_source,
        date_captured=payload.date_captured,
        website_visits=payload.website_visits,
        pages_viewed=payload.pages_viewed,
        average_time_on_site=float(payload.average_time_on_site),
        email_open_rate=float(payload.email_open_rate),
        email_click_rate=float(payload.email_click_rate),
        webinar_attendance=payload.webinar_attendance,
        last_interaction_days=payload.last_interaction_days,
        meeting_scheduled=payload.meeting_scheduled,
        follow_up_status=payload.follow_up_status,
        estimated_budget=payload.estimated_budget,
        purchase_timeline=payload.purchase_timeline,
        lead_status=payload.lead_status or LeadStatus.NEW,
        import_batch_id=import_batch_id,
        raw_data=raw_data,
        is_deleted=False,
        converted=False,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def update_lead(db: Session, *, lead: Lead, payload: LeadCreate) -> Lead:
    lead.full_name = str(payload.full_name)
    lead.first_name = payload.first_name
    lead.last_name = payload.last_name
    lead.email = str(payload.email)
    lead.phone_number = payload.phone_number
    lead.job_title = payload.job_title
    lead.seniority_level = payload.seniority_level
    lead.department = payload.department
    lead.country = payload.country
    lead.company_name = payload.company_name
    lead.company_industry = payload.company_industry
    lead.company_size_category = payload.company_size_category
    lead.company_size_range = payload.company_size_range
    lead.estimated_annual_revenue = Decimal(payload.estimated_annual_revenue)
    lead.lead_source = payload.lead_source
    lead.date_captured = payload.date_captured
    lead.website_visits = payload.website_visits
    lead.pages_viewed = payload.pages_viewed
    lead.average_time_on_site = float(payload.average_time_on_site)
    lead.email_open_rate = float(payload.email_open_rate)
    lead.email_click_rate = float(payload.email_click_rate)
    lead.webinar_attendance = payload.webinar_attendance
    lead.last_interaction_days = payload.last_interaction_days
    lead.meeting_scheduled = payload.meeting_scheduled
    lead.follow_up_status = payload.follow_up_status
    lead.estimated_budget = payload.estimated_budget
    lead.purchase_timeline = payload.purchase_timeline
    lead.lead_status = payload.lead_status or lead.lead_status
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def get_lead_by_email(db: Session, *, organization_id, email: str) -> Lead | None:
    stmt = select(Lead).where(Lead.organization_id == organization_id, Lead.email == email)
    return db.scalar(stmt)


def get_lead(db: Session, *, organization_id, lead_id: str) -> Lead | None:
    stmt = select(Lead).where(Lead.organization_id == organization_id, Lead.lead_id == lead_id)
    return db.scalar(stmt)


def list_leads(db: Session, *, organization_id, limit: int = 50, offset: int = 0) -> list[Lead]:
    stmt = (
        select(Lead)
        .where(Lead.organization_id == organization_id, Lead.is_deleted.is_(False))
        .order_by(Lead.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(stmt))


def list_assigned_leads(
    db: Session,
    *,
    organization_id,
    assigned_to,
    limit: int = 50,
    offset: int = 0,
) -> list[Lead]:
    stmt = (
        select(Lead)
        .join(LeadAssignment, LeadAssignment.lead_id == Lead.lead_id)
        .where(
            Lead.organization_id == organization_id,
            Lead.is_deleted.is_(False),
            LeadAssignment.organization_id == organization_id,
            LeadAssignment.assigned_to == assigned_to,
        )
        .order_by(Lead.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(stmt))


def is_lead_assigned_to(
    db: Session,
    *,
    organization_id,
    lead_id: str,
    assigned_to,
) -> bool:
    stmt = (
        select(LeadAssignment.assignment_id)
        .where(
            LeadAssignment.organization_id == organization_id,
            LeadAssignment.lead_id == lead_id,
            LeadAssignment.assigned_to == assigned_to,
        )
        .limit(1)
    )
    return db.scalar(stmt) is not None
