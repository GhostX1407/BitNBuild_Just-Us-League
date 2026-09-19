# 15-Hour Build Plan (vibecoding)

Assumes 2 people: **A = backend/AI**, **B = frontend/UI**. Solo? Follow order, apply cut-line. Contract-first: `03_DATA_API.md` is the handshake; B mocks API from the contract until A lands endpoints.

| Hr | A — Backend | B — Frontend | Milestone |
|---|---|---|---|
| 0–1 | New repo skeleton, models, config, EventBus+WS, copy `geo`/notify patterns, seed loader stubs | Vite+TS+Tailwind, port Raahi tokens/UI primitives, routes, WS store, API client | Both run, WS ping works |
| 1–2.5 | Seed data (facilities/units/sensors/gazetteer/templates/history) + `/snapshot` | Console layout: map, queue, KPI strip, detail drawer skeleton | Map shows units/facilities |
| 2.5–5 | Ingest endpoints + pipeline: geocode, classify (LLM+ML+rules), priority, dedupe, audit | Report form, Call form, incident cards/markers, live updates via WS | **Report → classified → on map** |
| 5–7 | recommend.py (templates, matching, shortages) + dispatch/approve/accept/status + unit mover sim | Incident detail: linked reports, recommendation w/ score breakdown, approve UI, status stepper | **End-to-end dispatch** |
| 7–8.5 | sla.py alerts+escalation, notify router (in-app/mock/Twilio/SMTP), outbox | Alerts panel/banner, notification drawer+outbox, Team mobile view (accept/status/field report) | Alerts & notifications live |
| 8.5–10 | Simulator + 3 scenarios, sensor feed, reset; pytest for classify/dedupe/match/SLA | Simulator page, sensor layer, duplicate "related" UI, merge/split | **Full demo loop works — freeze P0** |
| 10–12 | AI assist: summary, SOP, brief, query; analytics endpoints | AI panel, Situation Brief, Analytics page (charts, heatmap, shortages) | P1 done |
| 12–13.5 | Real SMS/email keys test, citizen track page API, hospital view API, perf/bugfix | Track page, Hospital light view, polish, empty/error/loading states, responsive | Feature freeze |
| 13.5–15 | Demo rehearsal x3, seed tuning, fallback checks (no key, no net), README, architecture slide, screen-recording backup | same | Submit |

## Cut-line (drop in this order if behind)
Telegram/voice → NL query → shift handover → hospital view → OSRM routing → real email → track page → analytics AI insights. **Never cut:** multi-source ingest, dedupe, recommendation w/ breakdown, alerts/escalation, live dashboard, simulator, analytics basics.

## Definition of done
- Fresh clone → run script → seeded dashboard in <2 min, no keys needed.
- 3 scenarios run cleanly; each produces merge, P1 alert, recommendation, shortage/escalation.
- pytest green for pipeline core; no console errors in demo path.
- README with architecture diagram, setup, demo script; backup demo video.

## Vibecoding workflow tips
1. Start each AI session with `00_AI_CONTEXT.md`+the doc for the task; ask for **one module per prompt** with its acceptance test.
2. Build order per feature: schema → service (pure functions) → endpoint → UI; commit after each.
3. Ask AI to write the pytest first for classify/dedupe/match/SLA; skip tests elsewhere.
4. Keep `03_DATA_API.md` updated when contracts change; paste diff into next prompt.
5. Timebox: any bug >20 min → use fallback/cut.

## Open questions for you (answer before Hour 0)
1. Team size/split (2? 3? solo)? 2. City for synthetic data — Vadodara OK? 3. Which LLM keys do you have (Groq/Gemini)? Twilio/SMTP available? 4. Product name — "ResQGrid" OK?
