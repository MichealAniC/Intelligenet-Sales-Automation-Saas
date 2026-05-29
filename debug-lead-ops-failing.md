[OPEN] Debug Session: lead-ops-failing

## Symptom
- Expected:
- Actual:

## Repro Steps
1.
2.
3.

## Environment
- Frontend: Vite + React
- Backend: FastAPI
- API base URL: frontend/.env VITE_API_BASE_URL

## Hypotheses
H1: Frontend is calling the wrong API base URL/port or backend isn’t running, causing request failures.
H2: DB migration/schema mismatch after Lead Ops changes causes backend 500s (missing columns/enums/sequence).
H3: Auth token/role gating blocks new endpoints (403/401) causing UI to appear “broken”.
H4: One of the new endpoints returns an unexpected response shape, causing frontend runtime crash.
H5: Bulk operations/import batch logic fails due to existing legacy tables/state in DB.

## Evidence Log Links
- Debug server: (pending)
- NDJSON log: (pending)

## Notes
- Do not remove instrumentation until the user confirms the fix.

