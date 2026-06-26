from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, aliased

from app.api.deps import get_current_user, get_db
from app.models.enums import UserRole
from app.models.lead import Lead
from app.models.lead_assignment import LeadAssignment
from app.models.lead_score import LeadScore
from app.models.user import User
from app.schemas.analytics import AnalyticsOverview


router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
def get_analytics_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Base filters
    base_filters = [
        Lead.organization_id == current_user.organization_id,
        Lead.is_deleted.is_(False),
    ]

    # If user is SALES, filter to leads assigned to them
    if current_user.role == UserRole.SALES:
        assignment_max = (
            select(
                LeadAssignment.lead_id,
                func.max(LeadAssignment.assignment_date).label("max_assignment_date"),
            )
            .where(
                LeadAssignment.organization_id == current_user.organization_id,
                LeadAssignment.assigned_to == current_user.id,
            )
            .group_by(LeadAssignment.lead_id)
            .subquery()
        )
        latest_assignment = aliased(LeadAssignment)
        # We need to get lead_ids assigned to current user
        assigned_lead_ids = select(Lead.lead_id).where(
            Lead.organization_id == current_user.organization_id,
            Lead.is_deleted.is_(False),
        ).join(
            assignment_max, assignment_max.c.lead_id == Lead.lead_id
        ).join(
            latest_assignment,
            and_(
                latest_assignment.lead_id == assignment_max.c.lead_id,
                latest_assignment.assignment_date == assignment_max.c.max_assignment_date,
            )
        )
        base_filters.append(Lead.lead_id.in_(assigned_lead_ids))

    # 1. Total pipeline value: sum of estimated_annual_revenue for active leads
    total_pipeline_value = db.scalar(
        select(func.sum(Lead.estimated_annual_revenue))
        .where(and_(*base_filters, Lead.lifecycle_state == "ACTIVE"))
    ) or 0

    # 2. Leads by status
    status_counts = db.execute(
        select(Lead.lead_status, func.count())
        .where(and_(*base_filters))
        .group_by(Lead.lead_status)
    ).all()
    leads_by_status = {str(status.value if hasattr(status, "value") else status): count for status, count in status_counts}

    # 3. Leads by source
    source_counts = db.execute(
        select(Lead.lead_source, func.count())
        .where(and_(*base_filters))
        .group_by(Lead.lead_source)
    ).all()
    leads_by_source = {str(source.value if hasattr(source, "value") else source): count for source, count in source_counts}

    # 4. Leads by tier (using latest score category)
    score_max = (
        select(LeadScore.lead_id, func.max(LeadScore.created_at).label("max_created_at"))
        .where(LeadScore.organization_id == current_user.organization_id)
        .group_by(LeadScore.lead_id)
        .subquery()
    )
    latest_score = aliased(LeadScore)
    tier_query = (
        select(latest_score.score_category, func.count())
        .select_from(Lead)
        .where(and_(*base_filters))
        .outerjoin(score_max, score_max.c.lead_id == Lead.lead_id)
        .outerjoin(
            latest_score,
            and_(
                latest_score.lead_id == Lead.lead_id,
                latest_score.created_at == score_max.c.max_created_at,
            )
        )
        .group_by(latest_score.score_category)
    )
    tier_counts = db.execute(tier_query).all()
    leads_by_tier = {str(tier.value if hasattr(tier, "value") else tier): count for tier, count in tier_counts if tier is not None}

    return AnalyticsOverview(
        total_pipeline_value=total_pipeline_value,
        leads_by_status=leads_by_status,
        leads_by_source=leads_by_source,
        leads_by_tier=leads_by_tier,
    )
