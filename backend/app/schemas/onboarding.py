from __future__ import annotations

from pydantic import BaseModel, EmailStr

try:
    from pydantic import field_validator
except Exception:  # pragma: no cover
    from pydantic import validator as field_validator  # type: ignore

from app.models.enums import UserRole
from app.schemas.user import _is_admin_staff_id


class AdminSignupRequest(BaseModel):
    organization_name: str
    full_name: str
    email: EmailStr
    password: str
    staff_id: str

    @field_validator("organization_name")
    @classmethod
    def validate_org_name(cls, v) -> str:
        name = str(v).strip()
        if not name:
            raise ValueError("organization_name is required")
        return name

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v) -> str:
        return str(v).strip()

    @field_validator("staff_id")
    @classmethod
    def validate_staff_id(cls, v) -> str:
        staff_id = str(v).strip()
        if not _is_admin_staff_id(staff_id):
            raise ValueError("Invalid staff_id format for Admin (expected ADM-XXX)")
        return staff_id


class SalesRole(BaseModel):
    role: UserRole = UserRole.SALES
