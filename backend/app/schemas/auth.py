from __future__ import annotations

from pydantic import BaseModel

from app.schemas.user import UserPublic


class LoginRequest(BaseModel):
    staff_id: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
