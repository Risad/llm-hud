from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date, datetime


@dataclass
class UsageEntry:
    usage_date: date
    model: str
    input_tokens: int
    output_tokens: int
    cached_tokens: int
    project_id: str | None = None


@dataclass
class BalanceEntry:
    balance_usd: float
    expiry_date: datetime | None = None


class BaseProvider(ABC):
    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    @abstractmethod
    async def fetch_usage(self, start: date, end: date) -> list[UsageEntry]:
        """Fetch usage records between start and end dates (inclusive)."""

    @abstractmethod
    async def fetch_balance(self) -> BalanceEntry | None:
        """Fetch current balance / credit grants. Returns None if not available."""

    @abstractmethod
    async def validate_key(self) -> bool:
        """Return True if the API key is valid."""

    @classmethod
    @abstractmethod
    def provider_name(cls) -> str:
        """Return the provider identifier string."""
