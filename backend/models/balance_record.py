import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database import Base


class BalanceRecord(Base):
    __tablename__ = "balance_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    api_key_id: Mapped[str] = mapped_column(String(36), ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    balance_usd: Mapped[float] = mapped_column(Float, default=0.0)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    api_key: Mapped["APIKey"] = relationship("APIKey", back_populates="balance_records")
