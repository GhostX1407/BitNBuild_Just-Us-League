# Smart Disaster & Emergency Management Platform
### Phase 1 — Core Backend & Database

A production-quality FastAPI + PostgreSQL backend for real-time emergency incident management.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start (Windows PowerShell)](#quick-start-windows-powershell)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup & Migrations](#database-setup--migrations)
6. [Running the Server](#running-the-server)
7. [API Reference](#api-reference)
8. [Running Tests](#running-tests)
9. [Geographic Distance Approach](#geographic-distance-approach)
10. [CORS Configuration](#cors-configuration)
11. [Phase Roadmap](#phase-roadmap)
12. [Known Limitations (Phase 1)](#known-limitations-phase-1)

---

## Architecture Overview

```
backend/
├── app/
│   ├── main.py                    # FastAPI app factory, CORS, routers
│   ├── core/
│   │   └── config.py              # All settings from environment variables
│   ├── database/
│   │   ├── base.py                # DeclarativeBase + TimestampMixin
│   │   └── connection.py          # AsyncEngine, AsyncSession, get_db dep
│   ├── models/
│   │   └── incident.py            # SQLAlchemy ORM model
│   ├── schemas/
│   │   └── incident.py            # Pydantic v2 request/response schemas
│   ├── api/
│   │   └── incidents.py           # FastAPI router (4 endpoints)
│   └── services/
│       ├── incident_service.py    # All async DB logic
│       └── geo_utils.py           # Haversine; PostGIS-ready stub
├── alembic/                       # Migration scripts
├── tests/                         # pytest-asyncio test suite (13 tests)
├── requirements.txt
├── .env.example
├── alembic.ini
└── pytest.ini
```

**Key technology choices:**

| Layer | Choice | Reason |
|---|---|---|
| Framework | FastAPI | Async-native, auto OpenAPI docs |
| ORM | SQLAlchemy 2.x AsyncSession | Non-blocking; WebSocket ready |
| PG driver | asyncpg | Fastest async PostgreSQL driver |
| Test DB | SQLite + aiosqlite | Zero-config CI; no external PG needed |
| Validation | Pydantic v2 | Fast, native FastAPI integration |
| Migrations | Alembic (async env) | Async engine compatible |

---

## Prerequisites

- Python 3.11+
- PostgreSQL 14+ (for production)
- pip

---

## Quick Start (Windows PowerShell)

```powershell
# 1. Clone and enter the backend directory
cd "C:\Users\Ananya Yadav\Desktop\Main\Projects\BitNBuild_Just-Us-League\backend"

# 2. Create and activate a virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
Copy-Item .env.example .env
# Edit .env with your PostgreSQL credentials (see next section)
notepad .env

# 5. Create the PostgreSQL database
# (Ensure PostgreSQL is running and psql is in PATH)
psql -U postgres -c "CREATE DATABASE disaster_mgmt;"

# 6. Apply database migrations
alembic upgrade head

# 7. Start the development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open **http://localhost:8000/docs** for the interactive Swagger UI.

---

## Environment Configuration

Copy `.env.example` to `.env` and set these values:

```ini
# PostgreSQL connection — psycopg driver required
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/disaster_mgmt

# SQLite for tests (no PostgreSQL needed for CI)
TEST_DATABASE_URL=sqlite+aiosqlite:///./test_disaster.db

# CORS — comma-separated list of allowed frontend origins
# Phase 4 React dev server runs on http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Default severity when not provided in POST /api/incidents
# Phase 2 AI classifier will replace this
DEFAULT_SEVERITY=Medium

APP_ENV=development
APP_DEBUG=true
```

> **Security**: Never commit `.env` to version control. `.gitignore` should include `.env`.

---

## Database Setup & Migrations

### First-time setup

```powershell
# Create the database (PostgreSQL must be running)
psql -U postgres -c "CREATE DATABASE disaster_mgmt;"

# Apply all migrations
alembic upgrade head
```

### Generating a new migration after model changes

```powershell
# Autogenerate migration from model diff
alembic revision --autogenerate -m "describe your change"

# Review the generated file in alembic/versions/, then apply it
alembic upgrade head
```

### Rolling back

```powershell
# Roll back one migration
alembic downgrade -1

# Roll back to a specific revision
alembic downgrade <revision_id>
```

---

## Running the Server

```powershell
# Development (auto-reload on file changes)
uvicorn app.main:app --reload

# Production-style (multiple workers)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health check**: http://localhost:8000/health

---

## API Reference

### `POST /api/incidents` — Create incident

**Request body:**
```json
{
  "title": "Building fire on Main St",
  "description": "Multi-story residential fire, occupants trapped on 3rd floor.",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "category": "Fire",
  "severity": "High",
  "reporter_info": "Jane Doe, 555-1234"
}
```

- `severity` is **optional** — defaults to `DEFAULT_SEVERITY` from environment.
- `category`: `Fire | Flood | Medical | Accident | Other`
- `severity`: `High | Medium | Low`

**Response (201):**
```json
{
  "id": 1,
  "title": "Building fire on Main St",
  "status": "Pending",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  ...
}
```

---

### `GET /api/incidents` — List incidents

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `category` | string | Filter by category |
| `severity` | string | Filter by severity |
| `status` | string | Filter by status |
| `page` | int | Page number (default: 1) |
| `page_size` | int | Items per page (default: 20, max: 100) |

**Example:**
```
GET /api/incidents?category=Fire&status=Pending&page=1&page_size=10
```

---

### `GET /api/incidents/{id}` — Get single incident

Returns 404 if not found.

---

### `PATCH /api/incidents/{id}/status` — Update status

**Request body:**
```json
{ "status": "Assigned" }
```

Valid transitions: `Pending → Assigned → Resolved`

---

## Running Tests

Tests use an in-memory SQLite database — **no PostgreSQL required**.

```powershell
# Activate virtual environment first
.\.venv\Scripts\Activate.ps1

# Run all tests with verbose output
pytest tests/ -v

# Run a specific test
pytest tests/test_incidents.py::test_create_incident_success -v

# Run with coverage (install pytest-cov first)
pip install pytest-cov
pytest tests/ --cov=app --cov-report=term-missing
```

**Test coverage (13 tests):**

| # | Test | Scenario |
|---|---|---|
| 1 | `test_create_incident_success` | Happy path creation |
| 2 | `test_create_incident_invalid_latitude` | Latitude > 90 |
| 3 | `test_create_incident_invalid_longitude` | Longitude > 180 |
| 4 | `test_create_incident_invalid_category` | Unknown category |
| 5 | `test_create_incident_invalid_severity` | Unknown severity |
| 6 | `test_create_incident_default_severity` | Severity omitted |
| 7 | `test_list_incidents_pagination` | Page 1 of 2 |
| 8 | `test_list_incidents_category_filter` | Filter by Flood |
| 9 | `test_get_incident_by_id` | Retrieve by ID |
| 10 | `test_get_incident_not_found` | 404 response |
| 11 | `test_update_incident_status` | Pending → Assigned |
| 12 | `test_update_status_not_found` | 404 on PATCH |
| 13 | `test_update_status_invalid` | Invalid status |

---

## Geographic Distance Approach

**Phase 1** stores latitude and longitude as `NUMERIC(10, 7)` columns (7 decimal places = ~1 cm precision).

Geographic utilities live in `app/services/geo_utils.py`:

```python
from app.services.geo_utils import haversine_distance, is_within_radius

distance_km = haversine_distance(lat1, lon1, lat2, lon2)
nearby = is_within_radius(lat1, lon1, lat2, lon2, radius_km=0.5)
```

**Phase 2 migration path to PostGIS:**
1. `CREATE EXTENSION postgis;`
2. Add a `GEOMETRY(Point, 4326)` column to the incidents table.
3. Replace `haversine_distance` calls in `incident_service.py` with PostGIS `ST_DWithin` via GeoAlchemy2.
4. The function signatures in `geo_utils.py` remain the same — callers don't change.

The existing `NUMERIC` columns are retained alongside the geometry column for compatibility.

---

## CORS Configuration

Configure allowed frontend origins in `.env`:

```ini
# Development (React dev server default ports)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Production
CORS_ORIGINS=https://your-dashboard.example.com
```

The backend allows these HTTP methods: `GET, POST, PATCH, OPTIONS`.  
Allowed headers: `Content-Type, Authorization, Accept`.

> **Do not** use `*` wildcard origins in production — this bypasses CSRF browser protections.

---

## Phase Roadmap

| Phase | Features |
|---|---|
| **Phase 1** ✅ | Core API, PostgreSQL, async ORM, migrations, tests |
| **Phase 2** | AI severity classification, geographic duplicate detection |
| **Phase 3** | Redis pub/sub, WebSocket notifications, mock SMS/push |
| **Phase 4** | React dashboard, live map, severity badges, status controls |

---

## Known Limitations (Phase 1)

1. **No authentication** — endpoints are open. Phase 2/3 will add JWT/API key auth.
2. **No AI classification** — severity defaults to `DEFAULT_SEVERITY`. Phase 2 replaces this.
3. **No duplicate detection** — each report creates a new incident. Phase 2 adds geographic + text deduplication.
4. **No real-time updates** — Phase 3 adds WebSocket push and Redis pub/sub.
5. **SQLite in tests** — CHECK constraints are not enforced by SQLite; enum validation relies on Pydantic. Run integration tests against PostgreSQL for full constraint coverage.
6. **No rate limiting** — add `slowapi` or an API gateway in Phase 3.
