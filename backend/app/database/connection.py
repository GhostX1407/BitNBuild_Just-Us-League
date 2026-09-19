"""
database/connection.py
──────────────────────
Async SQLAlchemy engine and session factory.

Design notes
────────────
• Uses `create_async_engine` (SQLAlchemy 2.x) with the `asyncpg` driver for
  PostgreSQL and `aiosqlite` for test databases.
• `AsyncSession` is yielded per-request via the `get_db` FastAPI dependency.
  The session is committed on success and rolled back on any exception,
  then always closed.  This prevents connection leaks.
• `engine` is a module-level singleton created once at import time.  It is
  re-created in tests by overriding the `get_db` dependency.
• Phase 3 (Redis, WebSocket) will add its own connection helpers in
  `app/core/redis.py` — this file stays database-only.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# ── Engine ────────────────────────────────────────────────────────────────────
# echo=False in production; set to True temporarily for SQL debugging.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.APP_DEBUG,
    # pool_pre_ping keeps connections alive across idle periods.
    pool_pre_ping=True,
    # Pool sizing — tunable via env vars in a future phase if needed.
    pool_size=10,
    max_overflow=20,
)

# ── Session factory ───────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,   # keeps attributes accessible after commit
    autocommit=False,
    autoflush=False,
)


# ── FastAPI dependency ────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield an async database session for the duration of a single request.

    Usage in a route:
        async def my_endpoint(db: AsyncSession = Depends(get_db)):
            ...

    The session is committed on success and rolled back on any unhandled
    exception, then closed regardless of outcome.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
