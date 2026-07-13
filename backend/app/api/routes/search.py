from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import and_, func, or_, select, cast, String
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.lead import Lead
from app.models.user import User
from app.schemas.lead import LeadPublic
from app.schemas.user import UserPublic

router = APIRouter(prefix="/search")


@router.get("")
def global_search(
    q: str = Query(..., description="Search query"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    search_pattern = f"%{q.lower()}%"
    
    # Search leads
    leads_query = select(Lead).where(
        Lead.organization_id == user.organization_id,
        Lead.is_deleted.is_(False),
        or_(
            Lead.lead_id.ilike(search_pattern),
            func.lower(Lead.first_name).ilike(search_pattern),
            func.lower(Lead.last_name).ilike(search_pattern),
            func.lower(Lead.full_name).ilike(search_pattern),
            func.lower(Lead.email).ilike(search_pattern),
            func.lower(Lead.phone_number).ilike(search_pattern),
            func.lower(Lead.company_name).ilike(search_pattern),
            func.lower(Lead.company_industry).ilike(search_pattern),
            func.lower(cast(Lead.lead_status, String)).ilike(search_pattern)
        )
    )
    leads = db.scalars(leads_query).all()
    
    # Search sales team users
    users_query = select(User).where(
        User.organization_id == user.organization_id,
        User.role == "Sales",
        or_(
            func.lower(User.full_name).ilike(search_pattern),
            func.lower(User.email).ilike(search_pattern),
            func.lower(User.staff_id).ilike(search_pattern)
        )
    )
    users = db.scalars(users_query).all()
    
    # Convert to Pydantic models
    lead_results = [LeadPublic.model_validate(l) for l in leads]
    user_results = [UserPublic.model_validate(u) for u in users]
    
    return {
        "leads": lead_results,
        "sales_team": user_results
    }
