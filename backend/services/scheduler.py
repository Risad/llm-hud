"""APScheduler-based per-API-key polling scheduler."""
from __future__ import annotations
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

# Maps api_key_id → job_id
_jobs: dict[str, str] = {}


def _job_id(api_key_id: str) -> str:
    return f"poll_{api_key_id}"


async def _poll_job(api_key_id: str) -> None:
    from backend.database import AsyncSessionLocal
    from backend.models.api_key import APIKey
    from backend.services.fetch_service import fetch_and_store
    from backend.routers.ws import broadcast
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(APIKey).where(APIKey.id == api_key_id))
        key_row = result.scalars().first()
        if key_row is None or not key_row.is_active:
            return
        fetch_result = await fetch_and_store(db, key_row)
        logger.info("Polled key %s: %d new records", api_key_id, fetch_result.records_saved)
        if fetch_result.records_saved > 0 or fetch_result.balance_updated:
            await broadcast(key_row.workspace_id, {
                "event": "usage_update",
                "api_key_id": api_key_id,
                "records_saved": fetch_result.records_saved,
                "balance_updated": fetch_result.balance_updated,
            })


def add_job(api_key_id: str, interval_seconds: int) -> None:
    job_id = _job_id(api_key_id)
    if job_id in _jobs:
        remove_job(api_key_id)
    scheduler.add_job(
        _poll_job,
        trigger=IntervalTrigger(seconds=interval_seconds),
        args=[api_key_id],
        id=job_id,
        replace_existing=True,
        misfire_grace_time=60,
    )
    _jobs[api_key_id] = job_id
    logger.info("Scheduled poll for key %s every %ds", api_key_id, interval_seconds)


def remove_job(api_key_id: str) -> None:
    job_id = _job_id(api_key_id)
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    _jobs.pop(api_key_id, None)


def update_job(api_key_id: str, interval_seconds: int) -> None:
    add_job(api_key_id, interval_seconds)
