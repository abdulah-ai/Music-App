from pydantic import BaseModel, Field


class TelegramSettingsIn(BaseModel):
    api_id: int
    api_hash: str = Field(min_length=8, max_length=200)
    phone: str = Field(min_length=5, max_length=40)


class TelegramCodeIn(BaseModel):
    code: str = Field(min_length=3, max_length=10)


class TelegramPasswordIn(BaseModel):
    password: str = Field(min_length=1, max_length=256)


class TelegramImportIn(BaseModel):
    # Exactly one of `chats` (manually picked dialogs) or `folder_id` (a
    # whole Telegram chat-list folder, resolved server-side) must be set.
    chats: list[str] = Field(default_factory=list, max_length=200)
    folder_id: int | None = None
    media_kind: str = "music"  # "music" | "video"
    # None means "no cap" — the worker still applies a hard safety ceiling.
    limit: int | None = Field(default=25, ge=1, le=5000)


class TelegramStatusOut(BaseModel):
    configured: bool
    authorized: bool
    phone: str | None = None


class TelegramDialogOut(BaseModel):
    id: str
    title: str
    username: str | None = None


class TelegramFolderOut(BaseModel):
    id: int
    title: str
    chat_count: int
