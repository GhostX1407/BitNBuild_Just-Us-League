# ResQGrid — Intelligent Emergency Response & Resource Coordination Platform

> **BitNBuild Hackathon | Team: Just-Us-League | Problem Statement: PS-9**

ResQGrid is a unified emergency management platform for Emergency Operations Centers (EOCs). It aggregates incident reports from 6 source channels, applies AI-assisted classification and deduplication, algorithmically matches and dispatches resources, and monitors SLA compliance in real-time — all from a single dispatcher command center.

---

## ⚡ Quick Start

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

Open: **http://localhost:5173** (Dispatcher Console) | **http://localhost:8000/docs** (API Docs)

> **Zero-key mode**: All features work without any API keys. LLM → ML → Rule fallbacks ensure full offline operation.

---

## 🎯 What ResQGrid Solves

| The Problem | How ResQGrid Solves It |
|---|---|
| Emergency reports arrive from 6 disconnected channels | Unified ingest API: citizen, call, sensor, field, hospital, department |
| One event generates 40 duplicate reports | TF-IDF + geographic deduplication → 40 reports become 9 incidents |
| Dispatchers can't identify best units under pressure | 4-factor scoring engine: proximity, capability, readiness, load |
| Response delays are invisible until too late | SLA monitoring loop (5s) with 8 alert rules + 4-tier auto-escalation |
| No audit trail for post-incident analysis | Every automated decision logged in an immutable `decision_log` |

---

## 🔑 Key Capabilities

- **Multi-Source Ingestion**: 6 parallel ingest channels with unified classification and geocoding pipeline
- **AI-Powered Triage**: LLM (Groq Llama-3.3-70B) → ML (scikit-learn) → Rule-engine — 3-tier fallback guarantees
- **Intelligent Deduplication**: Weighted scoring (geo 40% + text 35% + type 15% + time 10%) with configurable merge/relate thresholds
- **Algorithmic Dispatch**: Resource matching across 44 units with score breakdowns and ETA; 1-click approval
- **Real-Time Command Center**: WebSocket-driven live map, incident queue, unit tracking — updates in < 100ms
- **Automated SLA Escalation**: 8 alert rules evaluated every 5 seconds; 4-tier escalation to State Authority
- **Full Explainability**: Decision log captures every classification, merge, and priority change with reason
- **Demo Simulator**: Scripted flood / chemical fire / highway pileup scenarios for live demonstration

---

## 🏗️ Architecture

```
Citizen  Call  Sensor  Field  Hospital  Dept
   └─────────────────┬──────────────────────┘
                  [Ingest API]
                     │
         ┌───────────┼───────────┐
     [Geocode]  [Classify]  (parallel asyncio)
         └───────────┼───────────┘
                  [Dedupe Lock]
              ┌──────┴──────┐
           [Merge]       [New Incident]
              └──────┬──────┘
                     │
          ┌──────────┼───────────┐
      [Recommend] [SLA Loop] [Notify]
          │           │           │
      [Dispatch]  [Alerts]  [SMS/Email/WS]
          │
   [WebSocket EventBus → All connected clients]
```

**Backend**: FastAPI + SQLAlchemy (async) + SQLite + asyncio background tasks  
**Frontend**: React 18 + TypeScript + Vite + Zustand + React-Leaflet  
**AI**: Groq (Llama-3.3-70B) + Gemini 2.0 Flash fallback + scikit-learn offline ML

---

## 📁 Project Structure

```
BitNBuild_Just-Us-League/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers (ingest, incidents, units, sim, ws, ...)
│   │   ├── core/         # LLM client, EventBus, config, settings
│   │   ├── db/           # SQLAlchemy models (11 tables), session factory
│   │   ├── services/     # pipeline, classify, geocode, dedupe, recommend, sla, ...
│   │   └── data/         # gazetteer, seed data, training sentences
│   ├── tests/            # pytest suite (classify, dedupe, pipeline, recommend, sla)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/        # Console, Analytics, Report, Team, Track, Hospital, Simulator
│   │   ├── store/        # Zustand stores (incidents, units, alerts, notifications)
│   │   ├── services/     # API client, WebSocket client, mock data
│   │   └── components/   # Map, UI primitives, shared components
│   └── package.json
├── Docs/                 # Full documentation package (see below)
└── README.md
```

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v
# Expected: ~75 tests pass in < 10 seconds (fully offline, no API keys needed)
```

Test suite covers: classification (all 8 types), priority computation, geocoding, deduplication, pipeline integration, resource matching, SLA rules.

---

## 🌍 Environment Configuration

Copy `backend/.env.example` to `backend/.env`. All fields are optional:

```env
# LLM (optional — system works without these)
GROQ_API_KEY=gsk_...           # Groq Llama-3.3-70B (primary)
GEMINI_API_KEY=AIza...         # Google Gemini (fallback)

# Notifications (optional — mock-logged without these)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
SMTP_HOST=smtp.gmail.com

# Demo speed (optional)
SLA_TIME_SCALE=0.1             # 10× speed (P1 SLA = 12 seconds)
```

---

## 📚 Documentation

Full documentation package is available in the [`Docs/`](./Docs/) folder:

| Document | Description |
|---|---|
| [Project Overview](./Docs/01_Project_Overview/PROJECT_OVERVIEW.md) | Problem statement, value proposition, feature set |
| [System Architecture](./Docs/02_Architecture/SYSTEM_ARCHITECTURE.md) | Technical topology, pipeline flow, component diagram |
| [Backend Technical Reference](./Docs/03_Backend_Technical/BACKEND_TECHNICAL_REFERENCE.md) | Deep-dive into every service, algorithm, and design decision |
| [Frontend Technical Reference](./Docs/04_Frontend_Technical/FRONTEND_TECHNICAL_REFERENCE.md) | UI architecture, state management, components |
| [API Reference](./Docs/05_API_Reference/API_REFERENCE.md) | All 40+ REST endpoints and WebSocket events |
| [AI/ML Documentation](./Docs/06_AI_ML_Documentation/AI_ML_DOCUMENTATION.md) | LLM fallback chain, deduplication, scoring engine |
| [Data Models](./Docs/07_Data_Models/DATA_MODELS.md) | Database schema, ERD, JSON schemas |
| [Security & Resilience](./Docs/08_Security_And_Resilience/SECURITY_AND_RESILIENCE.md) | Fault tolerance patterns, honest security assessment |
| [Testing Documentation](./Docs/09_Testing/TESTING_DOCUMENTATION.md) | Test suite reference, all test cases, coverage |
| [Market Research](./Docs/10_Market_and_Research/MARKET_RESEARCH_AND_PROBLEM_VALIDATION.md) | Problem validation, competitive landscape |
| [Deployment Guide](./Docs/11_Deployment_and_Operations/DEPLOYMENT_GUIDE.md) | Setup, configuration, demo script |
| [Product Roadmap](./Docs/12_Roadmap/PRODUCT_ROADMAP.md) | Post-hackathon development phases |
| [PPT Context](./Docs/13_Presentation_Context/PPT_CONTEXT.md) | Complete presentation guide for judges |
| [Team](./Docs/14_Team/TEAM.md) | Team roles and development approach |

---

## 🎮 Demo Walkthrough (5 Minutes)

1. **Open** `http://localhost:5173` — dispatcher console with Vadodara map
2. **Analytics** tab — view 300 historic incidents heatmap, type distribution
3. **Simulator** → "Fast Forward" toggle (10× speed) → "Flood" button
4. Watch 9 reports auto-deduplicate into 1 P1 incident on map
5. Open incident drawer → "Approve All" → watch units move toward incident
6. SLA countdown → R1 alert fires → SMS notification to shift supervisor
7. **Simulator** → "Chemical Fire" → see HazMat shortage alert (R5)
8. **AI Brief** button → LLM-generated situation narrative

---

## 🏆 Technical Highlights

- **asyncio.Lock** prevents race conditions during deduplication under concurrent load
- **Circuit breaker** on LLM: 3 failures → 30s cooldown → auto-recovery
- **Zero-key guarantee**: ML + rule fallback ensures 100% uptime without API costs
- **Advisory-only AI**: No LLM output writes to DB without dispatcher approval
- **Immutable audit trail**: Every state change creates an `AuditEvent` record
- **Exponential backoff** on WebSocket reconnect: 1s → 2s → 4s → ... → 30s max

---

*Built for BitNBuild Hackathon | Problem Statement PS-9 | Team Just-Us-League*
