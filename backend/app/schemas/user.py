from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

try:
    from pydantic import ConfigDict, field_validator, model_validator
except Exception:  # pragma: no cover
    ConfigDict = None  # type: ignore
    from pydantic import validator as field_validator  # type: ignore
    model_validator = None  # type: ignore

from app.models.enums import AvailabilityStatus, ProfileStatus, SalesProfile, UserRole


class UserCreate(BaseModel):
    role: UserRole
    staff_id: str
    full_name: str
    email: EmailStr
    password: str

    @field_validator("staff_id")
    @classmethod
    def validate_staff_id_format(cls, v) -> str:
        staff_id = str(v).strip()
        if not (_is_admin_staff_id(staff_id) or _is_sales_staff_id(staff_id)):
            raise ValueError("Invalid staff_id format (expected ADM-XXX or ST-XXX)")
        return staff_id

    if model_validator is not None:
        @model_validator(mode="after")
        def validate_staff_id_matches_role(self) -> "UserCreate":
            staff_id = self.staff_id
            role = self.role
            if role == UserRole.ADMIN:
                if not _is_admin_staff_id(staff_id):
                    raise ValueError("Invalid staff_id format for Admin (expected ADM-XXX)")
            elif role == UserRole.SALES:
                if not _is_sales_staff_id(staff_id):
                    raise ValueError("Invalid staff_id format for Sales (expected ST-XXX)")
            return self


class UserPublic(BaseModel):
    if ConfigDict is not None:
        model_config = ConfigDict(from_attributes=True)
    else:
        class Config:
            orm_mode = True

    id: uuid.UUID
    organization_id: uuid.UUID
    staff_id: str
    full_name: str
    email: EmailStr
    role: UserRole
    created_at: datetime

    # Prescriptive Lead Routing attributes
    sales_profile: Optional[SalesProfile] = None
    availability_status: Optional[AvailabilityStatus] = AvailabilityStatus.AVAILABLE
    performance_rating: Optional[int] = 0
    industry_specializations: list[str] = Field(default_factory=list)
    auto_assignment_enabled: Optional[bool] = False
    profile_status: Optional[ProfileStatus] = ProfileStatus.PENDING_CONFIGURATION

    organization_name: str | None = None


class RoutingProfileUpdate(BaseModel):
    """Admin-only payload to configure a Sales member's routing profile."""
    sales_profile: Optional[SalesProfile] = None
    availability_status: Optional[AvailabilityStatus] = None
    performance_rating: Optional[int] = Field(default=None, ge=0, le=100)
    industry_specializations: Optional[list[str]] = None
    auto_assignment_enabled: Optional[bool] = None
    profile_status: Optional[ProfileStatus] = None


def _is_admin_staff_id(value: str) -> bool:
    if len(value) != 7:
        return False
    if not value.startswith("ADM-"):
        return False
    return value[4:7].isdigit()


def _is_sales_staff_id(value: str) -> bool:
    if len(value) != 6:
        return False
    if not value.startswith("ST-"):
        return False
    return value[3:6].isdigit()
