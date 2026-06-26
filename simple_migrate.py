import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend", "alembic", "versions"))

from app.core.config import settings
from sqlalchemy import create_engine
from alembic import op
from alembic.runtime.migration import MigrationContext
from alembic.operations import Operations

# Create our migration files in order!
migration_files = [
    "67275511a730_initial_schema",
    "2a9e0b8a1f6b_organizations_and_invitations",
    "8f4c0e2d9c1a_lead_ops_core",
    "a3b7c9e1f204_prescriptive_lead_routing",
    "b5c8d2e4f608_add_profile_status",
    "987654321abc_add_tasks_table"
]

# Create a little helper to run each upgrade
def run_upgrade(migration_name):
    print(f"Running upgrade: {migration_name}")
    # Import migration module
    module = __import__(migration_name)
    # Create engine
    engine = create_engine(settings.DATABASE_URL)
    # Start a context
    conn = engine.connect()
    try:
        ctx = MigrationContext.configure(conn)
        # Initialize alembic operations
        with Operations.context(ctx):
            module.upgrade()
        conn.commit()
        print(f"SUCCESS!")
    except Exception as e:
        conn.rollback()
        print(f"ERROR in {migration_name}:", type(e), str(e))
        import traceback
        print(traceback.format_exc())
        raise
    finally:
        conn.close()

# Now run all
for m in migration_files:
    run_upgrade(m)

print("\nAll migrations applied successfully!")