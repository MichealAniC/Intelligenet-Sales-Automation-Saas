from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.organization import Organization


def create_organization(db: Session, *, name: str) -> Organization:
    obj = Organization(name=name)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
