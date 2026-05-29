from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env", override=True)


@dataclass(frozen=True)
class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Intelligent Sales Automation SaaS")
    API_V1_STR: str = os.getenv("API_V1_STR", "/api/v1")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/intelligent_sales_automation",
    )
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-me")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    ARTIFACTS_DIR: Path = Path(os.getenv("ARTIFACTS_DIR", str(Path(__file__).resolve().parents[2] / "artifacts")))
    LEAD_IMPORT_MAX_BYTES: int = int(os.getenv("LEAD_IMPORT_MAX_BYTES", str(5 * 1024 * 1024)))
    LEAD_IMPORT_MAX_ROWS: int = int(os.getenv("LEAD_IMPORT_MAX_ROWS", "5000"))


settings = Settings()
