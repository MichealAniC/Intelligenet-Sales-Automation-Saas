from __future__ import annotations

from pydantic import BaseModel

from app.schemas.lead import LeadPublic
from app.schemas.lead_assignment import LeadAssignmentPublic
from app.schemas.lead_score import LeadScorePublic


class LeadWorkflowResponse(BaseModel):
    lead: LeadPublic
    score: LeadScorePublic
    assignment: LeadAssignmentPublic | None
    recommended_action: str

