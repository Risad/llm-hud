"""
Token → USD conversion table. Prices are per 1,000,000 tokens (1M).
Users can override these via the Settings API; overrides persist to
~/.llm-hud/prices.json across restarts.

NOTE: OpenAI does not expose a pricing API endpoint. Prices here reflect
published rates as of mid-2025. Use the Settings page to correct any that
have changed.
"""
from __future__ import annotations
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)
_PRICES_FILE = Path.home() / ".llm-hud" / "prices.json"

# fmt: off
DEFAULT_PRICES: dict[str, dict[str, float]] = {
    # ── OpenAI GPT-4o family ────────────────────────────────────────────────
    "gpt-4o":                       {"input": 2.50,  "output": 10.00, "cached": 1.25},
    "gpt-4o-2024-11-20":            {"input": 2.50,  "output": 10.00, "cached": 1.25},
    "gpt-4o-2024-08-06":            {"input": 2.50,  "output": 10.00, "cached": 1.25},
    "gpt-4o-2024-05-13":            {"input": 5.00,  "output": 15.00, "cached": 2.50},
    "gpt-4o-mini":                  {"input": 0.15,  "output": 0.60,  "cached": 0.075},
    "gpt-4o-mini-2024-07-18":       {"input": 0.15,  "output": 0.60,  "cached": 0.075},
    # ── OpenAI GPT-4.1 family ───────────────────────────────────────────────
    "gpt-4.1":                      {"input": 2.00,  "output": 8.00,  "cached": 0.50},
    "gpt-4.1-2025-04-14":           {"input": 2.00,  "output": 8.00,  "cached": 0.50},
    "gpt-4.1-mini":                 {"input": 0.40,  "output": 1.60,  "cached": 0.10},
    "gpt-4.1-mini-2025-04-14":      {"input": 0.40,  "output": 1.60,  "cached": 0.10},
    "gpt-4.1-nano":                 {"input": 0.10,  "output": 0.40,  "cached": 0.025},
    "gpt-4.1-nano-2025-04-14":      {"input": 0.10,  "output": 0.40,  "cached": 0.025},
    # ── OpenAI GPT-4 Turbo / GPT-4 ─────────────────────────────────────────
    "gpt-4-turbo":                  {"input": 10.00, "output": 30.00, "cached": 5.00},
    "gpt-4-turbo-2024-04-09":       {"input": 10.00, "output": 30.00, "cached": 5.00},
    "gpt-4-turbo-preview":          {"input": 10.00, "output": 30.00, "cached": 5.00},
    "gpt-4":                        {"input": 30.00, "output": 60.00, "cached": 15.00},
    "gpt-4-0613":                   {"input": 30.00, "output": 60.00, "cached": 15.00},
    "gpt-4-32k":                    {"input": 60.00, "output": 120.00, "cached": 30.00},
    # ── OpenAI GPT-3.5 ──────────────────────────────────────────────────────
    "gpt-3.5-turbo":                {"input": 0.50,  "output": 1.50,  "cached": 0.25},
    "gpt-3.5-turbo-0125":           {"input": 0.50,  "output": 1.50,  "cached": 0.25},
    "gpt-3.5-turbo-1106":           {"input": 1.00,  "output": 2.00,  "cached": 0.50},
    "gpt-3.5-turbo-instruct":       {"input": 1.50,  "output": 2.00,  "cached": 0.75},
    # ── OpenAI o-series ─────────────────────────────────────────────────────
    "o1":                           {"input": 15.00, "output": 60.00, "cached": 7.50},
    "o1-2024-12-17":                {"input": 15.00, "output": 60.00, "cached": 7.50},
    "o1-mini":                      {"input": 1.10,  "output": 4.40,  "cached": 0.55},
    "o1-mini-2024-09-12":           {"input": 1.10,  "output": 4.40,  "cached": 0.55},
    "o1-pro":                       {"input": 150.00,"output": 600.00,"cached": 75.00},
    "o3":                           {"input": 10.00, "output": 40.00, "cached": 2.50},
    "o3-2025-04-16":                {"input": 10.00, "output": 40.00, "cached": 2.50},
    "o3-mini":                      {"input": 1.10,  "output": 4.40,  "cached": 0.55},
    "o3-mini-2025-01-31":           {"input": 1.10,  "output": 4.40,  "cached": 0.55},
    "o4-mini":                      {"input": 1.10,  "output": 4.40,  "cached": 0.275},
    "o4-mini-2025-04-16":           {"input": 1.10,  "output": 4.40,  "cached": 0.275},
    # ── OpenAI embeddings ───────────────────────────────────────────────────
    "text-embedding-3-small":       {"input": 0.02,  "output": 0.0,   "cached": 0.0},
    "text-embedding-3-large":       {"input": 0.13,  "output": 0.0,   "cached": 0.0},
    "text-embedding-ada-002":       {"input": 0.10,  "output": 0.0,   "cached": 0.0},
    # ── OpenAI image generation ─────────────────────────────────────────────
    "dall-e-3":                     {"input": 0.0,   "output": 0.0,   "cached": 0.0},
    "dall-e-2":                     {"input": 0.0,   "output": 0.0,   "cached": 0.0},
    # ── OpenAI audio ────────────────────────────────────────────────────────
    "whisper-1":                    {"input": 0.006, "output": 0.0,   "cached": 0.0},
    "tts-1":                        {"input": 15.00, "output": 0.0,   "cached": 0.0},
    "tts-1-hd":                     {"input": 30.00, "output": 0.0,   "cached": 0.0},
    # ── Anthropic Claude (stubs — populated when provider implemented) ───────
    "claude-opus-4-7":              {"input": 15.00, "output": 75.00, "cached": 1.50},
    "claude-opus-4-5":              {"input": 15.00, "output": 75.00, "cached": 1.50},
    "claude-sonnet-4-6":            {"input": 3.00,  "output": 15.00, "cached": 0.30},
    "claude-sonnet-4-5":            {"input": 3.00,  "output": 15.00, "cached": 0.30},
    "claude-haiku-4-5":             {"input": 0.80,  "output": 4.00,  "cached": 0.08},
    "claude-3-5-sonnet-20241022":   {"input": 3.00,  "output": 15.00, "cached": 0.30},
    "claude-3-5-haiku-20241022":    {"input": 0.80,  "output": 4.00,  "cached": 0.08},
    "claude-3-opus-20240229":       {"input": 15.00, "output": 75.00, "cached": 1.50},
    # ── Google Gemini (stubs) ────────────────────────────────────────────────
    "gemini-2.5-pro":               {"input": 1.25,  "output": 10.00, "cached": 0.3125},
    "gemini-2.0-flash":             {"input": 0.10,  "output": 0.40,  "cached": 0.025},
    "gemini-2.0-flash-lite":        {"input": 0.075, "output": 0.30,  "cached": 0.01875},
    "gemini-1.5-pro":               {"input": 1.25,  "output": 5.00,  "cached": 0.3125},
    "gemini-1.5-flash":             {"input": 0.075, "output": 0.30,  "cached": 0.01875},
}
# fmt: on


def _load_overrides() -> dict[str, dict[str, float]]:
    try:
        if _PRICES_FILE.exists():
            return json.loads(_PRICES_FILE.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("Could not load prices.json: %s", exc)
    return {}


def _save_overrides() -> None:
    try:
        _PRICES_FILE.parent.mkdir(parents=True, exist_ok=True)
        _PRICES_FILE.write_text(json.dumps(_overrides, indent=2), encoding="utf-8")
    except Exception as exc:
        logger.warning("Could not save prices.json: %s", exc)


# Runtime overrides — persisted to ~/.llm-hud/prices.json
_overrides: dict[str, dict[str, float]] = _load_overrides()

# Models seen in usage data that have no configured price
_unknown_models: set[str] = set()


def set_override(model: str, prices: dict[str, float]) -> None:
    _overrides[model] = prices
    _unknown_models.discard(model)
    _save_overrides()


def delete_override(model: str) -> None:
    _overrides.pop(model, None)
    _save_overrides()


def unknown_models() -> list[str]:
    return sorted(_unknown_models)


def get_prices(model: str) -> dict[str, float]:
    if model in _overrides:
        return _overrides[model]
    if model in DEFAULT_PRICES:
        return DEFAULT_PRICES[model]
    # Fuzzy match: "gpt-4o-2024-05-13" → "gpt-4o"
    for key in (*_overrides, *DEFAULT_PRICES):
        if model.startswith(key) or key.startswith(model):
            return _overrides.get(key) or DEFAULT_PRICES.get(key, {})
    _unknown_models.add(model)
    return {"input": 0.0, "output": 0.0, "cached": 0.0}


def calculate_cost(model: str, input_tokens: int, output_tokens: int, cached_tokens: int = 0) -> float:
    prices = get_prices(model)
    per_m = 1_000_000
    cost = (
        (input_tokens / per_m) * prices.get("input", 0)
        + (output_tokens / per_m) * prices.get("output", 0)
        + (cached_tokens / per_m) * prices.get("cached", 0)
    )
    return round(cost, 8)


def all_prices() -> dict[str, dict[str, float]]:
    merged = {**DEFAULT_PRICES, **_overrides}
    return merged
