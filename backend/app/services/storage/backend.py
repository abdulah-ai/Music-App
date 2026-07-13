"""Picks local-disk or S3-compatible storage per file.

The deployment has one *default* (SMA_STORAGE_BACKEND), but each user can
override it via User.storage_preference ("auto" | "local" | "cloud"), so two
users on the same deployment can have their new uploads land on different
backends. Because of that, every existing file's actual location lives on
its own Media.storage_backend column — never re-derive it from the global
default, or files saved under a since-changed preference would be read from
(or deleted off) the wrong backend.

Callers (job engine, library endpoint) go through this module rather than
importing local_storage/s3_storage directly, so the rest of the app doesn't
need to know or care which one is active.
"""
from __future__ import annotations

from pathlib import Path

from app.core.config import settings
from app.services.storage import local_storage, s3_storage
from app.services.storage.s3_storage import StoredFile

__all__ = [
    "StoredFile",
    "is_s3",
    "cloud_available",
    "resolve_backend",
    "adopt_file",
    "delete_file",
    "presigned_url",
    "open_object",
    "copy_to_path",
]


def is_s3() -> bool:
    """The deployment-wide *default* only — never use this to decide how to
    read/delete a specific file, since storage_preference can put individual
    users' files on the other backend. See resolve_backend / Media.storage_backend."""
    return settings.storage_backend == "s3"


def cloud_available() -> bool:
    """Whether S3-compatible credentials are configured at all, regardless
    of which backend is the deployment default — this is what gates
    offering "cloud" as a per-user choice in Settings."""
    return bool(settings.s3_bucket and settings.s3_access_key_id and settings.s3_secret_access_key)


def resolve_backend(user_storage_preference: str | None) -> str:
    """The backend a *new* file for this user should be adopted into."""
    default = "s3" if is_s3() else "local"
    if user_storage_preference == "cloud":
        return "s3" if cloud_available() else "local"
    if user_storage_preference == "local":
        return "local"
    return default  # "auto", None, or any unrecognized value


def adopt_file(user_id: str, source_path: Path, suffix: str, backend: str) -> StoredFile:
    """Move a file produced in a temp/download dir into permanent storage."""
    if backend == "s3":
        return s3_storage.adopt_file(user_id, source_path, suffix)
    permanent_path = local_storage.adopt_file(user_id, source_path, suffix)
    return StoredFile(key=str(permanent_path), size_bytes=permanent_path.stat().st_size)


def delete_file(key: str, backend: str) -> None:
    if backend == "s3":
        s3_storage.delete_file(key)
    else:
        local_storage.delete_file(key)


def presigned_url(key: str, content_type: str) -> str:
    """Only meaningful when is_s3() — callers should branch on that first."""
    return s3_storage.presigned_url(key, content_type)


def open_object(key: str) -> tuple[object, int]:
    """Only meaningful when is_s3() — callers should branch on that first."""
    return s3_storage.open_object(key)


def copy_to_path(key: str, backend: str, destination: Path) -> None:
    """Copy one stored media object to a temporary local processing path."""
    if backend == "s3":
        s3_storage.copy_to_path(key, destination)
        return

    import shutil

    with Path(key).open("rb") as source, destination.open("wb") as output:
        shutil.copyfileobj(source, output)
