from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from collections import Counter

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin_user
from app.db.session import get_db
from app.models.admin_event import AdminEvent
from app.models.job import Job, JobStatus, JobType
from app.models.media import Media, MediaType
from app.models.telegram_account import TelegramAccount
from app.models.user import User
from app.schemas.admin import (
    AdminEventOut,
    AdminJobOut,
    AdminJobsPage,
    AdminLogsPage,
    AdminStatsOut,
    AdminUserOut,
    AdminUsersPage,
    SignupDay,
)

# Every route here requires the configured admin email — enforced once at the
# router level rather than repeated on each endpoint.
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin_user)])


@router.get("/stats", response_model=AdminStatsOut)
async def admin_stats(db: AsyncSession = Depends(get_db)) -> AdminStatsOut:
    total_users = await db.scalar(select(func.count()).select_from(User)) or 0
    total_media = await db.scalar(select(func.count()).select_from(Media)) or 0
    audio_count = await db.scalar(select(func.count()).where(Media.media_type == MediaType.AUDIO)) or 0
    video_count = total_media - audio_count
    storage_bytes = await db.scalar(select(func.coalesce(func.sum(Media.file_size_bytes), 0))) or 0

    status_rows = (await db.execute(select(Job.status, func.count()).group_by(Job.status))).all()
    jobs_by_status = {job_status: count for job_status, count in status_rows}

    # A recognize job's outcome lives in stage_label ("matched"/"no_match")
    # rather than a dedicated column — see job_engine.run_recognition_job.
    recognize_rows = (
        await db.execute(
            select(Job.stage_label, func.count())
            .where(Job.job_type == JobType.RECOGNIZE, Job.status == JobStatus.COMPLETE)
            .group_by(Job.stage_label)
        )
    ).all()
    matched = sum(count for label, count in recognize_rows if label == "matched")
    no_match = sum(count for label, count in recognize_rows if label == "no_match")
    recognize_failed = (
        await db.scalar(select(func.count()).where(Job.job_type == JobType.RECOGNIZE, Job.status == JobStatus.FAILED))
        or 0
    )
    recognize_total = matched + no_match + recognize_failed
    recognition_success_rate = (matched / recognize_total) if recognize_total else None

    telegram_linked_users = (
        await db.scalar(select(func.count(func.distinct(AdminEvent.user_id))).where(AdminEvent.event_type == "telegram_linked"))
        or 0
    )

    # Grouping "by calendar day" in SQL isn't portable across SQLite (no real
    # DATE cast — CAST(x AS DATE) is a no-op there) and Postgres — a personal
    # app's signup volume is small enough to just group in Python instead.
    since = datetime.now(timezone.utc) - timedelta(days=30)
    recent_signups = (await db.scalars(select(User.created_at).where(User.created_at >= since))).all()
    day_counts = Counter(created_at.date().isoformat() for created_at in recent_signups)
    signups_last_30_days = [SignupDay(date=date, count=count) for date, count in sorted(day_counts.items())]

    return AdminStatsOut(
        total_users=total_users,
        total_media=total_media,
        audio_count=audio_count,
        video_count=video_count,
        storage_bytes=storage_bytes,
        jobs_by_status=jobs_by_status,
        recognition_success_rate=recognition_success_rate,
        telegram_linked_users=telegram_linked_users,
        signups_last_30_days=signups_last_30_days,
    )


@router.get("/users", response_model=AdminUsersPage)
async def admin_users(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> AdminUsersPage:
    total = await db.scalar(select(func.count()).select_from(User)) or 0
    users = (await db.scalars(select(User).order_by(User.created_at.desc()).limit(limit).offset(offset))).all()
    telegram_user_ids = set((await db.scalars(select(TelegramAccount.user_id))).all())

    items: list[AdminUserOut] = []
    for user in users:
        media_count = await db.scalar(select(func.count()).where(Media.user_id == user.id)) or 0
        job_count = await db.scalar(select(func.count()).where(Job.user_id == user.id)) or 0
        storage_bytes = (
            await db.scalar(select(func.coalesce(func.sum(Media.file_size_bytes), 0)).where(Media.user_id == user.id)) or 0
        )
        last_activity_at = await db.scalar(select(func.max(Job.created_at)).where(Job.user_id == user.id))
        items.append(
            AdminUserOut(
                id=user.id,
                email=user.email,
                display_name=user.display_name,
                created_at=user.created_at,
                media_count=media_count,
                job_count=job_count,
                storage_bytes=storage_bytes,
                telegram_linked=user.id in telegram_user_ids,
                last_activity_at=last_activity_at,
            )
        )
    return AdminUsersPage(items=items, total=total)


@router.get("/jobs", response_model=AdminJobsPage)
async def admin_jobs(
    status_filter: JobStatus | None = Query(None, alias="status"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> AdminJobsPage:
    stmt = select(Job, User.email).join(User, Job.user_id == User.id)
    if status_filter:
        stmt = stmt.where(Job.status == status_filter)

    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = (await db.execute(stmt.order_by(Job.created_at.desc()).limit(limit).offset(offset))).all()
    items = [
        AdminJobOut(
            id=job.id,
            user_id=job.user_id,
            user_email=email,
            job_type=job.job_type,
            status=job.status,
            source_url=job.source_url,
            error_message=job.error_message,
            created_at=job.created_at,
        )
        for job, email in rows
    ]
    return AdminJobsPage(items=items, total=total)


@router.get("/logs", response_model=AdminLogsPage)
async def admin_logs(
    event_type: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> AdminLogsPage:
    stmt = select(AdminEvent, User.email).outerjoin(User, AdminEvent.user_id == User.id)
    if event_type:
        stmt = stmt.where(AdminEvent.event_type == event_type)

    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = (await db.execute(stmt.order_by(AdminEvent.created_at.desc()).limit(limit).offset(offset))).all()
    items = [
        AdminEventOut(
            id=event.id,
            event_type=event.event_type,
            user_id=event.user_id,
            user_email=email,
            detail=event.detail,
            created_at=event.created_at,
        )
        for event, email in rows
    ]
    return AdminLogsPage(items=items, total=total)
