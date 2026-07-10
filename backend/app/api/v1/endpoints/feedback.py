from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.feedback import Announcement, Feedback
from app.models.user import User
from app.schemas.feedback import AnnouncementOut, FeedbackIn, FeedbackOut
from app.services.admin_events import log_event

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    payload: FeedbackIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FeedbackOut:
    entry = Feedback(user_id=current_user.id, message=payload.message)
    db.add(entry)
    await log_event(db, "feedback_submitted", user_id=current_user.id, detail=payload.message[:120])
    await db.commit()
    await db.refresh(entry)
    out = FeedbackOut.model_validate(entry)
    out.user_email = current_user.email
    return out


@router.get("/announcements", response_model=list[AnnouncementOut])
async def list_announcements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AnnouncementOut]:
    rows = (await db.scalars(select(Announcement).order_by(Announcement.created_at.desc()).limit(20))).all()
    return [AnnouncementOut.model_validate(a) for a in rows]
