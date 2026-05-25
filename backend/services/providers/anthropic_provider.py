"""Anthropic provider — stub. Implementation pending."""
from __future__ import annotations
from datetime import date
from .base_provider import BaseProvider, UsageEntry, BalanceEntry


class AnthropicProvider(BaseProvider):
    @classmethod
    def provider_name(cls) -> str:
        return "anthropic"

    async def validate_key(self) -> bool:
        raise NotImplementedError("Anthropic provider not yet implemented")

    async def fetch_usage(self, start: date, end: date) -> list[UsageEntry]:
        raise NotImplementedError("Anthropic provider not yet implemented")

    async def fetch_balance(self) -> BalanceEntry | None:
        raise NotImplementedError("Anthropic provider not yet implemented")
