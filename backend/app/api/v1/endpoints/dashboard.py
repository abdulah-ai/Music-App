from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.job import Job, JobStatus
from app.models.media import Media, MediaType
from app.models.media_state import MediaState
from app.models.telegram_account import TelegramAccount
from app.models.user import User
from app.services.telegram import telegram_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def summary(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    media_stats = (await db.execute(select(
        func.count(Media.id), func.coalesce(func.sum(Media.file_size_bytes), 0),
        func.sum(case((Media.media_type == MediaType.AUDIO, 1), else_=0)),
        func.sum(case((Media.media_type == MediaType.VIDEO, 1), else_=0)),
    ).where(Media.user_id == current_user.id))).one()
    job_stats = (await db.execute(select(
        func.sum(case((Job.status.in_([JobStatus.PENDING, JobStatus.IN_PROGRESS]), 1), else_=0)),
        func.sum(case((Job.status == JobStatus.FAILED, 1), else_=0)),
    ).where(Job.user_id == current_user.id))).one()
    favorites = await db.scalar(select(func.count(MediaState.id)).where(
        MediaState.user_id == current_user.id, MediaState.favorite.is_(True))) or 0
    account = await db.get(TelegramAccount, current_user.id)
    telegram_authorized = False
    if account is not None:
        try:
            telegram_authorized = await telegram_service.is_authorized(account)
        except Exception:
            pass
    used = int(media_stats[1] or 0)
    return {
        "total_files": int(media_stats[0] or 0), "total_storage_bytes": used,
        "media_type_breakdown": {"audio": int(media_stats[2] or 0), "video": int(media_stats[3] or 0)},
        "active_downloads": int(job_stats[0] or 0), "failed_downloads": int(job_stats[1] or 0),
        "favorites": int(favorites),
        "telegram": {"configured": account is not None, "authorized": telegram_authorized},
        "storage_warning": used >= 10 * 1024 * 1024 * 1024,
    }
