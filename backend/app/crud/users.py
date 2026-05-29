from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserCreate


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def get_user_by_staff_id(db: Session, staff_id: str) -> User | None:
    return db.scalar(select(User).where(User.staff_id == staff_id))


def count_users(db: Session) -> int:
    return int(db.scalar(select(func.count()).select_from(User)) or 0)


def create_user(db: Session, payload: UserCreate, *, organization_id) -> User:
    user = User(
        organization_id=organization_id,
        staff_id=payload.staff_id,
        full_name=payload.full_name,
        email=str(payload.email),
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
