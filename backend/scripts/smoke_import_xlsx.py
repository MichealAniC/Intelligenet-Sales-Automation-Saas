import io
import os
import sys
import time

sys.path.append(os.getcwd())

import pandas as pd
from fastapi.testclient import TestClient

from app.main import app


def main() -> None:
    client = TestClient(app)

    ts = int(time.time())
    staff_id = f"ADM-{(ts % 1000):03d}"
    email = f"xlsx_admin_{ts}@example.com"
    password = "Password123!"

    r = client.post(
        "/api/v1/auth/signup-admin",
        json={
            "organization_name": f"XLSX Org {ts}",
            "full_name": "XLSX Admin",
            "email": email,
            "password": password,
            "staff_id": staff_id,
        },
    )
    if r.status_code not in (200, 409):
        raise RuntimeError(r.text)

    r = client.post("/api/v1/auth/login", json={"staff_id": staff_id, "password": password})
    r.raise_for_status()
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    df = pd.DataFrame(
        [
            {
                "first_name": "John",
                "last_name": "Doe",
                "email": "john.doe.xlsx@example.com",
                "phone_number": "+2348012345678",
                "job_title": "CEO",
                "seniority_level": "C-Suite",
                "department": "Sales",
                "country": "Nigeria",
                "company_name": "Acme Ltd",
                "company_industry": "SaaS",
                "company_size_category": "Enterprise",
                "company_size_range": "500-1000",
                "estimated_annual_revenue(Millions)": 5.0,
                "lead_source": "LinkedIn",
                "date_captured": "2026-01-01",
                "website_visits": 10,
                "pages_viewed": 5,
                "average_time_on_site(mins)": 3.2,
                "email_open_rate(%)": 60,
                "email_click_rate(%)": 10,
                "webinar_attendance": True,
                "last_interaction_days": 4,
                "meeting_scheduled": True,
                "follow_up_status": "Positive",
                "estimated_budget": "High",
                "purchase_timeline": "Immediate",
            }
        ]
    )

    buf = io.BytesIO()
    df.to_excel(buf, index=False, engine="openpyxl")
    buf.seek(0)

    files = {
        "file": (
            "leads.xlsx",
            buf,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }

    r = client.post("/api/v1/leads/import/validate", files=files, headers=headers)
    r.raise_for_status()
    data = r.json()
    assert data["row_count"] == 1
    assert not data["missing_required_columns"]

    buf.seek(0)
    r = client.post("/api/v1/leads/import", files=files, headers=headers)
    r.raise_for_status()
    data = r.json()
    assert data["imported_count"] == 1

    print("ok", {"imported": data["imported_count"], "failed": data["failed_count"]})


if __name__ == "__main__":
    main()
