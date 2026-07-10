from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)
    invite_code: str | None = Field(default=None, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    display_name: str
    # Not a DB column — set explicitly by each endpoint that builds this
    # response (see app.api.deps.is_admin_email). UI-visibility only; every
    # real /admin/* route is independently protected server-side.
    is_admin: bool = False
    # "auto" | "local" | "cloud" — see app.services.storage.backend.resolve_backend.
    # Normalized from the nullable DB column so the client never has to
    # special-case None.
    storage_preference: str = "auto"
    # Not a DB column — whether this deployment has S3 credentials configured
    # at all, so the client knows whether to offer "cloud" as a choice.
    cloud_storage_available: bool = False

    model_config = {"from_attributes": True}

    @field_validator("storage_preference", mode="before")
    @classmethod
    def _default_storage_preference(cls, value: str | None) -> str:
        # The DB column is nullable (rows created before this feature shipped
        # have no value yet) — model_validate(user, from_attributes=True)
        # reads the raw column, so None has to be normalized here rather than
        # relying on the field default, which only applies when the attribute
        # is missing entirely, not when it's present-but-None.
        return value or "auto"


class UserSettingsUpdate(BaseModel):
    storage_preference: str = Field(pattern="^(auto|local|cloud)$")


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
