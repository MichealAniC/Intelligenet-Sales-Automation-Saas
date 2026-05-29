from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.config import settings
from app.ml.scoring import LeadScorer
from app.models.user import User
from app.schemas.prediction import LeadFeatures, PredictionResponse

router = APIRouter(prefix="/prediction")

scorer: LeadScorer | None = None


def get_scorer() -> LeadScorer:
    global scorer
    if scorer is None:
        artifacts_dir = Path(settings.ARTIFACTS_DIR)
        if not artifacts_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Model artifacts not found. Run training first.",
            )
        scorer = LeadScorer(artifacts_dir=artifacts_dir)
    return scorer


@router.post("/score", response_model=PredictionResponse)
def score_lead(payload: LeadFeatures, _user: User = Depends(get_current_user)) -> PredictionResponse:
    s = get_scorer()
    result = s.score(payload.model_dump())
    return PredictionResponse(
        probability=result.probability,
        score_value=result.score_value,
        category=result.category,
        model_name=s.model_name,
        features_used=payload.model_dump(),
    )
