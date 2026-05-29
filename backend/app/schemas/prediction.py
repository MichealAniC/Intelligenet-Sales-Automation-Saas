from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class LeadFeatures(BaseModel):
    model_config = ConfigDict(extra="allow")


class PredictionResponse(BaseModel):
    probability: float
    score_value: int
    category: str
    model_name: str
    features_used: dict[str, Any]

