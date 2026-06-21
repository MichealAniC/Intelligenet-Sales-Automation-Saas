from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_admin
from app.core.database import get_db
from app.core.security import create_access_token, hash_password
from app.crud.invitations import create_invitation, get_invitation_by_token
from app.crud.users import get_user_by_email, get_user_by_staff_id
from app.models.invitation import Invitation
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import TokenResponse
from app.schemas.invitation import (
    InvitationAcceptRequest,
    InvitationCreateRequest,
    InvitationCreateResponse,
    InvitationInfo,
    InvitationPublic,
)
from app.schemas.user import UserCreate, UserPublic

router = APIRouter(prefix="/invitations")


@router.post("", response_model=InvitationCreateResponse)
def invite_sales_member(
    payload: InvitationCreateRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> InvitationCreateResponse:
    if get_user_by_email(db, str(payload.email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    now = datetime.now(timezone.utc)
    existing_stmt = select(Invitation).where(
        Invitation.organization_id == admin.organization_id,
        Invitation.email == str(payload.email),
        Invitation.accepted_at.is_(None),
        Invitation.expires_at > now,
    )
    existing = db.scalar(existing_stmt)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Active invitation already exists for this email",
        )

    invite, token = create_invitation(
        db,
        organization_id=admin.organization_id,
        invited_by=admin.id,
        email=str(payload.email),
        expires_in_hours=payload.expires_in_hours,
    )
    invitation_url = f"/invite/{token}"
    return InvitationCreateResponse(
        invitation=InvitationPublic.model_validate(invite),
        invitation_token=token,
        invitation_url=invitation_url,
    )


@router.get("/{token}", response_model=InvitationInfo)
def get_invitation(token: str, db: Session = Depends(get_db)) -> InvitationInfo:
    invite = get_invitation_by_token(db, token)
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    if invite.accepted_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation already used")
    if invite.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation expired")

    org = db.get(Organization, invite.organization_id)
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return InvitationInfo(
        organization_name=org.name,
        email=invite.email,
        role=invite.role,
        expires_at=invite.expires_at,
    )


@router.post("/accept", response_model=TokenResponse)
def accept_invitation(payload: InvitationAcceptRequest, db: Session = Depends(get_db)) -> TokenResponse:
    invite = get_invitation_by_token(db, payload.token)
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    if invite.accepted_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation already used")
    if invite.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation expired")

    if get_user_by_email(db, invite.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
    if get_user_by_staff_id(db, payload.staff_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Staff ID already exists")

    user_payload = UserCreate(
        staff_id=payload.staff_id,
        full_name=payload.full_name,
        email=invite.email,
        password=payload.password,
        role=invite.role,
    )
    user = User(
        organization_id=invite.organization_id,
        staff_id=user_payload.staff_id,
        full_name=user_payload.full_name,
        email=str(user_payload.email),
        password_hash=hash_password(user_payload.password),
        role=user_payload.role,
    )
    invite.accepted_at = datetime.now(timezone.utc)
    db.add_all([user, invite])
    db.commit()
    db.refresh(user)
    # eagerly load organization for the response
    user_with_org = db.query(User).options(joinedload(User.organization)).filter(
        User.id == user.id
    ).first()
    token = create_access_token(
        str(user_with_org.id),
        role=user_with_org.role.value,
        organization_id=str(user_with_org.organization_id),
    )
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user_with_org))


@router.get("/me/list", response_model=list[InvitationPublic])
def list_my_org_invitations(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> list[InvitationPublic]:
    stmt = (
        select(Invitation)
        .where(Invitation.organization_id == admin.organization_id)
        .order_by(Invitation.created_at.desc())
        .limit(100)
    )
    rows = list(db.scalars(stmt))
    return [InvitationPublic.model_validate(r) for r in rows]
