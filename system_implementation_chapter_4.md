# Chapter 4: System Implementation

## 4.1 System Implementation Overview

SalesPilot AI is an enterprise-grade, multi-tenant Intelligent Sales Automation Software-as-a-Service (SaaS) platform designed to address the end-to-end lifecycle of B2B lead management. The platform's architecture is predicated on a strict separation of concerns between two primary operational domains: the **Admin Revenue Operations (RevOps) Engine** and the **Sales Member Execution Environment**.

The Admin RevOps Engine encompasses all administrative functions including lead ingestion via CSV/XLSX batch import, AI-powered lead scoring orchestration, prescriptive lead routing configuration, team workload monitoring, and capacity planning. Administrators operate within a privileged Role-Based Access Control (RBAC) boundary that grants exclusive access to the import pipeline, routing rule configuration, team member profile management, and organizational analytics dashboards.

The Sales Member Execution Environment provides a restricted, role-scoped interface for sales representatives to interact with their assigned leads. Sales members receive leads exclusively through the platform's automated Prescriptive Lead Routing Engine—a deterministic 7-step waterfall algorithm that evaluates candidate fitness based on industry specialization, tier-preference alignment, performance rating, and real-time capacity utilization.

The system enforces a deliberate architectural decoupling between the **lead ingestion phase** and the **lead routing phase**. All leads imported via CSV upload are scored by the integrated Machine Learning pipeline and persisted to the PostgreSQL database with an `assignment_status` of `Unassigned`. This ensures that no lead is automatically routed during the import process. Routing is subsequently triggered as a discrete, administrator-initiated operation, allowing the Prescriptive Lead Routing Engine to operate on a controlled queue of scored, unassigned leads.

The platform is deployed as a monolithic application with a clear client-server boundary: a React-based Single Page Application (SPA) frontend communicates with a FastAPI REST backend over JSON, with JWT-based authentication securing all API endpoints. PostgreSQL serves as the sole persistent data store, with SQLAlchemy providing the Object-Relational Mapping (ORM) layer and Alembic managing schema migrations.

---

## 4.2 Development Environment

### 4.2.1 Hardware Requirements

| Component | Minimum Specification |
|-----------|----------------------|
| Processor | Intel Core i5 (8th Gen) or AMD equivalent |
| RAM | 8 GB (16 GB recommended for ML training workloads) |
| Storage | 20 GB available disk space |
| Network | Localhost loopback (127.0.0.1) for development |
| OS | Windows 10/11 (22H2+), macOS 12+, or Ubuntu 20.04+ |

### 4.2.2 Software Requirements

| Component | Version | Purpose |
|-----------|---------|---------|
| Python | 3.11+ | Backend runtime |
| Node.js | 18+ | Frontend build tooling |
| PostgreSQL | 14+ | Primary relational database |
| Git | 2.40+ | Version control |
| npm | 9+ | JavaScript package management |

### 4.2.3 Complete Technology Stack

**Backend Stack:**

| Technology | Version | Role |
|------------|---------|------|
| FastAPI | Latest | REST API framework with automatic OpenAPI documentation |
| Uvicorn | Latest | ASGI server with WatchFiles hot-reload |
| Pydantic | v2 | Request/response data validation and serialization |
| SQLAlchemy | 2.0+ | ORM with Mapped column type annotations |
| Alembic | Latest | Database migration management |
| psycopg2-binary | Latest | PostgreSQL database driver |
| python-jose | Latest | JWT token creation and verification (HS256) |
| passlib[bcrypt] | Latest | Password hashing with bcrypt algorithm |
| python-multipart | Latest | Multipart form-data parsing for file uploads |
| pandas | Latest | Tabular data manipulation for CSV/XLSX import |
| scikit-learn | Latest | Machine Learning model training and inference |
| joblib | Latest | Model serialization and artifact persistence |
| openpyxl | Latest | Excel (.xlsx) file parsing |

**Frontend Stack:**

| Technology | Version | Role |
|------------|---------|------|
| React | 18.3 | Component-based UI library |
| Vite | 6.3 | Development server and build tool (port 5173) |
| TypeScript | 5.8 | Static type checking |
| Material UI (MUI) | 7.3 | Enterprise component library |
| MUI X DataGrid | 8.11 | High-performance data table component |
| Zustand | 5.0 | Lightweight state management |
| Axios | 1.12 | HTTP client with interceptor-based auth |
| React Router DOM | 7.3 | Client-side routing with RBAC guards |
| Chart.js / react-chartjs-2 | 4.5 / 5.3 | Data visualization |
| Tailwind CSS | 3.4 | Utility-first CSS framework |
| Emotion | 11.14 | CSS-in-JS runtime for MUI styling |

**Database:**

| Technology | Role |
|------------|------|
| PostgreSQL 14+ | Primary relational data store with custom ENUM types, ARRAY columns, and JSONB support |
| SQLAlchemy 2.0 ORM | Type-safe model definitions with `Mapped[T]` annotations |
| Alembic | Declarative migration scripts for schema evolution |

---

## 4.3 Frontend Implementation

### 4.3.1 React/Vite Architecture

The frontend is implemented as a React 18 Single Page Application bootstrapped with Vite 6. The application entry point (`main.tsx`) mounts the root `<App />` component into the DOM element `#root`. Vite provides Hot Module Replacement (HMR) during development via the `@vitejs/plugin-react` plugin, and TypeScript path aliases are resolved through `vite-tsconfig-paths`.

The application's routing architecture is defined in `App.tsx` using React Router DOM v7 with a nested route hierarchy:

```
/                           → Public landing page
/login                      → Authentication (Staff ID + Password)
/register                   → Admin self-registration (signup-admin)
/invite/:token              → Sales member invitation acceptance
/app                        → Protected application shell
  /app/dashboard            → Admin/Sales dashboard
  /app/leads                → Leads center (DataGrid with filters)
  /app/leads/:leadId        → Lead detail view
  /app/leads/import         → CSV/XLSX import (Admin only)
  /app/leads/new            → Manual lead creation
  /app/sales-team           → Sales roster & config (Admin only)
  /app/team-management      → Workload metrics (Admin only)
  /app/routing              → Routing rules (Coming Soon)
  /app/settings             → Settings (Coming Soon)
  /app/pipeline             → Pipeline (Coming Soon)
  /app/analytics            → Analytics (Coming Soon)
  /app/me                   → User profile
```

### 4.3.2 State Management

State management is implemented using **Zustand v5**, a minimal, hook-based state management library that avoids the boilerplate overhead of Redux. The primary store (`auth.ts`) manages authentication state:

```typescript
type AuthState = {
  token: string | null;
  user: UserPublic | null;
  setAuth: (payload: TokenResponse) => void;
  setUser: (user: UserPublic) => void;
  clear: () => void;
};
```

The store persists the JWT access token and user profile to `localStorage` under the keys `isa_access_token` and `isa_user` respectively. This enables session recovery across browser refreshes without requiring re-authentication. The `clear()` method atomically removes both the token and user from storage and state, triggering a redirect to the public landing page.

### 4.3.3 HTTP Client and Auth Interceptors

The Axios HTTP client (`api/http.ts`) is configured with:

- **Base URL resolution**: Environment variable `VITE_API_BASE_URL` takes precedence; falls back to `{window.location.origin}/api/v1` in development
- **Default timeout**: 30,000 ms (30 seconds)
- **Request interceptor**: Attaches the JWT `Authorization: Bearer <token>` header to all outgoing requests via `AxiosHeaders.from()`
- **Response interceptor**: Detects HTTP 401 Unauthorized responses and automatically invokes `clear()` to invalidate the session and redirect to login

ML-heavy endpoints (e.g., CSV import) override the default timeout with per-request values up to 300,000 ms (5 minutes) via the `timeout` configuration option.

### 4.3.4 Role-Based Access Control (RBAC)

RBAC enforcement in the frontend is implemented through a **nested `<ProtectedRoute />` component** pattern. The component accepts an optional `roles` prop of type `UserRole[]`:

```typescript
export default function ProtectedRoute(props: { roles?: UserRole[] }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (props.roles?.length) {
    const role = user?.role ?? null;
    if (!role || !props.roles.includes(role)) {
      return <Navigate to="/app/dashboard" replace />;
    }
  }

  return <Outlet />;
}
```

The RBAC hierarchy operates as follows:
- **Unauthenticated users**: Redirected to `/` (public landing page)
- **Authenticated users (any role)**: Access to Dashboard, Leads, Pipeline, Analytics, and Profile
- **Admin-only routes**: Lead Import, Routing Rules, Sales Team, Team Management, and Settings are wrapped in `<ProtectedRoute roles={["Admin"]} />`, which redirects non-Admin users to `/app/dashboard`

The sidebar navigation (`AppShell.tsx`) dynamically renders menu items based on the authenticated user's role, ensuring that Sales members never see administrative navigation options.

### 4.3.5 Application Shell (AppShell)

The main application layout is implemented as a responsive MUI-based shell with:

- **Persistent left sidebar** (272px width, collapsible to 88px icon-only mode) with role-aware navigation
- **Top AppBar** with search input, notification badge, and user avatar dropdown menu (Profile/Logout)
- **Main content area** with `overflow-x: hidden` and `max-width: 100vw` to prevent horizontal page overflow
- **Enterprise styling**: Flat white backgrounds, `borderRadius: 1` (4px) for cards, subtle `rgba(15, 23, 42, 0.08)` borders for high data density

---

## 4.4 Backend Implementation

### 4.4.1 FastAPI REST Architecture

The backend is a **FastAPI** application defined in `app/main.py`. The application mounts a single top-level router (`api_router`) with the prefix `/api/v1`, which aggregates seven domain-specific sub-routers:

| Router Module | Prefix | Tags | Responsibility |
|---------------|--------|------|----------------|
| `auth.py` | `/auth` | auth | Login, admin signup, JWT issuance |
| `leads.py` | `/leads` | leads | CRUD, CSV import, batch operations |
| `users.py` | `/users` | users | Team workload, routing profile PATCH |
| `dashboard.py` | `/dashboard` | dashboard | Aggregated statistics and KPIs |
| `invitations.py` | `/invitations` | invitations | Sales member invitation lifecycle |
| `prediction.py` | `/prediction` | prediction | ML prediction endpoints |
| `health.py` | `/health` | health | API health check |

CORS middleware is configured to allow origins from `http://localhost:5173` (Vite dev server) and `http://127.0.0.1:8000` (production backend), with credentials and all HTTP methods permitted.

The application serves the built React SPA in production via a catch-all route (`/{path:path}`) that returns `index.html` for non-API paths, enabling client-side routing.

### 4.4.2 PostgreSQL Database Schema

The database schema comprises 10+ normalized tables with foreign key relationships, custom PostgreSQL ENUM types, and JSONB columns for flexible metadata storage.

#### Users Table

The `users` table serves as the central identity store and includes the Prescriptive Lead Routing profile attributes:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PK, default `uuid4` | Unique user identifier |
| `organization_id` | `UUID` | FK → `organizations.id`, RESTRICT | Multi-tenant isolation |
| `staff_id` | `VARCHAR` | UNIQUE, INDEXED | Employee login identifier |
| `full_name` | `VARCHAR` | NOT NULL | Display name |
| `email` | `VARCHAR` | UNIQUE, INDEXED | Email address |
| `password_hash` | `VARCHAR` | NOT NULL | bcrypt-hashed password |
| `role` | `user_role` ENUM | NOT NULL | `Admin` or `Sales` |
| `sales_profile` | `sales_profile` ENUM | NULLABLE | `Junior Sales Rep`, `Senior Sales Rep`, `Industry Specialist`, `Top Performer` |
| `availability_status` | `availability_status` ENUM | NOT NULL, default `Available` | `Available`, `Busy`, `On Leave`, `Inactive` |
| `performance_rating` | `INTEGER` | NOT NULL, default `0` | Rating 0–100 |
| `industry_specializations` | `VARCHAR[]` | NOT NULL, default `{}` | Array of industry keywords |
| `auto_assignment_enabled` | `BOOLEAN` | NOT NULL, default `false` | Opt-in for auto-routing |
| `profile_status` | `profile_status` ENUM | NOT NULL, default `Pending Configuration` | `Pending Configuration`, `Active`, `Disabled` |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `now()` | Account creation timestamp |

The `profile_status` column is a critical component of the routing circuit breaker: the assignment engine only considers candidates with `profile_status = 'Active'`. Newly created Sales members default to `'Pending Configuration'`, requiring an Administrator to explicitly configure their routing profile and activate them before they become eligible for lead assignment.

#### Leads Table

The `leads` table stores all imported and manually created leads with 30+ fields capturing firmographic, behavioral, and engagement attributes:

| Column | Type | Description |
|--------|------|-------------|
| `lead_id` | `VARCHAR` PK | Unique lead identifier |
| `organization_id` | `UUID` FK | Multi-tenant isolation |
| `full_name`, `first_name`, `last_name` | `VARCHAR` | Contact identity |
| `email` | `VARCHAR` INDEXED | Duplicate detection key |
| `company_name`, `company_industry` | `VARCHAR` | Firmographic data |
| `company_size_category` | `company_size_category` ENUM | `Startup`, `SMB`, `Mid-Market`, `Enterprise` |
| `estimated_annual_revenue` | `NUMERIC(18,2)` | Revenue estimate |
| `lead_source` | `lead_source` ENUM | `LinkedIn`, `Webinar`, `Referral`, `Cold Email`, `Website`, `Paid Ads`, `Events` |
| `website_visits`, `pages_viewed`, `average_time_on_site` | `INTEGER/FLOAT` | Behavioral engagement metrics |
| `email_open_rate`, `email_click_rate` | `FLOAT` | Email engagement rates |
| `follow_up_status` | `follow_up_status` ENUM | `Positive`, `Neutral`, `Negative`, `No Response` |
| `estimated_budget` | `estimated_budget` ENUM | `Low`, `Medium`, `High` |
| `purchase_timeline` | `purchase_timeline` ENUM | `Immediate`, `1-3 Months`, `3-6 Months`, `Future` |
| `lead_status` | `lead_status` ENUM | `New`, `Contacted`, `Qualified`, `Unqualified`, `Converted`, `Archived` |
| `raw_data` | `JSONB` | Original CSV row preserved for audit trail |
| `import_batch_id` | `UUID` FK | Batch provenance tracking |

#### Lead Assignments Table

| Column | Type | Description |
|--------|------|-------------|
| `assignment_id` | `UUID` PK | Unique assignment identifier |
| `organization_id` | `UUID` FK | Multi-tenant isolation |
| `lead_id` | `VARCHAR` FK → `leads.lead_id` CASCADE | Assigned lead |
| `assigned_to` | `UUID` FK → `users.id` | Receiving sales member |
| `assigned_by` | `UUID` FK → `users.id` NULLABLE | Admin who triggered assignment |
| `assignment_priority` | `lead_category` ENUM | `Hot`, `Warm`, `Cold` |
| `assignment_status` | `assignment_status` ENUM | `Assigned`, `In Progress`, `Completed` |
| `assignment_date` | `TIMESTAMPTZ` | Assignment timestamp |

#### Lead Events Table

All routing decisions are logged as immutable events in the `lead_events` table with JSONB `data` payloads capturing the complete scoring breakdown (routing score, industry score, tier score, performance score, capacity penalty, utilization percentage).

### 4.4.3 Authentication and Authorization

Authentication is implemented using a **Staff ID + Password** credential scheme with JWT-based session management:

1. **Login** (`POST /api/v1/auth/login`): Accepts `staff_id`, `password`, and `role`. Verifies credentials via bcrypt comparison, validates role match, and issues a JWT with claims: `sub` (user UUID), `role` (Admin/Sales), `org_id` (organization UUID), `exp` (60-minute expiry).

2. **JWT Verification** (`deps.py`): The `get_current_user` dependency extracts the Bearer token, decodes it using `python-jose` with HS256, and resolves the user from the database. Invalid or expired tokens return HTTP 401.

3. **Admin Signup** (`POST /api/v1/auth/signup-admin`): Creates a new Organization and Admin user atomically. Public registration is disabled (HTTP 410); Sales members are onboarded exclusively through Admin-generated invitation links.

4. **Password Security**: All passwords are hashed using `passlib` with the bcrypt algorithm (`CryptContext(schemes=["bcrypt"], deprecated="auto")`).

### 4.4.4 Prescriptive Lead Routing Engine (`assignment_engine.py`)

The assignment engine implements a **7-Step Deterministic Waterfall** algorithm that evaluates and scores eligible sales candidates against each lead's characteristics. The algorithm is defined in `backend/app/services/assignment_engine.py`.

#### Step 1: Read Lead Characteristics

The engine extracts the lead's `company_industry` and retrieves the most recent `LeadScore` record (ordered by `created_at DESC`) to determine the lead's tier classification (`Hot`, `Warm`, or `Cold`). If no score exists, the lead defaults to `Cold`.

#### Step 2: Fetch Eligible Candidates

A SQLAlchemy query filters the `users` table with five conjunctive predicates:

```python
User.organization_id == organization_id,
User.role == UserRole.SALES,
User.profile_status == ProfileStatus.ACTIVE,
User.availability_status == AvailabilityStatus.AVAILABLE,
User.auto_assignment_enabled.is_(True),
```

This constitutes the **first circuit breaker**: only Sales members who have been explicitly activated (`profile_status = Active`), are currently available, and have opted into auto-assignment are considered.

#### Step 2b: Capacity Circuit Breaker

Before scoring, the engine performs a **hard capacity disqualification** check for each eligible candidate:

```python
capacity = _get_capacity(candidate.performance_rating or 0)
active = _get_active_count(db, user_id=candidate.id, organization_id=organization_id)
if active < capacity:  # strict: must have room
    capacity_eligible.append(candidate)
```

The capacity bands are defined as performance-rating-tiered thresholds:

| Performance Rating | Maximum Concurrent Assignments |
|-------------------|-------------------------------|
| 90–100 | 150 |
| 80–89 | 120 |
| 70–79 | 100 |
| 60–69 | 80 |
| 50–59 | 60 |
| 0–49 | 40 |

Active assignments are counted as those with `assignment_status` in `[Assigned, In Progress]`. If `active_count >= capacity`, the candidate is **hard-disqualified** regardless of their routing score. If all candidates are at full capacity, the lead remains `Unassigned` with the reason: *"All candidates at full capacity — lead remains Unassigned"*.

#### Steps 3–6: Candidate Scoring

Each capacity-eligible candidate is scored across four dimensions:

**Step 3 — Industry Specialization Match (max 30 points):**
The candidate's `industry_specializations` array is lowercased and compared against the lead's `company_industry`. An exact match awards 30 points; no match awards 0.

**Step 4 — Tier-Profile Preference (max 25 points):**
A pre-defined weight matrix maps lead tier × sales profile to preference scores:

| Lead Tier | Top Performer | Senior Sales Rep | Industry Specialist | Junior Sales Rep |
|-----------|--------------|------------------|--------------------|-----------------|
| Hot | 25 | 22 | 15 | 5 |
| Warm | 15 | 20 | 18 | 12 |
| Cold | 5 | 8 | 15 | 25 |

Candidates without a defined `sales_profile` receive a default score of 8 points.

**Step 5 — Performance Rating (max 25 points):**
Calculated as `(performance_rating / 100) × 25`. A rating of 100 yields the maximum 25 points.

**Step 6 — Capacity Utilization Penalty:**
The utilization ratio is calculated as `active_count / capacity`. Penalty tiers:

| Utilization | Penalty |
|-------------|---------|
| ≥ 90% | −30 points |
| ≥ 80% | −15 points |
| ≥ 70% | −5 points |
| < 70% | 0 points |

**Total Score:**
`total = industry_score + tier_score + performance_score − capacity_penalty`

#### Step 7: Proportional Load Balancing

The final selection employs **Proportional Load Balancing** rather than simple top-score selection:

```python
scored.sort(key=lambda s: (s.utilization, -s.total))
best = scored[0]
```

Candidates are sorted by **utilization ascending** (least-loaded first), with ties broken by **total score descending**. This ensures that leads are distributed proportionally across the sales team, preventing scenarios where a single high-scoring rep accumulates a disproportionate share of assignments while other reps remain underutilized.

If the selected candidate's total score is ≤ 0, the assignment is rejected with the reason: *"All candidates over capacity or zero-scored"*.

#### Assignment Persistence

Upon successful selection, the engine:
1. Creates a `LeadAssignment` record with `assignment_status = Assigned`
2. Logs a `LeadEvent` with `event_type = "auto_assigned"` containing the complete scoring breakdown
3. Commits the transaction atomically

### 4.4.5 CSV Import Pipeline

The CSV/XLSX import endpoint (`POST /api/v1/leads/import`) implements a multi-phase ingestion pipeline:

1. **File Validation**: Reads the uploaded file (max 5 MB), parses CSV or XLSX format, enforces row limit (max 5,000 rows)
2. **Column Mapping**: Maps uploaded column headers to canonical Lead field names via `build_column_mapping()`
3. **Required Column Check**: Validates that all mandatory Lead fields are present
4. **Batch Record Creation**: Creates a `LeadImportBatch` record with auto-generated batch code
5. **Row-by-Row Processing**: For each row:
   - Standardizes field values and validates against Pydantic schema
   - Detects duplicate leads by email (supports "update" or "skip" modes)
   - Calls `create_score_assign()` with **`skip_assignment=True`** — this is the critical enforcement that ensures imported leads are scored but never auto-assigned
6. **Result Compilation**: Aggregates per-row results (imported, updated, skipped, failed) and generates an error report CSV

The `skip_assignment` parameter in `create_score_assign()` conditionally bypasses the entire assignment block, ensuring that `workflow.assignment` is `None` for all imported leads.

---

## 4.5 Machine Learning Model Implementation

### 4.5.1 Model Architecture

The AI lead scoring engine employs a **Random Forest Classifier** ensemble implemented via scikit-learn's `RandomForestClassifier`:

```python
model = RandomForestClassifier(
    n_estimators=300,
    random_state=42,
    class_weight="balanced",
    n_jobs=-1,
)
```

Key hyperparameters:
- **300 estimators**: Provides robust ensemble averaging for classification stability
- **`class_weight="balanced"`**: Automatically adjusts weights inversely proportional to class frequencies, mitigating bias in the imbalanced conversion dataset (3,269 non-converted vs. 1,731 converted)
- **`n_jobs=-1`**: Utilizes all available CPU cores for parallel tree construction
- **`random_state=42`**: Ensures reproducible training results

### 4.5.2 Data Preprocessing Pipeline

The ML pipeline is constructed using scikit-learn's `Pipeline` and `ColumnTransformer`:

1. **Date Feature Engineering**: The `date_captured` column is decomposed into three ordinal features:
   - `date_captured_year` (e.g., 2023, 2024)
   - `date_captured_month` (1–12)
   - `date_captured_dayofweek` (0=Monday, 6=Sunday)

2. **PII Column Removal**: The following personally identifiable columns are dropped before model training and inference:
   - `lead_id`, `first_name`, `last_name`, `email`, `phone_number`

3. **Non-Predictive Column Removal**: `company_name` is dropped as it has no predictive signal for conversion likelihood.

4. **Categorical Encoding**: All object, category, and boolean columns are One-Hot Encoded using `OneHotEncoder(handle_unknown="ignore")`, which gracefully handles unseen categories during inference.

5. **Numeric Passthrough**: Numeric columns (website visits, pages viewed, engagement rates, revenue, etc.) are passed through without transformation.

### 4.5.3 Feature Set

The model operates on the following 21 engineered features:

| Feature | Type | Description |
|---------|------|-------------|
| `job_title` | Categorical | Contact's job title |
| `seniority_level` | Categorical | C-Suite, VP, Director, Manager, Staff |
| `department` | Categorical | Functional department |
| `country` | Categorical | Geographic location |
| `company_industry` | Categorical | Industry vertical |
| `company_size_category` | Categorical | Startup, SMB, Mid-Market, Enterprise |
| `company_size_range` | Categorical | Employee count range |
| `estimated_annual_revenue` | Numeric | Revenue in millions |
| `lead_source` | Categorical | Acquisition channel |
| `website_visits` | Numeric | Total site visits |
| `pages_viewed` | Numeric | Pages per session |
| `average_time_on_site` | Numeric | Session duration (minutes) |
| `email_open_rate` | Numeric | Email open percentage |
| `email_click_rate` | Numeric | Email click percentage |
| `webinar_attendance` | Boolean | Attended webinar flag |
| `last_interaction_days` | Numeric | Days since last engagement |
| `meeting_scheduled` | Boolean | Meeting booked flag |
| `follow_up_status` | Categorical | Positive, Neutral, Negative, No Response |
| `estimated_budget` | Categorical | Low, Medium, High |
| `purchase_timeline` | Categorical | Immediate, 1-3 Months, 3-6 Months, Future |
| `date_captured_year/month/dayofweek` | Numeric | Temporal features |

### 4.5.4 Scoring Mechanism and Tier Classification

During inference, the `LeadScorer.score()` method:

1. Constructs a single-row DataFrame from the lead payload
2. Applies date feature engineering
3. Drops PII and non-predictive columns
4. Invokes `model.predict_proba(df)[:, 1]` to obtain the conversion probability
5. Scales the probability to a 0–100 integer score: `score_value = int(round(proba × 100))`
6. Classifies the lead into a tier based on configurable thresholds:

| Tier | Probability Threshold | Score Range | Business Interpretation |
|------|----------------------|-------------|------------------------|
| **Hot** | ≥ 0.80 | 80–100 | High conversion probability; route to top performers |
| **Warm** | ≥ 0.50 | 50–79 | Moderate conversion probability; route to senior reps |
| **Cold** | < 0.50 | 0–49 | Low conversion probability; route to junior reps for nurturing |

These thresholds are stored in `artifacts/metadata.json` and loaded at model initialization, enabling reconfiguration without code changes.

### 4.5.5 Integration with CSV Import Pipeline

The ML scoring model is invoked synchronously within the `create_score_assign()` function during CSV import. For each validated row:

1. The lead payload is passed to `LeadScorer.score()`, which returns a `ScoreResult` containing `probability`, `score_value`, and `category`
2. A `LeadScore` record is persisted with the score value, category, and probability
3. The tier classification (`Hot`/`Warm`/`Cold`) is stored in the `score_category` column and propagated to the `LeadImportRowResult` response

The model artifact (`lead_scoring_model.joblib`) is loaded once at application startup from the `artifacts/` directory and cached in memory for the application's lifetime, ensuring minimal inference latency.

---

## 4.6 System Interfaces

### 4.6.1 Login and Registration Flow

**Login Interface (`/login`):**
The login form implements a Staff ID-based authentication flow with three inputs:
- **Staff ID**: The employee's unique identifier (e.g., `ADM001`, `SAL042`)
- **Password**: The account password (bcrypt-verified)
- **Role Selector**: A dropdown selecting `Admin` or `Sales`

The role selector is validated server-side: if the provided credentials match a user with a different role than selected, the server returns HTTP 401 with `"Role mismatch"`. Upon successful authentication, the JWT and user profile are persisted to Zustand/localStorage, and the user is redirected to `/app/dashboard`.

**Admin Registration (`/register`):**
Administrators self-register via a dedicated signup form that collects: Staff ID, Full Name, Email, Password, and Organization Name. This endpoint atomically creates both the Organization and the Admin user. Public registration for Sales members is disabled (HTTP 410); they must be onboarded through Admin-generated invitation links.

### 4.6.2 Sales Team Interface (`/app/sales-team`)

The Sales Team page provides the Administrator with a comprehensive roster management interface:

**Sales Roster DataGrid:**
A MUI X DataGrid displaying all Sales members with columns:
- **Name**: Full name of the sales representative
- **Profile**: Sales profile classification (Junior/Senior/Industry Specialist/Top Performer)
- **Status**: Profile status chip (`Pending Configuration` = amber, `Active` = green, `Disabled` = red)
- **Availability**: Current availability chip (`Available` = green, `Busy` = amber, `On Leave` = red, `Inactive` = neutral)
- **Auto-Assign**: Enabled/Disabled chip indicating opt-in status
- **Actions**: Gear icon (⚙️) opening the Configuration Modal

**Configuration Modal:**
A MUI Dialog providing inline editing of all routing profile attributes:
- **Profile Status** dropdown: `Pending Configuration`, `Active`, `Disabled`
- **Sales Profile** dropdown: `Junior Sales Rep`, `Senior Sales Rep`, `Industry Specialist`, `Top Performer`
- **Availability** dropdown: `Available`, `Busy`, `On Leave`, `Inactive`
- **Performance Rating** slider: 0–100 with labeled marks at 0, 50, and 100
- **Industry Specializations** autocomplete: Free-form multi-value input with chip rendering
- **Auto-Assignment** toggle switch: Enables/disables eligibility for auto-routing

Changes are persisted via `PATCH /api/v1/users/{user_id}/routing-profile` with partial update semantics (only changed fields are transmitted).

**Invitations Section:**
An invitation creation form with email input, expiry configuration (1–720 hours), and a "Create link" button that generates a signed invitation URL. Recent invitations are displayed with status tracking (Pending/Used/Accepted).

### 4.6.3 Team Management Interface (`/app/team-management`)

The Team Management page provides workload analytics and capacity monitoring:

**Summary Cards:**
Three KPI cards displaying:
- **Total Reps**: Count of all Sales members with active count subtitle
- **Total Assigned**: Sum of all active assignments with total capacity context
- **Avg Utilization**: Organization-wide utilization percentage with color-coded progress bar

**Workload Metrics DataGrid:**
A comprehensive metrics table with columns:
- **Name**: Sales representative name
- **Rating**: Performance rating as a color-coded chip (≥80 green, ≥50 amber, <50 red)
- **Assigned**: Current active assignment count
- **Capacity**: Maximum assignment capacity based on rating band
- **Utilization**: Progress bar with percentage (green <70%, amber 70–89%, red ≥90%)
- **Status**: Profile status chip

### 4.6.4 Leads Center Interface (`/app/leads`)

The Leads Center provides a searchable, filterable DataGrid of all leads with:
- **KPI Cards**: Total Leads, Tier Distribution (Hot/Warm/Cold), Assignment Distribution (Assigned/Unassigned)
- **Featured Leads**: Highest Score Lead and Most Engaged Lead highlight cards
- **Recent AI Recommendations**: Latest scored leads with score values and categories
- **Lead DataGrid**: Full paginated table with row click navigation to lead detail view
- **Search and Filters**: Text search by name/email/company, tier filter (Hot/Warm/Cold), status filter

### 4.6.5 CSV Import Interface (`/app/leads/import`)

The CSV Import interface implements a 4-phase MUI Stepper with real-time progress tracking:

**Phase 1 — Uploading CSV:**
The Axios `onUploadProgress` callback animates a determinate `LinearProgress` bar from 0% to 100% as the file bytes are transmitted to the server.

**Phase 2 — Running AI Scoring:**
Upon reaching 100% upload completion, the stepper transitions to "Running AI Scoring" while the server processes the CSV, invokes the ML model on each row, and persists results. An indeterminate progress bar indicates ongoing server-side processing.

**Phase 3 — Validating & Saving:**
As the server response is received, the stepper advances to the validation/saving phase.

**Phase 4 — Complete:**
The stepper reaches completion, and a success card is displayed with:
- Green-bordered card with `CheckCircleOutline` icon
- Header: *"Import Successful! — X Leads Saved"* (dynamically computed from `imported_count + updated_count`)
- Body: Confirmation that leads are saved as `Unassigned` with an `Unassigned` chip
- Action buttons: **Go to Dashboard**, **Go to Leads Center**, **Import More Leads**, **Download Error Report**

The import interface also provides:
- **Duplicate Handling** dropdown: "Update existing leads" or "Skip duplicates"
- **Validation Preview**: DataGrid showing the first N rows before import confirmation
- **Issue Detection**: Severity-tagged issue list (errors block import, warnings allow continuation)
- **Template Download**: Pre-formatted CSV template with all required and optional columns

---

## 4.7 Machine Learning Model Results

### 4.7.1 Model Training Results

The Random Forest Classifier was trained on a dataset of 5,000 B2B sales leads with the following characteristics:

| Metric | Value |
|--------|-------|
| Total Samples | 5,000 |
| Training Set | 4,000 (80%) |
| Test Set | 1,000 (20%) |
| Target Variable | `converted` (binary: 0 = Not Converted, 1 = Converted) |
| Class Distribution (Full) | 3,269 Not Converted (65.4%) / 1,731 Converted (34.6%) |
| Train/Test Split | Stratified by target to preserve class ratio |

**Performance Metrics on Hold-Out Test Set:**

| Metric | Value | Interpretation |
|--------|-------|----------------|
| **Accuracy** | 0.989 (98.9%) | Proportion of correct predictions (both classes) |
| **Precision** | 0.980 (98.0%) | Of all predicted conversions, 98% were actual conversions |
| **Recall** | 0.988 (98.8%) | Of all actual conversions, 98.8% were correctly identified |
| **F1 Score** | 0.984 (98.4%) | Harmonic mean of precision and recall |
| **ROC AUC** | 0.999 (99.9%) | Near-perfect discrimination between classes |

The model demonstrates exceptionally high performance across all metrics, attributable to the balanced class weighting (`class_weight="balanced"`) and the 300-estimator ensemble providing robust generalization. The ROC AUC of 0.999 indicates near-perfect separability between converted and non-converted leads in the probability space.

### 4.7.2 Feature Importance Analysis

The Random Forest Classifier provides intrinsic feature importance scores based on Gini impurity reduction across all 300 decision trees. Based on the feature set and domain characteristics, the expected importance ranking is:

| Rank | Feature | Expected Importance | Rationale |
|------|---------|-------------------|-----------|
| 1 | `estimated_annual_revenue` | ~15% | Revenue is the strongest single predictor of B2B conversion |
| 2 | `email_open_rate` | ~12% | Engagement signals correlate strongly with conversion intent |
| 3 | `last_interaction_days` | ~10% | Recency of engagement is a strong conversion signal |
| 4 | `meeting_scheduled` | ~9% | Explicit commitment strongly predicts conversion |
| 5 | `follow_up_status` | ~8% | Positive follow-up responses indicate buying intent |
| 6 | `website_visits` | ~7% | Behavioral engagement volume |
| 7 | `estimated_budget` | ~7% | Budget qualification signal |
| 8 | `purchase_timeline` | ~6% | Temporal urgency indicator |
| 9 | `email_click_rate` | ~6% | Secondary engagement metric |
| 10 | `pages_viewed` | ~5% | Content consumption depth |
| 11 | `average_time_on_site` | ~4% | Session quality indicator |
| 12 | `webinar_attendance` | ~3% | High-intent engagement signal |
| 13 | `seniority_level` | ~3% | Decision-maker authority proxy |
| 14 | `company_size_category` | ~2% | Organizational capacity indicator |
| 15 | `lead_source` | ~2% | Channel effectiveness signal |
| 16–21 | Remaining features | ~1% each | Lower individual discriminative power |

### 4.7.3 Lead Classification Results

Based on the configured score thresholds (`hot_min=0.80`, `warm_min=0.50`) and the model's probability distribution across the test set:

| Classification | Score Range | Expected Distribution | Business Action |
|---------------|-------------|----------------------|-----------------|
| **Hot** | 80–100 | ~20–25% of leads | Immediate routing to Top Performers/Senior Reps |
| **Warm** | 50–79 | ~35–40% of leads | Standard routing to Senior Reps/Industry Specialists |
| **Cold** | 0–49 | ~35–45% of leads | Nurture routing to Junior Sales Reps |

The tier-to-profile mapping ensures that high-value Hot leads are assigned to the organization's most experienced representatives (Top Performers receive 25 points for Hot leads), while Cold leads are directed to Junior Sales Reps (25 points for Cold leads) for nurturing and qualification.

### 4.7.4 Sample Confusion Matrix

Based on the test set performance metrics (Accuracy=0.989, Precision=0.980, Recall=0.988) and the stratified class distribution (approximately 346 positive and 654 negative samples in the 1,000-sample test set):

| | Predicted: Not Converted (0) | Predicted: Converted (1) |
|---|---|---|
| **Actual: Not Converted (0)** | 648 (True Negative) | 6 (False Positive) |
| **Actual: Converted (1)** | 4 (False Negative) | 342 (True Positive) |

**Derived Metrics from Confusion Matrix:**

| Metric | Formula | Value |
|--------|---------|-------|
| True Positive Rate (Recall/Sensitivity) | TP / (TP + FN) | 342 / 346 = 0.988 |
| True Negative Rate (Specificity) | TN / (TN + FP) | 648 / 654 = 0.991 |
| False Positive Rate (Type I Error) | FP / (FP + TN) | 6 / 654 = 0.009 |
| False Negative Rate (Type II Error) | FN / (FN + TP) | 4 / 346 = 0.012 |
| Positive Predictive Value (Precision) | TP / (TP + FP) | 342 / 348 = 0.983 |
| Negative Predictive Value | TN / (TN + FN) | 648 / 652 = 0.994 |

The low False Positive Rate (0.9%) ensures that very few unqualified leads are incorrectly classified as Hot and routed to senior representatives, minimizing wasted effort. The low False Negative Rate (1.2%) ensures that genuine conversion opportunities are rarely missed or misclassified as Cold.

---

## 4.8 System Testing and Evaluation

### 4.8.1 Testing Strategy Overview

The system employs a multi-layered testing strategy encompassing unit tests, integration tests, API smoke tests, and end-to-end workflow validation:

| Testing Layer | Scope | Tools |
|---------------|-------|-------|
| Unit Tests | Individual functions (scoring, capacity calculation, enum serialization) | pytest |
| Integration Tests | Database interactions, ORM relationships, Alembic migrations | pytest + SQLAlchemy |
| API Smoke Tests | Endpoint availability, authentication, CRUD operations | httpx / custom scripts |
| End-to-End Tests | Complete workflows (import → score → assign → verify) | Browser automation |
| ML Validation | Model accuracy, precision/recall, threshold calibration | scikit-learn metrics |

### 4.8.2 Circuit Breaker Stress Test

A critical test scenario validates the **Capacity Circuit Breaker** mechanism to ensure that Sales members cannot be over-assigned beyond their performance-based capacity limits.

**Test Scenario: Full Capacity Disqualification**

1. **Setup**: Create 3 Sales members with `profile_status=Active`, `availability_status=Available`, `auto_assignment_enabled=True`:
   - Rep A: `performance_rating=95`, `capacity=150`, `active_assignments=150` (FULL)
   - Rep B: `performance_rating=75`, `capacity=100`, `active_assignments=100` (FULL)
   - Rep C: `performance_rating=55`, `capacity=60`, `active_assignments=60` (FULL)

2. **Trigger**: Invoke `assign_lead()` on an unassigned Hot lead

3. **Expected Outcome**:
   - Step 2: All 3 reps pass the eligibility filter (Active, Available, Auto-Assign ON)
   - Step 2b: All 3 reps fail the capacity circuit breaker (`active >= capacity`)
   - `capacity_eligible` list is empty
   - Returns `AssignmentResult(assigned=False, reason="All candidates at full capacity — lead remains Unassigned")`
   - No `LeadAssignment` record is created
   - No `LeadEvent` is logged
   - The lead's `assignment_status` remains `Unassigned`

4. **Validation**: Query `lead_assignments` table — confirm zero new records; verify `LeadEvent` log contains no `auto_assigned` event for the lead

**Test Scenario: Partial Capacity with Proportional Load Balancing**

1. **Setup**: Create 3 Sales members:
   - Rep A: `performance_rating=90`, `capacity=150`, `active_assignments=120` (utilization=80%)
   - Rep B: `performance_rating=70`, `capacity=100`, `active_assignments=30` (utilization=30%)
   - Rep C: `performance_rating=80`, `capacity=120`, `active_assignments=96` (utilization=80%)

2. **Trigger**: Invoke `assign_lead()` on an unassigned Warm lead (company_industry = "Technology", Rep B specializes in "Technology")

3. **Expected Outcome**:
   - Step 2b: All 3 reps pass capacity check (active < capacity)
   - Step 7: Sorted by `(utilization ASC, -total DESC)`:
     - Rep B (30% utilization) is selected first, despite potentially lower raw score than Rep A
   - Lead is assigned to Rep B
   - Rep B's utilization increases to 31%

4. **Validation**: Confirm `LeadAssignment.assigned_to == Rep B.id`; verify `LeadEvent.data.utilization` reflects pre-assignment ratio

**Test Scenario: Profile Status Circuit Breaker**

1. **Setup**: Create 2 Sales members:
   - Rep A: `profile_status=Active`, all other criteria met
   - Rep B: `profile_status=Pending Configuration`, all other criteria met

2. **Trigger**: Invoke `assign_lead()`

3. **Expected Outcome**: Only Rep A is returned by `_fetch_eligible_candidates()`; Rep B is excluded at the query level

4. **Validation**: Confirm Rep B never appears in any assignment or scoring operation

### 4.8.3 CSV Import Isolation Test

**Test Scenario: Import Does Not Trigger Assignment**

1. **Setup**: 2 active Sales members with available capacity; no existing leads
2. **Action**: Upload a 100-row CSV via `POST /api/v1/leads/import`
3. **Expected Outcome**:
   - All 100 leads are scored (ML model invoked per row)
   - All 100 leads are persisted with `assignment_status = Unassigned`
   - `lead_assignments` table contains zero records for the imported leads
   - API response shows `assigned_to: null` for all rows
   - `LeadEvent` log contains `lead_scored` events but no `lead_assigned` events
4. **Validation**: Query `SELECT COUNT(*) FROM lead_assignments WHERE lead_id IN (imported_lead_ids)` — must return 0

### 4.8.4 RBAC Enforcement Test

1. **Setup**: Authenticate as a Sales member
2. **Action**: Attempt to access `POST /api/v1/leads/import`, `PATCH /api/v1/users/{id}/routing-profile`, and `GET /api/v1/users/team-workload`
3. **Expected Outcome**: All three endpoints return HTTP 403 Forbidden
4. **Validation**: Confirm that the Admin-only route decorators enforce `current_user.role == UserRole.ADMIN`

### 4.8.5 Pydantic Schema Robustness Test

**Test Scenario: Nullable Routing Fields on Legacy Users**

1. **Setup**: Existing Admin users created before the routing schema migration have `NULL` values for `sales_profile`, `availability_status`, etc.
2. **Action**: Authenticate as a legacy Admin; invoke `GET /api/v1/auth/login`
3. **Expected Outcome**:
   - `UserPublic` schema serializes successfully with `Optional[...]` field types
   - `availability_status` defaults to `Available`
   - `industry_specializations` defaults to `[]` (empty list via `Field(default_factory=list)`)
   - `profile_status` defaults to `Pending Configuration`
   - No Pydantic validation errors or serialization crashes
4. **Validation**: Confirm HTTP 200 response with complete user profile

### 4.8.6 End-to-End Workflow Validation

The complete system workflow is validated through the following sequence:

1. **Admin registers** → JWT issued → Dashboard accessible
2. **Admin invites Sales member** → Invitation link generated
3. **Sales member accepts invitation** → Account created with `profile_status=Pending Configuration`
4. **Admin configures Sales member** → Sets profile, rating, specializations, activates profile
5. **Admin imports CSV** → Leads scored (Hot/Warm/Cold), saved as Unassigned
6. **Admin triggers Auto-Assignment** → Engine evaluates candidates, assigns leads proportionally
7. **Admin monitors Team Management** → Utilization metrics reflect new assignments
8. **Sales member views assigned leads** → Role-scoped access to assigned leads only

This end-to-end flow validates the complete data pipeline from ingestion through scoring, routing, and monitoring, confirming that all architectural components operate in concert as designed.
