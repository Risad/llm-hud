from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from backend.database import get_db
from backend.models.api_key import APIKey
from backend.models.usage_record import UsageRecord
from backend.models.balance_record import BalanceRecord
from backend.schemas.usage import AnalyticsSummary, BalanceRecordOut
from backend.services import project_cache

router = APIRouter(prefix="/analytics", tags=["analytics"])

RANGE_DAYS = {"1d": 1, "7d": 7, "30d": 30, "90d": 90}


def _parse_range(range_str: str, start: date | None, end: date | None) -> tuple[date, date]:
    e = end or date.today()
    if start:
        return start, e
    days = RANGE_DAYS.get(range_str, 30)
    return e - timedelta(days=days - 1), e


@router.get("/summary", response_model=AnalyticsSummary)
async def summary(
    workspace_id: str | None = None,
    api_key_id: str | None = None,
    range: str = Query(default="30d", regex="^(1d|7d|30d|90d|custom)$"),
    start: date | None = None,
    end: date | None = None,
    db: AsyncSession = Depends(get_db),
):
    start_d, end_d = _parse_range(range, start, end)

    key_filter = _key_filter(workspace_id, api_key_id)

    base = [UsageRecord.usage_date >= start_d, UsageRecord.usage_date <= end_d]
    if key_filter is not None:
        base.append(key_filter)

    totals = await db.execute(
        select(
            func.sum(UsageRecord.total_tokens).label("total_tokens"),
            func.sum(UsageRecord.cost_usd).label("total_cost"),
            func.sum(UsageRecord.input_tokens).label("input_tokens"),
            func.sum(UsageRecord.output_tokens).label("output_tokens"),
            func.sum(UsageRecord.cached_tokens).label("cached_tokens"),
        ).where(and_(*base))
    )
    row = totals.one()

    # By model
    by_model_q = await db.execute(
        select(
            UsageRecord.model,
            func.sum(UsageRecord.total_tokens).label("tokens"),
            func.sum(UsageRecord.cost_usd).label("cost"),
            func.sum(UsageRecord.input_tokens).label("input_tokens"),
            func.sum(UsageRecord.output_tokens).label("output_tokens"),
        ).where(and_(*base)).group_by(UsageRecord.model).order_by(func.sum(UsageRecord.total_tokens).desc())
    )
    by_model = [
        {
            "model": r.model,
            "tokens": r.tokens or 0,
            "cost": round(r.cost or 0, 6),
            "input_tokens": r.input_tokens or 0,
            "output_tokens": r.output_tokens or 0,
        }
        for r in by_model_q
    ]

    # By project — with resolved names from the project cache
    by_project_q = await db.execute(
        select(
            UsageRecord.project_id,
            func.sum(UsageRecord.total_tokens).label("tokens"),
            func.sum(UsageRecord.cost_usd).label("cost"),
            func.sum(UsageRecord.input_tokens).label("input_tokens"),
            func.sum(UsageRecord.output_tokens).label("output_tokens"),
        ).where(and_(*base)).group_by(UsageRecord.project_id).order_by(func.sum(UsageRecord.total_tokens).desc())
    )
    by_project = [
        {
            "project_id": r.project_id or "unknown",
            "project_name": project_cache.get_project_name(r.project_id) or (r.project_id or "unknown"),
            "project_status": next(
                (p["status"] for p in project_cache.all_projects() if p["id"] == r.project_id), None
            ),
            "tokens": r.tokens or 0,
            "cost": round(r.cost or 0, 6),
            "input_tokens": r.input_tokens or 0,
            "output_tokens": r.output_tokens or 0,
        }
        for r in by_project_q
    ]

    # By day
    by_day_q = await db.execute(
        select(
            UsageRecord.usage_date,
            func.sum(UsageRecord.total_tokens).label("tokens"),
            func.sum(UsageRecord.cost_usd).label("cost"),
            func.sum(UsageRecord.input_tokens).label("input_tokens"),
            func.sum(UsageRecord.output_tokens).label("output_tokens"),
        ).where(and_(*base)).group_by(UsageRecord.usage_date).order_by(UsageRecord.usage_date)
    )
    by_day = [
        {
            "date": str(r.usage_date),
            "tokens": r.tokens or 0,
            "cost": round(r.cost or 0, 6),
            "input_tokens": r.input_tokens or 0,
            "output_tokens": r.output_tokens or 0,
        }
        for r in by_day_q
    ]

    # Projects × Models cross-tab — for the pivot table in Analytics
    px_model_q = await db.execute(
        select(
            UsageRecord.project_id,
            UsageRecord.model,
            func.sum(UsageRecord.total_tokens).label("tokens"),
            func.sum(UsageRecord.cost_usd).label("cost"),
            func.sum(UsageRecord.input_tokens).label("input_tokens"),
            func.sum(UsageRecord.output_tokens).label("output_tokens"),
        ).where(and_(*base))
        .group_by(UsageRecord.project_id, UsageRecord.model)
        .order_by(func.sum(UsageRecord.total_tokens).desc())
    )
    projects_by_model = [
        {
            "project_id": r.project_id or "unknown",
            "project_name": project_cache.get_project_name(r.project_id) or (r.project_id or "unknown"),
            "model": r.model,
            "tokens": r.tokens or 0,
            "cost": round(r.cost or 0, 6),
            "input_tokens": r.input_tokens or 0,
            "output_tokens": r.output_tokens or 0,
        }
        for r in px_model_q
    ]

    # Latest balance
    latest_balance = None
    bal_filter = [BalanceRecord.api_key_id == api_key_id] if api_key_id else (
        [BalanceRecord.api_key_id.in_(select(APIKey.id).where(APIKey.workspace_id == workspace_id))]
        if workspace_id else []
    )
    bal_q = await db.execute(
        select(BalanceRecord).where(and_(*bal_filter)).order_by(BalanceRecord.fetched_at.desc()).limit(1)
        if bal_filter else select(BalanceRecord).order_by(BalanceRecord.fetched_at.desc()).limit(1)
    )
    bal_row = bal_q.scalars().first()
    if bal_row:
        latest_balance = BalanceRecordOut.model_validate(bal_row)

    return AnalyticsSummary(
        total_tokens=int(row.total_tokens or 0),
        total_cost_usd=round(float(row.total_cost or 0), 6),
        input_tokens=int(row.input_tokens or 0),
        output_tokens=int(row.output_tokens or 0),
        cached_tokens=int(row.cached_tokens or 0),
        by_model=by_model,
        by_day=by_day,
        by_project=by_project,
        projects_by_model=projects_by_model,
        latest_balance=latest_balance,
    )


def _key_filter(workspace_id: str | None, api_key_id: str | None):
    if api_key_id:
        return UsageRecord.api_key_id == api_key_id
    if workspace_id:
        return UsageRecord.api_key_id.in_(select(APIKey.id).where(APIKey.workspace_id == workspace_id))
    return None
