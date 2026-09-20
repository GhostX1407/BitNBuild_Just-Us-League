# ROLE: FRONTEND (FE)

## OWNED FILES
Everything under `frontend/` (you may create any new files/folders there). NOTHING outside `frontend/` — never touch `backend/`, `docs/`, root files. Backend needs a change? Write it in `frontend/CONTRACT_NOTES.md` (yours) and in your final message as "REQUEST TO BE1/BE2". Never edit the frozen contract; adapt defensively (optional chaining, defaults for missing fields).

## STACK (fill the empty config files)
React 18 + Vite + TypeScript + Tailwind 3 + react-router-dom 6 + Zustand + react-leaflet 4 + leaflet + leaflet.heat + recharts + lucide-react + clsx. `vite.config.ts`: dev proxy `/api` → `http://localhost:8000` (with `ws: true`, so WebSocket `/api/ws` works). Frontend calls `/api/...` and WebSocket `${location.origin→ws}/api/ws`. `.env.example`: `VITE_USE_MOCK=false`.

## MOCK MODE (so you never wait for backend)
Create `src/services/mock.ts`: realistic in-memory data matching the contract shapes (Snapshot with ~8 incidents across types/priorities incl. merged one with 4 reports and one with shortage, ~25 units, ~10 facilities, ~8 sensors, alerts, notifications, analytics payloads, AI payloads) and a fake event emitter that periodically fires `incident.upsert`, `unit.update` (moving units), `alert.new`. `api.ts` and `ws.ts` switch to mock when `VITE_USE_MOCK=true` OR when the backend is unreachable at boot (show a small "Demo data" badge). Real mode must be a drop-in swap.

## DATA LAYER
`types/domain.ts` (all contract shapes), `services/api.ts` (typed fetch wrappers for every REST endpoint), `services/ws.ts` + `hooks/useWebSocket.ts` (auto-reconnect w/ backoff, on reconnect refetch snapshot), `hooks/useSnapshot.ts` (bootstrap GET /snapshot into stores), Zustand stores `incidents, units, alerts, notifications, ui` applying WS events (`incident.upsert`, `report.new`, `unit.update`, `sensor.update`, `alert.new|ack|resolved`, `notification.new`, `kpi.update`, `sim.state`) idempotently. `utils/format.ts, geo.ts, time.ts` (relative time, countdown from `sla_due_at`, severity/priority colours, type icons).

## ROUTES (`app/routes.tsx`, `app/App.tsx`, `main.tsx`)
`/` → redirect `/console` · `/console` · `/analytics` · `/report` (public citizen) · `/team/:unitId` (mobile-first) · `/track/:trackId` (public) · `/hospital/:id` (light) · `/simulator`. Header with `RoleSwitcher` (Dispatcher / Field Team / Public), nav, `ConnectionBanner` (live/reconnecting), notification bell → `NotificationDrawer` (in-app feed + outbox status chips sent/mock/failed), Toast for new critical alerts (with sound optional).

## PAGES & COMPONENTS (fill the existing empty files; names in `src/pages` and `src/components/*`)
1. **Console** (main, desktop-first): 3 zones — left `IncidentQueue` (sorted P1→P4 then age; filters type/priority/status/source; search), centre `LiveMap` (Leaflet + OSM tiles, centred on Vadodara 22.3072,73.1812; `IncidentMarker` colour/pulse by priority & type icon; `UnitMarker` by status; `FacilityLayer`; `SensorLayer` (ok/warn/breach); `HeatLayer` toggle from hotspot data; layer toggles; dashed lines from incident to assigned units; click selects incident), right `AlertsPanel` (open alerts, ack/escalate buttons, escalation level chips) — top `KpiStrip` (active, P1, avg response, units available/total, open alerts, unmet requirements) + `AlertBanner` for critical.
2. **IncidentDrawer** (slide-over/right panel): header (code, type, priority badge, severity, confidence, escalated flag), `SlaCountdown`, `StatusStepper` (new→…→resolved), AI summary (`AiSummaryPanel`: call summary + SOP checklist with tick boxes, "AI-generated" label, loading skeletons), `LinkedReports` (each source icon, reliability, text, time; "possible related incidents" with `MergeDialog` to merge, split action per report), `RecommendationPanel` (per requirement: matches with `ScoreBreakdown` bars proximity/capability/readiness/load, ETA, shortage warning in red) + buttons **Approve all / approve selected / Re-plan**, `AssignmentList` with live statuses, decision_log accordion ("why this priority"), notifications for the incident, manual override (severity/type) with confirm.
3. **Situation Brief** (`SituationBrief` on console, collapsible top-right): button "Generate brief" → POST /ai/brief; `AskBox`: natural-language question → POST /ai/query, shows answer.
4. **Analytics** page: overview cards; `TypeChart` (donut), `TimeSeriesChart` (line, total vs P1), `DelayChart` (grouped bars by type + SLA % by priority), `ShortageChart` (demand vs available), `HotspotTable` + heat map, sources bar; loading/empty/error states.
5. **Report** (public, mobile-first): big simple form (what happened, map-pick or "use my location", phone, optional photo URL), submit → POST /ingest/citizen → success card with tracking ID + link to `/track/:id`. Also a "Call log" tab (simulated emergency call: caller phone + transcript, optional browser Web Speech API mic button) → POST /ingest/call.
6. **Team** (`/team/:unitId`, mobile): unit status card, current assignment(s) with Accept/Reject, status buttons (En route → On scene → Completed) → POST /assignments/{id}/status, big field-report box (text + status) → POST /ingest/field, incident details + SOP checklist, live map with own position.
7. **Track**: public status timeline from GET /track/{id} (polling every 5 s + WS not needed).
8. **Hospital** (`/hospital/:id`): incoming patient alerts (from notifications/incidents with medical needs), beds_free stepper → PATCH /facilities/{id}, diversion toggle.
9. **Simulator** (demo control): buttons for start/stop ambient feed, scenarios (flood, chemical_fire, pileup), sensor breach, duplicate burst, fast-forward, reset (confirm), sim state readout; big and obvious — this drives the live demo.

## DESIGN
Modern control-room look: dark slate theme with high-contrast severity palette (P1 red, P2 orange, P3 amber, P4 blue/green), glassy cards, clear typography, smooth transitions (respect reduced motion), pulse animation only for P1. Define tokens in `styles/tokens.css` + `tailwind.config.js`. Primitives in `components/ui/*` (Card, Button, Badge, Toggle, Modal, Toast). Every list/panel has loading, empty and error states. Accessible (labels, focus rings, colour + icon not colour alone). Console must be usable at 1366×768; Report/Team/Track at 375 px.

## ORDER OF WORK
1. Config + tokens + primitives + types + mock + stores + WS + routes (≈1.5 h). 2. Console layout, map, queue, KPI (≈2.5 h). 3. Report/Call forms + incident cards live (≈1 h). 4. IncidentDrawer w/ recommendation/approve + alerts + notifications (≈2 h). 5. Team + Simulator (≈1.5 h). 6. AI panel, Brief, Analytics (≈2 h). 7. Track, Hospital, polish, responsive, empty states (≈1.5 h). Switch to real backend as soon as human says "BACKEND API LIVE" (set `VITE_USE_MOCK=false`); fix integration by adapting the frontend only.

## DEFINITION OF DONE
`cd frontend && npm i && npm run dev` runs with mock data alone and looks demo-ready; with backend live the same UI works end-to-end (submit a report → appears on map instantly via WS → open drawer → approve → units move → alerts fire); `npm run build` passes with no TS errors; no console errors on the demo path. Final message: summary, assumptions, any "REQUEST TO BE1/BE2".

---
# HOW TO USE
You are one of 3 developers on ResQGrid (repo shared via GitHub, everyone commits to `main`). You have been given docs `00_AI_CONTEXT.md`, `01_PRD.md`, `02_ARCHITECTURE.md`, `03_DATA_API.md`, `04_PLAN.md`. Read them fully, then execute ONLY your role below. Work autonomously, top to bottom, without asking questions; make reasonable decisions and note assumptions in your final message.

# ABSOLUTE RULES (merge-conflict prevention — violating any is a failure)
1. **Edit/create/delete ONLY files in your OWNED list.** Never touch any other file, not even to fix a typo, add an import, reformat, or rename. Never touch `docs/`, root `README.md`, `.gitignore`.
2. Need something from another role's file? Do NOT edit it. Code strictly against the FROZEN CONTRACT below (assume it exists), and if you must have a change, write it in your final message as "REQUEST TO <ROLE>: ...".
3. No new files outside your owned paths. Put helpers inside your own files (frontend owner may create new files anywhere under `frontend/`).
4. Never run project-wide formatters/linters with write mode, `git add -A`, `git add .`, `git rm`, or `git commit -a`. Stage explicitly: `git add <your paths>`.
5. Commit small and often: `git pull --rebase origin main` → `git add <your paths>` → `git commit -m "<area>: <what>"` → `git push origin main`. Before every commit run `git diff --cached --name-only` and confirm every path is yours; unstage anything else.
6. Never modify signatures/names/JSON shapes in the FROZEN CONTRACT. Extra optional fields are allowed only in your own outputs.
7. Everything must work with NO API keys (mock/fallback). Keep code typed, small, documented. No auth, no Docker.

# FROZEN CONTRACT (all roles rely on this)
## Backend Python interfaces (all cross-role functions take IDs / plain dicts and open their own DB session)
**BE1 provides:** 
- `app.core.config.settings` (pydantic-settings) fields: `DATABASE_URL, GROQ_API_KEY, GEMINI_API_KEY, GROQ_MODEL, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, DEFAULT_SMS_TO, DEFAULT_EMAIL_TO, SLA_TIME_SCALE(float=1.0), AUTO_DISPATCH_P1(bool=False), CORS_ORIGINS`
- `app.db.session`: `engine`, `SessionLocal` (async_sessionmaker, expire_on_commit=False), `async get_session()` FastAPI dependency, `async init_db()` (create_all).
- `app.db.models` (SQLAlchemy 2 declarative, string UUID pk `default=lambda: str(uuid4())`, JSON columns): classes `Report, Incident, Unit, Facility, Assignment, Shortage, Alert, Notification, Sensor, AuditEvent` with exactly the columns in `03_DATA_API.md` (+ `Incident.is_historic: bool=False`, `Incident.region_key: str|None`). Timestamps are timezone-aware UTC `datetime`.
- `app.core.llm.complete_json(prompt: str, system: str = "", cache_key: str | None = None) -> dict | None` (None on missing key/timeout/error; 4 s timeout; in-memory cache).
- `app.services.geo`: `haversine_km(lat1,lng1,lat2,lng2)->float`, `eta_minutes(dist_km, speed_kmh)->float`.
- `app.services.pipeline`: `async ingest_report(source: str, payload: dict) -> dict` returning `{"report_id","incident_id","action":"new|merged|related","classification":{...},"track_id"}`; `async publish_incident(incident_id: str) -> None` (loads incident+assignments+shortages, publishes `incident.upsert` with IncidentOut). `async serialize_incident(session, incident) -> dict` (IncidentOut).
- `app.main`: creates app, CORS, includes every router found as `router` in each module of `app.api.*` (auto-discovery, skips missing), lifespan: `init_db()`, then `await app.data.seed.seed_if_empty()` if present, then calls `start(app)` on `app.services.sla`, `app.services.simulator` if they define it, and `stop()` on shutdown.
- Data files BE1 owns: `data/gazetteer.json` = list of `{"name","aliases":[...],"lat","lng","ward","kind"}` (~60 Vadodara landmarks/wards), `data/training_sentences.json` = `{"fire":[...],"flood":[...],"road_accident":[...],"medical":[...],"industrial_hazard":[...],"building_collapse":[...],"gas_leak":[...],"other":[...]}` (~40 each), `data/sop.json` = `{type: [checklist strings]}`.

**BE2 provides:**
- `app.core.events`: `bus` with `async publish(type: str, payload: dict)` broadcasting to all WS clients; `manager` WS connection manager.
- `app.services.recommend.plan(incident_id: str) -> dict` (creates/refreshes `Assignment` rows status=`recommended` and `Shortage` rows; returns `{"items":[{"requirement":{kind,subtype,qty},"matches":[...],"shortage":int}]}`; publishes via `pipeline.publish_incident`).
- `app.services.sla.evaluate_incident(incident_id: str) -> None` (creates alerts immediately, e.g. P1 critical) and `start(app)`/`stop()`.
- `app.services.notify.route(event: str, incident_id: str | None, data: dict) -> None` (never raises).
- `app.services.simulator.start(app)/stop()`.
- `app.data.seed.seed_if_empty() -> None` (facilities, units, sensors, ~300 historic incidents `is_historic=True`, using gazetteer.json read-only; idempotent).
- Routers in `api/units.py, alerts.py, analytics.py, sim.py, notifications.py, ws.py`.

## REST (prefix `/api`, plain JSON, no envelope, errors `{detail}`)
BE1 routers: `POST /ingest/{citizen|call|sensor|field|hospital|department}` · `GET /incidents` · `GET /incidents/{id}` (IncidentDetail) · `POST /incidents/{id}/merge {other_id}` · `POST /incidents/{id}/split {report_id}` · `PATCH /incidents/{id} {severity?,type?,status?,escalated?}` · `POST /ai/incident/{id}/summary` · `POST /ai/incident/{id}/sop` · `POST /ai/brief` · `POST /ai/query {q}` · `GET /track/{track_id}`.
BE2 routers: `GET /snapshot` · `GET /units`, `GET /units/{id}`, `PATCH /units/{id}` · `GET /facilities`, `PATCH /facilities/{id}` · `POST /incidents/{id}/recommend` · `POST /incidents/{id}/approve {all?:bool, assignment_ids?:[..]}` · `POST /assignments/{id}/accept|reject` · `POST /assignments/{id}/status {status}` · `GET /alerts?status=` · `POST /alerts/{id}/ack` · `POST /alerts/{id}/escalate` · `GET /notifications` · `GET /analytics/{overview|types|delays|shortages|hotspots|timeseries|sources}` · `GET /sim/state`, `POST /sim/{start|stop|reset|sensor-breach|duplicate-burst|fast-forward}`, `POST /sim/scenario/{flood|chemical_fire|pileup}` · WebSocket `/api/ws`.
Ingest bodies: citizen `{text,lat?,lng?,location_text?,phone?,name?,photo_url?}` · call `{caller_phone,transcript,location_text?,lat?,lng?}` · sensor `{sensor_id,kind,value,unit,lat,lng,threshold?}` · field `{unit_id,incident_id?,text,lat?,lng?,status?}` · hospital `{facility_id,text,beds_free?,incoming_patients?}` · department `{agency,text,lat?,lng?,location_text?}`.

## JSON shapes
- **IncidentOut**: `{id,code,type,title,summary,severity,priority,confidence,status,escalated,escalation_level,lat,lng,area,people_affected,hazards[],report_count,sources[],created_at,triaged_at,first_assigned_at,first_arrival_at,resolved_at,sla_due_at,track_id,decision_log[],assignments:AssignmentOut[],shortages:[{subtype,qty_missing}]}`
- **AssignmentOut**: `{id,incident_id,unit_id,facility_id,target_name,kind,requirement_key,score,score_breakdown:{proximity,capability,readiness,load},eta_min,status}`
- **UnitOut**: `{id,name,kind,category,agency,capabilities[],equipment{},crew_size,status,lat,lng,station_id,current_incident_id,fatigue,phone}` · **FacilityOut**: `{id,name,kind,lat,lng,capabilities[],beds_total,beds_free,on_diversion,contact}` · **SensorOut**: `{id,kind,lat,lng,threshold,unit,last_value,last_at,state}`
- **AlertOut**: `{id,incident_id,kind,rule,level,message,status,created_at,ack_at}` · **NotificationOut**: `{id,event,recipient,role,channel,subject,body,status,incident_id,created_at}` · **ReportOut**: `{id,source,text,lat,lng,location_text,reliability,created_at,incident_id,classification}`
- **IncidentDetail** = IncidentOut + `{reports:ReportOut[], related:[{incident_id,code,score}], alerts:AlertOut[], notifications:NotificationOut[]}`
- **Snapshot**: `{incidents:IncidentOut[] (active + resolved in last 60 min), units, facilities, sensors, alerts (open+ack), notifications (last 50), kpis, sim}`; **kpis** `{active,p1,avg_response_min,units_available,units_total,open_alerts,unmet_requirements,reports_total,incidents_total}`; **sim** `{running,scenario,message}`
- **Analytics**: overview `{total_incidents,total_reports,dedupe_ratio,avg_response_min,sla_compliance_pct,open_alerts,top_type}` · types `[{type,count}]` · delays `{by_type:[{type,avg_assign_min,avg_arrival_min}],by_priority:[{priority,avg_assign_min,avg_arrival_min,sla_pct}]}` · shortages `[{subtype,demand,available,unmet_count}]` · hotspots `[{area,lat,lng,count,weight}]` · timeseries `[{bucket,count,p1}]` · sources `[{source,count}]`
- **AI**: summary `{summary,timeline[],risks[],questions[],model}` · sop `{checklist:[{step,done}],model}` · brief `{brief,top_risks[],reinforcement[],generated_at,model}` · query `{answer,model}` · **Track** `{code,type,status,area,eta_min,updates:[{ts,text}]}`
- **Ingest response**: `{report_id,incident_id,action,classification:{type,severity,priority,confidence,reasoning,extracted,model},track_id}`

## WebSocket events `{type,ts,payload}`
`incident.upsert`→IncidentOut · `report.new`→ReportOut · `unit.update`→UnitOut · `sensor.update`→SensorOut · `alert.new|ack|resolved`→AlertOut · `notification.new`→NotificationOut · `kpi.update`→kpis · `sim.state`→sim.
Enums: type ∈ fire|flood|road_accident|medical|industrial_hazard|building_collapse|gas_leak|other · priority P1..P4 · incident status new|triaged|dispatched|en_route|on_scene|contained|resolved|closed · unit status available|assigned|en_route|on_scene|returning|offline · assignment status recommended|approved|accepted|en_route|arrived|completed|rejected|cancelled · alert kind critical|delayed|escalation|sensor|cluster · alert status open|ack|resolved.

## Sync points (humans will tell you)
"FOUNDATION PUSHED" (BE1: models/session/config/main/geo/llm stubs) · "EVENTS PUSHED" (BE2: events.py) · "BACKEND API LIVE". Until then, code against the contract; run `git pull --rebase origin main` often.
