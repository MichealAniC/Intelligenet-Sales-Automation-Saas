import io
import os
import sys
import time

sys.path.append(os.getcwd())

from fastapi.testclient import TestClient

from app.main import app


def main() -> None:
    client = TestClient(app)

    ts = int(time.time())
    staff_id = f"ADM-{ts % 1000:03d}"
    email = f"import_err_{ts}@example.com"
    password = "Password123!"

    r = client.post(
        "/api/v1/auth/signup-admin",
        json={
            "organization_name": f"Import Err Org {ts}",
            "full_name": "Import Admin",
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

    csv_text = """first_name,last_name,email,phone_number,job_title,seniority_level,department,country,company_name,company_industry,company_size_category,company_size_range,estimated_annual_revenue(Millions),lead_source,date_captured,website_visits,pages_viewed,average_time_on_site(mins),email_open_rate(%),email_click_rate(%),webinar_attendance,last_interaction_days,meeting_scheduled,follow_up_status,estimated_budget,purchase_timeline
John,Doe,john.doe.err@example.com,+2348012345678,CEO,C-Suite,Sales,Nigeria,Acme Ltd,SaaS,Enterprise,500-1000,5.0,LinkedIn,2026-01-01,10,5,3.2,60,10,true,4,true,Positive,High,Immediate
,,not-an-email,+2348012223333,VP Sales,VP,Sales,Nigeria,Globex Ltd,FinTech,SMB,10-50,5.0,Referral,2026-01-02,8,4,2.2,55,8,false,7,false,Neutral,Medium,1-3 Months
"""

    files = {"file": ("leads.csv", io.BytesIO(csv_text.encode("utf-8")), "text/csv")}
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post("/api/v1/leads/import", files=files, headers=headers)
    r.raise_for_status()
    data = r.json()

    assert data["row_count"] == 2
    assert data["imported_count"] == 1
    assert data["failed_count"] == 1
    assert data.get("error_report_csv")
    print("ok", {"batch_id": data.get("batch_id"), "imported": data["imported_count"], "failed": data["failed_count"]})


if __name__ == "__main__":
    main()
