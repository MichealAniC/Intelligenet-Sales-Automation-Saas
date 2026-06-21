from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.enums import AssignmentStatus, LeadCategory, LeadStatus
from app.schemas.lead import LeadPublic


class LeadEventPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: str
    actor_user_id: uuid.UUID | None
    batch_id: uuid.UUID | None
    event_type: str
    data: dict[str, Any] | None
    created_at: datetime


class LeadNoteCreate(BaseModel):
    body: str


class LeadStatusUpdate(BaseModel):
    lead_status: LeadStatus


class LeadActivityCreate(BaseModel):
    activity_type: str  # Call, Email, Meeting, Note
    outcome: str | None = None
    notes: str | None = None


class LeadActivityPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: str
    actor_user_id: uuid.UUID | None
    event_type: str
    data: dict[str, Any] | None
    created_at: datetime


class LeadNotePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    lead_id: str
    author_user_id: uuid.UUID | None
    body: str
    created_at: datetime


class LeadTagPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    created_at: datetime


class LeadIntelligenceAI(BaseModel):
    score_value: int | None = None
    conversion_probability: float | None = None
    lead_tier: LeadCategory | None = None
    ai_priority_level: str | None = None
    confidence_score: float | None = None
    ranking_position: int | None = None
    predicted_value: float | None = None
    recommended_action: str | None = None
    reasoning: str | None = None


class LeadIntelligenceAssignment(BaseModel):
    assigned_to_staff_id: str | None = None
    assigned_to_name: str | None = None
    assignment_status: AssignmentStatus | None = None


class LeadIntelligenceDetail(BaseModel):
    lead: LeadPublic
    lead_status: LeadStatus
    import_batch_code: str | None = None
    raw_data: dict[str, Any] | None = None
    ai: LeadIntelligenceAI
    assignment: LeadIntelligenceAssignment
    recent_events: list[LeadEventPublic]
    notes: list[LeadNotePublic]
    tags: list[LeadTagPublic]


class BulkDeletePreview(BaseModel):
    affected_count: int
    sample_lead_ids: list[str]


class BulkDeleteRequest(BaseModel):
    batch_code: str | None = None
    lead_status: LeadStatus | None = None
    min_score: int | None = None
    max_score: int | None = None
    created_after: datetime | None = None
    created_before: datetime | None = None
