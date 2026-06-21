from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.enums import LeadCategory


class DashboardRecentScore(BaseModel):
    lead_id: str
    lead_name: str
    company_name: str | None = None
    score_value: int
    score_category: LeadCategory
    prediction_probability: float | None = None
    recommended_action: str | None = None
    created_at: datetime
    assigned_to_staff_id: str | None = None
    assigned_to_name: str | None = None
    lead_status: str | None = None


class PipelineStageCount(BaseModel):
    stage: str
    count: int


class DashboardOverview(BaseModel):
    total_leads: int
    scored_leads: int
    hot_count: int
    warm_count: int
    cold_count: int
    assigned_leads: int
    unassigned_leads: int
    recent_scores: list[DashboardRecentScore]


class SalesDashboardOverview(BaseModel):
    total_assigned: int
    hot_count: int
    open_opportunities: int
    closed_won_count: int
    pipeline_stages: list[PipelineStageCount]
    priority_leads: list[DashboardRecentScore]
