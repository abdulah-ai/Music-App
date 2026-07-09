from datetime import datetime

from pydantic import BaseModel


class SignupDay(BaseModel):
    date: str
    count: int


class AdminStatsOut(BaseModel):
    total_users: int
    total_media: int
    audio_count: int
    video_count: int
    storage_bytes: int
    jobs_by_status: dict[str, int]
    # None until at least one recognition has ever completed or failed.
    recognition_success_rate: float | None
    telegram_linked_users: int
    signups_last_30_days: list[SignupDay]


class AdminUserOut(BaseModel):
    id: str
    email: str
    display_name: str
    created_at: datetime
    media_count: int
    job_count: int
    storage_bytes: int
    telegram_linked: bool
    last_activity_at: datetime | None

    model_config = {"from_attributes": True}


class AdminUsersPage(BaseModel):
    items: list[AdminUserOut]
    total: int


class AdminJobOut(BaseModel):
    id: str
    user_id: str
    user_email: str
    job_type: str
    status: str
    source_url: str | None
    error_message: str | None
    created_at: datetime


class AdminJobsPage(BaseModel):
    items: list[AdminJobOut]
    total: int


class AdminEventOut(BaseModel):
    id: str
    event_type: str
    user_id: str | None
    user_email: str | None
    detail: str | None
    created_at: datetime


class AdminLogsPage(BaseModel):
    items: list[AdminEventOut]
    total: int
