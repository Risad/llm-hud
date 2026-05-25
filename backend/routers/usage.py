from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from backend.database import get_db
from backend.models.api_key import APIKey
from backend.models.usage_record import UsageRecord
from backend.models.balance_record import BalanceRecord
from backend.schemas.usage import UsageRecordOut, BalanceRecordOut, FetchResult

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("", response_model=list[UsageRecordOut])
async def list_usage(
    api_key_id: str | None = None,
    workspace_id: str | None = None,
    start: date | None = None,
    end: date | None = None,
    db: AsyncSession = Depends(get_db),
):
    end = end or date.today()
    start = start or (end - timedelta(days=30))

    filters = [UsageRecord.usage_date >= start, UsageRecord.usage_date <= end]

    if api_key_id:
        filters.append(UsageRecord.api_key_id == api_key_id)
    elif workspace_id:
        subq = select(APIKey.id).where(APIKey.workspace_id == workspace_id)
        filters.append(UsageRecord.api_key_id.in_(subq))

    result = await db.execute(
        select(UsageRecord).where(and_(*filters)).order_by(UsageRecord.usage_date.desc())
    )
    return result.scalars().all()


@router.post("/fetch", response_model=FetchResult)
async def trigger_fetch(
    api_key_id: str,
    start: date | None = None,
    end: date | None = None,
    db: AsyncSession = Depends(get_db),
):
    key = await db.get(APIKey, api_key_id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    from backend.services.fetch_service import fetch_and_store
    end = end or date.today()
    start = start or (end - timedelta(days=1))
    result = await fetch_and_store(db, key, start=start, end=end, source="poll")
    return result


@router.post("/backfill", response_model=FetchResult)
async def trigger_backfill(
    api_key_id: str,
    days: int = Query(default=90, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    key = await db.get(APIKey, api_key_id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    from backend.services.fetch_service import backfill
    result = await backfill(db, key, days=days)
    return result


@router.get("/balance", response_model=list[BalanceRecordOut])
async def list_balance(
    api_key_id: str | None = None,
    workspace_id: str | None = None,
    limit: int = Query(default=10, le=100),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if api_key_id:
        filters.append(BalanceRecord.api_key_id == api_key_id)
    elif workspace_id:
        subq = select(APIKey.id).where(APIKey.workspace_id == workspace_id)
        filters.append(BalanceRecord.api_key_id.in_(subq))

    q = select(BalanceRecord).order_by(BalanceRecord.fetched_at.desc()).limit(limit)
    if filters:
        from sqlalchemy import and_
        q = q.where(and_(*filters))

    result = await db.execute(q)
    return result.scalars().all()
