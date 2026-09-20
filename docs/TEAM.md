# ResQGrid — Team Documentation

> **Team: Just-Us-League | Hackathon: BitNBuild | Problem Statement: PS-9**

---

## Team Overview

**Team Name:** Just-Us-League

**Hackathon:** BitNBuild

**Problem Statement:** PS-9 — Emergency Response Coordination Platform

**Project:** ResQGrid — Intelligent Emergency Response & Resource Coordination Platform

---

## Development Roles & Ownership

The codebase was developed following a split-ownership architecture defined in `PROMPT_FE.md` to enable parallel development without merge conflicts.

### Role: BE1 — Core Pipeline

**Owned Files:** Core backend systems

**Responsibilities:**
- Application entry point (`app/main.py`): Router autodiscovery, lifespan management, CORS
- Configuration system (`app/core/config.py`): Pydantic Settings with all environment variables
- LLM client (`app/core/llm.py`): Groq primary + Gemini fallback, circuit breaker, LRU cache
- Database (`app/db/models.py`, `app/db/session.py`): All 11 SQLAlchemy models, async session factory
- Ingest pipeline (`app/services/pipeline.py`): Central orchestrator for all ingest stages
- Classification (`app/services/classify.py`): LLM + ML + rule-based classification
- Geocoding (`app/services/geocode.py`): Multi-level location resolution with gazetteer
- Deduplication (`app/services/dedupe.py`): TF-IDF cosine + geographic scoring engine
- Priority (`app/services/priority.py`): Deterministic priority computation
- Geographic utilities (`app/services/geo.py`): Haversine distance, ETA computation
- API endpoints (`app/api/ingest.py`, `app/api/incidents.py`, `app/api/ai.py`, `app/api/track.py`)
- Data files: `gazetteer.json`, `training_sentences.json`, `sop.json`, `train_data.py`
- Schemas: `app/schemas/incident.py`

### Role: BE2 — Operations Layer

**Owned Files:** Resource management and real-time systems

**Responsibilities:**
- Event system (`app/core/events.py`): EventBus singleton + ConnectionManager
- Resource recommendation (`app/services/recommend.py`): Requirement templates + 4-factor matching
- Dispatch state machine (`app/services/dispatch.py`): Assignment lifecycle management
- SLA monitoring (`app/services/sla.py`): 8 alert rules + 4-tier escalation ladder
- Notification routing (`app/services/notify.py`): Multi-channel router (in-app, SMS, email)
- AI assistance (`app/services/ai_assist.py`): Summary, SOP, brief, NL query
- Analytics engine (`app/services/analytics.py`): KPI and metrics computation
- Simulator (`app/services/simulator.py`): Unit mover, ambient feed, scripted scenarios
- Seed data (`app/data/seed.py`, `app/data/facilities.json`, `app/data/units.json`, `app/data/templates.json`)
- API endpoints: `app/api/units.py`, `app/api/alerts.py`, `app/api/analytics.py`, `app/api/sim.py`, `app/api/notifications.py`, `app/api/ws.py`
- Schemas: `app/schemas/unit.py`

### Role: FE — Frontend Engineer

**Owned Files:** Everything under `frontend/`

**Responsibilities:**
- TypeScript domain types (`src/types/domain.ts`)
- REST API client (`src/services/api.ts`): Typed fetch wrappers for all 40+ endpoints
- WebSocket client (`src/services/ws.ts`): Auto-reconnect with exponential backoff
- Mock data service (`src/services/mock.ts`): In-memory demo data for offline frontend
- Zustand stores (`src/store/incidents.ts`, `units.ts`, `alerts.ts`, `notifications.ts`, `ui.ts`)
- Hooks (`src/hooks/useWebSocket.ts`, `useSnapshot.ts`)
- Utility functions (`src/utils/format.ts`, `geo.ts`, `time.ts`)
- Design tokens (`src/styles/tokens.css`)
- UI primitives (`src/components/ui/*`: Card, Button, Badge, Toggle, Modal, Toast)
- Pages:
  - Console (`src/pages/Console/`): 3-zone dispatcher dashboard with live map
  - Analytics (`src/pages/Analytics/`): Charts and KPI visualizations
  - Report (`src/pages/Report/`): Public citizen report form
  - Team (`src/pages/Team/`): Field team mobile interface
  - Track (`src/pages/Track/`): Public incident tracking
  - Hospital (`src/pages/Hospital/`): Hospital capacity management
  - Simulator (`src/pages/Simulator/`): Demo control panel

---

## Development Approach

### Collaborative Architecture

The team operated against a **frozen API contract** defined in `PROMPT_FE.md` that specified:
- All REST endpoint paths, request bodies, and response shapes
- All WebSocket event types and payload schemas
- All SQLAlchemy model interfaces
- All service function signatures

This contract allowed all three roles to develop simultaneously without waiting for each other, with merge integration points ("FOUNDATION PUSHED", "EVENTS PUSHED", "BACKEND API LIVE") coordinated via the repository.

### Code Quality Standards

All team members adhered to:
- Python type annotations (`from __future__ import annotations`, `Mapped[]`, `dict | None`)
- Pydantic v2 for all request/response validation
- Async-first design (no synchronous blocking in the async event loop)
- Fail-safe service design (every service wraps in try/except, never raises to callers)
- Decision explainability (all automated decisions stored in `decision_log`)

### No External Blockers

The system is designed to work without any external dependencies:
- No LLM key: ML + rule fallback
- No Twilio: mock SMS logging
- No SMTP: mock email logging
- No internet: OSM tiles can be cached; all algorithm is local

---

## Acknowledgements

The team acknowledges the following open-source projects and services that made ResQGrid possible:

- **FastAPI** (Sebastián Ramírez) — The async web framework powering the backend
- **SQLAlchemy** — The Python SQL toolkit and ORM
- **scikit-learn** — ML library enabling offline classification and deduplication
- **React + Vite** — Frontend development environment
- **Leaflet + OpenStreetMap** — Open-source mapping platform
- **Groq** — Fast LLM inference API
- **Google Gemini** — LLM fallback provider
- **Recharts** — Charting library for analytics
- **Lucide React** — Icon library
- **Tailwind CSS** — Utility-first CSS framework
- **Zustand** — State management for React

---

*This document is part of the ResQGrid documentation package.*
