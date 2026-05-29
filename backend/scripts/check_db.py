import os
import sys

from sqlalchemy import create_engine, text

sys.path.append(os.getcwd())

from app.core.config import settings


def main() -> None:
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    with engine.connect() as conn:
        tables = [
            row[0]
            for row in conn.execute(
                text(
                    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
                )
            )
        ]
        print(tables)


if __name__ == "__main__":
    main()

