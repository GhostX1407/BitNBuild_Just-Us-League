from __future__ import annotations

import asyncio
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

# Windows SelectorEventLoop fix for asyncpg compatibility
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Import Base and models to register all models with metadata
# fmt: off
from app.database.base import Base          # noqa: F401
from app.models.incident import Incident    # noqa: F401
# fmt: on
from app.core.config import settings

# ── Alembic config object ─────────────────────────────────────────────────────
config = context.config

# Interpret alembic.ini logging config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata used for autogenerate
target_metadata = Base.metadata


# ── Offline migrations ────────────────────────────────────────────────────────
def run_migrations_offline() -> None:
    """Run migrations without a database connection (SQL output mode)."""
    url = settings.DATABASE_URL or config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online async migrations helper ────────────────────────────────────────────
def do_run_migrations(connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations with a live async database connection."""
    database_url = settings.DATABASE_URL or config.get_main_option("sqlalchemy.url")
    connectable = create_async_engine(database_url, future=True, echo=False)

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


# ── Dispatch ──────────────────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()