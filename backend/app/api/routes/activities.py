from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.activity import Activity
from app.models.lead import Lead
from app.models.enums import UserRole
from app.crud.leads import is_lead_assigned_to, get_lead
from app.models.user import User
from app.schemas.activity import ActivityCreate, ActivityResponse

router = APIRouter(prefix="/activities", tags=["activities"])


@router.post("/leads/{lead_id}", response_model=ActivityResponse)
def create_activity(
    lead_id: str,
    payload: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {UserRole.ADMIN, UserRole.SALES}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    
    lead = get_lead(db, organization_id=current_user.organization_id, lead_id=lead_id)
    if not lead or lead.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    
    if current_user.role == UserRole.SALES:
        allowed = is_lead_assigned_to(
            db,
            organization_id=current_user.organization_id,
            lead_id=lead_id,
            assigned_to=current_user.id,
        )
        if not allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    
    activity = Activity(
        activity_id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        lead_id=lead_id,
        user_id=current_user.id,
        activity_type=payload.activity_type,
        outcome=payload.outcome,
        notes=payload.notes,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    
    return ActivityResponse.model_validate(activity)


@router.get("/leads/{lead_id}", response_model=list[ActivityResponse])
def get_lead_activities(
    lead_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {UserRole.ADMIN, UserRole.SALES}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    
    lead = get_lead(db, organization_id=current_user.organization_id, lead_id=lead_id)
    if not lead or lead.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    
    if current_user.role == UserRole.SALES:
        allowed = is_lead_assigned_to(
            db,
            organization_id=current_user.organization_id,
            lead_id=lead_id,
            assigned_to=current_user.id,
        )
        if not allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    
    stmt = (
        select(Activity)
        .where(
            Activity.organization_id == current_user.organization_id,
            Activity.lead_id == lead_id,
        )
        .order_by(Activity.created_at.desc())
    )
    activities = db.scalars(stmt).all()
    
    return [ActivityResponse.model_validate(a) for a in activities]
