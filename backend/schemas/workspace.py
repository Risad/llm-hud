from datetime import datetime
from pydantic import BaseModel, Field


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    color: str = Field("#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")


class WorkspaceUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=128)
    color: str | None = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")


class WorkspaceOut(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    name: str
    color: str
    created_at: datetime
