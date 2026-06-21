"""Simulate login for Admin + Sales using Staff ID."""
import json, time, requests

BASE = "http://127.0.0.1:8002/api/v1"
TS = str(int(time.time()))

def pp(label, r):
    try:
        body = r.json()
    except Exception:
        body = r.text
    print(f"\n{'='*60}\n{label}  [HTTP {r.status_code}]")
    print(json.dumps(body, indent=2, default=str) if isinstance(body, dict) else body)
    return body

admin_sid = f"ADM-{TS[-3:]}"
sales_sid = f"ST-{TS[-3:]}"
admin_email = f"admin_{TS}@test.com"
sales_email = f"sales_{TS}@test.com"

# 1. Admin signup
r1 = requests.post(f"{BASE}/auth/signup-admin", json={
    "organization_name": f"TestCo {TS}",
    "full_name": "Admin User",
    "email": admin_email,
    "password": "Pass123!",
    "staff_id": admin_sid,
}, timeout=15)
d1 = pp("1) ADMIN SIGNUP", r1)
assert r1.status_code == 200, f"FAIL signup: {r1.status_code}"

# 2. Admin login via staff_id + role
r2 = requests.post(f"{BASE}/auth/login", json={
    "role": "Admin",
    "staff_id": admin_sid,
    "password": "Pass123!",
}, timeout=15)
d2 = pp("2) ADMIN LOGIN (staff_id)", r2)
assert r2.status_code == 200, f"FAIL admin login: {r2.status_code}"
# Verify JWT has role and org_id
import jose.jwt as j
payload = j.decode(d2["access_token"], "bankiasenbonzakurakageoshi", algorithms=["HS256"])
assert payload.get("role") == "Admin", f"JWT missing role: {payload}"
assert payload.get("org_id"), f"JWT missing org_id: {payload}"
print(f"   JWT payload role={payload['role']}, org_id={payload['org_id']}")

# 3. Admin creates invitation for sales
r3 = requests.post(f"{BASE}/invitations", json={
    "email": sales_email,
    "expires_in_hours": 24,
}, headers={"Authorization": f"Bearer {d2['access_token']}"}, timeout=15)
d3 = pp("3) CREATE INVITATION", r3)
assert r3.status_code in (200, 201), f"FAIL invite: {r3.status_code}"
inv_token = d3["invitation_token"]

# 4. Sales accepts invite
r4 = requests.post(f"{BASE}/invitations/accept", json={
    "token": inv_token,
    "full_name": "Sales User",
    "password": "Pass456!",
    "staff_id": sales_sid,
}, timeout=15)
d4 = pp("4) SALES ACCEPT INVITE", r4)
assert r4.status_code == 200, f"FAIL accept: {r4.status_code}"

# 5. Sales login via staff_id + role
r5 = requests.post(f"{BASE}/auth/login", json={
    "role": "Sales",
    "staff_id": sales_sid,
    "password": "Pass456!",
}, timeout=15)
d5 = pp("5) SALES LOGIN (staff_id)", r5)
assert r5.status_code == 200, f"FAIL sales login: {r5.status_code}"
payload5 = j.decode(d5["access_token"], "bankiasenbonzakurakageoshi", algorithms=["HS256"])
assert payload5.get("role") == "Sales", f"JWT missing role: {payload5}"
assert payload5.get("org_id") == payload["org_id"], "Tenant mismatch!"
print(f"   JWT payload role={payload5['role']}, org_id={payload5['org_id']}")

# 6. Wrong staff_id format should be rejected (422)
r6 = requests.post(f"{BASE}/auth/login", json={
    "role": "Admin",
    "staff_id": "ST-999",  # wrong format for Admin
    "password": "Pass123!",
}, timeout=15)
pp("6) WRONG STAFF FORMAT (expect 422)", r6)
assert r6.status_code == 422, f"FAIL: expected 422 got {r6.status_code}"

# 7. Wrong role should be rejected (401)
r7 = requests.post(f"{BASE}/auth/login", json={
    "role": "Sales",
    "staff_id": admin_sid,  # admin staff id with sales role
    "password": "Pass123!",
}, timeout=15)
pp("7) WRONG ROLE (expect 422 - rejected at validation)", r7)
assert r7.status_code == 422, f"FAIL: expected 422 got {r7.status_code}"

print(f"\n{'='*60}\nALL LOGIN TESTS PASSED!")
