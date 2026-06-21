"""Clean test data from DB."""
from app.core.database import SessionLocal
from app.models.user import User
from app.models.organization import Organization
from app.models.invitation import Invitation

db = SessionLocal()
db.query(Invitation).delete()
db.query(User).delete()
db.query(Organization).delete()
db.commit()
print("DB cleaned")
db.close()
