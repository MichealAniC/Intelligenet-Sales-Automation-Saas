import os
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

sys.path.append(os.getcwd())

from app.core.config import settings


def main() -> None:
    url = make_url(settings.DATABASE_URL)
    db_name = url.database
    if not db_name:
        raise RuntimeError("DATABASE_URL missing database name")

    admin_url = url.set(database="postgres")
    engine = create_engine(admin_url, isolation_level="AUTOCOMMIT", pool_pre_ping=True)

    with engine.connect() as conn:
        exists = conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": db_name},
        ).scalar()
        if not exists:
            conn.execute(text(f'CREATE DATABASE "{db_name}"'))


if __name__ == "__main__":
    main()
