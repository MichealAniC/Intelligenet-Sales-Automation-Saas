from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, aliased

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.enums import LeadCategory, UserRole
from app.models.lead import Lead
from app.models.lead_assignment import LeadAssignment
from app.models.lead_score import LeadScore
from app.models.user import User
from app.schemas.dashboard import DashboardOverview, DashboardRecentScore
from app.services.prescriptive import decide

router = APIRouter(prefix="/dashboard")


@router.get("/overview", response_model=DashboardOverview)
def get_dashboard_overview(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DashboardOverview:
    if user.role not in {UserRole.ADMIN, UserRole.SALES}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    total_leads_stmt = (
        select(func.count())
        .select_from(Lead)
        .where(Lead.organization_id == user.organization_id, Lead.is_deleted.is_(False))
    )
    total_leads = int(db.scalar(total_leads_stmt) or 0)

    score_max = (
        select(LeadScore.lead_id.label("lead_id"), func.max(LeadScore.created_at).label("max_created_at"))
        .where(LeadScore.organization_id == user.organization_id)
        .group_by(LeadScore.lead_id)
        .subquery()
    )
    latest_score = aliased(LeadScore)

    assignment_max = (
        select(LeadAssignment.lead_id.label("lead_id"), func.max(LeadAssignment.assignment_date).label("max_assignment_date"))
        .where(LeadAssignment.organization_id == user.organization_id)
        .group_by(LeadAssignment.lead_id)
        .subquery()
    )
    latest_assignment = aliased(LeadAssignment)

    scored_stmt = select(func.count()).select_from(score_max)
    scored_leads = int(db.scalar(scored_stmt) or 0)

    tier_counts_stmt = (
        select(latest_score.score_category, func.count())
        .select_from(Lead)
        .where(Lead.organization_id == user.organization_id, Lead.is_deleted.is_(False))
        .outerjoin(score_max, score_max.c.lead_id == Lead.lead_id)
        .outerjoin(
            latest_score,
            and_(latest_score.lead_id == Lead.lead_id, latest_score.created_at == score_max.c.max_created_at),
        )
        .group_by(latest_score.score_category)
    )
    tier_rows = db.execute(tier_counts_stmt).all()
    by_tier = {k: int(v) for k, v in tier_rows if k is not None}

    assigned_stmt = (
        select(func.count())
        .select_from(Lead)
        .where(Lead.organization_id == user.organization_id, Lead.is_deleted.is_(False))
        .outerjoin(assignment_max, assignment_max.c.lead_id == Lead.lead_id)
        .outerjoin(
            latest_assignment,
            and_(
                latest_assignment.lead_id == Lead.lead_id,
                latest_assignment.assignment_date == assignment_max.c.max_assignment_date,
            ),
        )
        .where(latest_assignment.assigned_to.is_not(None))
    )
    if user.role == UserRole.SALES:
        assigned_stmt = assigned_stmt.where(latest_assignment.assigned_to == user.id)
    assigned_leads = int(db.scalar(assigned_stmt) or 0)

    unassigned_leads = max(0, total_leads - assigned_leads) if user.role == UserRole.ADMIN else 0

    assignee = aliased(User)
    recent_stmt = (
        select(latest_score, Lead, latest_assignment, assignee)
        .select_from(latest_score)
        .join(Lead, Lead.lead_id == latest_score.lead_id)
        .outerjoin(assignment_max, assignment_max.c.lead_id == Lead.lead_id)
        .outerjoin(
            latest_assignment,
            and_(
                latest_assignment.lead_id == Lead.lead_id,
                latest_assignment.assignment_date == assignment_max.c.max_assignment_date,
            ),
        )
        .outerjoin(assignee, assignee.id == latest_assignment.assigned_to)
        .where(
            latest_score.organization_id == user.organization_id,
            Lead.organization_id == user.organization_id,
            Lead.is_deleted.is_(False),
        )
        .order_by(latest_score.created_at.desc())
        .limit(8)
    )
    if user.role == UserRole.SALES:
        recent_stmt = recent_stmt.where(latest_assignment.assigned_to == user.id)

    recent_rows = db.execute(recent_stmt).all()
    recent_scores: list[DashboardRecentScore] = []
    for score, lead, assignment, rep in recent_rows:
        recent_scores.append(
            DashboardRecentScore(
                lead_id=lead.lead_id,
                lead_name=lead.full_name,
                company_name=lead.company_name,
                score_value=score.score_value,
                score_category=score.score_category,
                prediction_probability=score.prediction_probability,
                recommended_action=decide(score.score_category).action,
                created_at=score.created_at,
                assigned_to_staff_id=getattr(rep, "staff_id", None) if rep is not None else None,
                assigned_to_name=getattr(rep, "full_name", None) if rep is not None else None,
            )
        )

    return DashboardOverview(
        total_leads=total_leads,
        scored_leads=scored_leads,
        hot_count=by_tier.get(LeadCategory.HOT, 0),
        warm_count=by_tier.get(LeadCategory.WARM, 0),
        cold_count=by_tier.get(LeadCategory.COLD, 0),
        assigned_leads=assigned_leads,
        unassigned_leads=unassigned_leads,
        recent_scores=recent_scores,
    )
