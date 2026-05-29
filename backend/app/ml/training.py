from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from app.ml.data import load_dataset
from app.ml.features import feature_spec
from app.ml.preprocess import add_date_features


@dataclass(frozen=True)
class TrainResult:
    model_path: str
    metrics_path: str
    metadata_path: str


def build_pipeline(df: pd.DataFrame) -> tuple[Pipeline, list[str]]:
    work = df.copy()

    for col in feature_spec.datetime_columns:
        if col in work.columns:
            work = add_date_features(work, col)

    drop = [c for c in (*feature_spec.pii_columns, *feature_spec.drop_columns) if c in work.columns]
    work = work.drop(columns=drop, errors="ignore")

    if feature_spec.target not in work.columns:
        raise ValueError(f"Target column missing: {feature_spec.target}")

    X = work.drop(columns=[feature_spec.target])
    y = work[feature_spec.target]

    categorical_cols = [c for c in X.columns if X[c].dtype == "object" or X[c].dtype.name == "category" or X[c].dtype == "bool"]
    numeric_cols = [c for c in X.columns if c not in categorical_cols]

    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols),
            ("num", "passthrough", numeric_cols),
        ],
        remainder="drop",
    )

    model = RandomForestClassifier(
        n_estimators=300,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1,
    )

    pipeline = Pipeline(
        steps=[
            ("preprocess", preprocessor),
            ("model", model),
        ]
    )

    return pipeline, list(X.columns)


def train(
    dataset_path: Path,
    artifacts_dir: Path,
) -> TrainResult:
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    df = load_dataset(dataset_path)
    pipeline, feature_columns = build_pipeline(df)

    work = df.copy()
    for col in feature_spec.datetime_columns:
        if col in work.columns:
            work = add_date_features(work, col)

    drop = [c for c in (*feature_spec.pii_columns, *feature_spec.drop_columns) if c in work.columns]
    work = work.drop(columns=drop, errors="ignore")
    X = work.drop(columns=[feature_spec.target])
    y = work[feature_spec.target].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    proba = pipeline.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": float(accuracy_score(y_test, y_pred)),
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1": float(f1_score(y_test, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, proba)),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "target_distribution": {
            "0": int((y == 0).sum()),
            "1": int((y == 1).sum()),
        },
    }

    model_path = artifacts_dir / "lead_scoring_model.joblib"
    joblib.dump(pipeline, model_path)

    metrics_path = artifacts_dir / "metrics.json"
    metrics_path.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    metadata = {
        "model_name": "RandomForestClassifier",
        "feature_spec": asdict(feature_spec),
        "feature_columns": feature_columns,
        "score_thresholds": {"hot_min": 0.80, "warm_min": 0.50},
    }
    metadata_path = artifacts_dir / "metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    return TrainResult(
        model_path=str(model_path),
        metrics_path=str(metrics_path),
        metadata_path=str(metadata_path),
    )

