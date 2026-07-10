from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from collections import Counter

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin_user, is_admin_user
from app.db.session import get_db
from app.models.admin_event import AdminEvent
from app.models.feedback import Announcement, Feedback, FeedbackStatus
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
    AdminUserUpdate,
    SignupDay,
)
from app.schemas.feedback import AnnouncementIn, AnnouncementOut, FeedbackOut, FeedbackPage, FeedbackUpdate
from app.services.admin_events import log_event

# Every route here requires the configured admin email (or a granted "admin"
# role — see app.api.deps.is_admin_user) — enforced once at the router level
# rather than repeated on each endpoint.
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

    open_feedback_count = (
        await db.scalar(select(func.count()).where(Feedback.status == FeedbackStatus.OPEN.value)) or 0
    )

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
        open_feedback_count=open_feedback_count,
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
                is_admin=is_admin_user(user),
                created_at=user.created_at,
                media_count=media_count,
                job_count=job_count,
                storage_bytes=storage_bytes,
                telegram_linked=user.id in telegram_user_ids,
                last_activity_at=last_activity_at,
            )
        )
    return AdminUsersPage(items=items, total=total)


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user(
    user_id: str,
    payload: AdminUserUpdate,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AdminUserOut:
    target = await db.get(User, user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    if payload.email is not None and payload.email.lower() != target.email.lower():
        existing = await db.scalar(select(User).where(User.email == payload.email))
        if existing is not None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Another account already uses that email")
        target.email = payload.email

    if payload.role is not None:
        if target.id == admin_user.id and payload.role != "admin":
            # The env-var admin can still always get back in, but a
            # role-granted admin removing their own role would instantly
            # lock them out of the panel they're using right now.
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't remove your own admin role")
        target.role = payload.role if payload.role == "admin" else None

    await db.commit()
    await db.refresh(target)
    await log_event(db, "admin_user_updated", user_id=admin_user.id, detail=f"updated {target.email}")
    await db.commit()

    media_count = await db.scalar(select(func.count()).where(Media.user_id == target.id)) or 0
    job_count = await db.scalar(select(func.count()).where(Job.user_id == target.id)) or 0
    storage_bytes = (
        await db.scalar(select(func.coalesce(func.sum(Media.file_size_bytes), 0)).where(Media.user_id == target.id))
        or 0
    )
    telegram_linked = (await db.scalar(select(TelegramAccount.user_id).where(TelegramAccount.user_id == target.id))) is not None
    last_activity_at = await db.scalar(select(func.max(Job.created_at)).where(Job.user_id == target.id))
    return AdminUserOut(
        id=target.id,
        email=target.email,
        display_name=target.display_name,
        is_admin=is_admin_user(target),
        created_at=target.created_at,
        media_count=media_count,
        job_count=job_count,
        storage_bytes=storage_bytes,
        telegram_linked=telegram_linked,
        last_activity_at=last_activity_at,
    )


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


@router.get("/feedback", response_model=FeedbackPage)
async def admin_feedback(
    status_filter: str | None = Query(None, alias="status", pattern="^(open|resolved)$"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> FeedbackPage:
    stmt = select(Feedback, User.email).join(User, Feedback.user_id == User.id)
    if status_filter:
        stmt = stmt.where(Feedback.status == status_filter)

    total = await db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = (await db.execute(stmt.order_by(Feedback.created_at.desc()).limit(limit).offset(offset))).all()
    items = []
    for entry, email in rows:
        out = FeedbackOut.model_validate(entry)
        out.user_email = email
        items.append(out)
    return FeedbackPage(items=items, total=total)


@router.patch("/feedback/{feedback_id}", response_model=FeedbackOut)
async def update_feedback(
    feedback_id: str,
    payload: FeedbackUpdate,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> FeedbackOut:
    entry = await db.get(Feedback, feedback_id)
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Feedback not found")

    if payload.admin_reply is not None:
        entry.admin_reply = payload.admin_reply
    if payload.status is not None:
        entry.status = payload.status
        entry.resolved_at = datetime.now(timezone.utc) if payload.status == FeedbackStatus.RESOLVED.value else None
        await log_event(db, "feedback_resolved", user_id=admin_user.id, detail=entry.id)

    await db.commit()
    await db.refresh(entry)
    user_email = await db.scalar(select(User.email).where(User.id == entry.user_id))
    out = FeedbackOut.model_validate(entry)
    out.user_email = user_email
    return out


@router.post("/announcements", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    payload: AnnouncementIn,
    admin_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
) -> AnnouncementOut:
    announcement = Announcement(title=payload.title, body=payload.body, created_by=admin_user.id)
    db.add(announcement)
    await log_event(db, "announcement_created", user_id=admin_user.id, detail=payload.title)
    await db.commit()
    await db.refresh(announcement)
    return AnnouncementOut.model_validate(announcement)


@router.get("/announcements", response_model=list[AnnouncementOut])
async def list_announcements_admin(db: AsyncSession = Depends(get_db)) -> list[AnnouncementOut]:
    rows = (await db.scalars(select(Announcement).order_by(Announcement.created_at.desc()).limit(50))).all()
    return [AnnouncementOut.model_validate(a) for a in rows]


@router.delete("/announcements/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(announcement_id: str, db: AsyncSession = Depends(get_db)) -> None:
    announcement = await db.get(Announcement, announcement_id)
    if announcement is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Announcement not found")
    await db.delete(announcement)
    await db.commit()


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
