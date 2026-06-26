from __future__ import annotations

from uuid import UUID
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import AvailabilityStatus, ProfileStatus, SalesProfile


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


class TeamMemberWorkload(WorkloadDashboard):
    model_config = ConfigDict(from_attributes=True)

    staff_id: str
    full_name: str
    sales_profile: Optional[SalesProfile] = None
    availability_status: AvailabilityStatus
    performance_rating: int
    industry_specializations: list[str]
    auto_assignment_enabled: bool
    profile_status: ProfileStatus


class TeamWorkloadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    team_workload: list[TeamMemberWorkload]
