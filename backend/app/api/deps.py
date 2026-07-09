from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


async def _resolve_user(raw_token: str | None, db: AsyncSession) -> User:
    if raw_token is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")

    payload = decode_token(raw_token)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    user = await db.get(User, payload["sub"])
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")

    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    return await _resolve_user(credentials.credentials if credentials else None, db)


async def get_stream_user(
    token: str | None = None,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Auth for media streaming: media players (HTML <audio>, AVPlayer range
    requests) cannot always attach an Authorization header, so the stream
    endpoint also accepts the access token as a ?token= query parameter."""
    raw = credentials.credentials if credentials else token
    return await _resolve_user(raw, db)


def is_admin_email(email: str) -> bool:
    return bool(settings.admin_email) and email.lower() == settings.admin_email.lower()


async def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """A normal user whose email happens to match SMA_ADMIN_EMAIL — no
    separate role/permission system, nothing stored on the user row."""
    if not is_admin_email(current_user.email):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return current_user
