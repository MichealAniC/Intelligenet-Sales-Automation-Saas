import argparse
from pathlib import Path

import requests


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8002/api/v1")
    parser.add_argument("--staff-id", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("file")
    args = parser.parse_args()

    path = Path(args.file)
    if not path.exists():
        raise SystemExit(f"File not found: {path}")

    r = requests.post(
        f"{args.base}/auth/login",
        json={"staff_id": args.staff_id, "password": args.password},
        timeout=20,
    )
    r.raise_for_status()
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    with path.open("rb") as f:
        files = {"file": (path.name, f, "text/csv")}
        r = requests.post(f"{args.base}/leads/import/validate", files=files, headers=headers, timeout=120)
    r.raise_for_status()
    validate = r.json()

    issues = validate.get("issues") or []
    issue_summary: dict[str, int] = {}
    for i in issues:
        sev = i.get("severity") or "unknown"
        issue_summary[sev] = issue_summary.get(sev, 0) + 1

    print(
        "validate",
        {
            "row_count": validate.get("row_count"),
            "missing_required_columns": validate.get("missing_required_columns"),
            "extra_columns": validate.get("extra_columns"),
            "issues_total": len(issues),
            "issues_by_severity": issue_summary,
        },
    )

    with path.open("rb") as f:
        files = {"file": (path.name, f, "text/csv")}
        r = requests.post(f"{args.base}/leads/import", files=files, headers=headers, timeout=300)
    r.raise_for_status()
    imported = r.json()

    results = imported.get("results") or []
    imported_rows = [x for x in results if x.get("status") in ("imported", "updated")]
    missing_scores = sum(1 for x in imported_rows if x.get("score_value") is None or x.get("score_category") is None)
    missing_assignments = sum(1 for x in imported_rows if x.get("assigned_to") is None)
    lead_ids = [x.get("lead_id") for x in imported_rows if x.get("lead_id")]

    print(
        "import",
        {
            "batch_id": imported.get("batch_id"),
            "row_count": imported.get("row_count"),
            "imported_count": imported.get("imported_count"),
            "updated_count": imported.get("updated_count"),
            "skipped_duplicate_count": imported.get("skipped_duplicate_count"),
            "failed_count": imported.get("failed_count"),
            "issues_total": len(imported.get("issues") or []),
            "missing_scores": missing_scores,
            "missing_assignments": missing_assignments,
        },
    )

    sample_ids = lead_ids[:5]
    sample_ok = 0
    for lead_id in sample_ids:
        r = requests.get(f"{args.base}/leads/{lead_id}", headers=headers, timeout=30)
        if r.ok:
            sample_ok += 1
    print("lead_fetch_sample", {"requested": len(sample_ids), "ok": sample_ok})

    r = requests.get(f"{args.base}/leads", headers=headers, params={"limit": 50, "offset": 0}, timeout=30)
    r.raise_for_status()
    first_page = r.json()
    present_in_first_page = sum(1 for lead_id in sample_ids if any(l.get("lead_id") == lead_id for l in first_page))
    print("leads_list_first_page", {"count": len(first_page), "sample_ids_present": present_in_first_page})


if __name__ == "__main__":
    main()
