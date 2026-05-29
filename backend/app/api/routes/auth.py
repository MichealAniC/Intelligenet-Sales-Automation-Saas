from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.crud.users import get_user_by_email, get_user_by_staff_id
from app.models.enums import UserRole
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.onboarding import AdminSignupRequest
from app.schemas.user import UserCreate, UserPublic

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = get_user_by_staff_id(db, payload.staff_id)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))


@router.post("/signup-admin", response_model=TokenResponse)
def signup_admin(payload: AdminSignupRequest, db: Session = Depends(get_db)) -> TokenResponse:
    existing_email = get_user_by_email(db, str(payload.email))
    if existing_email:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    existing_staff = get_user_by_staff_id(db, payload.staff_id)
    if existing_staff:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Staff ID already exists")

    user_payload = UserCreate(
        staff_id=payload.staff_id,
        full_name=payload.full_name,
        email=payload.email,
        password=payload.password,
        role=UserRole.ADMIN,
    )
    org = Organization(name=payload.organization_name)
    user = User(
        organization=org,
        staff_id=user_payload.staff_id,
        full_name=user_payload.full_name,
        email=str(user_payload.email),
        password_hash=hash_password(user_payload.password),
        role=user_payload.role,
    )
    db.add_all([org, user])
    db.commit()
    db.refresh(user)
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))


@router.post("/register", response_model=UserPublic)
def register() -> UserPublic:
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Public registration is disabled. Admins must use /auth/signup-admin and Sales members must join via invitation.",
    )
