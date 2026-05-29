from __future__ import annotations

from pydantic import BaseModel

from app.models.enums import AssignmentStatus, LeadCategory
from app.schemas.lead import LeadPublic


class LeadSummaryItem(BaseModel):
    lead: LeadPublic
    score_value: int | None = None
    score_category: LeadCategory | None = None
    prediction_probability: float | None = None
    recommended_action: str | None = None
    assigned_to_staff_id: str | None = None
    assigned_to_name: str | None = None
    assignment_status: AssignmentStatus | None = None


class LeadOpsListResponse(BaseModel):
    total: int
    items: list[LeadSummaryItem]
