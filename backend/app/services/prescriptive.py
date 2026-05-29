from __future__ import annotations

from dataclasses import dataclass

from app.models.enums import LeadCategory


@dataclass(frozen=True)
class PrescriptiveDecision:
    category: LeadCategory
    action: str


def decide(category: LeadCategory) -> PrescriptiveDecision:
    if category == LeadCategory.HOT:
        return PrescriptiveDecision(category=category, action="Route to Senior Sales Agent")
    if category == LeadCategory.WARM:
        return PrescriptiveDecision(category=category, action="Assign to Regular Sales Rep")
    return PrescriptiveDecision(category=category, action="Add to Nurturing Campaign")

