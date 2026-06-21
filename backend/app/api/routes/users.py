from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.enums import (
    AssignmentStatus,
    AvailabilityStatus,
    ProfileStatus,
    SalesProfile,
    UserRole,
)
from app.models.lead_assignment import LeadAssignment
from app.models.user import User
from app.schemas.user import RoutingProfileUpdate, UserPublic

router = APIRouter(prefix="/users")


@router.get("/me", response_model=UserPublic)
def me(user=Depends(get_current_user)) -> UserPublic:
    return UserPublic.model_validate(user)


_CAPACITY_BANDS = [
    (90, 100, 150),
    (80, 89, 120),
    (70, 79, 100),
    (60, 69, 80),
    (50, 59, 60),
    (0, 49, 40),
]


def _capacity(rating: int) -> int:
    for lo, hi, cap in _CAPACITY_BANDS:
        if lo <= rating <= hi:
            return cap
    return 40


@router.get("/team-workload")
def team_workload(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    members = list(
        db.scalars(
            select(User).where(
                User.organization_id == user.organization_id,
                User.role == UserRole.SALES,
            ).order_by(User.full_name)
        ).all()
    )

    out: list[dict] = []
    for m in members:
        active = (
            db.scalar(
                select(func.count())
                .select_from(LeadAssignment)
                .where(
                    LeadAssignment.assigned_to == m.id,
                    LeadAssignment.organization_id == user.organization_id,
                    LeadAssignment.assignment_status.in_([
                        AssignmentStatus.ASSIGNED,
                        AssignmentStatus.IN_PROGRESS,
                    ]),
                )
            )
            or 0
        )
        cap = _capacity(m.performance_rating or 0)
        utilization = round(active / cap * 100, 1) if cap > 0 else 0.0
        out.append({
            "id": str(m.id),
            "staff_id": m.staff_id,
            "full_name": m.full_name,
            "sales_profile": m.sales_profile.value if m.sales_profile else None,
            "availability_status": m.availability_status.value if m.availability_status else "Available",
            "performance_rating": m.performance_rating or 0,
            "industry_specializations": m.industry_specializations or [],
            "auto_assignment_enabled": m.auto_assignment_enabled,
            "profile_status": m.profile_status.value if m.profile_status else "Pending Configuration",
            "assigned_leads": int(active),
            "capacity": cap,
            "utilization_percent": utilization,
        })

    return out


@router.patch("/{user_id}/routing-profile", response_model=UserPublic)
def update_routing_profile(
    user_id: str,
    payload: RoutingProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserPublic:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    target = db.query(User).filter(
        User.id == user_id,
        User.organization_id == current_user.organization_id,
    ).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(target, field, value)

    db.commit()
    db.refresh(target)
    return UserPublic.model_validate(target)

