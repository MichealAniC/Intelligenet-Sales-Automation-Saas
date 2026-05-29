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


class UserCreate(BaseModel):
    role: UserRole
    staff_id: str
    full_name: str
    email: EmailStr
    password: str

    @field_validator("staff_id")
    @classmethod
    def validate_staff_id(cls, v, *args, **kwargs) -> str:
        staff_id = str(v).strip()
        role = None
        if args:
            ctx = args[0]
            if isinstance(ctx, dict):
                role = ctx.get("role")
            else:
                role = getattr(ctx, "data", {}).get("role")

        if role == UserRole.ADMIN:
            if not _is_admin_staff_id(staff_id):
                raise ValueError("Invalid staff_id format for Admin (expected ADM-XXX)")
        elif role == UserRole.SALES:
            if not _is_sales_staff_id(staff_id):
                raise ValueError("Invalid staff_id format for Sales (expected ST-XXX)")
        else:
            if not (_is_admin_staff_id(staff_id) or _is_sales_staff_id(staff_id)):
                raise ValueError("Invalid staff_id format (expected ADM-XXX or ST-XXX)")

        return staff_id


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

    organization_name: str | None = None


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
