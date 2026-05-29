from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import LeadCategory


class LeadScorePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    score_id: uuid.UUID
    lead_id: str
    score_value: int
    score_category: LeadCategory
    prediction_probability: float
    prediction_result: bool
    model_name: str
    created_at: datetime

