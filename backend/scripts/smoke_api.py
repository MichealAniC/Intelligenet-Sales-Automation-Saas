import requests


def main() -> None:
    base = "http://127.0.0.1:8002/api/v1"

    admin_email = "admin@example.com"
    admin_pass = "Admin123!"

    r = requests.post(
        f"{base}/auth/signup-admin",
        json={
            "organization_name": "Smoke Org",
            "full_name": "Admin User",
            "email": admin_email,
            "password": admin_pass,
            "staff_id": "ADM-001",
        },
        timeout=5,
    )
    print("signup_admin", r.status_code)
    if not r.ok and r.status_code != 409:
        r.raise_for_status()

    r = requests.post(
        f"{base}/auth/login",
        json={"staff_id": "ADM-001", "password": admin_pass},
        timeout=5,
    )
    print("login_admin", r.status_code)
    r.raise_for_status()
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = requests.post(
        f"{base}/invitations",
        headers=headers,
        json={
            "email": "sales1@example.com",
            "expires_in_hours": 24,
        },
        timeout=5,
    )
    print("invite_sales", r.status_code)
    invite_token = None
    if r.ok:
        invite_token = r.json()["invitation_token"]

    if invite_token:
        r = requests.post(
            f"{base}/invitations/accept",
            json={
                "token": invite_token,
                "full_name": "Sales One",
                "password": "Sales123!",
                "staff_id": "ST-001",
            },
            timeout=5,
        )
        print("accept_invite", r.status_code)
        if not r.ok and r.status_code != 409:
            r.raise_for_status()

    lead = {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@acme.com",
        "phone_number": "+234 801 234 5678",
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
    r = requests.post(f"{base}/leads", headers=headers, json=lead, timeout=10)
    print("create_lead", r.status_code)
    r.raise_for_status()
    data = r.json()
    print("lead_id", data["lead"]["lead_id"])
    print("category", data["score"]["score_category"], "score", data["score"]["score_value"])
    print("assigned", bool(data["assignment"]))


if __name__ == "__main__":
    main()
