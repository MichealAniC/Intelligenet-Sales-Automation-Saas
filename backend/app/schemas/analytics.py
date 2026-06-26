from __future__ import annotations

from decimal import Decimal
from typing import Dict

from pydantic import BaseModel

from app.models.enums import LeadStatus, LeadSource, LeadCategory


class AnalyticsOverview(BaseModel):
    total_pipeline_value: Decimal
    leads_by_status: Dict[str, int]
    leads_by_source: Dict[str, int]
    leads_by_tier: Dict[str, int]
