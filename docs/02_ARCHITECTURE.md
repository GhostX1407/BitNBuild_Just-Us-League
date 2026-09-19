# Architecture & Tech Stack

## Stack
| Layer | Choice | Why |
|---|---|---|
| Backend | Python 3.11, FastAPI, Uvicorn | Async, fast to vibecode, auto docs |
| DB | SQLite + SQLAlchemy 2 async (aiosqlite); JSON columns for flexible payloads | Zero setup; swap to Postgres via URL |
| Realtime | FastAPI WebSocket `/ws` + in-process pub/sub (`EventBus`) | Simple, enough for demo |
| Jobs | asyncio background tasks: SLA monitor (5 s), unit-mover sim (2 s), ambient feed | No Celery |
| ML | scikit-learn TF-IDF + LogReg (type), TF-IDF cosine (dedupe) | Local, offline |
| LLM | Groq (llama-3.3-70b) → Gemini flash fallback → templates; strict JSON, 4 s timeout, cached | Fast + resilient |
| Frontend | React 18, Vite, TS, Tailwind, Zustand, React-Leaflet (+ leaflet.heat), Recharts, lucide-react | Reuse Raahi UI kit |
| Maps/data | OSM tiles; static Vadodara JSON (hospitals, stations, landmarks, wards) from synthetic + optional Overpass export | Offline-safe |
| Notifications | in-app WS; Twilio SMS; SMTP email; console mock | Keys optional |
| Tests | pytest (pipeline: classify/dedupe/match/SLA) | Only critical logic |

## Repo layout
```
resqgrid/
  backend/app/
    main.py              # app, CORS, routers, lifespan (seed, start loops)
    core/{config,events,llm}.py   # settings; EventBus+WS manager; LLM client+cache+fallback
    db/{session,models}.py
    schemas/*.py
    api/{ingest,incidents,units,alerts,analytics,ai,sim,notifications,ws}.py
    services/
      pipeline.py        # orchestrates ingest→incident
      geocode.py  classify.py  dedupe.py  priority.py
      recommend.py       # requirement templates + matching + shortage
      dispatch.py        # assign/accept/status transitions, audit
      sla.py             # alert rules + escalation ladder
      notify.py          # channel router + templates + outbox
      ai_assist.py       # summary, SOP, brief, NL query
      analytics.py  simulator.py  geo.py(haversine)
    data/{gazetteer,facilities,units,templates,sop}.json ; seed.py ; train_data.py
  backend/tests/
  frontend/src/
    app/{routes,App}.tsx
    pages/{Console,Analytics,Report,Team,Track,Hospital,Simulator}/
    components/{map,incident,alerts,charts,ui}/
    store/{incidents,units,alerts,ws}.ts   services/api.ts  types/domain.ts
  docs/  run.bat run.sh  .env.example
```

## Core pipeline (services/pipeline.py)
```
ingest(report) 
 → validate + idempotency(source, external_id)
 → geocode.resolve(report)            # lat/lng | gazetteer | LLM | uncertain
 → classify.run(report)               # LLM JSON → fallback ML/rules; returns type,sev,conf,extracted
 → dedupe.find(report)                # candidates→score→merge|related|new
 → priority.compute(incident)         # sev, people, hazards, corroboration, sources
 → recommend.plan(incident)           # requirements → matched units/facilities + shortages
 → alerts.evaluate(incident)          # P1/escalation instantly
 → persist + audit + EventBus.publish # WS: incident.upsert, alert.new, unit.update
 → notify.route(event)                # background task
```
Every stage returns a dict with `reason`; stored in `incident.decision_log` (explainability).

## Realtime contract
WS `/ws?role=dispatcher|team:{id}|public:{trackId}` → server pushes `{type, ts, payload}`:
`incident.upsert`, `report.new`, `unit.update`, `alert.new|ack|resolved`, `notification.new`, `sim.state`, `kpi.update`. Client: Zustand store applies events; on reconnect refetch `/api/snapshot`.

## Matching engine (recommend.py)
1. `requirements = TEMPLATES[type][severity]` → list `{kind: team|vehicle|equipment|facility, subtype, qty, mandatory}`.
2. For each: candidates = units where status=available ∧ capability ⊇ subtype ∧ (equipment stock>0).
3. `score = .45*proximity + .25*capability + .15*readiness + .15*load_balance`; ETA = dist_km / speed(type) × 60 (+ traffic factor from simulated congestion).
4. Take top qty; unmet → `shortage` record `{incident, subtype, missing}` + escalation rule input.
5. Hospitals: eligibility (needed capability, beds>0, not on diversion) then same scoring; return breakdown.

## SLA / escalation (sla.py)
Loop 5 s: for each active incident evaluate rules R1 unassigned>SLA, R2 assigned-not-enroute, R3 ETA overrun, R4 severity worsened, R5 unmet shortage, R6 sensor breach cluster, R7 regional surge (≥N P1/P2 in ward). Upsert `Alert(rule, level)`; escalate level after repeated breach (timer per level); each alert triggers notify to level recipients. Ack stops escalation.

## AI layer boundaries
`llm.py: complete_json(prompt, schema, cache_key) -> dict|None`. Used by classify (primary), geocode (extraction fallback), ai_assist (summary/SOP/brief/query). `None` → deterministic path/template. No AI output writes to resources/assignments without dispatcher or deterministic code.

## Env (`.env.example`)
`GROQ_API_KEY= GEMINI_API_KEY= TWILIO_ACCOUNT_SID= TWILIO_AUTH_TOKEN= TWILIO_FROM= SMTP_HOST= SMTP_USER= SMTP_PASS= DEFAULT_SMS_TO= DEFAULT_EMAIL_TO= DATABASE_URL=sqlite+aiosqlite:///./resq.db SLA_TIME_SCALE=1 (set 0.2 for faster demo) AUTO_DISPATCH_P1=false`

## Run
`cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload` (auto seeds if empty) · `cd frontend && npm i && npm run dev` (proxy `/api`,`/ws` → :8000).
