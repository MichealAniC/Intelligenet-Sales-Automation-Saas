import os
import sys

print("sys.executable:", sys.executable)
print("sys.path:", sys.path)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

print("Loading app.core.config...")
try:
    from app.core.config import settings
    print("Settings DATABASE_URL:", settings.DATABASE_URL)
except Exception as e:
    print("ERROR loading config:", type(e), str(e))
    import traceback
    print(traceback.format_exc())
    sys.exit(1)

print("Loading SQLAlchemy...")
try:
    from sqlalchemy import create_engine, text
except Exception as e:
    print("ERROR loading sqlalchemy:", type(e), str(e))
    import traceback
    print(traceback.format_exc())
    sys.exit(1)

print("Creating admin engine...")
try:
    # Create engine to connect to 'postgres' db first to create our target db if needed
    admin_url = settings.DATABASE_URL.replace("intelligent_sales_automation", "postgres")
    print("Admin URL:", admin_url)
    engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")

    with engine.connect() as conn:
        # Check if DB exists
        result = conn.execute(text("SELECT 1 FROM pg_database WHERE datname = 'intelligent_sales_automation'"))
        db_exists = bool(result.scalar())
        print("DB exists?", db_exists)
        if not db_exists:
            print("Creating database...")
            conn.execute(text('CREATE DATABASE "intelligent_sales_automation"'))
            print("Created database 'intelligent_sales_automation'")
except Exception as e:
    print("ERROR in admin connection:", type(e), str(e))
    import traceback
    print(traceback.format_exc())
    sys.exit(1)

print("Connecting to target DB...")
try:
    # Now connect to our target DB
    engine = create_engine(settings.DATABASE_URL, isolation_level="AUTOCOMMIT")

    with engine.connect() as conn:
        print("Creating ENUM types...")
        # Create ENUM types
        conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """))
        conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE task_status AS ENUM ('Pending', 'Completed', 'Canceled');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """))
        print("Created ENUMs (or they already existed)")

        print("Creating tasks table...")
        # Create tasks table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS tasks (
                task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id UUID NOT NULL,
                lead_id VARCHAR,
                assigned_user_id UUID NOT NULL,
                title VARCHAR NOT NULL,
                description TEXT,
                due_date TIMESTAMPTZ,
                priority task_priority NOT NULL DEFAULT 'Medium',
                status task_status NOT NULL DEFAULT 'Pending',
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT fk_organization FOREIGN KEY(organization_id) REFERENCES organizations(id),
                CONSTRAINT fk_lead FOREIGN KEY(lead_id) REFERENCES leads(lead_id) ON DELETE CASCADE,
                CONSTRAINT fk_assigned_user FOREIGN KEY(assigned_user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
        print("Created tasks table!")

except Exception as e:
    print("ERROR in target connection:", type(e), str(e))
    import traceback
    print(traceback.format_exc())
    sys.exit(1)

print("SUCCESS! Manual migration complete!")