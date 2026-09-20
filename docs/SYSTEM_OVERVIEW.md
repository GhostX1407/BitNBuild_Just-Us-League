# ResQGrid — System Overview & Context
Project: **ResQGrid** — Intelligent Emergency Response & Resource Coordination Platform (Hackathon PS-9).

Documentation Index: `SYSTEM_OVERVIEW` → `01_PRD` → `02_ARCHITECTURE` → `03_DATA_API`.

## One-Paragraph Summary
Multi-source incidents (citizen web form, emergency-call transcript, sensor feed, field team, hospital) enter one unified pipeline: normalize → geolocate → classify (type, severity, priority) → duplicate-merge → resource recommendation (teams, vehicles, equipment, facilities) → dispatcher approves/auto-dispatches → live tracking with SLA timers → alerts/escalation → notifications. A React command-center dashboard (map + incident queue + alerts + analytics) updates in real time over WebSockets. Machine learning and LLMs assist with classification and situation summaries, while all core operational decisions feature deterministic fallbacks ensuring high availability and resilience.

## System Design & Technology Decisions
- **Backend**: Python 3.11+, FastAPI, SQLAlchemy 2 async, SQLite (`aiosqlite`), Pydantic v2, WebSockets, background asyncio loops for SLA checks and simulation.
- **ML / Classification**: scikit-learn (TF-IDF + LogisticRegression) as local fallback classifier; LLM (Groq Llama 3.3-70B, with Gemini fallback) via unified `llm.py` returning strict JSON; rule/ML fallback triggers on missing key or timeout (4s).
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Leaflet (OpenStreetMap tiles) + Recharts + Zustand for reactive state management.
- **Geography**: Synthetic emergency response dataset set in **Vadodara, Gujarat** (lat 22.30, lng 73.19), with local landmarks, wards, and facilities pre-mapped.
- **Notifications**: In-app (WebSocket toast + outbox panel) always enabled; SMS (Twilio) and email (SMTP) dispatch when environment credentials are provided, with mock logging fallback.
- **Authentication**: Role switcher (Dispatcher, Field Team, Public Citizen) for rapid role-based operations.
- **Deployment**: Zero-dependency local setup, no Docker required. `run.sh` / `run.bat` launches both backend and frontend.

## Architecture Reuse & Adaptations
| Component | Origin | Purpose & Adaptation |
|---|---|---|
| Geolocation Utilities | Haversine distance | Pure function distance and ETA calculations (`haversine_km`, `eta_minutes`) |
| Configuration | Pydantic Settings | Environment-driven settings with fallbacks (`core/config.py`) |
| Matching Engine | Multi-factor scoring | Proximity, capability fit, readiness, and load balancing scoring with detailed breakdown |
| Audit Trail | Immutable Ledger | Every state change logged into `audit_events` and broadcasted via WebSockets |
| Reliability & Fallbacks | Zero-key operation | Graceful degradation across all AI and messaging features |

## Operational Principles
1. **Zero-Key Resilience**: Every core feature functions without external API keys (mock/fallback paths provided).
2. **Deterministic Authority**: Automated intelligence proposes recommendations; dispatcher approval or deterministic rules commit state changes.
3. **Full Auditability**: Every state change records an entry in `audit_events` and broadcasts a WebSocket message `{type, payload}`.
4. **Standardized Data Formats**: UUID strings for IDs; UTC ISO-8601 strings for timestamps; kilometres for distances; 0–1 normalized scores.
5. **Decision Explainability**: All matching and classification decisions expose explicit reasons and score breakdowns to operators.
