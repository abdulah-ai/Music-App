"""Local-disk media storage.

Kept behind a small interface (save/resolve/delete) so a future S3/R2-backed
implementation can be swapped in without touching callers.
"""
import hashlib
import shutil
import uuid
from pathlib import Path

from app.core.config import settings


def _user_dir(user_id: str) -> Path:
    path = settings.media_storage_dir / user_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def sha1_file(path: Path) -> str:
    digest = hashlib.sha1()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def adopt_file(user_id: str, source_path: Path, suffix: str) -> Path:
    """Move a file produced in a temp/download dir into permanent user storage."""
    target = _user_dir(user_id) / f"{uuid.uuid4()}{suffix}"
    shutil.move(str(source_path), str(target))
    return target


def resolve_path(relative_or_absolute: str) -> Path:
    return _validated_media_path(relative_or_absolute)


def _validated_media_path(value: str | Path) -> Path:
    """Reject corrupted/tampered DB paths before any read or delete.

    Local media must always remain below media_storage_dir; resolving first
    also closes `..` and symlink traversal paths.
    """
    root = settings.media_storage_dir.resolve()
    candidate = Path(value).resolve()
    if candidate == root or root not in candidate.parents:
        raise ValueError("Media path is outside the configured storage directory")
    return candidate


def delete_file(path: str) -> None:
    p = _validated_media_path(path)
    if p.exists():
        p.unlink(missing_ok=True)
