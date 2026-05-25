import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Boolean, Integer, LargeBinary, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class APIKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)  # openai | anthropic | gemini | glm
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    key_encrypted: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    key_hint: Mapped[str] = mapped_column(String(8), nullable=False)   # last 4 chars
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    poll_interval_seconds: Mapped[int] = mapped_column(Integer, default=3600)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="api_keys")
    usage_records: Mapped[list["UsageRecord"]] = relationship("UsageRecord", back_populates="api_key", cascade="all, delete-orphan")
    balance_records: Mapped[list["BalanceRecord"]] = relationship("BalanceRecord", back_populates="api_key", cascade="all, delete-orphan")
