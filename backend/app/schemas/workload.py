from __future__ import annotations

from uuid import UUID
from pydantic import BaseModel, ConfigDict


class WorkloadDashboard(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    capacity: int
    active_leads: int
    available_capacity: int
    utilization: float
    nurturing_leads: int
    won_leads: int
    lost_leads: int


class TeamWorkloadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    team_workload: list[WorkloadDashboard]
