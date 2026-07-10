from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, is_admin_user
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    AccessTokenOut,
    RefreshRequest,
    TokenPair,
    UserLogin,
    UserOut,
    UserRegister,
    UserSettingsUpdate,
)
from app.services.admin_events import log_event
from app.services.storage import backend as storage_backend

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_out(user: User) -> UserOut:
    out = UserOut.model_validate(user)
    out.is_admin = is_admin_user(user)
    out.cloud_storage_available = storage_backend.cloud_available()
    return out


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)) -> TokenPair:
    if settings.registration_invite_code and payload.invite_code != settings.registration_invite_code:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "A valid invite code is required")

    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    user = User(
        email=payload.email,
        display_name=payload.display_name,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    await db.flush()
    await log_event(db, "user_registered", user_id=user.id, detail=user.email)
    await db.commit()
    await db.refresh(user)

    return TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=_user_out(user),
    )


@router.post("/login", response_model=TokenPair)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)) -> TokenPair:
    user = await db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")

    return TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=_user_out(user),
    )


@router.post("/refresh", response_model=AccessTokenOut)
async def refresh(payload: RefreshRequest) -> AccessTokenOut:
    decoded = decode_token(payload.refresh_token)
    if decoded is None or decoded.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")

    return AccessTokenOut(access_token=create_access_token(decoded["sub"]))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return _user_out(current_user)


@router.patch("/me/settings", response_model=UserOut)
async def update_settings(
    payload: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    if payload.storage_preference == "cloud" and not storage_backend.cloud_available():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cloud storage isn't configured on this deployment")
    current_user.storage_preference = payload.storage_preference
    await db.commit()
    await db.refresh(current_user)
    return _user_out(current_user)
