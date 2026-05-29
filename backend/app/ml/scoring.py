from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from app.ml.features import feature_spec
from app.ml.preprocess import add_date_features


@dataclass(frozen=True)
class ScoreResult:
    probability: float
    score_value: int
    category: str


class LeadScorer:
    def __init__(self, artifacts_dir: Path) -> None:
        self._artifacts_dir = Path(artifacts_dir)
        self._model = joblib.load(artifacts_dir / "lead_scoring_model.joblib")
        metadata = json.loads((artifacts_dir / "metadata.json").read_text(encoding="utf-8"))
        thresholds = metadata.get("score_thresholds", {"hot_min": 0.80, "warm_min": 0.50})
        self._hot_min = float(thresholds["hot_min"])
        self._warm_min = float(thresholds["warm_min"])
        self._model_name = str(metadata.get("model_name", "RandomForestClassifier"))

    @property
    def model_name(self) -> str:
        return self._model_name

    def score(self, payload: dict[str, Any]) -> ScoreResult:
        df = pd.DataFrame([payload])

        for col in feature_spec.datetime_columns:
            if col in df.columns:
                df = add_date_features(df, col)

        drop = [c for c in (*feature_spec.pii_columns, *feature_spec.drop_columns) if c in df.columns]
        df = df.drop(columns=drop, errors="ignore")

        proba = float(self._model.predict_proba(df)[:, 1][0])
        score_value = int(round(proba * 100))
        if proba >= self._hot_min:
            category = "Hot"
        elif proba >= self._warm_min:
            category = "Warm"
        else:
            category = "Cold"
        return ScoreResult(probability=proba, score_value=score_value, category=category)
