from __future__ import annotations

import pandas as pd


def add_date_features(df: pd.DataFrame, column: str) -> pd.DataFrame:
    out = df.copy()
    dt = pd.to_datetime(out[column], errors="coerce")
    out[f"{column}_year"] = dt.dt.year
    out[f"{column}_month"] = dt.dt.month
    out[f"{column}_dayofweek"] = dt.dt.dayofweek
    out = out.drop(columns=[column])
    return out

