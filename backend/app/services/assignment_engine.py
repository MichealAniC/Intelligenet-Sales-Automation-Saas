"""Prescriptive Lead Routing Engine – 7-Step Deterministic Waterfall.

This service scores eligible sales candidates against a lead's
characteristics and assigns the lead to the highest-scoring rep.

Steps
-----
1. Read Lead characteristics (Industry, Tier, Score).
2. Fetch eligible Sales Members (role=Sales, Available, auto-assignment on).
3. Score candidates by Industry Specialization match.
4. Score by Lead Tier (Hot/Warm/Cold × SalesProfile).
5. Score by Performance Rating.
6. Evaluate Capacity Utilization (derived from rating bands).
7. Select top-scoring candidate and persist the assignment.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session, aliased

from app.models.enums import (
    AssignmentStatus,
    AvailabilityStatus,
    LeadCategory,
    ProfileStatus,
    SalesProfile,
    UserRole,
)
from app.models.lead_assignment import LeadAssignment
from app.models.lead_event import LeadEvent
from app.models.lead_score import LeadScore
from app.models.user import User


# ---------------------------------------------------------------------------
# Capacity bands: performance_rating → max concurrent active assignments
# ---------------------------------------------------------------------------
_CAPACITY_BANDS: list[tuple[int, int, int]] = [
    (90, 100, 150),
    (80, 89, 120),
    (70, 79, 100),
    (60, 69, 80),
    (50, 59, 60),
    (0, 49, 40),
]


def _get_capacity(rating: int) -> int:
    for lo, hi, cap in _CAPACITY_BANDS:
        if lo <= rating <= hi:
            return cap
    return 40


# ---------------------------------------------------------------------------
# Tier → profile preference weights
# ---------------------------------------------------------------------------
_TIER_PROFILE_WEIGHTS: dict[LeadCategory, dict[SalesProfile, float]] = {
    LeadCategory.HOT: {
        SalesProfile.TOP_PERFORMER: 25,
        SalesProfile.SENIOR_SALES_REP: 22,
        SalesProfile.INDUSTRY_SPECIALIST: 15,
        SalesProfile.JUNIOR_SALES_REP: 5,
    },
    LeadCategory.WARM: {
        SalesProfile.SENIOR_SALES_REP: 20,
        SalesProfile.INDUSTRY_SPECIALIST: 18,
        SalesProfile.TOP_PERFORMER: 15,
        SalesProfile.JUNIOR_SALES_REP: 12,
    },
    LeadCategory.COLD: {
        SalesProfile.JUNIOR_SALES_REP: 25,
        SalesProfile.INDUSTRY_SPECIALIST: 15,
        SalesProfile.SENIOR_SALES_REP: 8,
        SalesProfile.TOP_PERFORMER: 5,
    },
}


# ---------------------------------------------------------------------------
# Data class for candidate scoring details
# ---------------------------------------------------------------------------
@dataclass
class _CandidateScore:
    user: User
    total: float
    industry_score: float
    tier_score: float
    performance_score: float
    capacity_penalty: float
    utilization: float


# ---------------------------------------------------------------------------
# Step 2: Fetch eligible candidates
# ---------------------------------------------------------------------------
def _fetch_eligible_candidates(
    db: Session, *, organization_id
) -> list[User]:
    stmt = select(User).where(
        User.organization_id == organization_id,
        User.role == UserRole.SALES,
        User.profile_status == ProfileStatus.ACTIVE,
        User.availability_status == AvailabilityStatus.AVAILABLE,
        User.auto_assignment_enabled.is_(True),
    )
    return list(db.scalars(stmt).all())


# ---------------------------------------------------------------------------
# Step 6: Get active lead count (lifecycle_state=ACTIVE) for a user
# ---------------------------------------------------------------------------
from app.models.lead import Lead
from app.models.enums import LeadLifecycleState


def _get_active_count(db: Session, *, user_id, organization_id) -> int:
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
        select(func.count())
        .select_from(Lead)
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
            Lead.lifecycle_state == LeadLifecycleState.ACTIVE,
        )
    )
    return db.scalar(stmt) or 0


# ---------------------------------------------------------------------------
# Steps 3-6: Score a single candidate
# ---------------------------------------------------------------------------
def _score_candidate(
    db: Session,
    *,
    user: User,
    lead_industry: str,
    tier: LeadCategory,
    organization_id,
) -> _CandidateScore:
    # Step 3 – Industry Specialization match (max 30 pts)
    specs = [s.lower().strip() for s in (user.industry_specializations or [])]
    industry_score = 30.0 if lead_industry.lower() in specs else 0.0

    # Step 4 – Tier preference (max 25 pts)
    profile = user.sales_profile
    tier_weights = _TIER_PROFILE_WEIGHTS.get(tier, {})
    tier_score = tier_weights.get(profile, 8.0) if profile else 8.0

    # Step 5 – Performance Rating (max 25 pts)
    rating = user.performance_rating or 0
    performance_score = (rating / 100.0) * 25.0

    # Step 6 – Capacity Utilization penalty
    capacity = _get_capacity(rating)
    active = _get_active_count(
        db, user_id=user.id, organization_id=organization_id
    )
    utilization = active / capacity if capacity > 0 else 1.0

    if utilization >= 0.9:
        capacity_penalty = 30.0
    elif utilization >= 0.8:
        capacity_penalty = 15.0
    elif utilization >= 0.7:
        capacity_penalty = 5.0
    else:
        capacity_penalty = 0.0

    total = industry_score + tier_score + performance_score - capacity_penalty
    return _CandidateScore(
        user=user,
        total=total,
        industry_score=industry_score,
        tier_score=tier_score,
        performance_score=performance_score,
        capacity_penalty=capacity_penalty,
        utilization=utilization,
    )


# ---------------------------------------------------------------------------
# Public API: assign_lead
# ---------------------------------------------------------------------------
@dataclass
class AssignmentResult:
    assigned: bool
    assignee: User | None = None
    score: float = 0.0
    reason: str = ""


def assign_lead(
    db: Session,
    *,
    lead,
    organization_id,
    assigned_by=None,
) -> AssignmentResult:
    """Run the full 7-step waterfall for a single lead.

    Parameters
    ----------
    db : Session
    lead : Lead model instance
    organization_id : UUID
    assigned_by : User.id (UUID) or None
    """
    # Step 1 – Read Lead characteristics
    lead_industry = (lead.company_industry or "").strip()
    score = db.scalar(
        select(LeadScore)
        .where(
            LeadScore.organization_id == organization_id,
            LeadScore.lead_id == lead.lead_id,
        )
        .order_by(LeadScore.created_at.desc())
        .limit(1)
    )
    tier = score.score_category if score else LeadCategory.COLD

    # Step 2 – Fetch eligible candidates
    candidates = _fetch_eligible_candidates(db, organization_id=organization_id)
    if not candidates:
        return AssignmentResult(
            assigned=False, reason="No eligible sales members available"
        )

    # Step 2b – Eligibility: Only reps with active < cap are eligible
    capacity_eligible = []
    for c in candidates:
        cap = _get_capacity(c.performance_rating or 0)
        active = _get_active_count(
            db, user_id=c.id, organization_id=organization_id
        )
        utilization = active / cap if cap > 0 else 1.0
        
        if active < cap:
            # Target: Calculate exact slots needed to hit 100% capacity
            c.available_slots = cap - active
            c.active = active  # Store for sorting
            c.cap = cap        # Store for sorting
            capacity_eligible.append(c)

    if not capacity_eligible:
        return AssignmentResult(
            assigned=False,
            reason="All candidates at full capacity — lead remains Unassigned",
        )

    # Sort eligible reps by utilization (emptiest plates first)
    capacity_eligible.sort(key=lambda x: (x.active / x.cap) if x.cap > 0 else 1.0)

    # Steps 3-6 – Score every candidate
    scored = [
        _score_candidate(
            db,
            user=c,
            lead_industry=lead_industry,
            tier=tier,
            organization_id=organization_id,
        )
        for c in capacity_eligible
    ]

    # Step 7 – Proportional Load Balancing: pick lowest-utilization rep (ties broken by score)
    scored.sort(key=lambda s: (s.utilization, -s.total))
    best = scored[0]

    if best.total <= 0:
        return AssignmentResult(
            assigned=False,
            reason="All candidates over capacity or zero-scored",
        )

    assignment = LeadAssignment(
        organization_id=organization_id,
        lead_id=lead.lead_id,
        assigned_to=best.user.id,
        assigned_by=assigned_by,
        assignment_priority=tier,
        assignment_status=AssignmentStatus.ASSIGNED,
    )
    db.add(assignment)
    db.flush()

    db.add(
        LeadEvent(
            id=uuid.uuid4(),
            organization_id=organization_id,
            lead_id=lead.lead_id,
            actor_user_id=assigned_by,
            event_type="auto_assigned",
            data={
                "assigned_to": str(best.user.id),
                "assigned_to_staff_id": best.user.staff_id,
                "assigned_to_name": best.user.full_name,
                "routing_score": round(best.total, 2),
                "industry_score": round(best.industry_score, 2),
                "tier_score": round(best.tier_score, 2),
                "performance_score": round(best.performance_score, 2),
                "capacity_penalty": round(best.capacity_penalty, 2),
                "utilization": round(best.utilization, 4),
                "tier": tier.value,
            },
        )
    )
    db.commit()

    return AssignmentResult(
        assigned=True,
        assignee=best.user,
        score=best.total,
        reason="Assigned via 7-step waterfall routing",
    )


@dataclass
class BulkAssignmentResult:
    total_unassigned: int
    assigned_count: int
    failed_count: int
    assignments: list[dict]


def bulk_assign_leads(
    db: Session,
    *,
    unassigned_leads: list,
    organization_id,
    assigned_by=None,
) -> BulkAssignmentResult:
    """Bulk assign unassigned leads using Continuous Replenishment model."""
    total = len(unassigned_leads)
    assigned_count = 0
    failed_count = 0
    assignments: list[dict] = []

    # Step 1: Fetch eligible candidates and calculate available slots
    candidates = _fetch_eligible_candidates(db, organization_id=organization_id)
    capacity_eligible = []
    for c in candidates:
        cap = _get_capacity(c.performance_rating or 0)
        active = _get_active_count(db, user_id=c.id, organization_id=organization_id)
        if active < cap:
            c.available_slots = cap - active
            c.active = active
            c.cap = cap
            capacity_eligible.append(c)

    if not capacity_eligible:
        return BulkAssignmentResult(
            total_unassigned=total,
            assigned_count=0,
            failed_count=total,
            assignments=[{"lead_id": lead.lead_id, "assigned_to": None, "reason": "No eligible reps available"} for lead in unassigned_leads],
        )

    # Step 2: Load balancing: Sort eligible reps by utilization (emptiest first)
    capacity_eligible.sort(key=lambda x: (x.active / x.cap) if x.cap > 0 else 1.0)

    # Step 3: Continuous Replenishment: Assign leads to sorted reps
    for lead in unassigned_leads:
        assigned = False
        # Check if any reps still have available slots
        has_available_slots = any(getattr(rep, "available_slots", 0) > 0 for rep in capacity_eligible)
        if not has_available_slots:
            break

        for rep in capacity_eligible:
            if getattr(rep, "available_slots", 0) > 0:
                try:
                    result = assign_lead(
                        db,
                        lead=lead,
                        organization_id=organization_id,
                        assigned_by=assigned_by,
                    )
                    if result.assigned:
                        # Update capacity tracking for this rep
                        rep.available_slots -= 1
                        rep.active += 1
                        # Re-sort reps after each assignment to keep emptiest first
                        capacity_eligible.sort(key=lambda x: (x.active / x.cap) if x.cap > 0 else 1.0)
                        assigned_count += 1
                        assignments.append({
                            "lead_id": lead.lead_id,
                            "assigned_to": str(result.assignee.id),
                            "assigned_to_name": result.assignee.full_name,
                            "routing_score": round(result.score, 2),
                        })
                        assigned = True
                        break
                except Exception as exc:
                    failed_count += 1
                    assignments.append({
                        "lead_id": lead.lead_id,
                        "assigned_to": None,
                        "reason": f"Error: {exc}",
                    })
                    assigned = True
                    break

        if not assigned:
            failed_count += 1
            assignments.append({
                "lead_id": lead.lead_id,
                "assigned_to": None,
                "reason": "No eligible rep with available capacity",
            })

    # Any remaining unassigned leads (after all reps hit 100% capacity) go to failed count
    remaining = total - len(assignments)
    failed_count += remaining

    return BulkAssignmentResult(
        total_unassigned=total,
        assigned_count=assigned_count,
        failed_count=failed_count,
        assignments=assignments,
    )
