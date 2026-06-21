@echo off
echo Starting SalesPilot RevOps Environment...

:: Resolve project root (where this script lives)
set "ROOT=%~dp0"

:: Start the FastAPI Backend using the root .venv
start "Backend - FastAPI" cmd /k "cd /d "%ROOT%" && call .venv\Scripts\activate && cd backend && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

:: Start the React/Vite Frontend
start "Frontend - Vite" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo Both servers are booting up!
