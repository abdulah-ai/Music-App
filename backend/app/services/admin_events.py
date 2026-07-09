from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin_event import AdminEvent

EventType = Literal[
    "user_registered",
    "job_created",
    "job_completed",
    "job_failed",
    "telegram_linked",
    "media_deleted",
]


async def log_event(db: AsyncSession, event_type: EventType, user_id: str | None = None, detail: str | None = None) -> None:
    """Fire-and-forget activity log entry for the admin dashboard. Callers
    already hold an open session mid-request — this adds one row to the same
    transaction rather than opening a separate one, so it commits atomically
    with whatever the caller is already doing (or rolls back with it)."""
    db.add(AdminEvent(event_type=event_type, user_id=user_id, detail=detail))
