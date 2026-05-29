import os
import sys

sys.path.append(os.getcwd())

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.crud.organizations import create_organization
from app.crud.users import create_user
from app.schemas.user import UserCreate


def main() -> None:
    db: Session = SessionLocal()
    try:
        org = create_organization(db, name="Debug Org")
        payload = UserCreate(
            staff_id="ADM-001",
            full_name="Admin User",
            email="admin@example.com",
            password="Admin123!",
            role="Admin",
        )
        user = create_user(db, payload, organization_id=org.id)
        print("created", str(user.id), user.email, user.role)
    except Exception as e:
        print("error", type(e).__name__, str(e))
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
