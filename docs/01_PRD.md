# PRD — ResQGrid: Intelligent Emergency Response & Resource Coordination Platform

## 1. Problem (PS-9)
In floods, fires, industrial accidents and major road incidents, information arrives from disconnected sources (calls, citizens, sensors, field teams, hospitals, departments). Authorities can't see one evolving picture, duplicates waste attention, and resources get assigned slowly or wrongly. Build a platform that **continuously collects incidents, identifies severity & location, recommends resources, and coordinates teams in real time.**

## 2. Goals / Non-goals
**Goals:** single real-time operating picture; automatic triage in <3 s per report; no duplicate flooding; explainable resource recommendations; proactive alerts on critical/delayed/escalation; useful analytics; a flawless 5-minute demo.
**Non-goals:** real telephony/voice AI, real auth/multi-tenant, production-grade GIS routing, real hospital integrations, mobile native apps.

## 3. Personas
| Persona | Needs | Surface |
|---|---|---|
| **Dispatcher / Control-room operator** (primary) | See all incidents, approve dispatch, handle alerts | `/console` |
| **Incident Commander / Authority** | Situation brief, escalations, analytics | `/console`, `/analytics` |
| **Field team (fire/ambulance/police/NDRF/utility)** | Get assignment, update status, send field report | `/team/:unitId` (mobile-first) |
| **Citizen** | Report quickly, see acknowledgement | `/report` |
| **Hospital** | Receive incoming-patient alert, update capacity | `/hospital/:id` (light) |
| **Demo operator (us)** | Trigger scenarios/sensors | `/simulator` |

## 4. Functional requirements (map 1:1 to PS deliverables)

### F1 Incident Collection (multi-source)
- Channels → unified `Report`: `citizen` (web form: text, optional photo URL, GPS/map-pick, phone), `call` (call-transcript form/simulated call log with caller number, transcript, optional location text), `sensor` (flood gauge, smoke/fire, gas, seismic/structural, traffic-collision; JSON payload with value+threshold), `field` (team report with status/observations), `hospital` (surge/capacity/incoming-patient notice), `department` (govt/agency advisory, e.g. IMD weather alert).
- Endpoint per source + generic `/api/ingest`. Each Report keeps raw payload, source, reliability weight (sensor .9, field .95, call .8, citizen .6, dept .9).
- **Simulator** generates continuous synthetic sensor/citizen/call feed and scripted scenarios (Flood, Chemical fire, Highway pile-up).
- Location: lat/lng if present; else geocode from text via local gazetteer (Vadodara landmarks/areas) + fuzzy match; else LLM extraction; else flag `location_uncertain`.

### F2 Classification (AI)
- Output: `type` ∈ {fire, flood, road_accident, medical, industrial_hazard, building_collapse, gas_leak, other}; `severity` 1–5; `priority` P1(critical)–P4; `confidence`; `reasoning`; `extracted` {people_affected, hazards[], location_text, needs[]}.
- Primary: LLM strict-JSON. Fallback: sklearn TF-IDF+LogReg (type) + rule/keyword + numeric-cue severity scoring. Priority derived deterministically: severity, people at risk, vulnerable factors, hazard escalators (chemical, spreading, trapped), corroboration count.
- Re-scored whenever new reports merge (severity can only escalate automatically; de-escalate needs human).

### F3 Duplicate detection & consolidation
- Candidate = active incident with compatible type (same or related, e.g. fire↔industrial_hazard), within radius (default 500 m, 1 km for flood), within time window (60 min). Score = 0.4·geo + 0.35·TF-IDF cosine text + 0.15·type + 0.10·time. ≥0.65 auto-merge; 0.45–0.65 "possible related" (shown to dispatcher w/ merge button); <0.45 new incident.
- Merged incident: `report_count`, source list, confidence up, latest description, unified timeline; evidence panel shows every linked report.
- Manual merge/split by dispatcher.

### F4 Resource recommendation
- Catalog: **teams** (fire crew, ambulance/EMS, police, rescue/NDRF, HazMat, utility/electricity, traffic), **vehicles** (fire engine, water tanker, ambulance, boat, rescue van, crane), **equipment** (pumps, breathing apparatus, cutters, life jackets, gas detectors, medical kits), **facilities** (hospitals w/ capabilities/beds, shelters, fire stations).
- Requirement templates per type × severity (e.g., flood sev4: 2 rescue boats, 1 rescue team, 1 ambulance, pumps, shelter; industrial fire sev5: 3 engines, HazMat, 2 ambulances, burn-capable hospital, police cordon).
- Matching: filter by capability & availability → score = 0.45·ETA(proximity, road-speed factor) + 0.25·capability fit + 0.15·readiness/fatigue + 0.15·load balance; return top-N per requirement with **score breakdown**, ETA, and **shortage flag** if requirement unmet (feeds analytics + escalation). Hospital pick uses capability match (trauma/burn/ICU beds) + distance + load (ported from Raahi).
- Dispatcher one-click "Approve all" / per-unit assign / override. Auto-dispatch mode toggle for P1 (with confirmation window).

### F5 Real-time monitoring dashboard
- Live map (Leaflet/OSM): incident markers by severity color/pulse, unit markers with status, facility layer, heatmap toggle, sensor layer, linked-report lines, assigned-unit routes (straight/OSRM-lite polyline).
- Incident queue sorted by priority+age, filters (type/severity/status/source), KPI strip (active, P1 count, avg response, units available, unmatched requirements).
- Incident detail drawer: summary, timeline, linked reports, recommended vs assigned resources, response status stepper, SLA countdown, AI panel, notification log.
- Status lifecycle: `new → triaged → dispatched → en_route → on_scene → contained → resolved` (+ `escalated` flag, `closed`). Unit lifecycle: `available → assigned → en_route → on_scene → returning → available/offline`.
- WebSocket push; connection banner; optimistic UI.

### F6 Alerts & escalation
- Types: **critical** (P1 created / severity escalated), **delayed_response** (no assignment by SLA; unit not en-route within X; ETA overrun >50%; no ack), **escalation_required** (resource shortage, sev≥4 with worsening reports, SLA breach twice, multi-incident regional surge), **sensor_threshold**, **duplicate_cluster** (many reports → likely wide-area event).
- SLA config (demo-compressed; minutes): P1 assign≤2, P2≤5, P3≤10, P4≤20; en-route ack ≤1×; arrival ≤ ETA×1.5.
- Escalation ladder: L0 dispatcher → L1 shift supervisor → L2 district authority/commander → L3 state/NDRF. Each level has recipients, auto-raised on repeated breach; acknowledge/resolve alerts.
- Background loop every 5–10 s evaluates rules; all alerts deduped by (incident, rule).

### F7 AI assistance
- Per-incident: 2-line **summary**, **situation timeline**, **recommended actions/SOP checklist for responders** (by type), **risks & unknowns**, **suggested questions to ask caller**, "why this priority/resources".
- Global: **Situation Brief** (last N min, top risks, where to reinforce), **shift handover** summary, natural-language **query box** ("which areas need more boats?") answered from live data context.
- Rules: LLM output labelled "AI-generated", cached, timeout+template fallback, never mutates state.

### F8 Analytics
- Emergency types (donut/bar), incidents over time, severity mix, **response delays** (report→assign→arrival; by type/priority; SLA compliance %), **resource shortages** (demand vs available per resource type, unmet requirements log), **frequently affected areas** (grid/ward heatmap + top-N table), source mix, duplicate-reduction stat (reports vs incidents), unit utilization. Seeded historical data (≈300 incidents over 90 days) so charts are rich at demo start. AI insight sentence per chart.

### F9 Notifications
- Events → recipients (role/unit/authority tiers) with channel routing: in-app toast+drawer (always), SMS (Twilio), email (SMTP), optional Telegram/webhook. Templates per event (new P1, assignment, status change, escalation, resolved). Retry once, failure never blocks flow; **Outbox UI** shows message, channel, status (sent/mock/failed). Field team receives assignment in `/team` view instantly. Citizen gets ack + tracking ID (`/track/:id`).

### F10 Simulator / demo control (needed for judging)
- Buttons: start/stop ambient feed, run scenario (Flood, Chemical fire, Pile-up), inject sensor breach, inject duplicate burst, fast-forward SLA, reset data. Field-unit movement simulator (units move along straight/OSRM path, status auto-advances) so the map is alive without real devices.

## 5. Scope tiers
- **P0 (must, ≈ first 10 h):** F1 (citizen/call/sensor/field), F2, F3, F4, F5, F6, F9 in-app+mock, simulator, seed data.
- **P1 (should):** F7 full, F8 full, real SMS/email, field-team view, citizen tracking page, hospital light view.
- **P2 (nice):** Situation-brief NL query, OSRM routing, shift handover, Telegram, dark mode, audit view, voice input (Web Speech API) for call form.

## 6. Non-functional
Latency: ingest→classified→on-screen ≤3 s (LLM) / ≤500 ms (fallback). Works offline of LLM. Handles 50 reports/min. Idempotent ingest (dedupe by source+external_id). Every decision explainable. Responsive (console desktop-first; team/report mobile-first). Seed+reset < 5 s.

## 7. Success metrics (for demo narrative)
Reports→incidents reduction (e.g., 40 → 9); time-to-triage <3 s; time-to-first-assignment; SLA compliance %; zero-shortage or flagged shortage with escalation; number of alerts auto-raised.

## 8. Demo script (5 min)
1. Dashboard idle with ambient feed + history → 2. Flood scenario: gauge breach + 6 citizen reports + 2 calls → auto classified, merged into 1 incident, P1 alert → 3. Resource recommendation w/ scores, approve → team phone view accepts, units move → 4. Delay injected → delayed-response alert → escalation L2 notified (SMS/outbox) → 5. Second incident (chemical fire) creates shortage of HazMat → escalation → 6. AI situation brief → 7. Analytics: types, delays, shortages, hotspots → close with architecture slide.

## 9. Risks & mitigations
LLM latency/quota → fallback classifier + cache. Map tiles offline → keep cached zone/graceful blank. Realtime bugs → WS reconnect + REST refetch. Scope creep → cut-line in plan. Empty demo → seed + simulator.
