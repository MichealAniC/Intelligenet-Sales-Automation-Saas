import os
import sys

sys.path.append(os.getcwd())

from fastapi.testclient import TestClient

from app.main import app


def main() -> None:
    client = TestClient(app)

    admin_email = "admin@example.com"
    admin_pass = "Admin123!"

    r = client.post(
        "/api/v1/auth/signup-admin",
        json={
            "organization_name": "Test Org",
            "full_name": "Admin User",
            "email": admin_email,
            "password": admin_pass,
            "staff_id": "ADM-001",
        },
    )
    print("signup_admin", r.status_code, r.text)

    r = client.post(
        "/api/v1/auth/login",
        json={"staff_id": "ADM-001", "password": admin_pass},
    )
    print("login_admin", r.status_code, r.text)

    if r.status_code >= 400:
        return

    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post(
        "/api/v1/invitations",
        headers=headers,
        json={
            "email": "sales2@example.com",
            "expires_in_hours": 24,
        },
    )
    print("invite_sales", r.status_code, r.text)
    token = r.json().get("invitation_token") if r.ok else None
    if token:
        r = client.post(
            "/api/v1/invitations/accept",
            json={
                "token": token,
                "full_name": "Sales Two",
                "password": "Sales123!",
                "staff_id": "ST-002",
            },
        )
        print("accept_invite", r.status_code, r.text)

    lead = {
        "first_name": "Jane",
        "last_name": "Doe",
        "email": "jane.doe@acme.com",
        "phone_number": "+234 801 222 3333",
        "job_title": "CEO",
        "seniority_level": "C-Suite",
        "department": "Sales",
        "country": "Nigeria",
        "company_name": "Acme Ltd",
        "company_industry": "SaaS",
        "company_size_category": "Enterprise",
        "company_size_range": "500-1000",
        "estimated_annual_revenue": 5000000,
        "lead_source": "LinkedIn",
        "date_captured": "2026-01-01",
        "website_visits": 10,
        "pages_viewed": 5,
        "average_time_on_site": 3.2,
        "email_open_rate": 60,
        "email_click_rate": 10,
        "webinar_attendance": True,
        "last_interaction_days": 4,
        "meeting_scheduled": True,
        "follow_up_status": "Positive",
        "estimated_budget": "High",
        "purchase_timeline": "Immediate",
    }
    r = client.post("/api/v1/leads", headers=headers, json=lead)
    print("create_lead", r.status_code, r.text)


if __name__ == "__main__":
    main()
