# ResQGrid — Deployment & Operations Guide

> **Local Development, Setup, Configuration, and Operational Reference**

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Setup](#2-repository-setup)
3. [Backend Deployment](#3-backend-deployment)
4. [Frontend Deployment](#4-frontend-deployment)
5. [Environment Configuration](#5-environment-configuration)
6. [Database Management](#6-database-management)
7. [One-Command Startup](#7-one-command-startup)
8. [Verifying Correct Operation](#8-verifying-correct-operation)
9. [Common Issues & Troubleshooting](#9-common-issues--troubleshooting)
10. [SLA Time Scale Configuration](#10-sla-time-scale-configuration)
11. [Demo Configuration Guide](#11-demo-configuration-guide)
12. [Logging & Monitoring](#12-logging--monitoring)
13. [Production Considerations](#13-production-considerations)

---

## 1. Prerequisites

### Required Software

| Software | Minimum Version | Check Command |
|---|---|---|
| Python | 3.11+ | `python --version` |
| pip | 23+ | `pip --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | 2.x | `git --version` |

### Optional (for full feature set)

| Software/Service | Purpose | Without It |
|---|---|---|
| Groq API Key | LLM classification | ML + rule fallback |
| Gemini API Key | LLM fallback | Template responses |
| Twilio Account | SMS notifications | Notifications logged as "mock" |
| SMTP Server | Email notifications | Notifications logged as "mock" |

**Zero-key mode**: All features work without any external API keys. Classification uses the local scikit-learn model; notifications are mock-logged; AI assist uses template responses.

---

## 2. Repository Setup

```bash
# Clone the repository
git clone https://github.com/GhostX1407/BitNBuild_Just-Us-League.git
cd BitNBuild_Just-Us-League
```

### Repository Structure After Clone
```
BitNBuild_Just-Us-League/
├── backend/
│   ├── app/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── docs/                 # Legacy docs folder (preserved)
├── Docs/                 # New comprehensive documentation (this package)
├── run.bat               # Windows startup script
├── run.sh                # Linux/Mac startup script
└── README.md
```

---

## 3. Backend Deployment

### Step 1: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

**Key dependencies installed:**
- `fastapi[standard]` — Web framework with standard extras (uvicorn, email-validator)
- `sqlalchemy[asyncio]` — ORM with async support
- `aiosqlite` — Async SQLite driver
- `pydantic-settings` — Environment variable management
- `scikit-learn` — ML classifier and TF-IDF
- `httpx` — Async HTTP client (for Twilio/Groq/Gemini calls)
- `python-dotenv` — .env file loading

### Step 2: Configure Environment (Optional)

```bash
cp .env.example .env
# Edit .env with any API keys you want to use
```

If you skip this step, the system runs in full zero-key mode.

### Step 3: Start the Backend

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Options:**
- `--reload`: Auto-restart on code changes (development mode)
- `--host 0.0.0.0`: Accept connections from all interfaces (needed for frontend proxy)
- `--port 8000`: Default port

### First-Run Behavior

On the very first run with an empty database:

1. All SQLAlchemy tables are created (`init_db()`)
2. Seed script detects empty DB and runs (`seed_if_empty()`)
3. Seeding takes 5-10 seconds:
   - 14+ hospitals, 8 fire stations, 6 police stations, 5 shelters
   - 44+ response units (engines, ambulances, boats, etc.)
   - 25 sensors
   - ~300 historic incidents (90 days)
4. ML classifier trained on `training_sentences.json` (< 1 second)
5. Background tasks started: SLA loop (5s), unit mover (2s)
6. API ready on `http://localhost:8000`

You will see log output like:
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Seeding database...
INFO:     Seeded 14 hospitals, 8 fire_stations, 6 police_stations, 5 shelters
INFO:     Seeded 44 units
INFO:     Seeded 25 sensors
INFO:     Seeded 298 historic incidents
INFO:     ML classifier trained on 1200 examples
INFO:     SLA monitor started (interval=5s)
INFO:     Unit mover started (interval=2s)
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Verify Backend is Running

```bash
curl http://localhost:8000/api/snapshot | python -m json.tool | head -50
```

Or open `http://localhost:8000/docs` in a browser for interactive API documentation.

---

## 4. Frontend Deployment

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

### Step 2: Start Development Server

```bash
npm run dev
```

The Vite dev server starts on `http://localhost:5173`.

### Proxy Configuration

`vite.config.ts` is pre-configured to proxy all API requests:

```typescript
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,  // WebSocket proxying enabled
      }
    }
  }
}
```

This means:
- Frontend at `http://localhost:5173` makes requests to `/api/*`
- Vite proxies these to `http://localhost:8000/api/*`
- WebSocket connections to `/api/ws` are also proxied

**Important**: Both backend (port 8000) and frontend (port 5173) must be running simultaneously.

### Mock Mode (Frontend Only)

If the backend is not running, the frontend can operate in mock mode:

```bash
VITE_USE_MOCK=true npm run dev
```

Or create a `.env.local` file in the `frontend/` directory:
```
VITE_USE_MOCK=true
```

The UI will show a "Demo data" badge when operating in mock mode.

### Production Build (Optional)

```bash
cd frontend
npm run build
# Builds to frontend/dist/
```

The built files can be served by any static file server or by FastAPI itself:
```python
from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory="frontend/dist", html=True))
```

---

## 5. Environment Configuration

The backend reads configuration from environment variables or a `.env` file in the `backend/` directory.

### Full `.env` Reference

```env
# ═══════════════════════════════════════════════════════════════
# ResQGrid Backend — Environment Configuration
# Copy this file to .env and fill in values you want to use.
# ALL fields are optional. Blank = mock/fallback mode.
# ═══════════════════════════════════════════════════════════════

# ── Database ─────────────────────────────────────────────────
# SQLite (default, no setup):
DATABASE_URL=sqlite+aiosqlite:///./resq.db
# PostgreSQL (if migrating):
# DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/resqdb

# ── LLM — Groq (primary, recommended) ───────────────────────
# Get free key at https://console.groq.com
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# ── LLM — Gemini (fallback) ─────────────────────────────────
# Get free key at https://aistudio.google.com
GEMINI_API_KEY=AIza_your_key_here
GEMINI_MODEL=gemini-2.0-flash

# ── Twilio SMS ───────────────────────────────────────────────
TWILIO_ACCOUNT_SID=AC_your_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM=+14155552671
DEFAULT_SMS_TO=+917600000000  # Default recipient if no specific role found

# ── SMTP Email ───────────────────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youremail@gmail.com
SMTP_PASS=your_app_password
DEFAULT_EMAIL_TO=emergency@vadodara-resq.gov.in

# ── SLA & Dispatch ───────────────────────────────────────────
# SLA time scale multiplier
# 1.0 = real-time (P1 SLA = 2 minutes)
# 0.1 = 10x speed (P1 SLA = 12 seconds — demo mode)
# 0.2 = 5x speed (P1 SLA = 24 seconds — presentation mode)
SLA_TIME_SCALE=1.0

# Auto-dispatch P1 incidents without dispatcher approval
# true = P1 incidents auto-approve on ingest (for high-speed demo)
# false = dispatcher must click "Approve" (realistic workflow)
AUTO_DISPATCH_P1=False

# ── CORS ─────────────────────────────────────────────────────
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# ── Geography defaults (Vadodara city center) ────────────────
DEFAULT_CITY_LAT=22.30
DEFAULT_CITY_LNG=73.19

# ── LLM tuning ───────────────────────────────────────────────
# Maximum seconds to wait for LLM response
LLM_TIMEOUT_S=4.0
```

### Environment Priority

Configuration values are resolved in this order (highest priority first):
1. Actual environment variables set in the shell
2. `.env` file values
3. Pydantic `Settings` class defaults

---

## 6. Database Management

### Database Location

Default: `backend/resq.db`

This is a SQLite database file created automatically on first run.

### Reset Database

To reset to initial seeded state:

**Via API (recommended for demo):**
```bash
curl -X POST http://localhost:8000/api/sim/reset
```

This deletes all live data but preserves historic seed data.

**Full reset (nuclear option):**
```bash
# Stop the backend first
cd backend
rm resq.db           # Linux/Mac
del resq.db          # Windows
# Restart backend to re-create and re-seed
uvicorn app.main:app --reload
```

### Database Inspection

```bash
# Install sqlite3 command line tool
# View all tables
sqlite3 backend/resq.db ".tables"

# Count records
sqlite3 backend/resq.db "SELECT COUNT(*) FROM incidents"

# View recent reports
sqlite3 backend/resq.db "SELECT id, source, text, created_at FROM reports ORDER BY created_at DESC LIMIT 10"

# Check active incidents
sqlite3 backend/resq.db "SELECT code, type, priority, status FROM incidents WHERE is_historic = 0"
```

### Backup

```bash
cp backend/resq.db backend/resq.db.backup
```

### Migration to PostgreSQL (Advanced)

To switch from SQLite to PostgreSQL:

1. Install async driver: `pip install asyncpg`
2. Set `DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname`
3. Restart backend (SQLAlchemy will create tables automatically)
4. Note: You will need to re-run seed data

---

## 7. One-Command Startup

### Windows (`run.bat`)

```bat
@echo off
echo Starting ResQGrid Backend...
start cmd /k "cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload"

timeout /t 5

echo Starting ResQGrid Frontend...
start cmd /k "cd frontend && npm install && npm run dev"

echo.
echo ResQGrid is starting up...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
```

### Linux/Mac (`run.sh`)

```bash
#!/bin/bash
echo "Starting ResQGrid Backend..."
(cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload) &

sleep 5

echo "Starting ResQGrid Frontend..."
(cd frontend && npm install && npm run dev) &

echo ""
echo "ResQGrid is starting up..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "API Docs: http://localhost:8000/docs"

wait
```

Make executable: `chmod +x run.sh`

---

## 8. Verifying Correct Operation

### Checklist After Startup

**Backend Health:**
```bash
# 1. Check API is responding
curl http://localhost:8000/api/snapshot | python -m json.tool | grep '"active"'
# Expected: "active": <number>

# 2. Check unit count
curl http://localhost:8000/api/units | python -m json.tool | python -c "import sys,json; d=json.load(sys.stdin); print(f'Units: {len(d)}')"
# Expected: Units: 44 (or similar)

# 3. Check analytics
curl http://localhost:8000/api/analytics/overview | python -m json.tool
# Expected: JSON with total_incidents, total_reports, etc.
```

**Frontend Health:**
- Open `http://localhost:5173` — should show the dispatcher console
- Map should be centered on Vadodara (22.30°N, 73.19°E)
- KPI strip should show incident/unit counts
- Navigation tabs should work (Console, Analytics, Report, Simulator)

**WebSocket Health:**
- Open browser DevTools → Network → WS
- Navigate to `http://localhost:5173`
- Should see WebSocket connection to `/api/ws` with status 101 (switching protocols)
- Server should send `connection.established` message

**End-to-End Test:**
```bash
# Submit a test citizen report
curl -X POST http://localhost:8000/api/ingest/citizen \
  -H "Content-Type: application/json" \
  -d '{"text": "Fire near GIDC, smoke visible", "lat": 22.25, "lng": 73.19}'

# Expected response:
# {
#   "report_id": "...",
#   "incident_id": "...",
#   "action": "new",
#   "classification": {"type": "fire", ...},
#   "track_id": "TRK-..."
# }
```

After submitting, check the frontend console — a new incident marker should appear on the map within 1-2 seconds (WebSocket push).

---

## 9. Common Issues & Troubleshooting

### Backend Won't Start

**Issue**: `ModuleNotFoundError: No module named 'fastapi'`
```bash
# Solution: Install dependencies
cd backend
pip install -r requirements.txt
```

**Issue**: `UNIQUE constraint failed: incidents.code`
```bash
# Stale test DB conflict - reset
cd backend && rm resq.db
# Restart backend to re-seed
```

**Issue**: Port 8000 already in use
```bash
# Find and kill the process
lsof -i :8000 | grep LISTEN  # Linux/Mac
netstat -ano | findstr :8000  # Windows

# Or use a different port
uvicorn app.main:app --reload --port 8001
# Update vite.config.ts proxy target to port 8001
```

### Frontend Won't Start

**Issue**: `npm install` fails with EACCES
```bash
# Solution: Fix npm permissions or use sudo
sudo chown -R $USER ~/.npm
npm install
```

**Issue**: `Failed to load resource: net::ERR_CONNECTION_REFUSED` for API calls
- Backend is not running. Start it first.
- Check the proxy in `vite.config.ts` targets `localhost:8000`.

**Issue**: Map doesn't appear
- OpenStreetMap tiles require internet connection
- Check browser console for CSP errors
- Leaflet CSS must be imported

### Database Issues

**Issue**: `sqlite3.OperationalError: database is locked`
- Multiple uvicorn workers are sharing the SQLite file
- Use single worker: `uvicorn app.main:app --workers 1`
- Or migrate to PostgreSQL

**Issue**: Seed data not appearing after reset
```bash
# Full database reset
rm backend/resq.db
# Restart backend
```

### LLM Issues

**Issue**: Classifications all returning "rules" model
- LLM key not configured (this is correct zero-key behavior)
- To enable LLM: add `GROQ_API_KEY=...` to `.env`

**Issue**: LLM circuit breaker tripped
- Check logs for "Groq circuit breaker TRIPPED"
- Circuit auto-resets after 30 seconds
- Add `GEMINI_API_KEY` for automatic fallback

### WebSocket Issues

**Issue**: WebSocket not connecting (frontend shows "reconnecting")
- Backend not running
- Proxy configuration incorrect in `vite.config.ts`
- Ensure `ws: true` is set in proxy options

**Issue**: Events not updating in real-time
- Check browser DevTools WebSocket connection
- Verify `EventBus.publish` is called by services (check backend logs)

---

## 10. SLA Time Scale Configuration

The `SLA_TIME_SCALE` setting controls the speed of SLA timers, enabling realistic demonstration of escalation behavior:

| Scale | Meaning | Use Case |
|---|---|---|
| `1.0` | Real-time (P1 = 2 min, P4 = 20 min) | Production-like testing |
| `0.5` | 2× speed (P1 = 1 min) | Slow demo |
| `0.2` | 5× speed (P1 = 24 seconds) | Standard demo |
| `0.1` | 10× speed (P1 = 12 seconds) | Fast demo, judge presentation |
| `0.05` | 20× speed (P1 = 6 seconds) | Extreme fast-forward |

### Changing SLA Scale During Runtime

Via API (no restart needed):
```bash
curl -X POST http://localhost:8000/api/sim/fast-forward \
  -H "Content-Type: application/json" \
  -d '{"scale": 0.1}'
```

Via environment variable (requires restart):
```env
SLA_TIME_SCALE=0.1
```

### Recommended Demo Configuration

For a 5-minute hackathon demo:
```env
SLA_TIME_SCALE=0.1       # 10× speed
AUTO_DISPATCH_P1=False   # Show dispatcher workflow
GROQ_API_KEY=...         # LLM classification for better demo
```

---

## 11. Demo Configuration Guide

### Pre-Demo Setup

1. **Reset to clean state:**
   ```bash
   curl -X POST http://localhost:8000/api/sim/reset
   ```

2. **Set fast SLA scale:**
   ```bash
   curl -X POST http://localhost:8000/api/sim/fast-forward \
     -d '{"scale": 0.1}' -H "Content-Type: application/json"
   ```

3. **Verify seeded data:**
   ```bash
   curl http://localhost:8000/api/analytics/overview
   ```

4. **Open browser tabs:**
   - Tab 1: `http://localhost:5173/console` (dispatcher view)
   - Tab 2: `http://localhost:5173/analytics` (analytics)
   - Tab 3: `http://localhost:5173/simulator` (demo controls)

### Demo Script (5 minutes)

**0:00 — Dashboard Overview (30s)**
- Show KPI strip with historic data (active incidents from seed)
- Show analytics page with type distribution, hotspot heatmap
- Return to console

**0:30 — Enable Ambient Feed (15s)**
- Simulator page → Start
- Watch ambient citizen reports appearing (every 25-40s)

**0:45 — Flood Scenario (90s)**
- Simulator page → "Flood" scenario button
- Narrate: "9 reports arriving from multiple sources..."
- Watch map: sensor breach marker → incident created → multiple reports merge
- Open incident drawer: show merged report count, AI summary, recommendation panel
- Click "Approve All" → units start moving on map
- Show SLA countdown
- Watch R1 alert fire (unit not en_route) → notification in drawer

**2:15 — Escalation (45s)**
- Wait for or manually trigger alert escalation (level 0 → 1)
- Show notification outbox: SMS to "Shift Supervisor" appears
- Show decision log: priority history, merge events

**3:00 — Chemical Fire Scenario (60s)**
- Simulator page → "Chemical Fire" button
- Watch: gas sensor breach → chemical fire incident created → HazMat shortage alert
- Open shortage incident: shortage panel showing "2 HazMat required, 0 available"
- Show escalation level 2 (district commander notification)

**4:00 — AI Brief (30s)**
- Back to console → Situation Brief button
- Show AI-generated narrative covering both active incidents
- Type NL query: "How many people are affected?"

**4:30 — Analytics (30s)**
- Switch to `/analytics`
- Show response delay chart
- Show shortage bar chart (HazMat demand > available)
- Show geographic hotspots

---

## 12. Logging & Monitoring

### Log Output

The backend uses Python's `logging` module with level-appropriate output:

| Level | Category | Example |
|---|---|---|
| INFO | Startup, seeding, background task start | `SLA monitor started` |
| INFO | Ingest requests | `POST /api/ingest/citizen → incident INC-0001` |
| WARNING | LLM failures, circuit breaker, notify failures | `Groq timeout, falling back to Gemini` |
| DEBUG | Detailed operations | `Dedupe score: geo=0.92 text=0.71 total=0.78` |
| ERROR | Unhandled exceptions | (rare, wrapped by fail-safe design) |

### Configuring Log Level

```bash
# Debug level (verbose)
uvicorn app.main:app --reload --log-level debug

# Warning level (quiet)
uvicorn app.main:app --reload --log-level warning
```

### Key Log Messages to Monitor

```
# Good: System functioning normally
INFO: SLA monitor started (interval=5s)
INFO: Seeded 298 historic incidents

# Good: Requests processing
INFO: New incident created: INC-0001 (flood, P1) at Vishwamitri
INFO: Reports merged: INC-0001 now has 3 reports

# Warning: LLM fallback active
WARNING: Groq circuit breaker TRIPPED after 3 failures
WARNING: LLM fallback to ML classifier for request

# Warning: Notification issues
WARNING: SMS dispatch failed: Twilio credentials not configured (using mock)
WARNING: notify.route failed for channel email (handled safely)

# Critical (rare): Database issues
ERROR: Database operation failed: sqlite3.OperationalError
```

### Operational Metrics (Manual)

Check these during/after demo:
```bash
# Active incidents
curl http://localhost:8000/api/snapshot | python -c "import sys,json; s=json.load(sys.stdin); print(f'Active: {s[\"kpis\"][\"active\"]}, P1: {s[\"kpis\"][\"p1\"]}')"

# Open alerts
curl http://localhost:8000/api/alerts?status=open | python -c "import sys,json; print(f'Open alerts: {len(json.load(sys.stdin))}')"

# Notification count
curl http://localhost:8000/api/notifications | python -c "import sys,json; print(f'Notifications sent: {len(json.load(sys.stdin))}')"
```

---

## 13. Production Considerations

> **Important**: ResQGrid is designed and optimized for hackathon demonstration. The following notes describe what would be needed for production deployment but are **NOT implemented** in the current version.

### What Would Need to Change for Production

**Authentication & Authorization:**
- Add JWT-based authentication
- Implement role-based access control (RBAC)
- Secure WebSocket connections

**Database:**
- Migrate from SQLite to PostgreSQL for concurrent multi-user access
- Add database connection pooling
- Implement proper migrations (Alembic)
- Set up automated backups

**Scalability:**
- Deploy behind Nginx or Caddy reverse proxy
- Run multiple uvicorn workers (after migrating from SQLite)
- Consider Redis for WebSocket pub/sub at scale

**Security:**
- HTTPS/TLS for all connections
- Secrets management (not .env files)
- Input sanitization and rate limiting
- Prompt injection testing for LLM endpoints

**Reliability:**
- Health check endpoint
- Process supervisor (systemd, supervisor)
- Alerting for background task failures
- Automated restart on crash

**Monitoring:**
- Prometheus metrics endpoint
- Grafana dashboards
- Distributed tracing for pipeline stages
- Error tracking (Sentry)

**Current Architecture Limits:**
- SQLite: single-writer, ~100 concurrent readers
- In-process EventBus: single-node only (no horizontal scale)
- In-memory LRU cache: cleared on restart, not shared across instances
- Background asyncio tasks: single-process, no worker distribution

---

*This document is part of the ResQGrid documentation package. For API reference, see `Docs/05_API_Reference/`. For architecture overview, see `Docs/02_Architecture/`.*
