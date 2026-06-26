import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.core.config import settings
from sqlalchemy import create_engine
from alembic.config import Config
from alembic.runtime.environment import EnvironmentContext
from alembic.script import ScriptDirectory

def run_upgrade(revision):
    # Create alembic config
    alembic_cfg = Config(os.path.join(os.path.dirname(__file__), "backend", "alembic.ini"))
    alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    
    # Get script directory and current head
    script = ScriptDirectory.from_config(alembic_cfg)
    
    def upgrade(rev, context):
        return script._upgrade_revs(revision, rev)
    
    # Create environment context
    with EnvironmentContext(
        alembic_cfg,
        script,
        fn=upgrade,
        as_sql=False,
        starting_rev=None,
        destination_rev=revision,
        tag=None,
    ):
        script.run_env()

# Now run each migration in order
migration_order = [
    "67275511a730",  # initial schema
    "2a9e0b8a1f6b",  # organizations and invitations
    "8f4c0e2d9c1a",  # lead ops core
    "a3b7c9e1f204",  # prescriptive lead routing
    "b5c8d2e4f608",  # add profile status
    "987654321abc"   # add tasks table (our new one)
]

for rev in migration_order:
    print(f"Running migration: {rev}")
    try:
        run_upgrade(rev)
        print(f"Successfully applied: {rev}")
    except Exception as e:
        print(f"ERROR applying migration {rev}: {type(e)} - {e}")
        import traceback
        print(traceback.format_exc())
        sys.exit(1)

print("All migrations applied successfully!")