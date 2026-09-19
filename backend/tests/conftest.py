"""
tests/conftest.py
──────────────────
pytest fixtures for async FastAPI + SQLAlchemy testing.

Test isolation strategy
────────────────────────
• Uses SQLite + aiosqlite instead of PostgreSQL so tests run in CI without
  an external database server.
• A fresh in-memory (or file-based) SQLite DB is created per test session;
  tables are dropped and re-created between tests via the `db_session` fixture.
• The FastAPI `get_db` dependency is overridden to inject the test session,
  so routes use the same isolated DB as the assertions.

SQLite vs PostgreSQL differences to be aware of
─────────────────────────────────────────────────
• SQLite does not enforce CHECK constraints by default.  We rely on Pydantic
  validation in tests; constraint testing is effectively at the schema level.
• NUMERIC(10,7) maps to REAL in SQLite — precision is sufficient for testing.
• If you want to run tests against a real PostgreSQL, set TEST_DATABASE_URL
  to a PostgreSQL asyncpg URL in .env and remove the SQLite workaround in
  engine creation below.
"""

from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database.base import Base
from app.database.connection import get_db
from app.main import app
from app.core.config import settings

# ── Test engine ───────────────────────────────────────────────────────────────
# Use the TEST_DATABASE_URL from settings (defaults to SQLite)
TEST_ENGINE = create_async_engine(
    settings.TEST_DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.TEST_DATABASE_URL else {},
)

TestSessionLocal = async_sessionmaker(
    bind=TEST_ENGINE,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# ── Schema fixtures ───────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="session", autouse=True)
async def create_tables():
    """Create all tables once per test session."""
    async with TEST_ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with TEST_ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(autouse=True)
async def truncate_tables():
    """Wipe all rows before each test for isolation."""
    yield
    async with TEST_ENGINE.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            await conn.execute(table.delete())


# ── Session + dependency override ─────────────────────────────────────────────

@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    """Yield a test DB session."""
    async with TestSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncClient:
    """
    Yield an async HTTP test client with the DB dependency overridden to use
    the test session.
    """
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()
