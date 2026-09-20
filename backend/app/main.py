"""ResQGrid — FastAPI application entry point."""
from __future__ import annotations

import asyncio
import importlib
import logging
import pkgutil
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Auto-discover and import routers
# ---------------------------------------------------------------------------

_loaded_routers: List[str] = []
_skipped_routers: List[str] = []


def _load_routers(app: FastAPI) -> None:
    """Import every module in app.api.*, include its ``router`` attribute."""
    import app.api as api_pkg

    for module_info in pkgutil.iter_modules(api_pkg.__path__):
        name = module_info.name
        module_path = f"app.api.{name}"
        try:
            module = importlib.import_module(module_path)
            if hasattr(module, "router"):
                app.include_router(module.router, prefix="/api")
                _loaded_routers.append(name)
                logger.info("Router loaded: %s", name)
            else:
                logger.debug("Module %s has no router attribute; skipping", name)
        except Exception as exc:
            _skipped_routers.append(name)
            logger.warning("Router skipped (%s): %s", name, exc)


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    # 1. Initialise DB (create_all)
    from app.db.session import init_db
    await init_db()

    # 2. Seed data if BE2 seed module is available
    try:
        from app.data.seed import seed_if_empty  # type: ignore
        await seed_if_empty()
        logger.info("Seed completed")
    except ImportError:
        logger.debug("app.data.seed not available; skipping seed")
    except Exception as exc:
        logger.warning("Seed failed: %s", exc)

    # 3. Warm up ML classifier in background thread
    try:
        from app.services.classify import warm_up
        await asyncio.to_thread(warm_up)
        logger.info("ML classifier warmed up")
    except Exception as exc:
        logger.warning("ML warm-up failed: %s", exc)

    # 4. Start BE2 background services if they exist
    for svc_path in ("app.services.sla", "app.services.simulator"):
        try:
            svc = importlib.import_module(svc_path)
            start_fn = getattr(svc, "start", None)
            if start_fn:
                result = start_fn(app)
                if asyncio.iscoroutine(result):
                    await result
                logger.info("%s.start() called", svc_path)
        except ImportError:
            logger.debug("%s not available", svc_path)
        except Exception as exc:
            logger.warning("%s.start() failed: %s", svc_path, exc)

    yield  # Application runs

    # 5. Shutdown BE2 background services
    for svc_path in ("app.services.sla", "app.services.simulator"):
        try:
            svc = importlib.import_module(svc_path)
            stop_fn = getattr(svc, "stop", None)
            if stop_fn:
                result = stop_fn()
                if asyncio.iscoroutine(result):
                    await result
        except Exception:
            pass


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="ResQGrid API",
    description="Intelligent Emergency Response & Resource Coordination Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load all routers
_load_routers(app)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/health", tags=["health"])
async def health() -> dict:
    """Service health and configuration status."""
    llm_configured = bool(settings.GROQ_API_KEY or settings.GEMINI_API_KEY)
    return {
        "status": "ok",
        "llm_configured": llm_configured,
        "routers": _loaded_routers,
        "skipped": _skipped_routers,
    }
