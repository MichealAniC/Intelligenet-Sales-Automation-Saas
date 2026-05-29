from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.lead_score import LeadScore


def create_lead_score(
    db: Session,
    *,
    organization_id,
    lead_id: str,
    score_value: int,
    score_category,
    prediction_probability: float,
    prediction_result: bool,
    model_name: str,
) -> LeadScore:
    obj = LeadScore(
        organization_id=organization_id,
        lead_id=lead_id,
        score_value=score_value,
        score_category=score_category,
        prediction_probability=prediction_probability,
        prediction_result=prediction_result,
        model_name=model_name,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
