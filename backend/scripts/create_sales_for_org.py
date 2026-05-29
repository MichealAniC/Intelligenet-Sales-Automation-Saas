import time

import requests


def main() -> None:
    base = "http://127.0.0.1:8002/api/v1"

    r = requests.post(
        f"{base}/auth/login",
        json={"staff_id": "ADM-799", "password": "123"},
        timeout=60,
    )
    r.raise_for_status()
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    ts = int(time.time())
    email = f"sales_verify_{ts}@example.com"
    start = ts % 1000
    staff_id = None

    r = requests.post(
        f"{base}/invitations",
        headers=headers,
        json={"email": email, "expires_in_hours": 24},
        timeout=60,
    )
    r.raise_for_status()
    invitation_token = r.json()["invitation_token"]

    for i in range(1000):
        candidate = f"ST-{(start + i) % 1000:03d}"
        r = requests.post(
            f"{base}/invitations/accept",
            json={
                "token": invitation_token,
                "full_name": "Sales Verify",
                "password": "Sales123!",
                "staff_id": candidate,
            },
            timeout=60,
        )
        if r.status_code == 409:
            continue
        r.raise_for_status()
        staff_id = candidate
        break
    if staff_id is None:
        raise RuntimeError("Could not allocate a unique ST-XXX staff_id")

    print({"email": email, "staff_id": staff_id})


if __name__ == "__main__":
    main()
