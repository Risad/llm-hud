"""Cache OpenAI project names fetched via the admin API.

Project metadata (name, status) is stored in ~/.llm-hud/projects.json and
refreshed on demand via the /settings/projects/refresh endpoint.
"""
from __future__ import annotations
import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)
_PROJECTS_FILE = Path.home() / ".llm-hud" / "projects.json"

# project_id → {name, status}
_cache: dict[str, dict[str, Any]] = {}


def _load() -> None:
    global _cache
    try:
        if _PROJECTS_FILE.exists():
            _cache = json.loads(_PROJECTS_FILE.read_text(encoding="utf-8"))
    except Exception as exc:
        logger.warning("Could not load projects.json: %s", exc)


def _save() -> None:
    try:
        _PROJECTS_FILE.parent.mkdir(parents=True, exist_ok=True)
        _PROJECTS_FILE.write_text(json.dumps(_cache, indent=2), encoding="utf-8")
    except Exception as exc:
        logger.warning("Could not save projects.json: %s", exc)


_load()


def all_projects() -> list[dict]:
    return [{"id": k, "name": v.get("name", k), "status": v.get("status", "active")} for k, v in _cache.items()]


def get_project_name(project_id: str | None) -> str | None:
    if not project_id:
        return None
    return _cache.get(project_id, {}).get("name")


def upsert(project_id: str, name: str, status: str = "active") -> None:
    _cache[project_id] = {"name": name, "status": status}
    _save()


async def refresh_from_api(api_key: str) -> list[dict]:
    """Fetch all projects from the OpenAI org API and update the cache."""
    import httpx

    url = "https://api.openai.com/v1/organization/projects"
    headers = {"Authorization": f"Bearer {api_key}"}
    params: dict = {"limit": 100, "include_archived": "true"}
    fetched: list[dict] = []

    async with httpx.AsyncClient(timeout=15) as client:
        while True:
            r = await client.get(url, headers=headers, params=params)
            if r.status_code in (401, 403):
                raise PermissionError(
                    f"HTTP {r.status_code} — Admin API key required to list organization projects. "
                    "Create one at: platform.openai.com → Settings → API Keys → Admin keys."
                )
            if not r.is_success:
                raise RuntimeError(
                    f"OpenAI projects API returned HTTP {r.status_code}: {r.text[:300]}"
                )
            data = r.json()
            for p in data.get("data", []):
                pid = p.get("id", "")
                name = p.get("name") or pid
                status = p.get("status", "active")
                if pid:
                    _cache[pid] = {"name": name, "status": status}
                    fetched.append({"id": pid, "name": name, "status": status})

            if not data.get("has_more", False):
                break
            last = data["data"][-1]["id"] if data.get("data") else None
            if not last:
                break
            params = {"limit": 100, "include_archived": "true", "after": last}

    if fetched:
        _save()
    return fetched
