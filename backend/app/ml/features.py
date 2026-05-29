from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FeatureSpec:
    target: str = "converted"
    pii_columns: tuple[str, ...] = (
        "lead_id",
        "first_name",
        "last_name",
        "email",
        "phone_number",
    )
    drop_columns: tuple[str, ...] = (
        "company_name",
    )
    datetime_columns: tuple[str, ...] = ("date_captured",)


feature_spec = FeatureSpec()

