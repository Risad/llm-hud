from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from backend.config import settings

# Ensure the DB parent directory exists (matters when DB is in ~/.llm-hud/).
if settings.database_url.startswith("sqlite"):
    import urllib.parse
    _db_file = urllib.parse.urlparse(settings.database_url).path.lstrip("/")
    Path(_db_file).parent.mkdir(parents=True, exist_ok=True)

engine = create_async_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    from backend.models import workspace, api_key, usage_record, balance_record  # noqa: F401
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Inline migration: add project_id column to existing DBs
        try:
            await conn.execute(text("ALTER TABLE usage_records ADD COLUMN project_id VARCHAR(128)"))
        except Exception:
            pass  # Column already exists
