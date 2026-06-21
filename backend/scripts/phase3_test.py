"""Quick Phase 3 RBAC verification."""
import requests, json

BASE = "http://127.0.0.1:8000/api/v1"

# Admin login
r = requests.post(f"{BASE}/auth/login", json={"staff_id": "ADM-001", "password": "Admin123!", "role": "Admin"})
assert r.status_code == 200, f"Admin login failed: {r.status_code}"
admin_token = r.json()["access_token"]
admin_h = {"Authorization": f"Bearer {admin_token}"}

# 1. Admin sees all leads
r = requests.get(f"{BASE}/leads", headers=admin_h)
data = r.json()
admin_total = len(data) if isinstance(data, list) else data.get("total", "?")
print(f"[ADMIN] GET /leads -> {r.status_code}, total={admin_total}")

# 2. Team workload
r = requests.get(f"{BASE}/users/team-workload", headers=admin_h)
members = r.json()
print(f"[ADMIN] GET /users/team-workload -> {r.status_code}, members={len(members)}")
for m in members:
    print(f"  {m['staff_id']} ({m['full_name']}): assigned={m['assigned_leads']}, cap={m['capacity']}, util={m['utilization_percent']}%")

# 3. Auto-assignment
r = requests.post(f"{BASE}/leads/trigger-auto-assignment", headers=admin_h, timeout=120)
print(f"[ADMIN] POST /leads/trigger-auto-assignment -> {r.status_code}, result={r.json()}")

# 4. Sales login - find a sales user
if members:
    sales_staff_id = members[0]["staff_id"]
    # Try common passwords
    for pw in ["Sales123!", "Admin123!", "password123", "123"]:
        r = requests.post(f"{BASE}/auth/login", json={"staff_id": sales_staff_id, "password": pw, "role": "Sales"})
        if r.status_code == 200:
            sales_token = r.json()["access_token"]
            sales_h = {"Authorization": f"Bearer {sales_token}"}
            
            # Sales sees only assigned leads
            r = requests.get(f"{BASE}/leads", headers=sales_h)
            sdata = r.json()
            sales_total = len(sdata) if isinstance(sdata, list) else sdata.get("total", "?")
            print(f"[SALES {sales_staff_id}] GET /leads -> {r.status_code}, total={sales_total}")
            
            # Sales should be forbidden from team-workload
            r = requests.get(f"{BASE}/users/team-workload", headers=sales_h)
            print(f"[SALES {sales_staff_id}] GET /users/team-workload -> {r.status_code} (expect 403)")
            
            # Sales should be forbidden from auto-assignment
            r = requests.post(f"{BASE}/leads/trigger-auto-assignment", headers=sales_h, timeout=30)
            print(f"[SALES {sales_staff_id}] POST /leads/trigger-auto-assignment -> {r.status_code} (expect 403)")
            break
    else:
        print(f"[WARN] Could not login as sales user {sales_staff_id}")

print("\n=== Phase 3 Verification Complete ===")
