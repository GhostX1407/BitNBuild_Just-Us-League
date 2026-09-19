"""
app/main.py
───────────
FastAPI application factory.

Startup sequence
────────────────
1. Load settings (from .env via config.py)
2. Configure CORS (origins from settings.cors_origins_list)
3. Register the /api/incidents router
4. Expose /health for load-balancer and container readiness checks

Phase 3 additions (not yet implemented):
  • WebSocket router: app.include_router(ws_router)
  • Redis connection pool: lifespan context manager

Phase 4 additions:
  • Static file serving for the built React bundle (if desired)
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.incidents import router as incidents_router
from app.core.config import settings

# ── Application instance ──────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    description=(
        "Smart Disaster & Emergency Management Platform — Phase 1 API.\n\n"
        "Provides incident ingestion, retrieval, and status management. "
        "Built with FastAPI + SQLAlchemy async + PostgreSQL."
    ),
    docs_url="/docs",       # Swagger UI
    redoc_url="/redoc",     # ReDoc
    openapi_url="/openapi.json",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Origins are loaded from the CORS_ORIGINS environment variable.
# Example .env entry:
#   CORS_ORIGINS=http://localhost:5173,https://my-dashboard.example.com
#
# Never use allow_origins=["*"] in production — it bypasses the browser's
# same-origin protection and exposes the API to CSRF attacks.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    # Only the methods used by this API + preflight OPTIONS
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    # Content-Type is required for JSON bodies; Authorization for future auth
    allow_headers=["Content-Type", "Authorization", "Accept"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(incidents_router)

# Phase 3: app.include_router(websocket_router)  ← add here

# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"], summary="Service liveness check")
async def health() -> dict:
    """
    Returns 200 OK when the service is running.
    Phase 3 can extend this to include DB + Redis status.
    """
    return {"status": "ok", "version": settings.APP_VERSION}
