from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TelegramAccount(Base):
    """Per-user Telegram API credentials for the in-app chat importer."""

    __tablename__ = "telegram_accounts"

    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    api_id: Mapped[int] = mapped_column()
    api_hash: Mapped[str] = mapped_column(String(200))
    phone: Mapped[str] = mapped_column(String(40))
    api_hash_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    # A Telethon StringSession is equivalent to a logged-in Telegram session,
    # so it must never be stored or returned as plaintext. Keeping the
    # encrypted value beside the account makes authorization survive an
    # ephemeral-disk reset or a request landing on another backend instance.
    session_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
