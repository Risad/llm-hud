"""Google Gemini provider — stub. Implementation pending."""
from __future__ import annotations
from datetime import date
from .base_provider import BaseProvider, UsageEntry, BalanceEntry


class GeminiProvider(BaseProvider):
    @classmethod
    def provider_name(cls) -> str:
        return "gemini"

    async def validate_key(self) -> bool:
        raise NotImplementedError("Gemini provider not yet implemented")

    async def fetch_usage(self, start: date, end: date) -> list[UsageEntry]:
        raise NotImplementedError("Gemini provider not yet implemented")

    async def fetch_balance(self) -> BalanceEntry | None:
        raise NotImplementedError("Gemini provider not yet implemented")
