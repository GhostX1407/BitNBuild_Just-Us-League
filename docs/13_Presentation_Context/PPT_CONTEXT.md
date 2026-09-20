# ResQGrid — PPT Context Document

> **Single Source of Truth for Presentation Generation**
> For judges, presenters, and AI slide generation tools.
> DO NOT add Mermaid diagrams to this document — use plain text and tables only.

---

## SECTION 1: PROJECT IDENTITY

**Project Name:** ResQGrid

**Tagline:** Intelligent Emergency Response and Resource Coordination Platform

**Team Name:** Just-Us-League

**Hackathon:** BitNBuild

**Problem Statement:** PS-9 — Emergency Response Coordination Platform

**One-liner:** ResQGrid unifies fragmented emergency information from 6 sources, uses AI to classify and deduplicate incidents in real-time, and recommends the right responders — cutting time-to-dispatch from minutes to seconds.

**Three-word summary:** Connect. Classify. Coordinate.

---

## SECTION 2: THE PROBLEM (What We Solve)

### The Real Scenario

When a flood hits Vadodara at 3 AM:
- A citizen calls 100. A sensor at Vishwamitri Bridge breaches. A driver tweets. Five families knock on a station door. A hospital texts about incoming patients.
- The dispatcher gets all of this at once, from different places.
- They have to manually figure out: Is this one event or five? Where exactly? What resources are needed? Which units are free?
- Meanwhile, the water is rising.

### The Three Failures ResQGrid Solves

1. **Information Fragmentation**: No single platform unifies reports from citizens, call centers, IoT sensors, field teams, hospitals, and government agencies.

2. **Deduplication Overload**: One major fire generates 30-50 reports from different sources. Each demands dispatcher attention. Without automation, operators are overwhelmed.

3. **Slow Resource Assignment**: Identifying the right resources requires knowing current unit locations, capabilities, fatigue levels, and estimated travel times — data that is impossible to hold in a dispatcher's head during a surge.

### The Impact of These Failures

- Average time to first unit dispatch: 8-15 minutes (India average) vs. 2-3 minutes (best practice)
- Resource misallocation in disaster scenarios: 35-40% of dispatches are suboptimal
- SLA compliance in major Indian cities: 40-60% (vs. 90%+ international standard)
- Post-incident analysis: Impossible without structured records — no audit trail

---

## SECTION 3: THE SOLUTION (What ResQGrid Does)

### Core Concept

ResQGrid is a command center platform for Emergency Operations Centers that:
1. Ingests reports from 6 different channels through a single unified API
2. Uses AI + ML to classify, geolocate, and deduplicate all incoming reports automatically
3. Recommends the optimal resource assignment using a scoring algorithm
4. Monitors SLA compliance and escalates alerts automatically
5. Gives dispatchers a single-screen command center to manage everything

### How It Works (5 Steps)

STEP 1 — INGEST: Reports arrive from citizens (form/call), sensors (IoT), field teams, hospitals, and government agencies. All routed to a single pipeline.

STEP 2 — CLASSIFY: AI determines the emergency type (8 categories), severity (1-5 scale), and priority (P1-P4). LLM primary, ML fallback, rule engine as safety net.

STEP 3 — DEDUPLICATE: A weighted scoring algorithm (geography 40%, text similarity 35%, type match 15%, recency 10%) determines if the report is part of an existing incident. 40 reports can become 9 incidents automatically.

STEP 4 — MATCH RESOURCES: The recommendation engine maps incident requirements to available units using a 4-factor score (proximity 45%, capability 25%, readiness 15%, load 15%). Dispatcher sees ranked options with ETAs.

STEP 5 — COORDINATE: Dispatcher approves with one click. Units receive SMS + in-app notification. SLA countdown starts. If units are delayed, automated alerts escalate through 4 levels: Dispatcher → Supervisor → District Commander → State Authority.

---

## SECTION 4: KEY DIFFERENTIATORS

### What Makes ResQGrid Different From Existing Systems

DIFFERENTIATOR 1 — MULTI-SOURCE UNIFICATION
No existing Indian municipal system unifies citizen, call center, IoT sensor, field team, hospital, and government agency inputs in one pipeline. ResQGrid handles all 6 simultaneously.

DIFFERENTIATOR 2 — AI-POWERED DEDUPLICATION
Current systems require manual deduplication. ResQGrid uses TF-IDF cosine similarity + geographic proximity to automatically merge duplicate reports, with configurable thresholds. A 40-report flood event becomes 1 incident record.

DIFFERENTIATOR 3 — ALGORITHMIC RESOURCE MATCHING WITH SCORES
Unlike phone-based dispatch, ResQGrid shows dispatchers a ranked list of units with score breakdowns (proximity/capability/readiness/load) and real-time ETA. No guesswork.

DIFFERENTIATOR 4 — AUTOMATED SLA ESCALATION LADDER
8 alert rules evaluate every active incident every 5 seconds. Alerts auto-escalate through 4 tiers without human memory dependence. Every level is notified via in-app + SMS.

DIFFERENTIATOR 5 — ZERO-KEY OPERATION
ALL features work without any external API keys. LLM → ML classifier → keyword rules. SMS → mock log. Email → mock log. This means the platform works regardless of budget or API availability.

DIFFERENTIATOR 6 — DECISION EXPLAINABILITY
Every automated decision is logged. The incident drawer shows: why this priority was assigned, what the dedupe score was, which unit scored highest and why. No black boxes.

---

## SECTION 5: THE TECHNOLOGY (How We Built It)

### Backend Technology

Language: Python 3.11
Web Framework: FastAPI (async, auto-generates OpenAPI docs)
Database: SQLite + SQLAlchemy 2.0 (async)
AI — Classification: Groq API (Llama-3.3-70B) with Gemini 2.0 Flash fallback
AI — Deduplication: scikit-learn TF-IDF cosine similarity (offline, local)
AI — Classifier Fallback: scikit-learn TF-IDF + Logistic Regression (trained at startup)
Real-Time Events: FastAPI WebSocket + in-process EventBus
Background Tasks: Python asyncio tasks (SLA loop every 5 seconds, unit mover every 2 seconds)
Notifications: Twilio (SMS), SMTP (Email), WebSocket (in-app)

### Frontend Technology

Framework: React 18 + TypeScript + Vite
Maps: React-Leaflet + OpenStreetMap tiles (offline-capable)
State Management: Zustand (stores applied idempotently from WebSocket events)
Charts: Recharts
Styling: Tailwind CSS
Icons: Lucide React

### AI Architecture Summary

Layer 1 (Primary): Groq Llama-3.3-70B — 200-800ms, structured JSON output
Layer 2 (Fallback): Google Gemini 2.0 Flash — activates if Groq circuit breaker trips
Layer 3 (Local ML): scikit-learn Logistic Regression — offline, trained on 1,200 labeled examples
Layer 4 (Rules): Keyword + sensor type mapping — always returns valid result, never fails

The system guarantees: Classification always returns a valid result. Never a crash. Never "service unavailable."

---

## SECTION 6: THE NUMBERS (What We Built)

### Feature Count

- Incident sources: 6 (citizen, call, sensor, field, hospital, department)
- Emergency types handled: 8 (fire, flood, road_accident, medical, industrial_hazard, building_collapse, gas_leak, other)
- SLA alert rules: 8 (R0-R7)
- Escalation levels: 4 (dispatcher → supervisor → district commander → state authority)
- Notification channels: 3 (in-app WebSocket, SMS, email)
- API endpoints: 40+ REST + 1 WebSocket
- Frontend pages: 7 (Console, Analytics, Report, Team, Track, Hospital, Simulator)
- Response unit types seeded: 10 (engine, tanker, ambulance, boat, rescue, hazmat, police, utility, traffic, crane)
- Total units seeded: 44
- Hospitals seeded: 14
- Sensors seeded: 25
- Historic incidents seeded: ~300 (90-day history)
- ML training examples: ~1,200 (8 types × ~150 each)

### Deduplication Performance

Target: 40 reports → ~9 distinct incidents (≥75% reduction)
Formula: 0.40×geo + 0.35×text + 0.15×type + 0.10×time
Merge threshold: ≥0.65 (automatic)
Relate threshold: ≥0.45 (shown to dispatcher for review)
Proximity override: 200m + compatible type → forced merge

### Response Time Targets

Full pipeline with LLM: < 3 seconds
Full pipeline with ML fallback: < 500 milliseconds
SLA evaluation loop: every 5 seconds
WebSocket event delivery: < 100 milliseconds
Snapshot API: < 500 milliseconds

---

## SECTION 7: THE DEMO (5-Minute Judge Walkthrough)

### Minute 1 — Dashboard & Live Data
Open the Dispatcher Console. Point to:
- Map of Vadodara with 300 historic incidents as heatmap hotspots
- KPI strip: active incidents, P1 count, unit availability
- Analytics page: type distribution donut, response delay chart

Key message: "This is what a real EOC would see. Rich data from day one."

### Minute 2 — Flood Scenario
Hit "Flood" on Simulator page.
Watch:
- Vishwamitri sensor breach → orange sensor marker on map
- 9 reports arrive (6 citizen + 2 call + 1 field) → all deduplicate into 1 P1 flood incident
- Incident code INC-00XX appears on map (red, pulsing)

Say: "40 calls, 1 incident. Dispatcher never sees duplicates."

Open the incident drawer:
- 9 merged reports visible
- AI summary auto-generated
- Recommendation panel showing rescue boats ranked by score
- Click "Approve All"

Watch units start moving on the map.

### Minute 3 — SLA Escalation
Wait for R2 alert (unit approved but not en-route within 2 minutes × scale).
Alert fires in the Alerts Panel. Show escalation chip (Level 1).
Click notification bell: SMS to "Shift Supervisor" appears in outbox.

Say: "No one has to remember to call the supervisor. The system does it."

Show decision_log accordion: "Priority: P3 → P2 due to 3 reports corroboration. P2 → P1 due to sensor source."

### Minute 4 — Chemical Fire + Shortage
Hit "Chemical Fire" on Simulator.
Open new incident. Show:
- Shortage panel: "2 HazMat teams required, 0 available"
- R5 alert fires (resource shortage)
- Escalation to Level 2 (District Commander notification)

Say: "The system doesn't just dispatch. It tells you when it can't."

Click "AI Brief" button. Show LLM-generated situation narrative covering both active incidents.

### Minute 5 — Analytics & Wrap
Switch to Analytics page. Show:
- Response delay by type/priority
- Shortage demand bar chart (HazMat shows demand > available)
- Hotspot heatmap (Vishwamitri + Makarpura highlighted)

Type NL query: "How many people are affected right now?"
Show AI answer.

Final message: "ResQGrid turns chaos into clarity. One screen. Every source. Every resource. Every escalation. All automated."

---

## SECTION 8: PROBLEM-SOLUTION FIT (For Judges)

### The PS-9 Requirements Mapped to ResQGrid Features

PS-9 requirement: "Information arrives from disconnected sources"
ResQGrid answer: 6 unified ingest endpoints (citizen/call/sensor/field/hospital/department), single pipeline

PS-9 requirement: "Authorities can't see one evolving picture"
ResQGrid answer: Real-time dispatcher console with live map, incident queue, KPI strip — all updated via WebSocket in < 100ms

PS-9 requirement: "Duplicates waste attention"
ResQGrid answer: TF-IDF + geographic deduplication reduces 40 reports to 9 incidents automatically

PS-9 requirement: "Resources get assigned slowly or wrongly"
ResQGrid answer: 4-factor algorithmic resource matching with ETAs and score breakdowns; one-click approval

### What Judges Should Look For

Technical Depth: AI classification with 3-tier fallback, TF-IDF cosine similarity, 4-factor scoring, asyncio concurrency, SLA loop, circuit breaker
Real-World Grounding: Vadodara geography (real landmarks), realistic unit roster, authentic incident types and patterns
Production Architecture: Not just a prototype — FastAPI async design, explainability, audit trail, WebSocket, fallback patterns
Demo Impact: Scripted scenarios run through the complete system in real-time during the demo

---

## SECTION 9: TEAM & ACKNOWLEDGMENTS

Team: Just-Us-League
Event: BitNBuild Hackathon
Problem: PS-9

Built using:
- Groq (Llama-3.3-70B) for AI classification — fast and free tier available
- Google Gemini 2.0 Flash as LLM fallback
- OpenStreetMap tiles for offline-capable mapping
- scikit-learn for local ML (no external API needed)
- FastAPI for the async backend
- React + TypeScript for the frontend
- All open source libraries

---

## SECTION 10: SLIDE STRUCTURE SUGGESTION

For a 7-10 minute pitch with slide deck, suggested structure:

Slide 1 — TITLE: "ResQGrid: Intelligent Emergency Response Coordination"
Sub: Just-Us-League | BitNBuild | PS-9

Slide 2 — THE PROBLEM (3 bullets):
- Fragmented information: 6 disconnected channels
- Duplicate overload: 40 reports, 9 real incidents — all manual today
- Slow dispatch: 8-15 minutes average in India vs. 2-3 minute best practice

Slide 3 — THE COST:
- SLA compliance: 40-60% (India) vs. 90%+ (international standard)
- Resource misallocation: 35% of dispatches suboptimal during surges
- Post-incident analysis: impossible without structured records

Slide 4 — OUR SOLUTION: ResQGrid (with system diagram or live screenshot)
One-liner + 5-step flow

Slide 5 — AI/ML DEEP DIVE:
- 3-tier classification: LLM → ML → Rules
- TF-IDF deduplication formula
- 4-factor resource scoring
- Zero-key guarantee

Slide 6 — THE LIVE DEMO (screenshot + key metrics):
- 9 reports deduplicated to 1 incident in < 3 seconds
- Rescue boats dispatched in 1 click
- SLA alert fires in 12 seconds (demo mode)

Slide 7 — TECH STACK (table: Backend / Frontend / AI / Infrastructure)

Slide 8 — WHAT MAKES US DIFFERENT:
- Multi-source unified ingest
- Algorithmic deduplication (not manual)
- Scoring-based matching with explanations
- Automated escalation ladder
- Zero external key dependency

Slide 9 — ROADMAP: 4 phases (Hardening → MVP → Intelligence → Platform)

Slide 10 — IMPACT & VISION:
- Vadodara pilot target
- 65-75% reduction in time-to-dispatch
- 100% automated deduplication
- "Save lives through coordination"

Slide 11 — TEAM & CLOSE
Just-Us-League | Thank you | Live demo available

---

*This PPT Context document is designed to be the single source of truth for any presentation, slide deck, or pitch material generated for ResQGrid at BitNBuild.*
