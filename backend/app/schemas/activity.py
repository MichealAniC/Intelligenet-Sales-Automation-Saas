from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.enums import ActivityType, ActivityOutcome


class ActivityCreate(BaseModel):
    activity_type: ActivityType
    outcome: ActivityOutcome
    notes: str | None = None


class ActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    activity_id: UUID
    organization_id: UUID
    lead_id: str
    user_id: UUID
    activity_type: ActivityType
    outcome: ActivityOutcome
    notes: str | None
    created_at: datetime
