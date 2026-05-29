from __future__ import annotations

import io
import re
from datetime import date
from decimal import Decimal
from typing import Any

import pandas as pd
from dateutil import parser as date_parser
from pydantic import ValidationError

from app.schemas.lead import LeadCreate
from app.schemas.lead_import import LeadImportIssue


def _norm_header(value: str) -> str:
    v = value.strip().lower()
    v = re.sub(r"\s+", "_", v)
    v = v.replace("-", "_")
    return v


def _to_bool(value: object) -> bool | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    raw = str(value).strip().lower()
    if raw in {"true", "t", "yes", "y", "1"}:
        return True
    if raw in {"false", "f", "no", "n", "0"}:
        return False
    return None


def _to_float(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)) and not pd.isna(value):
        return float(value)
    raw = str(value).strip()
    if not raw:
        return None
    raw = raw.replace(",", "")
    try:
        return float(raw)
    except ValueError:
        return None


def _to_int(value: object) -> int | None:
    f = _to_float(value)
    if f is None:
        return None
    try:
        return int(f)
    except (ValueError, TypeError):
        return None


def _to_date(value: object) -> date | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if isinstance(value, date):
        return value
    raw = str(value).strip()
    if not raw:
        return None
    try:
        return date_parser.parse(raw, dayfirst=False).date()
    except Exception:
        return None


def _parse_percent(value: object, *, issues: list[LeadImportIssue], row: int, field: str) -> float | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None

    if isinstance(value, (int, float)):
        v = float(value)
        if 0 <= v <= 100:
            return v
        if 0 <= v <= 1:
            issues.append(
                LeadImportIssue(
                    severity="warning",
                    row=row,
                    field=field,
                    message="Value looks like a fraction; converted to percent by multiplying by 100.",
                )
            )
            return v * 100
        return None

    raw = str(value).strip().replace(",", "")
    if not raw:
        return None
    if raw.endswith("%"):
        raw = raw[:-1].strip()
    try:
        v = float(raw)
    except ValueError:
        return None
    if 0 <= v <= 100:
        return v
    if 0 <= v <= 1:
        issues.append(
            LeadImportIssue(
                severity="warning",
                row=row,
                field=field,
                message="Value looks like a fraction; converted to percent by multiplying by 100.",
            )
        )
        return v * 100
    return None


def _parse_millions(value: object, *, issues: list[LeadImportIssue], row: int, field: str) -> Decimal | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None

    if isinstance(value, (int, float)):
        v = float(value)
        if v >= 100000:
            issues.append(
                LeadImportIssue(
                    severity="warning",
                    row=row,
                    field=field,
                    message="Value is very large; assumed raw currency and converted to Millions (÷ 1,000,000).",
                )
            )
            v = v / 1_000_000
        return Decimal(str(v))

    raw = str(value).strip().replace(",", "")
    if not raw:
        return None

    m = re.fullmatch(r"(?P<num>[-+]?\d*\.?\d+)\s*(?P<unit>[kKmMbB]?)", raw)
    if not m:
        return None
    num = float(m.group("num"))
    unit = m.group("unit").lower()
    if unit == "k":
        issues.append(
            LeadImportIssue(
                severity="warning",
                row=row,
                field=field,
                message="Value used 'K' suffix; converted to Millions (÷ 1,000).",
            )
        )
        num = num / 1_000
    elif unit == "b":
        issues.append(
            LeadImportIssue(
                severity="warning",
                row=row,
                field=field,
                message="Value used 'B' suffix; converted to Millions (× 1,000).",
            )
        )
        num = num * 1_000
    elif unit == "m":
        pass
    elif unit == "":
        if num >= 100000:
            issues.append(
                LeadImportIssue(
                    severity="warning",
                    row=row,
                    field=field,
                    message="Value is very large; assumed raw currency and converted to Millions (÷ 1,000,000).",
                )
            )
            num = num / 1_000_000

    return Decimal(str(num))


def read_csv_upload(upload_bytes: bytes) -> pd.DataFrame:
    buf = io.BytesIO(upload_bytes)
    try:
        return pd.read_csv(buf)
    except UnicodeDecodeError:
        buf.seek(0)
        return pd.read_csv(buf, encoding="utf-8-sig")


def read_tabular_upload(upload_bytes: bytes, *, filename: str | None) -> pd.DataFrame:
    name = (filename or "").lower().strip()
    if name.endswith(".xlsx") or name.endswith(".xlsm"):
        buf = io.BytesIO(upload_bytes)
        try:
            return pd.read_excel(buf, engine="openpyxl")
        except ImportError as exc:
            raise ValueError("Excel upload requires openpyxl to be installed on the backend.") from exc
    if name.endswith(".xls"):
        raise ValueError("Legacy .xls uploads are not supported. Please upload .xlsx or .csv.")
    return read_csv_upload(upload_bytes)


def build_column_mapping(columns: list[str]) -> tuple[dict[str, str], list[str]]:
    mapped: dict[str, str] = {}
    extras: list[str] = []

    known: dict[str, str] = {
        "fullname": "full_name",
        "full_name": "full_name",
        "first_name": "first_name",
        "firstname": "first_name",
        "lastname": "last_name",
        "last_name": "last_name",
        "email": "email",
        "phone_number": "phone_number",
        "phone": "phone_number",
        "job_title": "job_title",
        "seniority_level": "seniority_level",
        "department": "department",
        "country": "country",
        "company_name": "company_name",
        "company_industry": "company_industry",
        "company_size_category": "company_size_category",
        "company_size_range": "company_size_range",
        "estimated_annual_revenue": "estimated_annual_revenue",
        "estimated_annual_revenue(millions)": "estimated_annual_revenue",
        "estimated_annual_revenue_millions": "estimated_annual_revenue",
        "lead_source": "lead_source",
        "date_captured": "date_captured",
        "website_visits": "website_visits",
        "pages_viewed": "pages_viewed",
        "average_time_on_site": "average_time_on_site",
        "average_time_on_site(mins)": "average_time_on_site",
        "average_time_on_site_mins": "average_time_on_site",
        "email_open_rate": "email_open_rate",
        "email_open_rate(%)": "email_open_rate",
        "email_open_rate_percent": "email_open_rate",
        "email_click_rate": "email_click_rate",
        "email_click_rate(%)": "email_click_rate",
        "email_click_rate_percent": "email_click_rate",
        "webinar_attendance": "webinar_attendance",
        "last_interaction_days": "last_interaction_days",
        "meeting_scheduled": "meeting_scheduled",
        "follow_up_status": "follow_up_status",
        "estimated_budget": "estimated_budget",
        "purchase_timeline": "purchase_timeline",
        "lead_status": "lead_status",
        "assignee_staff_id": "assignee_staff_id",
        "assigned_to": "assignee_staff_id",
    }

    for col in columns:
        key = _norm_header(col)
        canonical = known.get(key)
        if canonical:
            mapped[col] = canonical
        else:
            extras.append(col)

    return mapped, extras


def standardize_row(
    data: dict[str, Any],
    *,
    row_num: int,
    issues: list[LeadImportIssue],
) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    normalized["full_name"] = str(data.get("full_name") or "").strip()
    normalized["first_name"] = str(data.get("first_name") or "").strip()
    normalized["last_name"] = str(data.get("last_name") or "").strip()
    if not normalized["full_name"]:
        normalized["full_name"] = f"{normalized['first_name']} {normalized['last_name']}".strip()
    normalized["email"] = str(data.get("email") or "").strip()
    normalized["phone_number"] = str(data.get("phone_number") or "").strip()
    normalized["job_title"] = str(data.get("job_title") or "").strip()
    normalized["seniority_level"] = str(data.get("seniority_level") or "").strip()
    normalized["department"] = str(data.get("department") or "").strip()
    normalized["country"] = str(data.get("country") or "").strip()
    normalized["company_name"] = str(data.get("company_name") or "").strip()
    normalized["company_industry"] = str(data.get("company_industry") or "").strip()
    normalized["company_size_category"] = str(data.get("company_size_category") or "").strip()
    normalized["company_size_range"] = str(data.get("company_size_range") or "").strip()
    normalized["estimated_annual_revenue"] = _parse_millions(
        data.get("estimated_annual_revenue"),
        issues=issues,
        row=row_num,
        field="estimated_annual_revenue",
    )
    normalized["lead_source"] = str(data.get("lead_source") or "").strip()
    normalized["date_captured"] = _to_date(data.get("date_captured"))
    normalized["website_visits"] = _to_int(data.get("website_visits"))
    normalized["pages_viewed"] = _to_int(data.get("pages_viewed"))
    normalized["average_time_on_site"] = _to_float(data.get("average_time_on_site"))
    normalized["email_open_rate"] = _parse_percent(
        data.get("email_open_rate"),
        issues=issues,
        row=row_num,
        field="email_open_rate",
    )
    normalized["email_click_rate"] = _parse_percent(
        data.get("email_click_rate"),
        issues=issues,
        row=row_num,
        field="email_click_rate",
    )
    normalized["webinar_attendance"] = _to_bool(data.get("webinar_attendance"))
    normalized["last_interaction_days"] = _to_int(data.get("last_interaction_days"))
    normalized["meeting_scheduled"] = _to_bool(data.get("meeting_scheduled"))
    normalized["follow_up_status"] = str(data.get("follow_up_status") or "").strip()
    normalized["estimated_budget"] = str(data.get("estimated_budget") or "").strip()
    normalized["purchase_timeline"] = str(data.get("purchase_timeline") or "").strip()
    if "lead_status" in data and data.get("lead_status") is not None:
        normalized["lead_status"] = str(data.get("lead_status") or "").strip()
    if "assignee_staff_id" in data and data.get("assignee_staff_id") is not None:
        normalized["assignee_staff_id"] = str(data.get("assignee_staff_id") or "").strip()
    return normalized


def standardize_and_validate_rows(
    df: pd.DataFrame,
    *,
    max_preview_rows: int = 20,
    max_issues: int = 500,
) -> tuple[list[dict[str, Any]], list[LeadCreate], list[LeadImportIssue], dict[str, str], list[str], list[str]]:
    issues: list[LeadImportIssue] = []

    mapped, extras = build_column_mapping(list(df.columns))
    canonical_seen = set(mapped.values())
    required = {
        name
        for name, field in LeadCreate.model_fields.items()
        if callable(getattr(field, "is_required", None)) and field.is_required()
    }
    missing_required = sorted(required - canonical_seen)

    preview: list[dict[str, Any]] = []
    valid_payloads: list[LeadCreate] = []

    for idx, row in df.iterrows():
        row_num = int(idx) + 2
        data: dict[str, Any] = {}
        for original, canonical in mapped.items():
            raw = row.get(original)
            if isinstance(raw, float) and pd.isna(raw):
                raw = None
            data[canonical] = raw
        normalized = standardize_row(data, row_num=row_num, issues=issues)

        if len(preview) < max_preview_rows:
            preview.append(
                {
                    **{k: (v.isoformat() if isinstance(v, date) else v) for k, v in normalized.items()},
                    "__row__": row_num,
                }
            )

        try:
            payload = LeadCreate.model_validate({k: v for k, v in normalized.items() if k != "assignee_staff_id"})
            valid_payloads.append(payload)
        except ValidationError as e:
            for err in e.errors():
                loc = err.get("loc", ())
                field = str(loc[0]) if loc else None
                msg = err.get("msg", "Invalid value")
                issues.append(LeadImportIssue(severity="error", row=row_num, field=field, message=msg))

        if len(issues) >= max_issues:
            issues.append(
                LeadImportIssue(severity="error", row=None, field=None, message="Too many issues; stopped validating further rows.")
            )
            break

    return preview, valid_payloads, issues, mapped, missing_required, extras
