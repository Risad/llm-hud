from __future__ import annotations
import logging
from datetime import date, datetime, timezone
from typing import Any
import httpx
from .base_provider import BaseProvider, UsageEntry, BalanceEntry

logger = logging.getLogger(__name__)

OPENAI_BASE = "https://api.openai.com"

USAGE_CATEGORIES = [
    "completions",
    "embeddings",
    "images",
    "audio_speeches",
    "audio_transcriptions",
    "moderations",
]


class OpenAIProvider(BaseProvider):
    @classmethod
    def provider_name(cls) -> str:
        return "openai"

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}"}

    async def validate_key(self) -> bool:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{OPENAI_BASE}/v1/models", headers=self._headers())
            return r.status_code == 200

    async def fetch_usage(self, start: date, end: date) -> list[UsageEntry]:
        start_ts = int(datetime(start.year, start.month, start.day, tzinfo=timezone.utc).timestamp())
        end_ts = int(datetime(end.year, end.month, end.day, 23, 59, 59, tzinfo=timezone.utc).timestamp())

        entries: list[UsageEntry] = []
        forbidden_count = 0
        async with httpx.AsyncClient(timeout=60) as client:
            for category in USAGE_CATEGORIES:
                page_entries, was_forbidden = await self._fetch_category(client, category, start_ts, end_ts)
                entries.extend(page_entries)
                if was_forbidden:
                    forbidden_count += 1

        if forbidden_count == len(USAGE_CATEGORIES):
            raise PermissionError(
                "403 Forbidden on all usage endpoints. "
                "This key cannot access organization usage data. "
                "You need an Admin API key: platform.openai.com → Settings → API Keys → Admin keys."
            )

        return entries

    async def _fetch_category(
        self,
        client: httpx.AsyncClient,
        category: str,
        start_ts: int,
        end_ts: int,
    ) -> tuple[list[UsageEntry], bool]:
        """Returns (entries, was_forbidden).

        Always requests group_by[]=project_id so each result carries its
        OpenAI project. Pagination carries all required params on every page.
        """
        LIMIT = 31  # OpenAI caps daily-bucket requests at 31 per page
        # Base params are kept on every page (including pagination pages).
        base_params: dict[str, Any] = {
            "start_time": start_ts,
            "end_time": end_ts,
            "bucket_width": "1d",
            "limit": LIMIT,
            "group_by[]": "project_id",
        }
        params: dict[str, Any] = dict(base_params)
        url = f"{OPENAI_BASE}/v1/organization/usage/{category}"
        entries: list[UsageEntry] = []

        while url:
            try:
                r = await client.get(url, headers=self._headers(), params=params)
                if r.status_code == 403:
                    logger.warning("OpenAI 403 on %s — key lacks org-level permissions", category)
                    return entries, True
                if r.status_code == 404:
                    break
                if r.status_code == 429:
                    logger.warning("OpenAI usage API rate limited for %s", category)
                    break
                if not r.is_success:
                    logger.error("OpenAI usage %s HTTP %s: %s", category, r.status_code, r.text[:400])
                    break
            except httpx.HTTPStatusError as exc:
                logger.error("OpenAI usage fetch error %s: %s", category, exc)
                break

            data = r.json()
            for bucket in data.get("data", []):
                usage_date = datetime.fromtimestamp(
                    bucket.get("start_time", 0), tz=timezone.utc
                ).date()
                for result in bucket.get("results", []):
                    model = result.get("model") or "unknown"
                    project_id: str | None = result.get("project_id") or None
                    input_t = result.get("input_tokens", 0) or 0
                    output_t = result.get("output_tokens", 0) or 0
                    cached_t = result.get("input_cached_tokens", 0) or 0
                    # Skip zero-token results (often empty project_id buckets)
                    if input_t == 0 and output_t == 0:
                        continue
                    entries.append(UsageEntry(
                        usage_date=usage_date,
                        model=model,
                        project_id=project_id,
                        input_tokens=input_t,
                        output_tokens=output_t,
                        cached_tokens=cached_t,
                    ))

            # Pagination: keep ALL base params and add the cursor.
            # OpenAI still requires start_time on every page.
            next_page = data.get("next_page")
            if next_page:
                params = {**base_params, "page": next_page}
            else:
                break

        return entries, False

    async def fetch_balance(self) -> BalanceEntry | None:
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                r = await client.get(
                    f"{OPENAI_BASE}/v1/dashboard/billing/credit_grants",
                    headers=self._headers(),
                )
                if r.status_code == 200:
                    data = r.json()
                    balance = data.get("total_available", 0.0) or 0.0
                    grants = data.get("grants", {}).get("data", [])
                    expiry = None
                    if grants:
                        try:
                            expiry = datetime.fromtimestamp(
                                grants[0].get("expires_at", 0), tz=timezone.utc
                            )
                        except Exception:
                            pass
                    return BalanceEntry(balance_usd=float(balance), expiry_date=expiry)
            except Exception as exc:
                logger.debug("credit_grants not available: %s", exc)

            try:
                r = await client.get(
                    f"{OPENAI_BASE}/v1/dashboard/billing/subscription",
                    headers=self._headers(),
                )
                if r.status_code == 200:
                    data = r.json()
                    soft_limit = data.get("soft_limit_usd", 0.0) or 0.0
                    return BalanceEntry(balance_usd=float(soft_limit), expiry_date=None)
            except Exception as exc:
                logger.debug("subscription endpoint not available: %s", exc)

        return None
