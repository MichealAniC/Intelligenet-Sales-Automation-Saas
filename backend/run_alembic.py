import os
import sys

from alembic.config import Config
from alembic import command

alembic_cfg = Config(os.path.join(os.path.dirname(__file__), "alembic.ini"))
command.upgrade(alembic_cfg, "head")