from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import AssignmentStatus, LeadCategory, UserRole
from app.models.lead_assignment import LeadAssignment
from app.models.user import User


def get_latest_assignment(db: Session, *, organization_id, lead_id: str) -> LeadAssignment | None:
    stmt = (
        select(LeadAssignment)
        .where(LeadAssignment.organization_id == organization_id, LeadAssignment.lead_id == lead_id)
        .order_by(LeadAssignment.assignment_date.desc())
        .limit(1)
    )
    return db.scalar(stmt)


def pick_assignee(db: Session, *, organization_id) -> User | None:
    stmt = (
        select(User)
        .where(User.organization_id == organization_id, User.role == UserRole.SALES)
        .order_by(User.created_at.asc())
    )
    return db.scalar(stmt)


def create_assignment(
    db: Session,
    *,
    organization_id,
    lead_id: str,
    assigned_to: uuid.UUID,
    assigned_by: uuid.UUID | None,
    priority: LeadCategory,
) -> LeadAssignment:
    obj = LeadAssignment(
        organization_id=organization_id,
        lead_id=lead_id,
        assigned_to=assigned_to,
        assigned_by=assigned_by,
        assignment_priority=priority,
        assignment_status=AssignmentStatus.ASSIGNED,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
