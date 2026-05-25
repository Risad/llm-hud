"""Settings router: pricing overrides, project name cache."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models.api_key import APIKey
from backend.models.usage_record import UsageRecord
from backend.services.cost_calculator import all_prices, set_override, delete_override, unknown_models
from backend.services import project_cache
from backend.encryption import decrypt

router = APIRouter(prefix="/settings", tags=["settings"])


class PriceOverride(BaseModel):
    model: str
    input: float
    output: float
    cached: float = 0.0


# ── Pricing ────────────────────────────────────────────────────────────────────

@router.get("/prices")
async def get_prices(
    active_only: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
):
    """Return pricing table. Pass active_only=true to restrict to models with usage records."""
    prices = all_prices()
    if not active_only:
        return prices
    # Filter to models present in UsageRecord
    result = await db.execute(select(UsageRecord.model).distinct())
    used = {r[0] for r in result.fetchall() if r[0]}
    return {m: p for m, p in prices.items() if m in used}


@router.get("/active-models")
async def get_active_models(db: AsyncSession = Depends(get_db)):
    """Return distinct model names that appear in usage records."""
    result = await db.execute(select(UsageRecord.model).distinct())
    models = sorted({r[0] for r in result.fetchall() if r[0]})
    prices = all_prices()
    return [
        {
            "model": m,
            "has_price": m in prices or any(m.startswith(k) or k.startswith(m) for k in prices),
        }
        for m in models
    ]


@router.post("/prices")
async def update_price(body: PriceOverride):
    if not body.model.strip():
        raise HTTPException(status_code=422, detail="Model name cannot be empty")
    set_override(body.model.strip(), {"input": body.input, "output": body.output, "cached": body.cached})
    return {"ok": True}


@router.delete("/prices/{model:path}")
async def remove_price_override(model: str):
    delete_override(model)
    return {"ok": True}


@router.get("/unknown-models")
async def get_unknown_models():
    return {"models": unknown_models()}


# ── Projects ───────────────────────────────────────────────────────────────────

@router.get("/projects")
async def list_projects():
    """Return cached project names (fetched from OpenAI org API)."""
    return {"projects": project_cache.all_projects()}


@router.post("/projects/refresh")
async def refresh_projects(
    workspace_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Fetch project names from OpenAI using an admin key from the workspace."""
    # Pick the first active key for the workspace (or any active key)
    q = select(APIKey).where(APIKey.is_active == True)
    if workspace_id:
        q = q.where(APIKey.workspace_id == workspace_id)
    result = await db.execute(q.limit(10))
    keys = result.scalars().all()

    last_err: str | None = None
    for key_row in keys:
        try:
            raw_key = decrypt(key_row.key_encrypted)
            projects = await project_cache.refresh_from_api(raw_key)
            return {"projects": projects, "count": len(projects)}
        except PermissionError as e:
            last_err = str(e)
            continue
        except Exception as e:
            last_err = str(e)
            continue

    raise HTTPException(
        status_code=400,
        detail=last_err or "No active keys available to fetch projects.",
    )


@router.patch("/projects/{project_id}")
async def patch_project(project_id: str, body: dict):
    """Manually set a project name/alias."""
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="name is required")
    project_cache.upsert(project_id, name)
    return {"ok": True}
