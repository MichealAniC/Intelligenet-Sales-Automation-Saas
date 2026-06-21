from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, aliased

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.enums import LeadCategory, LeadStatus, UserRole
from app.models.lead import Lead
from app.models.lead_assignment import LeadAssignment
from app.models.lead_score import LeadScore
from app.models.user import User
from app.schemas.dashboard import DashboardOverview, DashboardRecentScore, PipelineStageCount, SalesDashboardOverview
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


@router.get("/sales-overview", response_model=SalesDashboardOverview)
def get_sales_dashboard_overview(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> SalesDashboardOverview:
    """Sales Member personalized command center metrics."""
    if user.role != UserRole.SALES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    assignment_max = (
        select(
            LeadAssignment.lead_id.label("lead_id"),
            func.max(LeadAssignment.assignment_date).label("max_assignment_date"),
        )
        .where(LeadAssignment.organization_id == user.organization_id)
        .group_by(LeadAssignment.lead_id)
        .subquery()
    )
    latest_assignment = aliased(LeadAssignment)

    # Assigned lead IDs base query
    assigned_ids_q = (
        select(Lead.lead_id)
        .where(Lead.organization_id == user.organization_id, Lead.is_deleted.is_(False))
        .join(assignment_max, assignment_max.c.lead_id == Lead.lead_id)
        .join(
            latest_assignment,
            and_(
                latest_assignment.lead_id == Lead.lead_id,
                latest_assignment.assignment_date == assignment_max.c.max_assignment_date,
            ),
        )
        .where(latest_assignment.assigned_to == user.id)
        .subquery()
    )

    # Total assigned
    total_assigned = int(db.scalar(select(func.count()).select_from(assigned_ids_q)) or 0)

    # Score subquery scoped to assigned leads
    score_max = (
        select(
            LeadScore.lead_id.label("lead_id"),
            func.max(LeadScore.created_at).label("max_created_at"),
        )
        .where(LeadScore.organization_id == user.organization_id)
        .group_by(LeadScore.lead_id)
        .subquery()
    )
    latest_score = aliased(LeadScore)

    # Hot count (score_value >= 80) among assigned
    hot_stmt = (
        select(func.count())
        .select_from(Lead)
        .where(Lead.lead_id.in_(select(assigned_ids_q)))
        .join(score_max, score_max.c.lead_id == Lead.lead_id)
        .join(
            latest_score,
            and_(latest_score.lead_id == Lead.lead_id, latest_score.created_at == score_max.c.max_created_at),
        )
        .where(latest_score.score_value >= 80)
    )
    hot_count = int(db.scalar(hot_stmt) or 0)

    # Open opportunities: assigned leads with status NOT IN (Converted, Archived)
    open_stmt = (
        select(func.count())
        .select_from(Lead)
        .where(
            Lead.lead_id.in_(select(assigned_ids_q)),
            Lead.lead_status.notin_([LeadStatus.CONVERTED, LeadStatus.ARCHIVED]),
        )
    )
    open_opportunities = int(db.scalar(open_stmt) or 0)

    # Closed won: assigned leads with status = Converted
    won_stmt = (
        select(func.count())
        .select_from(Lead)
        .where(Lead.lead_id.in_(select(assigned_ids_q)), Lead.lead_status == LeadStatus.CONVERTED)
    )
    closed_won_count = int(db.scalar(won_stmt) or 0)

    # Pipeline stage counts for assigned leads
    stage_stmt = (
        select(Lead.lead_status, func.count())
        .where(Lead.lead_id.in_(select(assigned_ids_q)))
        .group_by(Lead.lead_status)
    )
    pipeline_stages = [
        PipelineStageCount(stage=row[0] if isinstance(row[0], str) else row[0].value, count=int(row[1]))
        for row in db.execute(stage_stmt).all()
    ]

    # Priority leads: assigned leads sorted by score desc, limit 10
    assignee = aliased(User)
    priority_stmt = (
        select(latest_score, Lead, latest_assignment, assignee)
        .select_from(Lead)
        .join(assignment_max, assignment_max.c.lead_id == Lead.lead_id)
        .join(
            latest_assignment,
            and_(
                latest_assignment.lead_id == Lead.lead_id,
                latest_assignment.assignment_date == assignment_max.c.max_assignment_date,
            ),
        )
        .outerjoin(score_max, score_max.c.lead_id == Lead.lead_id)
        .outerjoin(
            latest_score,
            and_(latest_score.lead_id == Lead.lead_id, latest_score.created_at == score_max.c.max_created_at),
        )
        .outerjoin(assignee, assignee.id == latest_assignment.assigned_to)
        .where(Lead.lead_id.in_(select(assigned_ids_q)))
        .order_by(latest_score.score_value.desc().nullslast())
        .limit(10)
    )
    priority_rows = db.execute(priority_stmt).all()
    priority_leads: list[DashboardRecentScore] = []
    for score, lead, assignment, rep in priority_rows:
        priority_leads.append(
            DashboardRecentScore(
                lead_id=lead.lead_id,
                lead_name=lead.full_name,
                company_name=lead.company_name,
                score_value=score.score_value if score else 0,
                score_category=score.score_category if score else "Cold",
                prediction_probability=score.prediction_probability if score else None,
                recommended_action=decide(score.score_category).action if score else None,
                created_at=score.created_at if score else lead.created_at,
                assigned_to_staff_id=getattr(rep, "staff_id", None) if rep else None,
                assigned_to_name=getattr(rep, "full_name", None) if rep else None,
                lead_status=lead.lead_status.value if lead.lead_status else None,
            )
        )

    return SalesDashboardOverview(
        total_assigned=total_assigned,
        hot_count=hot_count,
        open_opportunities=open_opportunities,
        closed_won_count=closed_won_count,
        pipeline_stages=pipeline_stages,
        priority_leads=priority_leads,
    )
