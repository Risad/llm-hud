from datetime import datetime, date
from pydantic import BaseModel


class UsageRecordOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    api_key_id: str
    fetched_at: datetime
    usage_date: date
    model: str
    input_tokens: int
    output_tokens: int
    cached_tokens: int
    total_tokens: int
    cost_usd: float
    source: str


class BalanceRecordOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    api_key_id: str
    fetched_at: datetime
    balance_usd: float
    expiry_date: datetime | None


class AnalyticsSummary(BaseModel):
    total_tokens: int
    total_cost_usd: float
    input_tokens: int
    output_tokens: int
    cached_tokens: int
    by_model: list[dict]
    by_day: list[dict]
    by_project: list[dict]
    projects_by_model: list[dict]
    latest_balance: BalanceRecordOut | None


class FetchResult(BaseModel):
    api_key_id: str
    records_saved: int
    balance_updated: bool
    error: str | None = None
