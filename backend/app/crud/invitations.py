from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import UserRole
from app.models.invitation import Invitation


def generate_invitation_token() -> str:
    return secrets.token_urlsafe(32)


def hash_invitation_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_invitation(
    db: Session,
    *,
    organization_id,
    invited_by,
    email: str,
    expires_in_hours: int,
) -> tuple[Invitation, str]:
    token = generate_invitation_token()
    token_hash = hash_invitation_token(token)
    now = datetime.now(timezone.utc)
    invite = Invitation(
        organization_id=organization_id,
        invited_by=invited_by,
        email=email,
        role=UserRole.SALES,
        token_hash=token_hash,
        expires_at=now + timedelta(hours=expires_in_hours),
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite, token


def get_invitation_by_token(db: Session, token: str) -> Invitation | None:
    token_hash = hash_invitation_token(token)
    stmt = select(Invitation).where(Invitation.token_hash == token_hash)
    return db.scalar(stmt)


def mark_invitation_accepted(db: Session, invite: Invitation) -> Invitation:
    invite.accepted_at = datetime.now(timezone.utc)
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite
