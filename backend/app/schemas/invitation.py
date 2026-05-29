from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr

try:
    from pydantic import ConfigDict, field_validator
except Exception:  # pragma: no cover
    ConfigDict = None  # type: ignore
    from pydantic import validator as field_validator  # type: ignore

from app.models.enums import UserRole
from app.schemas.user import _is_sales_staff_id


class InvitationCreateRequest(BaseModel):
    email: EmailStr
    expires_in_hours: int = 72

    @field_validator("expires_in_hours")
    @classmethod
    def validate_expires(cls, v) -> int:
        n = int(v)
        if n <= 0 or n > 24 * 30:
            raise ValueError("expires_in_hours must be between 1 and 720")
        return n


class InvitationPublic(BaseModel):
    if ConfigDict is not None:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True

    id: uuid.UUID
    organization_id: uuid.UUID
    email: EmailStr
    role: UserRole
    expires_at: datetime
    accepted_at: datetime | None
    created_at: datetime


class InvitationCreateResponse(BaseModel):
    invitation: InvitationPublic
    invitation_token: str
    invitation_url: str


class InvitationInfo(BaseModel):
    organization_name: str
    email: EmailStr
    role: UserRole
    expires_at: datetime


class InvitationAcceptRequest(BaseModel):
    token: str
    full_name: str
    password: str
    staff_id: str

    @field_validator("token")
    @classmethod
    def validate_token(cls, v) -> str:
        token = str(v).strip()
        if not token:
            raise ValueError("token is required")
        return token

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v) -> str:
        return str(v).strip()

    @field_validator("staff_id")
    @classmethod
    def validate_staff_id(cls, v) -> str:
        staff_id = str(v).strip()
        if not _is_sales_staff_id(staff_id):
            raise ValueError("Invalid staff_id format for Sales (expected ST-XXX)")
        return staff_id
