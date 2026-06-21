"""Check User routing fields for NULL values."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.core.database import SessionLocal
from app.models.user import User

db = SessionLocal()
users = db.query(User).all()
print(f"Total users: {len(users)}")
for u in users:
    print(f"  {u.staff_id} (role={u.role.value}):")
    print(f"    sales_profile = {u.sales_profile!r}")
    print(f"    availability_status = {u.availability_status!r}")
    print(f"    performance_rating = {u.performance_rating!r}")
    print(f"    industry_specializations = {u.industry_specializations!r}")
    print(f"    auto_assignment_enabled = {u.auto_assignment_enabled!r}")

# Now test Pydantic serialization
print("\n--- Testing Pydantic serialization ---")
from app.schemas.user import UserPublic
from sqlalchemy.orm import joinedload
users2 = db.query(User).options(joinedload(User.organization)).all()
for u in users2:
    try:
        pub = UserPublic.model_validate(u)
        print(f"  {u.staff_id}: OK -> {pub.model_dump_json()[:200]}")
    except Exception as e:
        print(f"  {u.staff_id}: FAILED -> {e}")
db.close()
