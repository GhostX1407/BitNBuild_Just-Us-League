# ResQGrid — Project Overview

> **Intelligent Emergency Response & Resource Coordination Platform**
> Hackathon: BitNBuild — Problem Statement PS-9

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [Core Value Proposition](#4-core-value-proposition)
5. [Key Features](#5-key-features)
6. [Target Users & Personas](#6-target-users--personas)
7. [Technology Overview](#7-technology-overview)
8. [Operational Geography — Vadodara, Gujarat](#8-operational-geography--vadodara-gujarat)
9. [System Capabilities & Scope](#9-system-capabilities--scope)
10. [Demo-Readiness & Simulator](#10-demo-readiness--simulator)
11. [Design Principles](#11-design-principles)
12. [Non-Goals & Explicit Exclusions](#12-non-goals--explicit-exclusions)
13. [Success Metrics](#13-success-metrics)
14. [Project Team & Hackathon Context](#14-project-team--hackathon-context)
15. [Quick-Start Summary](#15-quick-start-summary)

---

## 1. Executive Summary

**ResQGrid** is a full-stack, production-architecture emergency response and resource coordination platform built for hackathon Problem Statement 9 (PS-9). It addresses a fundamental gap in disaster management: when floods, fires, industrial accidents, and major road incidents happen, emergency information arrives from multiple disconnected channels — citizen calls, web forms, IoT sensors, field teams, hospitals, and government agencies. No single platform unifies this chaos into a coherent, real-time operational picture.

ResQGrid solves this by providing:

- **Unified incident ingestion** from 6 distinct sources via a single AI-powered processing pipeline
- **Automatic incident classification** using a dual-path AI system (LLM primary + ML/rule fallback)
- **Intelligent deduplication** that merges reports from the same emergency into a single incident using geographic proximity, text similarity, and temporal correlation
- **Automated resource matching** that recommends the right responders, vehicles, and facilities for each incident using a weighted scoring engine
- **SLA monitoring with 8 alert rules** and a 4-tier escalation ladder (Dispatcher → Supervisor → District Commander → State Authority)
- **Real-time dashboard** for dispatchers with live map, incident queue, KPI strip, and AI-powered situation analysis
- **Full audit trail** with every decision logged and broadcast over WebSocket for complete accountability

The platform is designed for immediate demo-readiness with a built-in scenario simulator that runs scripted emergency events (flood, chemical fire, highway pileup) through the full system pipeline, proving end-to-end functionality within a 5-minute showcase window.

---

## 2. Problem Statement

### PS-9: Emergency Response Coordination

> *In floods, fires, industrial accidents and major road incidents, information arrives from disconnected sources (calls, citizens, sensors, field teams, hospitals, departments). Authorities can't see one evolving picture, duplicates waste attention, and resources get assigned slowly or wrongly.*

### The Real-World Gap

Emergency response suffers from several compounding failures:

#### 2.1 Information Fragmentation
Emergency information arrives through incompatible channels:
- Citizens call 100/101/108 with fragmented verbal descriptions
- Weather and flood sensors transmit machine-readable telemetry
- Field teams send radio/verbal updates
- Hospitals report bed capacity and incoming patient status separately
- Government agencies issue bulletins through official channels

None of these sources talk to each other automatically. Dispatchers must manually reconcile information from all channels simultaneously, a task that becomes impossible during multi-incident surges.

#### 2.2 Duplicate Report Flooding
When a major incident occurs (e.g., a building fire in a crowded area), 15-40 people may independently report the same event within minutes. Each duplicate report demands dispatcher attention, creating cognitive overload precisely when clarity is most critical. Without intelligent deduplication, dispatchers spend time triaging reports rather than coordinating responses.

#### 2.3 Slow Resource Assignment
Matching the right resources to an incident requires knowledge of:
- Current unit locations and availability
- Unit capabilities (HazMat certification, trauma capacity, etc.)
- Estimated travel time from current position
- Current fatigue level of crews
- Facility capacity (hospital bed availability, shelter space)

Without tooling, this matching happens through experience and phone calls — a process that takes minutes, not seconds, and is prone to error.

#### 2.4 No Unified Operational Picture
Incident commanders and dispatchers work from fragmented views — radio communications, spreadsheets, phone calls. There is no single screen showing: all active incidents, all deployed resources, SLA compliance status, escalation alerts, and resource shortage flags simultaneously.

#### 2.5 Poor Accountability
Post-incident analysis is hampered by lack of structured records. Questions like "When was the first assignment approved?" or "Why was this unit chosen over another?" often cannot be answered from existing records.

---

## 3. Solution Overview

ResQGrid addresses every dimension of PS-9 through an integrated pipeline architecture:

```
[Multi-Source Input] → [Unified Pipeline] → [Live Dashboard] → [Field Teams]
       ↓                      ↓                    ↓                ↓
  6 channels            AI+ML triage          WebSocket push    Mobile view
  citizen, call         geocode, classify      real-time map     assignment
  sensor, field         dedupe, priority       alerts, KPIs      status updates
  hospital, dept        recommend, SLA         AI brief          field reports
```

### 3.1 The Ingestion Pipeline

Every incoming report, regardless of source, enters the same 7-stage pipeline:

1. **Validate & Idempotency** — Reject malformed payloads; deduplicate by `(source, external_id)` to prevent double-processing
2. **Geocode** — Resolve GPS coordinates from explicit lat/lng, or extract from text using a local Vadodara gazetteer (60+ landmarks), fuzzy matching, or LLM extraction as a last resort
3. **Classify** — Determine incident type (8 categories), severity (1–5), and priority (P1–P4) using Groq Llama-3.3-70B with ML/rule fallback
4. **Deduplicate** — Score each active incident against the new report using a 4-factor weighted formula; merge, relate, or create new
5. **Priority Computation** — Deterministically recalculate priority based on severity, people at risk, hazards, corroboration count, and source diversity
6. **Resource Recommendation** — Match units, vehicles, and facilities to the incident requirements using a 4-factor proximity/capability/readiness/load scoring engine
7. **SLA Alert Evaluation** — Immediately check if the new/updated incident triggers any of 8 SLA rules; create alerts and notify

### 3.2 Real-Time Dashboard

The dispatcher console is a dark-themed, responsive command center with:

- **Left panel**: Incident queue sorted by priority (P1 first) with filters for type, status, source, and area
- **Center panel**: Live Leaflet map (OpenStreetMap tiles, Vadodara-centered) with incident markers (severity-colored, P1 pulsing), unit position markers, sensor state indicators, facility layer, and a heatmap overlay of incident hotspots
- **Right panel**: Active alerts with acknowledgment controls and escalation level chips
- **Top strip**: KPI bar showing active incidents, P1 count, average response time, unit availability, open alerts, and unmet requirements
- **Incident Drawer**: Full detail view with AI summary, SOP checklist, recommendation panel with score breakdowns, assignment status stepper, linked reports panel with merge/split controls, and a decision log accordion

---

## 4. Core Value Proposition

| Without ResQGrid | With ResQGrid |
|---|---|
| Dispatcher manually synthesizes 40 calls into 9 real incidents | Automatic deduplication: 40 reports → 9 incidents in real-time |
| Resource assignment takes 5-10 minutes of phone coordination | One-click "Approve All" dispatches optimally scored units in seconds |
| SLA breaches discovered after the fact | Active SLA monitoring with alerts at 5/10/15 minute escalation thresholds |
| Field teams notified by phone or radio | Instant SMS + in-app assignment notification with accept/reject |
| No visibility into escalation patterns | 4-tier escalation ladder with automatic level promotion |
| Post-incident analysis from memory | Complete audit trail with timestamps for every state change |
| AI assistance requires internet connectivity | Zero-key resilience: all AI features have deterministic fallbacks |

---

## 5. Key Features

### F1 — Multi-Source Incident Collection
ResQGrid accepts emergency reports from 6 distinct source channels, each with its own ingest endpoint and data contract:

- **Citizen** (`POST /api/ingest/citizen`): Free-text description, optional GPS coordinates, phone number, name, photo URL
- **Call** (`POST /api/ingest/call`): Simulated emergency call with caller phone, transcript text, optional location
- **Sensor** (`POST /api/ingest/sensor`): IoT sensor data (flood gauge, gas detector, smoke sensor, seismic, traffic) with value, threshold, and breach detection
- **Field** (`POST /api/ingest/field`): Field team updates with unit ID, incident reference, status, and observations
- **Hospital** (`POST /api/ingest/hospital`): Surge and capacity notifications from medical facilities
- **Department** (`POST /api/ingest/department`): Official agency advisories (IMD weather alerts, fire department bulletins)

Each source has a reliability weight used in confidence scoring:
- Sensor: 0.90
- Field team: 0.95
- Department: 0.90
- Emergency call: 0.80
- Citizen: 0.60

### F2 — AI-Powered Classification
The classification system determines the incident type, severity, and priority for every incoming report:

**Output schema:**
```json
{
  "type": "fire|flood|road_accident|medical|industrial_hazard|building_collapse|gas_leak|other",
  "severity": 1-5,
  "priority": "P1|P2|P3|P4",
  "confidence": 0.0-1.0,
  "reasoning": "explanation string",
  "extracted": {
    "people_affected": 0,
    "hazards": ["chemical", "trapped"],
    "location_text": "Makarpura GIDC",
    "needs": ["hazmat_team", "ambulance"]
  },
  "model": "llm|ml|rules"
}
```

**Priority logic:**
| Severity | Life Risk? | Priority | SLA |
|---|---|---|---|
| 5 | any | P1 | 2 min |
| 4 | yes | P1 | 2 min |
| 4 | no | P2 | 5 min |
| 3 | any | P3 | 10 min |
| ≤2 | any | P4 | 20 min |

A **corroboration bump** applies: ≥3 reports OR ≥2 distinct source types raises the priority one level (capped at P1).

### F3 — Intelligent Deduplication
The deduplication engine prevents duplicate reports from becoming separate incidents:

**Scoring formula:**
```
score = 0.40 × geo_score + 0.35 × text_score + 0.15 × type_score + 0.10 × time_score
```

- `geo_score`: Proximity score with radius 500m (default) or 1km (flood type); linear decay to 0 at boundary
- `text_score`: TF-IDF cosine similarity between new report text and incident corpus (existing report texts + summary); uses scikit-learn with bigrams
- `type_score`: 1.0 for exact type match; 0.5 for related pairs (fire↔industrial_hazard, fire↔gas_leak, road_accident↔medical); 0.0 otherwise
- `time_score`: Linear decay from 1.0 at creation to 0.0 at 60 minutes

**Decision thresholds:**
- Score ≥ 0.65 → **Merge** (automatic, transparent to dispatcher)
- Score 0.45–0.65 → **Related** (shown to dispatcher with one-click merge button)
- Score < 0.45 → **New incident**

**Proximity override:** If distance ≤ 200m and type compatibility ≥ 0.5 and location is certain, score is forced to ≥ 0.65 (guaranteed merge).

### F4 — Resource Recommendation Engine
The recommendation engine maps incident requirements to available resources:

**Requirement templates** are defined per `(incident_type, severity)` pair. Examples:
- Flood, severity 4: 2 rescue boats, 1 rescue team, 1 ambulance, pumps, shelter facility
- Industrial fire, severity 5: 3 fire engines, HazMat team, 2 burn-capable ambulances, hospital with toxicology, police cordon team

**Scoring formula:**
```
score = 0.45 × proximity + 0.25 × capability + 0.15 × readiness + 0.15 × load_balance
```

- `proximity`: Linear score from ETA (0 = too far, 1 = at incident)
- `capability`: Fraction of required capabilities present on the unit
- `readiness`: 1.0 − fatigue (0 = fully fatigued, 1 = fully rested)
- `load_balance`: Score based on how many concurrent assignments the unit has

When no unit meets a requirement, a `Shortage` record is created, triggering SLA alert Rule R5.

### F5 — Real-Time Monitoring Dashboard
The React + TypeScript command center provides dispatchers with:
- Live map with incident markers, unit positions, sensor states, facility overlays, and heatmap
- Incident queue with priority sorting and multi-dimensional filtering
- KPI strip: active/P1/avg-response/units-available/open-alerts/unmet-requirements
- Incident detail drawer with full timeline, decision log, and one-click approval workflow
- Alert panel with acknowledgment and escalation controls

All updates are pushed via WebSocket without polling. On reconnect, a full snapshot is fetched from `GET /api/snapshot`.

### F6 — SLA Monitoring & Escalation Ladder
The SLA monitoring loop runs every 5 seconds and evaluates 8 rules:

| Rule | Condition | Alert Kind |
|---|---|---|
| R0 | P1 incident or severity ≥ 5 created | critical |
| R1 | Incident unassigned beyond SLA due time | delayed |
| R2 | Assignment approved but not en-route within 2 min | delayed |
| R3 | ETA overrun by >50% | delayed |
| R4 | Active incident with severity ≥ 4 | escalation |
| R5 | Open resource shortage for incident | escalation |
| R6 | ≥2 sensor breaches within 2 km | sensor |
| R7 | ≥3 P1/P2 incidents in the same area | cluster |
| R8 | ≥5 reports merged (high-volume duplicate cluster) | cluster |

**Escalation ladder** promotes unacknowledged alerts through levels:
- L0: Dispatcher (0–5 min)
- L1: Shift Supervisor (5–10 min)
- L2: District Commander (10–15 min)
- L3: State Authority / NDRF (>15 min)

### F7 — AI Assistance
Three AI-powered assistance modes, all with fallback templates when LLM is unavailable:

- **Incident Summary**: 2-3 sentence AI-generated summary + timeline + risks + suggested questions for responders
- **SOP Checklist**: Type-specific standard operating procedure checklist generated by LLM or loaded from `sop.json`
- **Situation Brief**: Global operational picture with top risks and reinforcement recommendations (30-second TTL cache)
- **Natural Language Query**: Ask questions like "Which areas need more ambulances?" — answered from live incident data using LLM or keyword routing fallback

### F8 — Analytics Engine
Provides operational intelligence across multiple dimensions:

- **Overview KPIs**: Total incidents, total reports, deduplication ratio, average response time, SLA compliance %, open alerts, top incident type
- **Type Distribution**: Incident counts and percentages by emergency type
- **Response Delays**: Average assignment and arrival times by type and priority, with SLA compliance rates
- **Resource Shortages**: Demand vs. available vs. unmet count per resource subtype
- **Geographic Hotspots**: Ward-level incident density with lat/lng centroids and normalized weights
- **Time Series Trends**: Weekly incident counts over 90 days with P1 breakdowns
- **Source Mix**: Report channel distribution (citizen/call/sensor/field/hospital/department)

Analytics are populated by ~300 seeded historic incidents representing realistic Vadodara emergency patterns.

### F9 — Multi-Channel Notifications
Every critical event triggers notifications through:

- **In-App** (always enabled): WebSocket push to toast notification + notification drawer
- **SMS** (if Twilio credentials configured): Dispatched to role-appropriate recipient with 1 retry
- **Email** (if SMTP credentials configured): Sent via SMTP with proper subject/body templates

When external credentials are absent, notifications are logged with status "mock" — visible in the Outbox UI.

**Role-based routing** by alert level:
- L0: Dispatcher
- L1: Shift Supervisor
- L2: District Commander
- L3: State Authority

### F10 — Live Simulator & Demo Control
For judging/demo purposes, the simulator provides:

- **Ambient Feed**: Continuous low-severity citizen reports every 25–40 seconds (5 pre-scripted Vadodara scenarios)
- **Scripted Scenarios**: Flood (Vishwamitri river, 9 reports → 1 P1 incident), Chemical Fire (Makarpura GIDC, HazMat shortage + escalation), Highway Pileup (NH48, mass casualty event)
- **Demo Controls**: Start/stop ambient, inject sensor breach, inject duplicate burst (5 reports), fast-forward SLA time scale, reset system to seeded state
- **Unit Autopilot**: Approved assignments automatically advance through en_route → arrived → completed with simulated GPS movement

---

## 6. Target Users & Personas

### Primary: Dispatcher / Control-Room Operator
**Who**: Emergency Operations Center (EOC) staff managing incidents in real-time
**Needs**: 
- Single screen showing all active incidents sorted by criticality
- One-click resource approval without phone coordination
- Immediate visibility of SLA status and alerts
- Full incident detail with AI assistance for fast decision-making
**Surface**: `/console` (desktop-first, optimized for 1366×768+)

### Secondary: Incident Commander / Authority
**Who**: District or state-level officials overseeing major multi-incident situations
**Needs**:
- Situation brief summarizing active emergencies and risks
- Escalation notifications when situations exceed local capacity
- Analytics showing response performance and resource gaps
**Surface**: `/console`, `/analytics`

### Tertiary: Field Team (Fire/Ambulance/Police/NDRF/Utility)
**Who**: Emergency responders in the field
**Needs**:
- Assignment notification with incident details and SOP
- Simple status update interface (en-route, on-scene, completed)
- Field report submission with GPS location
**Surface**: `/team/:unitId` (mobile-first, optimized for 375px)

### Supporting: Citizen / Public
**Who**: Members of the public reporting emergencies
**Needs**:
- Simple, fast report form that works on mobile
- Confirmation with tracking ID to monitor response status
**Surface**: `/report`, `/track/:trackId`

### Supporting: Hospital Duty Officer
**Who**: Hospital emergency department staff managing patient intake
**Needs**:
- Incoming patient alerts from dispatch
- Bed capacity update interface
- Diversion status toggle
**Surface**: `/hospital/:id`

### Internal: Demo Operator / Hackathon Judge
**Who**: ResQGrid team member driving the demo
**Needs**:
- Trigger scripted scenarios with a single button press
- Control ambient feed, fast-forward SLA, reset system
**Surface**: `/simulator`

---

## 7. Technology Overview

### Backend Stack

| Component | Technology | Rationale |
|---|---|---|
| Web Framework | FastAPI (Python 3.11+) | Async-native, auto-generated OpenAPI docs, excellent typing |
| Database | SQLite + aiosqlite | Zero setup, async-compatible, easily swappable to Postgres |
| ORM | SQLAlchemy 2 (async) | Industry-standard, declarative, async session management |
| Validation | Pydantic v2 | Fast, strict JSON schema validation for all API bodies |
| WebSocket | FastAPI WebSocket | Built-in, same process as REST — no separate WS server |
| Background Tasks | asyncio tasks | No Celery/Redis needed; SLA loop (5s), unit mover (2s), ambient feed |
| ML | scikit-learn | Offline TF-IDF + LogisticRegression classifier and TF-IDF cosine dedupe |
| LLM (primary) | Groq Llama-3.3-70B | Fast inference, structured JSON output, generous free tier |
| LLM (fallback) | Google Gemini 2.0 Flash | Secondary provider with circuit breaking |
| HTTP Client | httpx | Async HTTP for Twilio SMS API calls |

### Frontend Stack

| Component | Technology | Rationale |
|---|---|---|
| Framework | React 18 + Vite | Fast HMR, TypeScript-first, production-grade bundling |
| Language | TypeScript | Full type safety for complex domain objects |
| Styling | Tailwind CSS 3 | Rapid development with design tokens |
| State Management | Zustand | Lightweight, composable stores; perfect for WebSocket event application |
| Maps | React-Leaflet + Leaflet | Open-source, offline-capable with OSM tiles |
| Charts | Recharts | React-native chart components with responsive containers |
| Icons | Lucide React | Consistent SVG icon set |
| Routing | react-router-dom v6 | File-based routing with nested layouts |
| Animation | Framer Motion | Professional motion library for smooth transitions |

---

## 8. Operational Geography — Vadodara, Gujarat

The platform is built for Vadodara (also known as Baroda), the third-largest city in Gujarat, India. The system uses a synthetic but realistic dataset that includes:

### Emergency Infrastructure
- **14 hospitals** with capabilities: trauma, burn, ICU, pediatric, toxicology
- **8 fire stations** distributed across the city
- **6 police stations** covering major areas
- **5 emergency shelters** for flood and disaster evacuations
- **40+ response units**: fire engines, water tankers, ambulances, boats, rescue teams, HazMat teams, cranes, traffic management units

### Sensor Network
- **25 IoT sensors** including:
  - Vishwamitri river flood gauges (breach threshold: 8.0m)
  - Makarpura GIDC industrial belt gas and smoke detectors
  - NH48 bypass traffic collision sensors
  - Structural sensors for major buildings

### Key Incident Hotspot Areas (from seed data patterns)
- **Vishwamitri Riverside**: Flood-prone area; seasonal inundation events
- **Makarpura GIDC**: Industrial zone with chemical fire history
- **NH48 Bypass (Vadodara–Mumbai National Highway)**: High-traffic road accident corridor
- **Old City (Panigate, Karelibaug)**: Dense residential area with infrastructure incidents
- **Alkapuri / RC Dutt Road**: Commercial/residential mix
- **Sayajibaug area**: Central district with public gathering events

### Geographic Configuration
- City center: lat 22.3072, lng 73.1812
- Coordinate system: WGS84 decimal degrees
- All distances in kilometres (Haversine formula)
- All ETAs in minutes (distance / unit speed × 60)
- Default city fallback: lat 22.30, lng 73.19

---

## 9. System Capabilities & Scope

### In Scope (Implemented)
- ✅ Multi-source incident ingestion (citizen/call/sensor/field/hospital/department)
- ✅ AI classification with LLM primary + ML/rule fallback
- ✅ 4-factor deduplication engine
- ✅ Deterministic priority computation with corroboration bumping
- ✅ Resource requirement templates per type×severity
- ✅ 4-factor resource matching with score breakdowns
- ✅ Shortage detection and reporting
- ✅ Real-time WebSocket event bus
- ✅ Incident lifecycle management (8 statuses)
- ✅ Assignment lifecycle (7 statuses)
- ✅ SLA monitoring with 8 alert rules
- ✅ 4-tier escalation ladder
- ✅ Multi-channel notifications (in-app, SMS mock/real, email mock/real)
- ✅ AI incident summary, SOP, global brief, NL query
- ✅ Analytics dashboard with 7 data dimensions
- ✅ Live unit position simulation (GPS movement)
- ✅ 3 scripted demo scenarios
- ✅ System reset and fast-forward controls
- ✅ Full audit trail
- ✅ Manual incident merge/split
- ✅ Human override for severity, type, status
- ✅ Public tracking page
- ✅ Hospital view
- ✅ Field team mobile view
- ✅ Decision log explainability on every incident

### Explicit Non-Goals
- ❌ Real telephony or voice AI (PSTN integration)
- ❌ Production authentication or multi-tenancy
- ❌ Real GIS routing (OSRM, Google Maps Directions API)
- ❌ Real hospital EMR integration
- ❌ Native mobile apps (iOS/Android)
- ❌ Multi-city deployment configuration
- ❌ Data encryption at rest
- ❌ Role-based access control (RBAC)
- ❌ Payment processing or financial integrations

---

## 10. Demo-Readiness & Simulator

ResQGrid is designed to provide a compelling 5-minute hackathon demonstration:

### Pre-Demo State
On first startup, the seed script populates the database with:
- ~300 historic incidents (90 days, realistic type/area distribution for Vadodara)
- All 40+ response units at their starting positions
- All 14+ hospitals with realistic bed counts
- All sensors in "ok" state
- Pre-trained ML classifier

The dashboard immediately shows rich analytics even before a single demo action.

### 5-Minute Demo Script
1. **Dashboard Overview** (30s): Show KPI strip, map with historic hotspots on heatmap, incident queue with seeded data. Enable ambient feed.
2. **Flood Scenario** (90s): Trigger `POST /api/sim/scenario/flood`. Watch: sensor breach → 6 citizen reports → 2 calls → all deduplicated into 1 P1 flood incident → alert fires → recommendation panel shows rescue boats + teams → "Approve All" → units begin moving on map → SLA countdown visible.
3. **Delay & Escalation** (60s): Wait for R2 alert (unit approved but not en-route within 2min×scale). Alert fires, escalation level advances. Notification outbox shows SMS sent to shift supervisor.
4. **Chemical Fire Scenario** (60s): Trigger `chemical_fire`. HazMat shortage fires → R5 alert → shortage panel shows "2 HazMat units required, 0 available" → escalation to district commander.
5. **AI Brief** (30s): Open Situation Brief. See AI-generated narrative covering both active incidents. Ask NL query: "How many people are affected?" — LLM answers from live context.
6. **Analytics** (30s): Switch to `/analytics`. Show response delay chart (types/priorities), shortage bars (HazMat demand > available), hotspot heatmap with Vishwamitri and Makarpura highlighted.

### Fast-Forward
Use `POST /api/sim/fast-forward` with `{"scale": 0.1}` to reduce SLA times to 10% of real values, making escalation ladders trigger within seconds for demo purposes.

---

## 11. Design Principles

### 1. Zero-Key Resilience
Every external service has a deterministic fallback:
- No LLM key → ML classifier → rule-based fallback
- No Twilio → mock SMS logged to outbox
- No SMTP → mock email logged to outbox
- No geocode → gazetteer → fuzzy match → city-center default

The platform **never throws an unhandled error** due to missing API keys.

### 2. Deterministic Authority
AI systems are advisory only. They:
- Propose recommendations (classifications, resource matches, summaries)
- Never write to database without dispatcher approval or deterministic rule execution
- Are always labeled "AI-generated" in the UI
- Have their reasoning stored in `decision_log` for auditability

### 3. Full Auditability
Every state change produces an immutable `AuditEvent` record containing:
- Actor (dispatcher/system/field_team)
- Action (incident.created, assignment.approved, incident.overridden, etc.)
- Entity type and ID
- Full data payload of the change
- UTC timestamp

All audit events are also broadcast as WebSocket messages.

### 4. Standardized Data Formats
- IDs: UUID4 strings
- Timestamps: UTC ISO-8601 (with timezone)
- Distances: kilometres
- Scores: 0.0–1.0 normalized

### 5. Decision Explainability
Every classification result includes a `reasoning` field. Every resource match returns a `score_breakdown` with individual sub-scores. Every incident has a `decision_log` array documenting every pipeline stage decision. No "black box" outputs.

---

## 12. Non-Goals & Explicit Exclusions

The following were intentionally excluded to keep the system focused on the hackathon deliverable:

| Area | Excluded Feature | Rationale |
|---|---|---|
| Auth | User login, passwords, JWT tokens | Multi-tenant auth adds significant complexity without hackathon value |
| Routing | Turn-by-turn navigation, OSRM | Haversine straight-line ETA is sufficient for resource matching |
| Voice | PSTN integration, real IVR | Simulated call transcripts cover the use case |
| Mobile | iOS/Android native apps | Progressive web app on mobile browser covers the demo |
| Scale | Kubernetes, Redis, distributed DB | SQLite + async FastAPI handles the demo scale comfortably |
| Security | API key management, RBAC, encryption at rest | Out of scope for a 24-48 hour hackathon sprint |
| Billing | Payment gateways, resource cost tracking | Not relevant to emergency response |

---

## 13. Success Metrics

The PRD defines the following quantitative success metrics for the demo:

| Metric | Target | How Measured |
|---|---|---|
| Deduplication efficiency | 40 reports → ~9 incidents (≥75% reduction) | Analytics `dedupe_ratio` |
| Time-to-triage | < 3 seconds per report | Measured from ingest to `incident.upsert` WebSocket event |
| Time-to-first-assignment | < 5 seconds for P1 (post-approval) | `first_assigned_at - triaged_at` |
| SLA compliance rate | > 80% for seeded historic data | Analytics `sla_compliance_pct` |
| Alert generation | R0 alert fires within 2 seconds of P1 creation | SLA evaluation time |
| Zero-key operation | Full functionality without any API keys | Tested in local dev without .env |

---

## 14. Project Team & Hackathon Context

**Team Name**: Just-Us-League
**Event**: BitNBuild Hackathon
**Problem Statement**: PS-9 — Emergency Response Coordination Platform

The codebase follows a split-ownership architecture defined in `PROMPT_FE.md`:
- **BE1**: Core pipeline (classify, dedupe, geocode, priority), API endpoints for ingestion and incidents, LLM client, database session, models
- **BE2**: Resource matching, dispatch, SLA, simulator, analytics, notification router, WebSocket, seed data
- **FE**: Full React/TypeScript frontend

All three components were developed in parallel against a **frozen contract** defined in `PROMPT_FE.md` to enable simultaneous development without merge conflicts.

---

## 15. Quick-Start Summary

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
# Auto-seeds database on first run
# API available at http://localhost:8000
# OpenAPI docs at http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Proxies /api and /ws to localhost:8000
# UI available at http://localhost:5173
```

### One-command startup (Windows)
```bat
run.bat
```

### One-command startup (Linux/Mac)
```bash
./run.sh
```

### Environment Variables (all optional — system works without any)
```env
GROQ_API_KEY=           # LLM classification (llama-3.3-70b)
GEMINI_API_KEY=         # LLM fallback (gemini-2.0-flash)
TWILIO_ACCOUNT_SID=     # Real SMS dispatch
SMTP_HOST=              # Real email notifications
SLA_TIME_SCALE=0.2      # Speed up SLA timers for demo
```

Without any API keys, the system operates fully in mock/fallback mode with all features functional.

---

*This document is part of the ResQGrid documentation package. For detailed technical documentation, see the other files in the `Docs/` directory.*
