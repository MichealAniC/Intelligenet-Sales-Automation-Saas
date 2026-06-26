import os
import sys

# Add backend to path
backend_dir = os.path.join(os.path.dirname(__file__), "backend")
sys.path.insert(0, backend_dir)

from alembic.config import Config
from alembic import command

alembic_cfg = Config(os.path.join(backend_dir, "alembic.ini"))
command.upgrade(alembic_cfg, "head")