from __future__ import annotations

from typing import Any


def to_model_features(payload: dict[str, Any]) -> dict[str, Any]:
    out = dict(payload)
    if "estimated_annual_revenue" in out:
        out["estimated_annual_revenue(Millions)"] = out.pop("estimated_annual_revenue")
    if "average_time_on_site" in out:
        out["average_time_on_site(mins)"] = out.pop("average_time_on_site")
    if "email_open_rate" in out:
        out["email_open_rate(%)"] = out.pop("email_open_rate")
    if "email_click_rate" in out:
        out["email_click_rate(%)"] = out.pop("email_click_rate")
    return out

