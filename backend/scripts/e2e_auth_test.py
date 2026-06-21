"""End-to-end auth flow smoke test."""
import json
import sys
import time
import requests

BASE = "http://127.0.0.1:8001/api/v1"
TIMEOUT = 15
TS = str(int(time.time()))

def pp(label, r):
    try:
        body = r.json()
    except Exception:
        body = r.text
    print(f"\n{'='*60}")
    print(f"{label}  [HTTP {r.status_code}]")
    print(json.dumps(body, indent=2, default=str) if isinstance(body, dict) else body)
    return body

admin_email = f"alice_{TS}@testcorp.com"
sales_email = f"bob_{TS}@testcorp.com"
admin_staff_id = f"ADM-{TS[-3:]}"
sales_staff_id = f"ST-{TS[-3:]}"
print(f"Using admin_staff_id={admin_staff_id}, sales_staff_id={sales_staff_id}")
print(f"Using admin_email={admin_email}, sales_email={sales_email}")

# ---- 1. Admin Signup ----
r1 = requests.post(f"{BASE}/auth/signup-admin", json={
    "organization_name": f"E2E Corp {TS}",
    "full_name": "Alice Admin",
    "email": admin_email,
    "password": "Secret123!",
    "staff_id": admin_staff_id,
}, timeout=TIMEOUT)
admin_data = pp("1) ADMIN SIGNUP", r1)
assert r1.status_code in (200, 201), f"FAIL: admin signup got {r1.status_code}"
print(f"   -> access_token = {admin_data['access_token'][:40]}...")
print(f"   -> org_name = {admin_data['user'].get('organization_name')}")

# ---- 2. Admin Login (email + role) ----
r2 = requests.post(f"{BASE}/auth/login", json={
    "email": admin_email,
    "password": "Secret123!",
    "role": "Admin",
}, timeout=TIMEOUT)
login_data = pp("2) ADMIN LOGIN", r2)
assert r2.status_code == 200, f"FAIL: admin login got {r2.status_code}"

admin_token = login_data["access_token"]
admin_headers = {"Authorization": f"Bearer {admin_token}"}
print(f"   -> org_id = {login_data['user']['organization_id']}")
print(f"   -> org_name = {login_data['user'].get('organization_name')}")

# ---- 3. Admin creates invite ----
r3 = requests.post(f"{BASE}/invitations", json={
    "email": sales_email,
    "expires_in_hours": 48,
}, headers=admin_headers, timeout=TIMEOUT)
inv_data = pp("3) CREATE INVITATION", r3)
assert r3.status_code in (200, 201), f"FAIL: create invitation got {r3.status_code}"
invite_token = inv_data["invitation_token"]
print(f"   -> invite_token = {invite_token}")

# ---- 4. Sales member accepts invite ----
r4 = requests.post(f"{BASE}/invitations/accept", json={
    "token": invite_token,
    "full_name": "Bob Sales",
    "password": "Secret456!",
    "staff_id": sales_staff_id,
}, timeout=TIMEOUT)
sales_signup = pp("4) SALES ACCEPT INVITE", r4)
assert r4.status_code in (200, 201), f"FAIL: sales accept invite got {r4.status_code}"
print(f"   -> sales org_id = {sales_signup['user']['organization_id']}")

# ---- 5. Sales Login ----
r5 = requests.post(f"{BASE}/auth/login", json={
    "email": sales_email,
    "password": "Secret456!",
    "role": "Sales",
}, timeout=TIMEOUT)
sales_login = pp("5) SALES LOGIN", r5)
assert r5.status_code == 200, f"FAIL: sales login got {r5.status_code}"
print(f"   -> sales org_id = {sales_login['user']['organization_id']}")

# Verify tenant isolation: same org
admin_org = login_data["user"]["organization_id"]
sales_org = sales_login["user"]["organization_id"]
assert admin_org == sales_org, f"Tenant isolation FAIL: {admin_org} != {sales_org}"
print(f"   -> TENANT ISOLATION OK (both in {admin_org})")

# ---- 6. Wrong role login should fail ----
r6 = requests.post(f"{BASE}/auth/login", json={
    "email": admin_email,
    "password": "Secret123!",
    "role": "Sales",
}, timeout=TIMEOUT)
pp("6) WRONG ROLE LOGIN (should be 401)", r6)
assert r6.status_code == 401, f"FAIL: expected 401 got {r6.status_code}"

# ---- 7. Verify RBAC: sales cannot create invitations ----
sales_headers = {"Authorization": f"Bearer {sales_login['access_token']}"}
r7 = requests.post(f"{BASE}/invitations", json={
    "email": f"charlie_{TS}@testcorp.com",
}, headers=sales_headers, timeout=TIMEOUT)
pp("7) SALES TRY INVITE (should be 403)", r7)
assert r7.status_code == 403, f"FAIL: expected 403 got {r7.status_code}"

# ---- 8. Invalid staff ID format should fail ----
r8 = requests.post(f"{BASE}/auth/signup-admin", json={
    "organization_name": "Bad Corp",
    "full_name": "Bad Admin",
    "email": f"bad_{TS}@test.com",
    "password": "Secret123!",
    "staff_id": "INVALID",
}, timeout=TIMEOUT)
pp("8) INVALID STAFF ID (should be 422)", r8)
assert r8.status_code == 422, f"FAIL: expected 422 got {r8.status_code}"

print("\n" + "="*60)
print("ALL E2E TESTS PASSED!")
