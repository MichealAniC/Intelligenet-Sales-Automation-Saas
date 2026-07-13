from __future__ import annotations

import csv
import io
import json
import uuid
from datetime import date, datetime, timezone
from typing import Any

import pandas as pd
from fastapi import File, Form, Response, UploadFile
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import ValidationError
import sqlalchemy as sa
from sqlalchemy import and_, func, or_, select, text
from sqlalchemy.orm import Session, aliased

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.crud.lead_assignments import create_assignment, get_latest_assignment, pick_assignee
from app.crud.lead_scores import create_lead_score
from app.crud.leads import (
    create_lead,
    get_lead_by_email,
    get_lead,
    is_lead_assigned_to,
    list_assigned_leads,
    list_leads,
    update_lead,
)
from app.ml.scoring import LeadScorer
from app.models.lead import Lead
from app.models.lead_assignment import LeadAssignment
from app.models.lead_event import LeadEvent
from app.models.lead_import_batch import LeadImportBatch
from app.models.lead_note import LeadNote
from app.models.lead_tag import LeadTag
from app.models.lead_tag_link import LeadTagLink
from app.models.lead_score import LeadScore
from app.models.enums import (
    CompanySizeCategory,
    EstimatedBudget,
    FollowUpStatus,
    LeadCategory,
    LeadSource,
    LeadStatus,
    PurchaseTimeline,
    SeniorityLevel,
    UserRole,
    LeadLifecycleState,
)
from app.models.user import User
from app.models.pinned_lead import PinnedLead
from app.schemas.lead import LeadCreate, LeadPublic, LeadUpdate
from app.schemas.lead_import import (
    LeadImportIssue,
    LeadImportResponse,
    LeadImportRowResult,
    LeadImportValidateResponse,
)
from app.schemas.lead_workflow import LeadWorkflowResponse
from app.schemas.lead_assignment import LeadAssignmentPublic
from app.schemas.lead_score import LeadScorePublic
from app.schemas.lead_summary import LeadOpsListResponse, LeadSummaryItem
from app.schemas.lead_ops import (
    BulkDeletePreview,
    BulkDeleteRequest,
    LeadActivityCreate,
    LeadActivityPublic,
    LeadEventPublic,
    LeadIntelligenceAI,
    LeadIntelligenceAssignment,
    LeadIntelligenceDetail,
    LeadNoteCreate,
    LeadNotePublic,
    LeadStatusUpdate,
    LeadTagPublic,
)
from app.services.ml_mapping import to_model_features
from app.services.prescriptive import decide
from app.services.assignment_engine import assign_lead as route_assign_lead
from app.services.lead_import import (
    build_column_mapping,
    read_tabular_upload,
    standardize_and_validate_rows,
    standardize_row,
)
from app.crud.users import get_user_by_staff_id

router = APIRouter(prefix="/leads")

scorer: LeadScorer | None = None


def get_scorer() -> LeadScorer:
    global scorer
    if scorer is None:
        scorer = LeadScorer(settings.ARTIFACTS_DIR)
    return scorer


def log_lead_event(
    *,
    db: Session,
    organization_id,
    lead_id: str,
    actor_user_id,
    event_type: str,
    data: dict[str, Any] | None = None,
    batch_id=None,
) -> None:
    db.add(
        LeadEvent(
            organization_id=organization_id,
            lead_id=lead_id,
            actor_user_id=actor_user_id,
            batch_id=batch_id,
            event_type=event_type,
            data=data,
        )
    )
    db.commit()


def next_import_batch_code(db: Session, *, organization_id) -> str:
    today = datetime.now(tz=timezone.utc).date()
    counter = db.execute(
        text(
            """
            INSERT INTO lead_import_batch_counters (organization_id, batch_date, counter)
            VALUES (:org_id, :batch_date, 1)
            ON CONFLICT (organization_id, batch_date)
            DO UPDATE SET counter = lead_import_batch_counters.counter + 1
            RETURNING counter
            """
        ),
        {"org_id": organization_id, "batch_date": today},
    ).scalar_one()
    return f"BATCH-{today.strftime('%Y%m%d')}-{int(counter):03d}"


def create_score_assign(
    *,
    db: Session,
    user: User,
    payload: LeadCreate,
    existing_lead_id: str | None = None,
    assignee_staff_id: str | None = None,
    assignment_mode: str = "keep_existing",
    batch_id=None,
    raw_data: dict[str, Any] | None = None,
    skip_assignment: bool = False,
) -> LeadWorkflowResponse:
    if existing_lead_id is not None:
        existing = get_lead(db, organization_id=user.organization_id, lead_id=existing_lead_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
        lead = update_lead(db, lead=existing, payload=payload)
        if batch_id is not None:
            lead.import_batch_id = batch_id
        if raw_data is not None:
            lead.raw_data = raw_data
        db.add(lead)
        db.commit()
        db.refresh(lead)
        log_lead_event(
            db=db,
            organization_id=user.organization_id,
            lead_id=lead.lead_id,
            actor_user_id=user.id,
            batch_id=batch_id,
            event_type="lead_updated",
        )
    else:
        lead = create_lead(
            db,
            organization_id=user.organization_id,
            payload=payload,
            import_batch_id=batch_id,
            raw_data=raw_data,
        )
        log_lead_event(
            db=db,
            organization_id=user.organization_id,
            lead_id=lead.lead_id,
            actor_user_id=user.id,
            batch_id=batch_id,
            event_type="lead_created",
        )

    s = get_scorer()
    features = to_model_features(payload.model_dump())
    scored = s.score(features)

    category = LeadCategory(scored.category)
    score = create_lead_score(
        db,
        organization_id=user.organization_id,
        lead_id=lead.lead_id,
        score_value=scored.score_value,
        score_category=category,
        prediction_probability=scored.probability,
        prediction_result=scored.probability >= 0.5,
        model_name=s.model_name,
    )
    log_lead_event(
        db=db,
        organization_id=user.organization_id,
        lead_id=lead.lead_id,
        actor_user_id=user.id,
        batch_id=batch_id,
        event_type="lead_scored",
        data={"score_value": score.score_value, "score_category": score.score_category.value},
    )

    decision = decide(category)

    assignment = None
    if not skip_assignment:
        existing_assignment = get_latest_assignment(db, organization_id=user.organization_id, lead_id=lead.lead_id)
        if assignment_mode == "keep_existing" and existing_assignment is not None and not assignee_staff_id:
            assignment = existing_assignment
        else:
            assignee = None
            if assignee_staff_id:
                candidate = get_user_by_staff_id(db, assignee_staff_id)
                if candidate and candidate.organization_id == user.organization_id and candidate.role == UserRole.SALES:
                    assignee = candidate

            if assignee is None:
                assignee = pick_assignee(db, organization_id=user.organization_id)

            if assignee is not None:
                assignment = create_assignment(
                    db,
                    organization_id=user.organization_id,
                    lead_id=lead.lead_id,
                    assigned_to=assignee.id,
                    assigned_by=user.id if user.role == UserRole.ADMIN else None,
                    priority=category,
                )
                log_lead_event(
                    db=db,
                    organization_id=user.organization_id,
                    lead_id=lead.lead_id,
                    actor_user_id=user.id,
                    batch_id=batch_id,
                    event_type="lead_assigned",
                    data={
                        "assigned_to": str(assignee.id),
                        "assigned_to_staff_id": assignee.staff_id,
                        "assigned_to_name": assignee.full_name,
                        "priority": category.value,
                    },
                )

    return LeadWorkflowResponse(
        lead=LeadPublic.model_validate(lead),
        score=LeadScorePublic.model_validate(score),
        assignment=LeadAssignmentPublic.model_validate(assignment) if assignment else None,
        recommended_action=decision.action,
    )


@router.post("", response_model=LeadWorkflowResponse)
def create_and_score_lead(
    payload: LeadCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeadWorkflowResponse:
    if user.role not in {UserRole.ADMIN, UserRole.SALES}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    return create_score_assign(
        db=db,
        user=user,
        payload=payload,
    )


@router.get("/import/template")
def download_import_template(user: User = Depends(get_current_user)) -> Response:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    headers = [
        "first_name",
        "last_name",
        "email",
        "phone_number",
        "job_title",
        "seniority_level",
        "department",
        "country",
        "company_name",
        "company_industry",
        "company_size_category",
        "company_size_range",
        "estimated_annual_revenue(Millions)",
        "lead_source",
        "date_captured",
        "website_visits",
        "pages_viewed",
        "average_time_on_site(mins)",
        "email_open_rate(%)",
        "email_click_rate(%)",
        "webinar_attendance",
        "last_interaction_days",
        "meeting_scheduled",
        "follow_up_status",
        "estimated_budget",
        "purchase_timeline",
        "assignee_staff_id",
    ]

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(headers)
    writer.writerow(
        [
            "John",
            "Doe",
            "john.doe@acme.com",
            "+2348012345678",
            "CEO",
            "C-Suite",
            "Sales",
            "Nigeria",
            "Acme Ltd",
            "SaaS",
            "Enterprise",
            "500-1000",
            "5.0",
            "LinkedIn",
            "2026-01-01",
            "10",
            "5",
            "3.2",
            "60",
            "10",
            "true",
            "4",
            "true",
            "Positive",
            "High",
            "Immediate",
            "",
        ]
    )

    content = buf.getvalue().encode("utf-8")
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="lead_import_template.csv"'},
    )


@router.get("/import/allowed-values")
def download_import_allowed_values(user: User = Depends(get_current_user)) -> Response:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    payload = {
        "units": {
            "estimated_annual_revenue(Millions)": "Millions",
            "average_time_on_site(mins)": "Minutes",
            "email_open_rate(%)": "Percent",
            "email_click_rate(%)": "Percent",
        },
        "enums": {
            "seniority_level": [e.value for e in SeniorityLevel],
            "company_size_category": [e.value for e in CompanySizeCategory],
            "lead_source": [e.value for e in LeadSource],
            "follow_up_status": [e.value for e in FollowUpStatus],
            "estimated_budget": [e.value for e in EstimatedBudget],
            "purchase_timeline": [e.value for e in PurchaseTimeline],
        },
        "notes": {
            "estimated_annual_revenue": "Values should be in Millions.",
            "email_open_rate": "Values should be 0-100 (%). Fractions like 0.6 may be converted to 60 with a warning.",
            "email_click_rate": "Values should be 0-100 (%). Fractions like 0.1 may be converted to 10 with a warning.",
        },
    }

    content = json.dumps(payload, indent=2).encode("utf-8")
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="lead_import_allowed_values.json"'},
    )


@router.post("/import/validate", response_model=LeadImportValidateResponse)
async def validate_lead_import(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeadImportValidateResponse:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    raw = await file.read()
    if len(raw) > settings.LEAD_IMPORT_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max allowed is {settings.LEAD_IMPORT_MAX_BYTES} bytes.",
        )
    try:
        df = read_tabular_upload(raw, filename=file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    if len(df) > settings.LEAD_IMPORT_MAX_ROWS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Too many rows. Max allowed is {settings.LEAD_IMPORT_MAX_ROWS}.",
        )
    preview, _valid_payloads, issues, mapped_cols, missing_required, extras = standardize_and_validate_rows(df)

    # Downgrade per-row data-quality errors to warnings: the /import endpoint
    # handles invalid rows individually (skip or fail), so they should NOT block
    # the Import-now button.  Only structural issues (missing columns) block.
    for issue in issues:
        if issue.severity == "error" and issue.row is not None:
            issue.severity = "warning"

    if not missing_required:
        seen = set()
        for idx, row in df.iterrows():
            row_num = int(idx) + 2
            email = None
            for original, canonical in mapped_cols.items():
                if canonical == "email":
                    email = row.get(original)
                    break
            if email is None or (isinstance(email, float) and pd.isna(email)):
                continue
            email_str = str(email).strip()
            if email_str.lower() in seen:
                issues.append(
                    LeadImportIssue(
                        severity="warning",
                        row=row_num,
                        field="email",
                        message="Duplicate email within this CSV file.",
                    )
                )
            else:
                seen.add(email_str.lower())
            exists = get_lead_by_email(db, organization_id=user.organization_id, email=email_str)
            if exists:
                issues.append(
                    LeadImportIssue(
                        severity="warning",
                        row=row_num,
                        field="email",
                        message="A lead with this email already exists in your workspace and will be updated on import.",
                    )
                )

    return LeadImportValidateResponse(
        row_count=int(len(df)),
        mapped_columns={k: v for k, v in mapped_cols.items()},
        missing_required_columns=missing_required,
        extra_columns=extras,
        preview_rows=preview,
        issues=issues,
    )


@router.post("/import", response_model=LeadImportResponse)
async def import_leads(
    file: UploadFile = File(...),
    duplicate_mode: str = Form("update"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeadImportResponse:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    duplicate_mode = str(duplicate_mode).strip().lower()
    if duplicate_mode not in {"update", "skip"}:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid duplicate_mode")

    raw = await file.read()
    if len(raw) > settings.LEAD_IMPORT_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max allowed is {settings.LEAD_IMPORT_MAX_BYTES} bytes.",
        )
    try:
        df = read_tabular_upload(raw, filename=file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    if len(df) > settings.LEAD_IMPORT_MAX_ROWS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Too many rows. Max allowed is {settings.LEAD_IMPORT_MAX_ROWS}.",
        )
    issues: list[LeadImportIssue] = []
    mapped_cols, _extras = build_column_mapping(list(df.columns))
    required_fields = {
        name
        for name, field in LeadCreate.model_fields.items()
        if callable(getattr(field, "is_required", None)) and field.is_required()
    }
    missing_required = sorted(required_fields - set(mapped_cols.values()))
    if missing_required:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Missing required columns: {', '.join(missing_required)}",
        )

    batch: LeadImportBatch | None = None
    try:
        batch_code = next_import_batch_code(db, organization_id=user.organization_id)
        batch = LeadImportBatch(
            id=uuid.uuid4(),
            organization_id=user.organization_id,
            batch_code=batch_code,
            filename=file.filename,
            imported_by=user.id,
            row_count=int(len(df)),
            imported_count=0,
            updated_count=0,
            skipped_duplicate_count=0,
            failed_count=0,
        )
        db.add(batch)
        db.commit()
        db.refresh(batch)
    except Exception as exc:
        issues.append(
            LeadImportIssue(severity="warning", row=None, field=None, message=f"Import batch not stored: {exc}")
        )

    results: list[LeadImportRowResult] = []
    imported = 0
    updated = 0
    skipped = 0
    failed = 0

    for idx, row in df.iterrows():
        row_num = int(idx) + 2
        original_row: dict[str, Any] = {}
        for col in df.columns:
            v = row.get(col)
            if isinstance(v, float) and pd.isna(v):
                v = None
            if isinstance(v, (pd.Timestamp, datetime, date)):
                v = v.isoformat()
            original_row[col] = v

        mapped_row: dict[str, Any] = {}
        for original, canonical in mapped_cols.items():
            raw_value = row.get(original)
            if isinstance(raw_value, float) and pd.isna(raw_value):
                raw_value = None
            mapped_row[canonical] = raw_value

        try:
            standardized = standardize_row(mapped_row, row_num=row_num, issues=issues)
            email_str = str(standardized.get("email") or "").strip()
            exists = (
                get_lead_by_email(db, organization_id=user.organization_id, email=email_str) if email_str else None
            )

            if exists and duplicate_mode == "skip":
                skipped += 1
                results.append(LeadImportRowResult(row=row_num, status="skipped_duplicate", message="Duplicate email"))
                continue

            merged: dict[str, Any] = {k: v for k, v in standardized.items() if k != "assignee_staff_id"}
            if exists:
                for field in LeadCreate.model_fields.keys():
                    v = merged.get(field)
                    if v is None:
                        merged[field] = getattr(exists, field)
                        continue
                    if isinstance(v, str) and not v.strip():
                        merged[field] = getattr(exists, field)

            payload = LeadCreate.model_validate(merged)

            workflow = create_score_assign(
                db=db,
                user=user,
                payload=payload,
                existing_lead_id=exists.lead_id if exists else None,
                batch_id=batch.id if batch is not None else None,
                raw_data={"original": original_row, "mapped": mapped_row},
                skip_assignment=True,
            )
            if exists:
                updated += 1
            else:
                imported += 1
            results.append(
                LeadImportRowResult(
                    row=row_num,
                    status="updated" if exists else "imported",
                    lead_id=workflow.lead.lead_id,
                    assigned_to=str(workflow.assignment.assigned_to) if workflow.assignment else None,
                    score_value=workflow.score.score_value,
                    score_category=workflow.score.score_category.value if workflow.score.score_category else None,
                )
            )
        except Exception as e:
            if isinstance(e, ValidationError):
                for err in e.errors():
                    loc = err.get("loc", ())
                    field = str(loc[0]) if loc else None
                    msg = err.get("msg", "Invalid value")
                    issues.append(LeadImportIssue(severity="error", row=row_num, field=field, message=msg))
                failed += 1
                results.append(LeadImportRowResult(row=row_num, status="failed", message="Validation failed"))
                continue
            failed += 1
            results.append(LeadImportRowResult(row=row_num, status="failed", message=str(e)))

    error_buf = io.StringIO()
    error_writer = csv.writer(error_buf)
    error_writer.writerow(["row", "type", "field", "message"])
    for r in results:
        if r.status == "failed":
            error_writer.writerow([r.row, "row_failed", "", r.message or "Failed"])
    for i in issues:
        error_writer.writerow([i.row or "", f"issue_{i.severity}", i.field or "", i.message])
    error_report_csv = error_buf.getvalue() if (failed > 0 or issues) else None

    if batch is not None:
        batch.imported_count = imported
        batch.updated_count = updated
        batch.skipped_duplicate_count = skipped
        batch.failed_count = failed
        db.add(batch)
        db.commit()

    return LeadImportResponse(
        batch_id=batch.batch_code if batch is not None else None,
        row_count=int(len(df)),
        imported_count=imported,
        updated_count=updated,
        skipped_duplicate_count=skipped,
        failed_count=failed,
        results=results,
        issues=issues,
        error_report_csv=error_report_csv,
    )


@router.get("", response_model=list[LeadPublic])
def get_leads(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0,
) -> list[LeadPublic]:
    if user.role == UserRole.ADMIN:
        leads = list_leads(db, organization_id=user.organization_id, limit=limit, offset=offset)
        return [LeadPublic.model_validate(l) for l in leads]

    if user.role == UserRole.SALES:
        leads = list_assigned_leads(
            db,
            organization_id=user.organization_id,
            assigned_to=user.id,
            limit=limit,
            offset=offset,
        )
        return [LeadPublic.model_validate(l) for l in leads]

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


@router.get("/ops", response_model=LeadOpsListResponse)
def get_leads_ops(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    q: str | None = None,
    tier: str | None = None,
    lead_status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> LeadOpsListResponse:
    if user.role not in {UserRole.ADMIN, UserRole.SALES}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    qv = (q or "").strip()

    base_ids = select(Lead.lead_id).where(
        Lead.organization_id == user.organization_id, Lead.is_deleted.is_(False)
    )
    if qv:
        like = f"%{qv}%"
        base_ids = base_ids.where(
            or_(
                Lead.lead_id.ilike(like),
                Lead.full_name.ilike(like),
                Lead.email.ilike(like),
                Lead.company_name.ilike(like),
                Lead.company_industry.ilike(like),
            )
        )

    if user.role == UserRole.SALES:
        assignment_max = (
            select(
                LeadAssignment.lead_id.label("lead_id"),
                func.max(LeadAssignment.assignment_date).label("max_assignment_date"),
            )
            .where(LeadAssignment.organization_id == user.organization_id)
            .group_by(LeadAssignment.lead_id)
            .subquery()
        )
        latest_assignment = aliased(LeadAssignment)
        base_ids = (
            base_ids.join(assignment_max, assignment_max.c.lead_id == Lead.lead_id)
            .join(
                latest_assignment,
                and_(
                    latest_assignment.lead_id == Lead.lead_id,
                    latest_assignment.assignment_date == assignment_max.c.max_assignment_date,
                ),
            )
            .where(latest_assignment.assigned_to == user.id)
        )

    total = int(db.scalar(select(func.count()).select_from(base_ids.subquery())) or 0)

    score_max = (
        select(
            LeadScore.lead_id.label("lead_id"),
            func.max(LeadScore.created_at).label("max_created_at"),
        )
        .where(LeadScore.organization_id == user.organization_id)
        .group_by(LeadScore.lead_id)
        .subquery()
    )
    assignment_max = (
        select(
            LeadAssignment.lead_id.label("lead_id"),
            func.max(LeadAssignment.assignment_date).label("max_assignment_date"),
        )
        .where(LeadAssignment.organization_id == user.organization_id)
        .group_by(LeadAssignment.lead_id)
        .subquery()
    )
    latest_score = aliased(LeadScore)
    latest_assignment = aliased(LeadAssignment)
    assignee = aliased(User)

    stmt = (
        select(Lead, latest_score, latest_assignment, assignee)
        .where(Lead.organization_id == user.organization_id, Lead.is_deleted.is_(False))
        .outerjoin(score_max, score_max.c.lead_id == Lead.lead_id)
        .outerjoin(
            latest_score,
            and_(latest_score.lead_id == Lead.lead_id, latest_score.created_at == score_max.c.max_created_at),
        )
        .outerjoin(assignment_max, assignment_max.c.lead_id == Lead.lead_id)
        .outerjoin(
            latest_assignment,
            and_(
                latest_assignment.lead_id == Lead.lead_id,
                latest_assignment.assignment_date == assignment_max.c.max_assignment_date,
            ),
        )
        .outerjoin(assignee, assignee.id == latest_assignment.assigned_to)
    )

    if qv:
        like = f"%{qv}%"
        stmt = stmt.where(
            or_(
                Lead.lead_id.ilike(like),
                Lead.full_name.ilike(like),
                Lead.email.ilike(like),
                Lead.company_name.ilike(like),
                Lead.company_industry.ilike(like),
            )
        )

    if user.role == UserRole.SALES:
        stmt = stmt.where(latest_assignment.assigned_to == user.id)

    if tier:
        stmt = stmt.where(latest_score.score_category == tier)
    if lead_status:
        stmt = stmt.where(Lead.lead_status == lead_status)

    stmt = stmt.order_by(Lead.created_at.desc()).limit(limit).offset(offset)

    rows = db.execute(stmt).all()
    out: list[LeadSummaryItem] = []
    for lead, score, assignment, rep in rows:
        action = decide(score.score_category).action if score is not None else None
        out.append(
            LeadSummaryItem(
                lead=LeadPublic.model_validate(lead),
                score_value=getattr(score, "score_value", None) if score is not None else None,
                score_category=getattr(score, "score_category", None) if score is not None else None,
                prediction_probability=getattr(score, "prediction_probability", None) if score is not None else None,
                recommended_action=action,
                assigned_to_staff_id=getattr(rep, "staff_id", None) if rep is not None else None,
                assigned_to_name=getattr(rep, "full_name", None) if rep is not None else None,
                assignment_status=getattr(assignment, "assignment_status", None) if assignment is not None else None,
            )
        )

    return LeadOpsListResponse(total=total, items=out)


@router.get("/summary", response_model=list[LeadSummaryItem])
def get_leads_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = 100,
    offset: int = 0,
) -> list[LeadSummaryItem]:
    if user.role not in {UserRole.ADMIN, UserRole.SALES}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    score_max = (
        select(
            LeadScore.lead_id.label("lead_id"),
            func.max(LeadScore.created_at).label("max_created_at"),
        )
        .where(LeadScore.organization_id == user.organization_id)
        .group_by(LeadScore.lead_id)
        .subquery()
    )
    assignment_max = (
        select(
            LeadAssignment.lead_id.label("lead_id"),
            func.max(LeadAssignment.assignment_date).label("max_assignment_date"),
        )
        .where(LeadAssignment.organization_id == user.organization_id)
        .group_by(LeadAssignment.lead_id)
        .subquery()
    )

    latest_score = aliased(LeadScore)
    latest_assignment = aliased(LeadAssignment)
    assignee = aliased(User)

    stmt = (
        select(Lead, latest_score, latest_assignment, assignee)
        .where(Lead.organization_id == user.organization_id, Lead.is_deleted.is_(False))
        .outerjoin(score_max, score_max.c.lead_id == Lead.lead_id)
        .outerjoin(
            latest_score,
            and_(latest_score.lead_id == Lead.lead_id, latest_score.created_at == score_max.c.max_created_at),
        )
        .outerjoin(assignment_max, assignment_max.c.lead_id == Lead.lead_id)
        .outerjoin(
            latest_assignment,
            and_(
                latest_assignment.lead_id == Lead.lead_id,
                latest_assignment.assignment_date == assignment_max.c.max_assignment_date,
            ),
        )
        .outerjoin(assignee, assignee.id == latest_assignment.assigned_to)
        .order_by(Lead.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    if user.role == UserRole.SALES:
        stmt = stmt.where(latest_assignment.assigned_to == user.id)

    rows = db.execute(stmt).all()
    out: list[LeadSummaryItem] = []
    for lead, score, assignment, rep in rows:
        action = decide(score.score_category).action if score is not None else None
        out.append(
            LeadSummaryItem(
                lead=LeadPublic.model_validate(lead),
                score_value=getattr(score, "score_value", None) if score is not None else None,
                score_category=getattr(score, "score_category", None) if score is not None else None,
                prediction_probability=getattr(score, "prediction_probability", None) if score is not None else None,
                recommended_action=action,
                assigned_to_staff_id=getattr(rep, "staff_id", None) if rep is not None else None,
                assigned_to_name=getattr(rep, "full_name", None) if rep is not None else None,
                assignment_status=getattr(assignment, "assignment_status", None) if assignment is not None else None,
            )
        )
    return out


@router.get("/pinned", response_model=list[LeadPublic])
def get_pinned_leads(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Get all pinned leads for this user
    pinned_leads = db.execute(
        select(Lead)
        .join(PinnedLead, PinnedLead.lead_id == Lead.lead_id)
        .where(
            PinnedLead.user_id == user.id,
            PinnedLead.organization_id == user.organization_id,
            Lead.is_deleted.is_(False)
        )
        .order_by(PinnedLead.pinned_at.desc())
    ).scalars().all()
    
    return [LeadPublic.model_validate(lead) for lead in pinned_leads]


@router.post("/{lead_id}/pin")
def pin_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Check if lead exists and is not deleted
    lead = get_lead(db, organization_id=user.organization_id, lead_id=lead_id)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found"
        )
    
    # Check how many pinned leads user already has
    existing_pinned_count = db.execute(
        select(func.count(PinnedLead.pinned_lead_id))
        .where(
            PinnedLead.user_id == user.id,
            PinnedLead.organization_id == user.organization_id
        )
    ).scalar_one()
    
    if existing_pinned_count >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only pin a maximum of 5 leads"
        )
    
    # Check if lead is already pinned by this user
    existing_pinned = db.execute(
        select(PinnedLead)
        .where(
            PinnedLead.user_id == user.id,
            PinnedLead.lead_id == lead_id,
            PinnedLead.organization_id == user.organization_id
        )
    ).scalar_one_or_none()
    
    if existing_pinned:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Lead is already pinned"
        )
    
    # Create the pinned lead record
    new_pinned = PinnedLead(
        organization_id=user.organization_id,
        user_id=user.id,
        lead_id=lead_id
    )
    db.add(new_pinned)
    db.commit()
    db.refresh(new_pinned)
    
    return {"message": "Lead pinned successfully", "pinned_lead_id": new_pinned.pinned_lead_id}


@router.delete("/{lead_id}/pin")
def unpin_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Find and delete the pinned lead
    pinned = db.execute(
        select(PinnedLead)
        .where(
            PinnedLead.user_id == user.id,
            PinnedLead.lead_id == lead_id,
            PinnedLead.organization_id == user.organization_id
        )
    ).scalar_one_or_none()
    
    if not pinned:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pinned lead not found"
        )
    
    db.delete(pinned)
    db.commit()
    
    return {"message": "Lead unpinned successfully"}


@router.get("/{lead_id}", response_model=LeadPublic)
def get_lead_by_id(
    lead_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeadPublic:
    if user.role == UserRole.ADMIN:
        lead = get_lead(db, organization_id=user.organization_id, lead_id=lead_id)
        if not lead or lead.is_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
        return LeadPublic.model_validate(lead)

    if user.role == UserRole.SALES:
        lead = get_lead(db, organization_id=user.organization_id, lead_id=lead_id)
        if not lead or lead.is_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
        allowed = is_lead_assigned_to(
            db,
            organization_id=user.organization_id,
            lead_id=lead_id,
            assigned_to=user.id,
        )
        if not allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return LeadPublic.model_validate(lead)

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


@router.get("/{lead_id}/intelligence", response_model=LeadIntelligenceDetail)
def get_lead_intelligence(
    lead_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeadIntelligenceDetail:
    if user.role not in {UserRole.ADMIN, UserRole.SALES}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    lead = get_lead(db, organization_id=user.organization_id, lead_id=lead_id)
    if not lead or lead.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    if user.role == UserRole.SALES:
        allowed = is_lead_assigned_to(
            db,
            organization_id=user.organization_id,
            lead_id=lead_id,
            assigned_to=user.id,
        )
        if not allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    latest_assignment = get_latest_assignment(db, organization_id=user.organization_id, lead_id=lead_id)
    assigned_to_staff_id = None
    assigned_to_name = None
    assignment_status = None
    if latest_assignment is not None:
        assignment_status = latest_assignment.assignment_status
        rep = db.scalar(select(User).where(User.id == latest_assignment.assigned_to))
        if rep is not None:
            assigned_to_staff_id = rep.staff_id
            assigned_to_name = rep.full_name

    latest_score = db.scalar(
        select(LeadScore)
        .where(LeadScore.organization_id == user.organization_id, LeadScore.lead_id == lead_id)
        .order_by(LeadScore.created_at.desc())
        .limit(1)
    )
    score_value = latest_score.score_value if latest_score is not None else None
    probability = latest_score.prediction_probability if latest_score is not None else None
    tier = latest_score.score_category if latest_score is not None else None
    recommended_action = decide(tier).action if tier is not None else None

    ai_priority_level = None
    if score_value is not None:
        if score_value >= 80:
            ai_priority_level = "High"
        elif score_value >= 50:
            ai_priority_level = "Medium"
        else:
            ai_priority_level = "Low"

    predicted_value = None
    if probability is not None and getattr(lead, "estimated_annual_revenue", None) is not None:
        predicted_value = float(lead.estimated_annual_revenue) * 1_000_000 * float(probability)

    reasoning_parts: list[str] = []
    if lead.website_visits >= 10:
        reasoning_parts.append("strong website activity")
    if lead.email_open_rate >= 50:
        reasoning_parts.append("high email engagement")
    if lead.email_click_rate >= 10:
        reasoning_parts.append("meaningful click-through behavior")
    if not reasoning_parts and score_value is not None:
        reasoning_parts.append("overall engagement and firmographic fit")
    reasoning = (
        f"Lead scored highly because of {', '.join(reasoning_parts)}."
        if score_value is not None and score_value >= 70
        else (f"Lead score reflects {', '.join(reasoning_parts)}." if reasoning_parts else None)
    )

    score_rank = None
    if score_value is not None:
        score_max = (
            select(
                LeadScore.lead_id.label("lead_id"),
                func.max(LeadScore.created_at).label("max_created_at"),
            )
            .where(LeadScore.organization_id == user.organization_id)
            .group_by(LeadScore.lead_id)
            .subquery()
        )
        latest_score_alias = aliased(LeadScore)
        higher_count = db.scalar(
            select(func.count())
            .select_from(Lead)
            .join(score_max, score_max.c.lead_id == Lead.lead_id)
            .join(
                latest_score_alias,
                and_(
                    latest_score_alias.lead_id == Lead.lead_id,
                    latest_score_alias.created_at == score_max.c.max_created_at,
                ),
            )
            .where(
                Lead.organization_id == user.organization_id,
                Lead.is_deleted.is_(False),
                latest_score_alias.score_value > score_value,
            )
        )
        score_rank = int(higher_count or 0) + 1

    batch_code = None
    if lead.import_batch_id is not None:
        batch = db.scalar(
            select(LeadImportBatch).where(
                LeadImportBatch.organization_id == user.organization_id,
                LeadImportBatch.id == lead.import_batch_id,
            )
        )
        batch_code = batch.batch_code if batch is not None else None

    recent_events = list(
        db.scalars(
            select(LeadEvent)
            .where(LeadEvent.organization_id == user.organization_id, LeadEvent.lead_id == lead_id)
            .order_by(LeadEvent.created_at.desc())
            .limit(50)
        )
    )
    notes = list(
        db.scalars(
            select(LeadNote)
            .where(LeadNote.organization_id == user.organization_id, LeadNote.lead_id == lead_id)
            .order_by(LeadNote.created_at.desc())
            .limit(100)
        )
    )
    tags = list(
        db.scalars(
            select(LeadTag)
            .join(LeadTagLink, LeadTagLink.tag_id == LeadTag.id)
            .where(LeadTagLink.lead_id == lead_id, LeadTag.organization_id == user.organization_id)
            .order_by(LeadTag.name.asc())
        )
    )

    return LeadIntelligenceDetail(
        lead=LeadPublic.model_validate(lead),
        lead_status=lead.lead_status,
        import_batch_code=batch_code,
        raw_data=lead.raw_data,
        ai=LeadIntelligenceAI(
            score_value=score_value,
            conversion_probability=probability,
            lead_tier=tier,
            ai_priority_level=ai_priority_level,
            confidence_score=probability,
            ranking_position=score_rank,
            predicted_value=predicted_value,
            recommended_action=recommended_action,
            reasoning=reasoning,
        ),
        assignment=LeadIntelligenceAssignment(
            assigned_to_staff_id=assigned_to_staff_id,
            assigned_to_name=assigned_to_name,
            assignment_status=assignment_status,
        ),
        recent_events=[LeadEventPublic.model_validate(e) for e in recent_events],
        notes=[LeadNotePublic.model_validate(n) for n in notes],
        tags=[LeadTagPublic.model_validate(t) for t in tags],
    )


@router.post("/{lead_id}/notes", response_model=LeadNotePublic)
def add_lead_note(
    lead_id: str,
    payload: LeadNoteCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeadNotePublic:
    if user.role not in {UserRole.ADMIN, UserRole.SALES}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    lead = get_lead(db, organization_id=user.organization_id, lead_id=lead_id)
    if not lead or lead.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    if user.role == UserRole.SALES:
        allowed = is_lead_assigned_to(
            db,
            organization_id=user.organization_id,
            lead_id=lead_id,
            assigned_to=user.id,
        )
        if not allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    note = LeadNote(
        id=uuid.uuid4(),
        organization_id=user.organization_id,
        lead_id=lead_id,
        author_user_id=user.id,
        body=str(payload.body),
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    log_lead_event(
        db=db,
        organization_id=user.organization_id,
        lead_id=lead_id,
        actor_user_id=user.id,
        event_type="lead_note_added",
        data={"note_id": str(note.id)},
    )
    return LeadNotePublic.model_validate(note)


@router.patch("/{lead_id}", response_model=LeadPublic)
def update_lead(
    lead_id: str,
    payload: LeadUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeadPublic:
    """Update lead details. Accessible to both Admin and assigned Sales members."""
    if user.role not in {UserRole.ADMIN, UserRole.SALES}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    lead = get_lead(db, organization_id=user.organization_id, lead_id=lead_id)
    if not lead or lead.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    if user.role == UserRole.SALES:
        if not is_lead_assigned_to(db, organization_id=user.organization_id, lead_id=lead_id, assigned_to=user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    # Check if lifecycle_state is being changed
    old_lifecycle_state = lead.lifecycle_state
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(lead, key, value)

    # If lifecycle state changed, create an activity
    if old_lifecycle_state != lead.lifecycle_state:
        from app.models.activity import Activity
        from app.models.enums import ActivityType, ActivityOutcome
        activity = Activity(
            organization_id=user.organization_id,
            lead_id=lead.lead_id,
            user_id=user.id,
            activity_type=ActivityType.NOTE,
            outcome=ActivityOutcome.COMPLETED,
            notes=f"Lead moved from {old_lifecycle_state.value if old_lifecycle_state else 'None'} to {lead.lifecycle_state.value}",
        )
        db.add(activity)

    db.commit()
    db.refresh(lead)

    return LeadPublic.model_validate(lead)


@router.patch("/{lead_id}/status", response_model=LeadPublic)
def update_lead_status(
    lead_id: str,
    payload: LeadStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeadPublic:
    """Update pipeline stage for a lead. Accessible to both Admin and assigned Sales members."""
    if user.role not in {UserRole.ADMIN, UserRole.SALES}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    lead = get_lead(db, organization_id=user.organization_id, lead_id=lead_id)
    if not lead or lead.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    if user.role == UserRole.SALES:
        if not is_lead_assigned_to(db, organization_id=user.organization_id, lead_id=lead_id, assigned_to=user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    old_status = lead.lead_status
    lead.lead_status = payload.lead_status
    db.commit()
    db.refresh(lead)

    log_lead_event(
        db=db,
        organization_id=user.organization_id,
        lead_id=lead_id,
        actor_user_id=user.id,
        event_type="lead_status_changed",
        data={"old_status": old_status.value if old_status else None, "new_status": payload.lead_status.value},
    )
    return LeadPublic.model_validate(lead)


@router.post("/{lead_id}/activities", response_model=LeadActivityPublic)
def log_lead_activity(
    lead_id: str,
    payload: LeadActivityCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeadActivityPublic:
    """Log a sales activity (Call, Email, Meeting, Note) for a lead."""
    if user.role not in {UserRole.ADMIN, UserRole.SALES}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    lead = get_lead(db, organization_id=user.organization_id, lead_id=lead_id)
    if not lead or lead.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    if user.role == UserRole.SALES:
        if not is_lead_assigned_to(db, organization_id=user.organization_id, lead_id=lead_id, assigned_to=user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    event = LeadEvent(
        organization_id=user.organization_id,
        lead_id=lead_id,
        actor_user_id=user.id,
        event_type=f"activity_{payload.activity_type.lower()}",
        data={
            "activity_type": payload.activity_type,
            "outcome": payload.outcome,
            "notes": payload.notes,
        },
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return LeadActivityPublic.model_validate(event)


@router.post("/{lead_id}/tags", response_model=list[LeadTagPublic])
def add_lead_tag(
    lead_id: str,
    name: str = Form(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[LeadTagPublic]:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    lead = get_lead(db, organization_id=user.organization_id, lead_id=lead_id)
    if not lead or lead.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    tag_name = str(name).strip()
    if not tag_name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="name is required")

    tag = db.scalar(
        select(LeadTag).where(LeadTag.organization_id == user.organization_id, LeadTag.name == tag_name)
    )
    if tag is None:
        tag = LeadTag(id=uuid.uuid4(), organization_id=user.organization_id, name=tag_name)
        db.add(tag)
        db.commit()
        db.refresh(tag)

    exists_link = db.scalar(
        select(LeadTagLink).where(LeadTagLink.lead_id == lead_id, LeadTagLink.tag_id == tag.id)
    )
    if exists_link is None:
        db.add(LeadTagLink(lead_id=lead_id, tag_id=tag.id))
        db.commit()
        log_lead_event(
            db=db,
            organization_id=user.organization_id,
            lead_id=lead_id,
            actor_user_id=user.id,
            event_type="lead_tag_added",
            data={"tag_id": str(tag.id), "tag_name": tag.name},
        )

    tags = list(
        db.scalars(
            select(LeadTag)
            .join(LeadTagLink, LeadTagLink.tag_id == LeadTag.id)
            .where(LeadTagLink.lead_id == lead_id, LeadTag.organization_id == user.organization_id)
            .order_by(LeadTag.name.asc())
        )
    )
    return [LeadTagPublic.model_validate(t) for t in tags]


@router.delete("/{lead_id}/tags/{tag_id}", response_model=list[LeadTagPublic])
def remove_lead_tag(
    lead_id: str,
    tag_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[LeadTagPublic]:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    lead = get_lead(db, organization_id=user.organization_id, lead_id=lead_id)
    if not lead or lead.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    link = db.scalar(select(LeadTagLink).where(LeadTagLink.lead_id == lead_id, LeadTagLink.tag_id == tag_id))
    if link is not None:
        db.delete(link)
        db.commit()
        log_lead_event(
            db=db,
            organization_id=user.organization_id,
            lead_id=lead_id,
            actor_user_id=user.id,
            event_type="lead_tag_removed",
            data={"tag_id": str(tag_id)},
        )

    tags = list(
        db.scalars(
            select(LeadTag)
            .join(LeadTagLink, LeadTagLink.tag_id == LeadTag.id)
            .where(LeadTagLink.lead_id == lead_id, LeadTag.organization_id == user.organization_id)
            .order_by(LeadTag.name.asc())
        )
    )
    return [LeadTagPublic.model_validate(t) for t in tags]


@router.delete("/{lead_id}", response_model=LeadPublic)
def soft_delete_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeadPublic:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    lead = get_lead(db, organization_id=user.organization_id, lead_id=lead_id)
    if not lead or lead.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    lead.is_deleted = True
    lead.deleted_at = datetime.now(tz=timezone.utc)
    lead.deleted_by = user.id
    db.add(lead)
    db.commit()
    db.refresh(lead)
    log_lead_event(
        db=db,
        organization_id=user.organization_id,
        lead_id=lead_id,
        actor_user_id=user.id,
        event_type="lead_deleted",
    )
    return LeadPublic.model_validate(lead)


@router.post("/{lead_id}/restore", response_model=LeadPublic)
def restore_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeadPublic:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    lead = get_lead(db, organization_id=user.organization_id, lead_id=lead_id)
    if not lead or not lead.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    lead.is_deleted = False
    lead.deleted_at = None
    lead.deleted_by = None
    db.add(lead)
    db.commit()
    db.refresh(lead)
    log_lead_event(
        db=db,
        organization_id=user.organization_id,
        lead_id=lead_id,
        actor_user_id=user.id,
        event_type="lead_restored",
    )
    return LeadPublic.model_validate(lead)


@router.post("/system/wake-nurturing", response_model=list[LeadPublic])
def wake_nurturing_leads(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[LeadPublic]:
    """Wake up nurturing leads that are due (next_followup_date <= now)."""
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    now = datetime.now(tz=timezone.utc)
    stmt = select(Lead).where(
        Lead.organization_id == user.organization_id,
        Lead.is_deleted.is_(False),
        Lead.lifecycle_state == LeadLifecycleState.NURTURING,
        Lead.next_followup_date <= now,
    )
    leads = db.scalars(stmt).all()

    for lead in leads:
        old_state = lead.lifecycle_state
        lead.lifecycle_state = LeadLifecycleState.ACTIVE
        lead.next_followup_date = None
        db.add(lead)

        # Create activity log
        from app.models.activity import Activity
        from app.models.enums import ActivityType, ActivityOutcome
        activity = Activity(
            organization_id=user.organization_id,
            lead_id=lead.lead_id,
            user_id=user.id,
            activity_type=ActivityType.NOTE,
            outcome=ActivityOutcome.COMPLETED,
            notes="Lead woken up from nurturing state",
        )
        db.add(activity)

    db.commit()

    return [LeadPublic.model_validate(lead) for lead in leads]


@router.post("/{lead_id}/archive", response_model=LeadPublic)
def archive_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeadPublic:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    lead = get_lead(db, organization_id=user.organization_id, lead_id=lead_id)
    if not lead or lead.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    lead.lead_status = LeadStatus.ARCHIVED
    lead.archived_at = datetime.now(tz=timezone.utc)
    lead.archived_by = user.id
    db.add(lead)
    db.commit()
    db.refresh(lead)
    log_lead_event(
        db=db,
        organization_id=user.organization_id,
        lead_id=lead_id,
        actor_user_id=user.id,
        event_type="lead_archived",
    )
    return LeadPublic.model_validate(lead)


@router.post("/{lead_id}/unarchive", response_model=LeadPublic)
def unarchive_lead(
    lead_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> LeadPublic:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    lead = get_lead(db, organization_id=user.organization_id, lead_id=lead_id)
    if not lead or lead.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")
    if lead.lead_status != LeadStatus.ARCHIVED:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Lead is not archived")
    lead.lead_status = LeadStatus.NEW
    lead.archived_at = None
    lead.archived_by = None
    db.add(lead)
    db.commit()
    db.refresh(lead)
    log_lead_event(
        db=db,
        organization_id=user.organization_id,
        lead_id=lead_id,
        actor_user_id=user.id,
        event_type="lead_unarchived",
    )
    return LeadPublic.model_validate(lead)


@router.post("/bulk-delete/preview", response_model=BulkDeletePreview)
def bulk_delete_preview(
    payload: BulkDeleteRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BulkDeletePreview:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    stmt = select(Lead.lead_id).where(Lead.organization_id == user.organization_id, Lead.is_deleted.is_(False))

    if payload.lead_status is not None:
        stmt = stmt.where(Lead.lead_status == payload.lead_status)

    if payload.created_after is not None:
        stmt = stmt.where(Lead.created_at >= payload.created_after)
    if payload.created_before is not None:
        stmt = stmt.where(Lead.created_at <= payload.created_before)

    if payload.batch_code:
        batch = db.scalar(
            select(LeadImportBatch).where(
                LeadImportBatch.organization_id == user.organization_id,
                LeadImportBatch.batch_code == payload.batch_code,
            )
        )
        if batch is None:
            return BulkDeletePreview(affected_count=0, sample_lead_ids=[])
        stmt = stmt.where(Lead.import_batch_id == batch.id)

    if payload.min_score is not None or payload.max_score is not None:
        score_max = (
            select(LeadScore.lead_id.label("lead_id"), func.max(LeadScore.created_at).label("max_created_at"))
            .where(LeadScore.organization_id == user.organization_id)
            .group_by(LeadScore.lead_id)
            .subquery()
        )
        latest_score = aliased(LeadScore)
        stmt = (
            stmt.join(score_max, score_max.c.lead_id == Lead.lead_id)
            .join(
                latest_score,
                and_(latest_score.lead_id == Lead.lead_id, latest_score.created_at == score_max.c.max_created_at),
            )
        )
        if payload.min_score is not None:
            stmt = stmt.where(latest_score.score_value >= payload.min_score)
        if payload.max_score is not None:
            stmt = stmt.where(latest_score.score_value <= payload.max_score)

    affected_count = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    sample = [r[0] for r in db.execute(stmt.limit(20)).all()]
    return BulkDeletePreview(affected_count=int(affected_count), sample_lead_ids=sample)


@router.post("/bulk-delete", response_model=BulkDeletePreview)
def bulk_delete_execute(
    payload: BulkDeleteRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> BulkDeletePreview:
    preview = bulk_delete_preview(payload, db=db, user=user)
    if preview.affected_count == 0:
        return preview

    stmt = select(Lead.lead_id).where(Lead.organization_id == user.organization_id, Lead.is_deleted.is_(False))

    if payload.lead_status is not None:
        stmt = stmt.where(Lead.lead_status == payload.lead_status)

    if payload.created_after is not None:
        stmt = stmt.where(Lead.created_at >= payload.created_after)
    if payload.created_before is not None:
        stmt = stmt.where(Lead.created_at <= payload.created_before)

    if payload.batch_code:
        batch = db.scalar(
            select(LeadImportBatch).where(
                LeadImportBatch.organization_id == user.organization_id,
                LeadImportBatch.batch_code == payload.batch_code,
            )
        )
        if batch is None:
            return BulkDeletePreview(affected_count=0, sample_lead_ids=[])
        stmt = stmt.where(Lead.import_batch_id == batch.id)

    if payload.min_score is not None or payload.max_score is not None:
        score_max = (
            select(LeadScore.lead_id.label("lead_id"), func.max(LeadScore.created_at).label("max_created_at"))
            .where(LeadScore.organization_id == user.organization_id)
            .group_by(LeadScore.lead_id)
            .subquery()
        )
        latest_score = aliased(LeadScore)
        stmt = (
            stmt.join(score_max, score_max.c.lead_id == Lead.lead_id)
            .join(
                latest_score,
                and_(latest_score.lead_id == Lead.lead_id, latest_score.created_at == score_max.c.max_created_at),
            )
        )
        if payload.min_score is not None:
            stmt = stmt.where(latest_score.score_value >= payload.min_score)
        if payload.max_score is not None:
            stmt = stmt.where(latest_score.score_value <= payload.max_score)

    lead_ids = [r[0] for r in db.execute(stmt).all()]
    if not lead_ids:
        return BulkDeletePreview(affected_count=0, sample_lead_ids=[])

    now = datetime.now(tz=timezone.utc)
    chunk_size = 500
    for i in range(0, len(lead_ids), chunk_size):
        chunk = lead_ids[i : i + chunk_size]
        db.execute(
            sa.update(Lead)
            .where(Lead.organization_id == user.organization_id, Lead.lead_id.in_(chunk))
            .values(is_deleted=True, deleted_at=now, deleted_by=user.id)
        )
        db.commit()
        db.execute(
            sa.insert(LeadEvent),
            [
                {
                    "id": uuid.uuid4(),
                    "organization_id": user.organization_id,
                    "lead_id": lid,
                    "actor_user_id": user.id,
                    "event_type": "lead_deleted_bulk",
                    "data": {"bulk": True},
                }
                for lid in chunk
            ],
        )
        db.commit()

    return preview


@router.post("/trigger-auto-assignment")
def trigger_auto_assignment(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    # Find leads in this org that have NO assignment record at all
    assigned_lead_ids = (
        select(LeadAssignment.lead_id)
        .where(LeadAssignment.organization_id == user.organization_id)
        .distinct()
        .subquery()
    )
    unassigned_leads = list(
        db.scalars(
            select(Lead).where(
                Lead.organization_id == user.organization_id,
                Lead.is_deleted.is_(False),
                Lead.lead_id.notin_(select(assigned_lead_ids)),
            )
        ).all()
    )

    # Use new bulk assignment function with Continuous Replenishment model
    from app.services.assignment_engine import bulk_assign_leads
    result = bulk_assign_leads(
        db,
        unassigned_leads=unassigned_leads,
        organization_id=user.organization_id,
        assigned_by=user.id,
    )

    return {
        "total_unassigned": result.total_unassigned,
        "assigned": result.assigned_count,
        "failed": result.failed_count,
        "assignments": result.assignments,
    }



