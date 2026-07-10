from datetime import datetime

from pydantic import BaseModel, Field


class FeedbackIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


class FeedbackOut(BaseModel):
    id: str
    user_id: str
    user_email: str | None = None
    message: str
    status: str
    admin_reply: str | None
    created_at: datetime
    resolved_at: datetime | None

    model_config = {"from_attributes": True}


class FeedbackPage(BaseModel):
    items: list[FeedbackOut]
    total: int


class FeedbackUpdate(BaseModel):
    status: str | None = Field(default=None, pattern="^(open|resolved)$")
    admin_reply: str | None = Field(default=None, max_length=4000)


class AnnouncementIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=4000)


class AnnouncementOut(BaseModel):
    id: str
    title: str
    body: str
    created_at: datetime

    model_config = {"from_attributes": True}
