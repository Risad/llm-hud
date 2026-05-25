"""Core logic for fetching + persisting usage data for one API key."""
from __future__ import annotations
import logging
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from backend.models.api_key import APIKey
from backend.models.usage_record import UsageRecord
from backend.models.balance_record import BalanceRecord
from backend.services.provider_factory import get_provider
from backend.services.cost_calculator import calculate_cost
from backend.encryption import decrypt
from backend.schemas.usage import FetchResult

logger = logging.getLogger(__name__)


async def fetch_and_store(
    db: AsyncSession,
    api_key_row: APIKey,
    start: date | None = None,
    end: date | None = None,
    source: str = "poll",
) -> FetchResult:
    end = end or date.today()
    start = start or (end - timedelta(days=1))

    raw_key = decrypt(api_key_row.key_encrypted)
    provider = get_provider(api_key_row.provider, raw_key)

    records_saved = 0
    balance_updated = False
    error: str | None = None

    try:
        entries = await provider.fetch_usage(start, end)
        for entry in entries:
            # Upsert key: (api_key_id, usage_date, model, source, project_id)
            # NULL project_id is treated as a distinct value via IS NULL.
            project_filter = (
                UsageRecord.project_id.is_(None)
                if entry.project_id is None
                else UsageRecord.project_id == entry.project_id
            )
            existing = await db.execute(
                select(UsageRecord).where(
                    and_(
                        UsageRecord.api_key_id == api_key_row.id,
                        UsageRecord.usage_date == entry.usage_date,
                        UsageRecord.model == entry.model,
                        UsageRecord.source == source,
                        project_filter,
                    )
                )
            )
            if existing.scalars().first():
                continue

            cost = calculate_cost(entry.model, entry.input_tokens, entry.output_tokens, entry.cached_tokens)
            total = entry.input_tokens + entry.output_tokens
            record = UsageRecord(
                api_key_id=api_key_row.id,
                usage_date=entry.usage_date,
                model=entry.model,
                project_id=entry.project_id,
                input_tokens=entry.input_tokens,
                output_tokens=entry.output_tokens,
                cached_tokens=entry.cached_tokens,
                total_tokens=total,
                cost_usd=cost,
                source=source,
            )
            db.add(record)
            records_saved += 1

    except NotImplementedError as exc:
        error = f"Provider not implemented: {exc}"
        logger.warning(error)
    except Exception as exc:
        error = str(exc)
        logger.error("fetch_and_store error for key %s: %s", api_key_row.id, exc)

    # Balance fetch (best-effort)
    try:
        balance = await provider.fetch_balance()
        if balance is not None:
            db.add(BalanceRecord(
                api_key_id=api_key_row.id,
                balance_usd=balance.balance_usd,
                expiry_date=balance.expiry_date,
                fetched_at=datetime.now(timezone.utc),
            ))
            balance_updated = True
    except Exception as exc:
        logger.debug("balance fetch skipped: %s", exc)

    await db.commit()
    return FetchResult(
        api_key_id=api_key_row.id,
        records_saved=records_saved,
        balance_updated=balance_updated,
        error=error,
    )


async def backfill(db: AsyncSession, api_key_row: APIKey, days: int = 90) -> FetchResult:
    end = date.today()
    start = end - timedelta(days=days)
    return await fetch_and_store(db, api_key_row, start=start, end=end, source="historical")
