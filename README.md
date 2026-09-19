# ResQGrid
See `docs/00_AI_CONTEXT.md` first.
Ownership: **Frontend** = `frontend/` · **BE1 (Intake & AI)** = core/llm, db, schemas(report,incident), api(ingest,incidents,ai,track), services(pipeline,geocode,classify,dedupe,priority,ai_assist), tests(classify,dedupe) · **BE2 (Resources & Ops)** = services(recommend,dispatch,sla,notify,analytics,simulator), api(units,alerts,analytics,sim,notifications,ws), core/events, data/*, seed.py, tests(recommend,sla).
Shared (edit via small PRs/ask): db/models.py, main.py, config.py, docs/03_DATA_API.md.
