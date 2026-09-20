"""ResQGrid — pytest fixtures (async, file-based SQLite, no API keys)."""
from __future__ import annotations

import os
import tempfile
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.db.models import Base

# Use a temp file so the SQLite DB persists across event loops within the test session
_db_file = os.path.join(tempfile.gettempdir(), "resq_test.db")
_db_url = f"sqlite+aiosqlite:///{_db_file}"


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _create_tables():
    """Create all DB tables once per test session."""
    # Remove stale DB from previous run
    if os.path.exists(_db_file):
        os.remove(_db_file)
    eng = create_async_engine(_db_url, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await eng.dispose()


@pytest_asyncio.fixture(scope="session")
async def engine(_create_tables):
    """Session-scoped engine reused across all tests."""
    eng = create_async_engine(_db_url, echo=False)
    yield eng
    await eng.dispose()
    # Clean up temp DB
    if os.path.exists(_db_file):
        try:
            os.remove(_db_file)
        except OSError:
            pass


@pytest_asyncio.fixture(scope="session")
async def session_maker(engine):
    return async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


@pytest_asyncio.fixture
async def session(session_maker):
    """Fresh session per test."""
    async with session_maker() as s:
        yield s


@pytest.fixture(autouse=True)
def _no_llm(monkeypatch):
    """Monkeypatch LLM to return None so all tests are fully offline."""
    async def _null(*args, **kwargs):
        return None

    for target in (
        "app.core.llm.complete_json",
        "app.services.classify.complete_json",
        "app.services.geocode.complete_json",
        "app.services.ai_assist.complete_json",
    ):
        monkeypatch.setattr(target, _null, raising=False)


@pytest_asyncio.fixture(autouse=True)
async def _patch_session(monkeypatch, session_maker):
    """Redirect all SessionLocal usage to the shared test DB."""
    import app.db.session as db_session
    import app.services.pipeline as pipeline_mod

    monkeypatch.setattr(db_session, "SessionLocal", session_maker)
    monkeypatch.setattr(pipeline_mod, "SessionLocal", session_maker)

    for mod_name in (
        "app.services.ai_assist",
        "app.api.incidents",
        "app.api.track",
    ):
        try:
            import importlib
            mod = importlib.import_module(mod_name)
            if hasattr(mod, "SessionLocal"):
                monkeypatch.setattr(mod, "SessionLocal", session_maker)
        except ImportError:
            pass
