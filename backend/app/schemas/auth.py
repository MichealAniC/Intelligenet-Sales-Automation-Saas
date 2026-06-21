from __future__ import annotations

import re

from pydantic import BaseModel, field_validator

from app.models.enums import UserRole
from app.schemas.user import UserPublic

_ADM_RE = re.compile(r"^ADM-\d{3}$")
_ST_RE = re.compile(r"^ST-\d{3}$")


class LoginRequest(BaseModel):
    role: UserRole
    staff_id: str
    password: str

    @field_validator("staff_id")
    @classmethod
    def validate_staff_id_for_role(cls, v: str, info) -> str:
        sid = v.strip()
        role = info.data.get("role")
        if role == UserRole.ADMIN and not _ADM_RE.match(sid):
            raise ValueError("Admin Staff ID must match ADM-XXX (e.g. ADM-001)")
        if role == UserRole.SALES and not _ST_RE.match(sid):
            raise ValueError("Sales Staff ID must match ST-XXX (e.g. ST-001)")
        return sid


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
