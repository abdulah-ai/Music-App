from datetime import datetime

from pydantic import BaseModel

from app.models.media import MediaSource, MediaType


class MediaOut(BaseModel):
    id: str
    media_type: MediaType
    source: MediaSource
    source_url: str | None
    title: str | None
    artist: str | None
    album: str | None
    thumbnail_url: str | None
    recognized_title: str | None
    recognized_artist: str | None
    genre: str | None
    release_year: int | None
    is_remix: bool | None
    fade_in_ms: int | None
    fade_out_ms: int | None
    duration_seconds: float | None
    file_size_bytes: int | None
    original_filename: str | None
    mime_type: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MediaUpdate(BaseModel):
    title: str | None = None
    artist: str | None = None
    album: str | None = None
    genre: str | None = None
    release_year: int | None = None
    is_remix: bool | None = None
