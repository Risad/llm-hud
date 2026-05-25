import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models.api_key import APIKey
from backend.schemas.api_key import APIKeyCreate, APIKeyUpdate, APIKeyOut
from backend.encryption import encrypt
from backend.services import scheduler as sched

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


@router.get("", response_model=list[APIKeyOut])
async def list_keys(workspace_id: str | None = None, db: AsyncSession = Depends(get_db)):
    q = select(APIKey).order_by(APIKey.created_at)
    if workspace_id:
        q = q.where(APIKey.workspace_id == workspace_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=APIKeyOut, status_code=201)
async def create_key(body: APIKeyCreate, background: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    # Validate workspace exists
    from backend.models.workspace import Workspace
    ws = await db.get(Workspace, body.workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    key = APIKey(
        workspace_id=body.workspace_id,
        provider=body.provider,
        label=body.label,
        key_encrypted=encrypt(body.api_key),
        key_hint=body.api_key[-4:],
        poll_interval_seconds=body.poll_interval_seconds,
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)

    # Start scheduler job and kick off 90-day backfill
    sched.add_job(key.id, key.poll_interval_seconds)
    background.add_task(_backfill_task, key.id)

    return key


async def _backfill_task(api_key_id: str) -> None:
    from backend.database import AsyncSessionLocal
    from backend.models.api_key import APIKey
    from backend.services.fetch_service import backfill
    from backend.routers.ws import broadcast

    async with AsyncSessionLocal() as db:
        key_row = await db.get(APIKey, api_key_id)
        if key_row:
            result = await backfill(db, key_row, days=90)
            await broadcast(key_row.workspace_id, {
                "event": "backfill_complete",
                "api_key_id": api_key_id,
                "records_saved": result.records_saved,
            })


@router.get("/{key_id}", response_model=APIKeyOut)
async def get_key(key_id: str, db: AsyncSession = Depends(get_db)):
    key = await db.get(APIKey, key_id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    return key


@router.patch("/{key_id}", response_model=APIKeyOut)
async def update_key(key_id: str, body: APIKeyUpdate, db: AsyncSession = Depends(get_db)):
    key = await db.get(APIKey, key_id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    if body.label is not None:
        key.label = body.label
    if body.is_active is not None:
        key.is_active = body.is_active
        if body.is_active:
            sched.add_job(key.id, key.poll_interval_seconds)
        else:
            sched.remove_job(key.id)
    if body.poll_interval_seconds is not None:
        key.poll_interval_seconds = body.poll_interval_seconds
        if key.is_active:
            sched.update_job(key.id, body.poll_interval_seconds)
    await db.commit()
    await db.refresh(key)
    return key


@router.delete("/{key_id}", status_code=204)
async def delete_key(key_id: str, db: AsyncSession = Depends(get_db)):
    key = await db.get(APIKey, key_id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    sched.remove_job(key_id)
    await db.delete(key)
    await db.commit()


@router.post("/{key_id}/validate")
async def validate_key(key_id: str, db: AsyncSession = Depends(get_db)):
    key = await db.get(APIKey, key_id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    from backend.encryption import decrypt
    from backend.services.provider_factory import get_provider
    raw = decrypt(key.key_encrypted)
    provider = get_provider(key.provider, raw)
    try:
        valid = await provider.validate_key()
        return {"valid": valid}
    except NotImplementedError:
        return {"valid": None, "message": "Validation not implemented for this provider"}
