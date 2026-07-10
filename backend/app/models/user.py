import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(100))
    hashed_password: Mapped[str] = mapped_column(String(255))
    # "auto" (deployment default), "local" (this server's disk), or "cloud"
    # (the S3-compatible bucket) — see app.services.storage.backend.resolve_backend.
    storage_preference: Mapped[str | None] = mapped_column(String(10), nullable=True)
    # None (=="user") or "admin" — granted by an existing admin via
    # PATCH /admin/users/{id}. SMA_ADMIN_EMAIL is still a separate, always-on
    # admin path independent of this column — see app.api.deps.get_current_admin_user.
    role: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    media_items: Mapped[list["Media"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    jobs: Mapped[list["Job"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    playlists: Mapped[list["Playlist"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
