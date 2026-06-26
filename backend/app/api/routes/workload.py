from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, aliased

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.lead import Lead
from app.models.lead_assignment import LeadAssignment
from app.models.enums import UserRole, LeadLifecycleState
from app.models.user import User
from app.schemas.workload import WorkloadDashboard, TeamWorkloadResponse, TeamMemberWorkload

router = APIRouter(prefix="/workload", tags=["workload"])


# ---------------------------------------------------------------------------
# Helper function to calculate capacity from performance rating
# ---------------------------------------------------------------------------
def _get_capacity(rating: int) -> int:
    _CAPACITY_BANDS: list[tuple[int, int, int]] = [
        (90, 100, 150),
        (80, 89, 120),
        (70, 79, 100),
        (60, 69, 80),
        (50, 59, 60),
        (0, 49, 40),
    ]
    for lo, hi, cap in _CAPACITY_BANDS:
        if lo <= rating <= hi:
            return cap
    return 40


# ---------------------------------------------------------------------------
# Helper to count leads by lifecycle state for a user
# ---------------------------------------------------------------------------
def _get_lead_counts(db: Session, user_id: uuid.UUID, organization_id: uuid.UUID):
    # Get latest assignment per lead
    assignment_max = (
        select(
            LeadAssignment.lead_id,
            func.max(LeadAssignment.assignment_date).label("max_assignment_date"),
        )
        .where(
            LeadAssignment.organization_id == organization_id,
            LeadAssignment.assigned_to == user_id,
        )
        .group_by(LeadAssignment.lead_id)
        .subquery()
    )
    latest_assignment = aliased(LeadAssignment)

    stmt = (
        select(Lead)
        .join(assignment_max, assignment_max.c.lead_id == Lead.lead_id)
        .join(
            latest_assignment,
            and_(
                latest_assignment.lead_id == assignment_max.c.lead_id,
                latest_assignment.assignment_date == assignment_max.c.max_assignment_date,
            ),
        )
        .where(
            Lead.organization_id == organization_id,
            Lead.is_deleted.is_(False),
        )
    )

    leads = db.scalars(stmt).all()
    counts = {
        LeadLifecycleState.ACTIVE: 0,
        LeadLifecycleState.NURTURING: 0,
        LeadLifecycleState.CLOSED_WON: 0,
        LeadLifecycleState.CLOSED_LOST: 0,
    }
    for lead in leads:
        if lead.lifecycle_state in counts:
            counts[lead.lifecycle_state] += 1
    return counts


# ---------------------------------------------------------------------------
# GET /workload/my-dashboard
# ---------------------------------------------------------------------------
@router.get("/my-dashboard", response_model=WorkloadDashboard)
def get_my_workload(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.SALES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Sales members can access this endpoint"
        )

    counts = _get_lead_counts(db, current_user.id, current_user.organization_id)
    capacity = _get_capacity(current_user.performance_rating or 0)
    active = counts[LeadLifecycleState.ACTIVE]
    available = capacity - active
    utilization = (active / capacity) if capacity > 0 else 0.0

    return WorkloadDashboard(
        user_id=current_user.id,
        capacity=capacity,
        active_leads=active,
        available_capacity=available,
        utilization=utilization,
        nurturing_leads=counts[LeadLifecycleState.NURTURING],
        won_leads=counts[LeadLifecycleState.CLOSED_WON],
        lost_leads=counts[LeadLifecycleState.CLOSED_LOST],
    )


# ---------------------------------------------------------------------------
# GET /workload/team
# ---------------------------------------------------------------------------
@router.get("/team", response_model=TeamWorkloadResponse)
def get_team_workload(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins can access this endpoint"
        )

    stmt = (
        select(User)
        .where(
            User.organization_id == current_user.organization_id,
            User.role == UserRole.SALES,
        )
    )
    users = db.scalars(stmt).all()
    team_workload = []
    for user in users:
        counts = _get_lead_counts(db, user.id, user.organization_id)
        capacity = _get_capacity(user.performance_rating or 0)
        active = counts[LeadLifecycleState.ACTIVE]
        available = capacity - active
        utilization = (active / capacity) if capacity > 0 else 0.0

        team_workload.append(
            TeamMemberWorkload(
                user_id=user.id,
                staff_id=user.staff_id,
                full_name=user.full_name,
                sales_profile=user.sales_profile,
                availability_status=user.availability_status,
                performance_rating=user.performance_rating or 0,
                industry_specializations=user.industry_specializations or [],
                auto_assignment_enabled=user.auto_assignment_enabled or False,
                profile_status=user.profile_status,
                capacity=capacity,
                active_leads=active,
                available_capacity=available,
                utilization=utilization,
                nurturing_leads=counts[LeadLifecycleState.NURTURING],
                won_leads=counts[LeadLifecycleState.CLOSED_WON],
                lost_leads=counts[LeadLifecycleState.CLOSED_LOST],
            )
        )

    return TeamWorkloadResponse(team_workload=team_workload)
