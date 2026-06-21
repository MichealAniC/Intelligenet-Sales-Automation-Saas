"""Quick health + login smoke test against port 8000."""
import json, requests

BASE = "http://127.0.0.1:8000/api/v1"

# 1. Health check
r = requests.get(f"{BASE}/health", timeout=5)
print(f"Health: {r.status_code} {r.json()}")

# 2. Login with staff_id + role (should NOT get 422 "field required" for email)
r2 = requests.post(f"{BASE}/auth/login", json={
    "role": "Admin",
    "staff_id": "ADM-999",
    "password": "wrong",
}, timeout=10)
print(f"\nLogin probe: {r2.status_code}")
print(json.dumps(r2.json(), indent=2, default=str))

# If 401 => endpoint accepts staff_id correctly (user doesn't exist)
# If 422 with "email" required => OLD code still running
assert r2.status_code == 401, f"UNEXPECTED: {r2.status_code} — backend may need restart"
print("\nBackend on :8000 is serving the correct staff_id login endpoint.")
