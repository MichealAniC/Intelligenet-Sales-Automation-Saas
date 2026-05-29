from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import AssignmentStatus, LeadCategory


class LeadAssignmentPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    assignment_id: uuid.UUID
    lead_id: str
    assigned_to: uuid.UUID
    assigned_by: uuid.UUID | None
    assignment_priority: LeadCategory
    assignment_status: AssignmentStatus
    assignment_date: datetime

