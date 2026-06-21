from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.api.router import api_router
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


def _dist_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "frontend" / "dist"


@app.get("/")
def spa_index():
    dist = _dist_dir()
    index = dist / "index.html"
    if index.exists():
        return FileResponse(index)
    return {"detail": "Frontend not built. Run `npm run build` in frontend/."}


@app.get("/{path:path}")
def spa_assets(path: str):
    if path.startswith("api/") or path.startswith("@vite/") or path == "@vite/client":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    dist = _dist_dir().resolve()
    candidate = (dist / path).resolve()
    if str(candidate).startswith(str(dist)) and candidate.is_file():
        return FileResponse(candidate)

    index = dist / "index.html"
    if index.exists():
        return FileResponse(index)
    return {"detail": "Frontend not built. Run `npm run build` in frontend/."}
