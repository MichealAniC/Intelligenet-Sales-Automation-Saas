from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class LeadImportIssue(BaseModel):
    severity: Literal["error", "warning"] = "error"
    row: int | None = None
    field: str | None = None
    message: str


class LeadImportValidateResponse(BaseModel):
    row_count: int
    mapped_columns: dict[str, str]
    missing_required_columns: list[str]
    extra_columns: list[str]
    preview_rows: list[dict[str, object]]
    issues: list[LeadImportIssue]


class LeadImportRowResult(BaseModel):
    row: int
    status: Literal["imported", "updated", "skipped_duplicate", "failed"]
    lead_id: str | None = None
    assigned_to: str | None = None
    score_value: int | None = None
    score_category: str | None = None
    message: str | None = None


class LeadImportResponse(BaseModel):
    batch_id: str | None = None
    row_count: int
    imported_count: int
    updated_count: int
    skipped_duplicate_count: int
    failed_count: int
    results: list[LeadImportRowResult]
    issues: list[LeadImportIssue]
    error_report_csv: str | None = None
