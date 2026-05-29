import os
import sys
from pathlib import Path

sys.path.append(os.getcwd())

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.crud.organizations import create_organization
from app.crud.users import create_user
from app.schemas.user import UserCreate


def log(line: str) -> None:
    path = Path("debug_register.log")
    with path.open("a", encoding="utf-8") as fh:
        fh.write(line + "\n")


def main() -> None:
    Path("debug_register.log").write_text("", encoding="utf-8")
    db: Session = SessionLocal()
    try:
        before = db.execute(text("select count(*) from users")).scalar()
        log(f"before={before}")
        org = create_organization(db, name="Debug Org")
        payload = UserCreate(
            staff_id="ADM-001",
            full_name="Admin User",
            email="admin@example.com",
            password="Admin123!",
            role="Admin",
        )
        log(f"payload_role={payload.role}")
        user = create_user(db, payload, organization_id=org.id)
        log(f"created_id={user.id}")
        after = db.execute(text("select count(*) from users")).scalar()
        log(f"after={after}")
    except Exception as exc:
        log(f"error={type(exc).__name__}:{exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
