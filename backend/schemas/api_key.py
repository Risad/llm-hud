from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

Provider = Literal["openai", "anthropic", "gemini", "glm"]

POLL_INTERVALS = [30, 60, 300, 900, 1800, 3600, 21600, 43200, 86400]


class APIKeyCreate(BaseModel):
    workspace_id: str
    provider: Provider
    label: str = Field(..., min_length=1, max_length=128)
    api_key: str = Field(..., min_length=10)
    poll_interval_seconds: int = Field(3600)

    model_config = {"json_schema_extra": {"example": {
        "workspace_id": "uuid",
        "provider": "openai",
        "label": "Production Key",
        "api_key": "sk-...",
        "poll_interval_seconds": 3600,
    }}}


class APIKeyUpdate(BaseModel):
    label: str | None = Field(None, min_length=1, max_length=128)
    is_active: bool | None = None
    poll_interval_seconds: int | None = None


class APIKeyOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    workspace_id: str
    provider: str
    label: str
    key_hint: str
    is_active: bool
    poll_interval_seconds: int
    created_at: datetime
