from contextlib import asynccontextmanager
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.config import settings
from backend.database import init_db
from backend.services.scheduler import scheduler
from backend.routers import workspaces, api_keys, usage, analytics, ws, settings as settings_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Re-register scheduler jobs for all active keys on startup
    from backend.database import AsyncSessionLocal
    from backend.models.api_key import APIKey
    from sqlalchemy import select
    from backend.services import scheduler as sched

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(APIKey).where(APIKey.is_active == True))  # noqa: E712
        for key in result.scalars().all():
            sched.add_job(key.id, key.poll_interval_seconds)

    scheduler.start()
    logger.info("LLM HUD backend started on %s:%d", settings.host, settings.port)
    yield
    scheduler.shutdown(wait=False)
    logger.info("LLM HUD backend stopped")


app = FastAPI(
    title="LLM HUD API",
    version="0.1.0",
    description="Local LLM token usage monitoring backend",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(workspaces.router, prefix="/api")
app.include_router(api_keys.router, prefix="/api")
app.include_router(usage.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(ws.router)

# Serve built React frontend (production)
_frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if _frontend_dist.exists():
    # /assets/** served directly (JS, CSS bundles)
    app.mount("/assets", StaticFiles(directory=str(_frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str):
        # Serve any existing file in dist/ (registerSW.js, sw.js, workbox-*.js,
        # manifest.webmanifest, icons, favicon, etc.) with the correct MIME type.
        candidate = _frontend_dist / full_path
        if candidate.exists() and candidate.is_file():
            return FileResponse(str(candidate))
        # Everything else (React Router paths) -> SPA entry point
        return FileResponse(str(_frontend_dist / "index.html"))
