# AI CONTEXT — READ FIRST
Project: **ResQGrid** (working name) — Intelligent Emergency Response & Resource Coordination Platform (Hackathon PS-9, 15-hour build, vibecoded).
Give an AI these files in order: `00_AI_CONTEXT` → `01_PRD` → `02_ARCHITECTURE` → `03_DATA_API` → `04_PLAN`.

## One-paragraph summary
Multi-source incidents (citizen web form, emergency-call transcript, sensor feed, field team, hospital) enter one pipeline: normalize → geolocate → AI classify (type, severity, priority) → duplicate-merge → resource recommendation (teams, vehicles, equipment, facilities) → dispatcher approves/auto-dispatches → live tracking with SLA timers → alerts/escalation → notifications. A React command-center dashboard (map + incident queue + alerts + analytics) updates in real time over WebSockets. LLM adds summaries/recommendations; **all core decisions have deterministic fallbacks so the demo never breaks.**

## Locked decisions (do not re-debate)
- Backend: **Python 3.11+, FastAPI, SQLAlchemy 2 async, SQLite (aiosqlite)**, Pydantic v2, WebSockets, APScheduler-style asyncio loop for SLA checks.
- ML/AI: scikit-learn (TF-IDF + LogisticRegression, trained on synthetic data at startup) as fallback classifier; **LLM (Groq llama-3.3-70b, Gemini fallback) via one `llm.py`** returning strict JSON; if no key/timeout(4s) → rule/ML fallback.
- Frontend: **React 18 + Vite + TypeScript + Tailwind + Leaflet (OSM tiles) + Recharts**. Zustand for state. Design tokens/primitives ported from prior project "Raahi" (`CodeCraft_Just-Us-league`).
- Geography: synthetic data set in **Vadodara, Gujarat** (lat 22.30, lng 73.19). Optional one-time OSM Overpass export saved as static JSON (no live OSM dependency during demo).
- Notifications: in-app (WS toast + outbox panel) always; SMS (Twilio) / email (SMTP) real if env keys set, else logged "mock sent" visible in UI.
- Auth: none/simple role switcher (Dispatcher, Field Team, Public). No real auth (hackathon).
- Single repo, no Docker required. `run.sh`/`run.bat` starts both.

## Reuse map
| Source | Reuse | Action |
|---|---|---|
| BitNBuild backend (teammate) | `geo_utils.haversine`, `notification_service` dispatcher pattern (console/Twilio, BackgroundTasks), `core/config.py` pydantic-settings pattern, pytest fixtures | Copy & adapt |
| BitNBuild backend | 3-category enum, keyword-only severity, thin schema, no resources/teams/WS/analytics | **Replace** |
| BitNBuild `frontend/` + `frontend-react/` | small (~600 LOC), plain dashboard | **Discard** (ideas only) |
| Raahi frontend | Tailwind tokens, Card/Button/StatusBadge/Toast/NotificationDrawer/ConnectionBanner, Leaflet map setup, CountdownTimer, AuditTimeline, ScoreBreakdown, RoleGuard | Copy & adapt |
| Raahi functions | Matching engine idea (eligibility filter + weighted scoring + score breakdown), timeout→reroute, audit ledger, crisis mode, reliability, AI layer isolation, seed/demo-data | **Port concepts to Python** (not code copy) |

## Coding rules for AI
1. Every feature must work with **no API keys** (mock/fallback). Keys only upgrade quality.
2. AI never has authority to mutate state directly; it proposes, deterministic code/dispatcher commits.
3. Every state change → row in `audit_events` + WS broadcast `{type, payload}`.
4. IDs are UUID strings; times are UTC ISO; distance km; scores 0–1.
5. Keep files small, typed, with docstrings; no over-engineering; no auth, no Docker, no migrations (use `create_all` + seed script).
6. Do not add features outside PRD §Scope without asking; cut-line is in `04_PLAN`.
7. Show score breakdowns/reasons in UI wherever AI/matching decides (explainability = judge appeal).
