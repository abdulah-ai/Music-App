"""Telethon plumbing for the in-app Telegram importer.

Authorized sessions are serialized into the database as encrypted
``StringSession`` values. The old per-user SQLite sessions are still opened
when a row has not been migrated yet; the next successful status check copies
their authorization into the durable representation and removes the local
file. A pending login (code sent, waiting for the user to type it) remains
in-memory because Telegram ties that code to the live client connection.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from telethon import TelegramClient
from telethon.sessions import StringSession

from app.core.config import settings
from app.core.secrets import decrypt_secret
from app.models.telegram_account import TelegramAccount

SESSION_DIR = settings.media_storage_dir / "_telegram_sessions"

# user_id -> {"client": TelegramClient, "phone": str}
pending_logins: dict[str, dict[str, Any]] = {}


def session_path(user_id: str) -> Path:
    SESSION_DIR.mkdir(parents=True, exist_ok=True)
    return SESSION_DIR / f"user_{user_id}"


def make_client(account: TelegramAccount) -> TelegramClient:
    api_hash = decrypt_secret(account.api_hash_encrypted or account.api_hash)
    if account.session_encrypted:
        session = StringSession(decrypt_secret(account.session_encrypted))
    else:
        # Legacy path: retain access to an already-authorized SQLite session
        # long enough for telegram_status() to migrate it into the DB.
        session = str(session_path(account.user_id))
    return TelegramClient(session, account.api_id, api_hash)


def account_phone(account: TelegramAccount) -> str:
    return decrypt_secret(account.phone_encrypted or account.phone)


def export_session(client: TelegramClient) -> str:
    """Return the client's auth key/DC as a portable StringSession.

    A newly linked client already uses StringSession. Legacy clients use
    SQLiteSession, whose entity cache is intentionally not copied; numeric
    import references are resolved against fresh dialogs by
    ``resolve_chat_entities`` instead of relying on that local cache.
    """
    if isinstance(client.session, StringSession):
        return client.session.save()

    session = StringSession()
    session.set_dc(client.session.dc_id, client.session.server_address, client.session.port)
    session.auth_key = client.session.auth_key
    return session.save()


async def authorization_snapshot(account: TelegramAccount) -> tuple[bool, str | None]:
    """Check authorization and export its durable representation in one connection."""
    client = make_client(account)
    try:
        await client.connect()
        authorized = await client.is_user_authorized()
        return authorized, export_session(client) if authorized else None
    finally:
        await client.disconnect()


async def is_authorized(account: TelegramAccount) -> bool:
    authorized, _ = await authorization_snapshot(account)
    return authorized


def clear_legacy_session_files(user_id: str) -> None:
    """Remove the obsolete local Telethon session after DB persistence succeeds."""
    base = session_path(user_id)
    for path in (
        Path(f"{base}.session"),
        Path(f"{base}.session-journal"),
        Path(f"{base}.session-shm"),
        Path(f"{base}.session-wal"),
    ):
        path.unlink(missing_ok=True)


async def drop_pending(user_id: str) -> None:
    pending = pending_logins.pop(user_id, None)
    if pending:
        try:
            await pending["client"].disconnect()
        except Exception:  # noqa: BLE001 - best-effort cleanup
            pass


async def resolve_chat_entities(client: TelegramClient, chat_refs: list[str]) -> list[tuple[str, Any]]:
    """Resolve import targets without depending on a local entity cache.

    StringSession intentionally stores only the auth key and data-center
    details. Numeric chat IDs therefore need to be matched against a fresh
    dialog listing before the import worker can use their access hashes.
    Usernames remain directly resolvable. Unresolvable targets are skipped,
    matching the importer's existing best-effort behavior.
    """
    numeric_refs = {ref.strip() for ref in chat_refs if ref.strip().lstrip("-").isdigit()}
    entities_by_id: dict[str, Any] = {}
    if numeric_refs:
        async for dialog in client.iter_dialogs(limit=None):
            entity = dialog.entity
            entity_id = str(getattr(entity, "id", ""))
            dialog_id = str(getattr(dialog, "id", ""))
            if entity_id in numeric_refs:
                entities_by_id[entity_id] = entity
            if dialog_id in numeric_refs:
                entities_by_id[dialog_id] = entity
            if len(entities_by_id) == len(numeric_refs):
                break

    resolved: list[tuple[str, Any]] = []
    for raw_ref in chat_refs:
        ref = raw_ref.strip()
        if not ref:
            continue
        if ref.lstrip("-").isdigit():
            entity = entities_by_id.get(ref)
        else:
            try:
                entity = await client.get_entity(ref)
            except Exception:  # noqa: BLE001 - one stale chat should not sink a batch
                entity = None
        if entity is not None:
            resolved.append((raw_ref, entity))
    return resolved


def _peer_ref(peer: Any) -> str | None:
    """Extract the bare numeric id from an InputPeer* so it can be resolved
    the same way a manually-picked dialog id is. The import worker resolves
    these IDs against a fresh dialog listing, since StringSession has no
    persistent entity cache."""
    from telethon.tl.types import InputPeerChannel, InputPeerChat, InputPeerUser

    if isinstance(peer, InputPeerChannel):
        return str(peer.channel_id)
    if isinstance(peer, InputPeerChat):
        return str(peer.chat_id)
    if isinstance(peer, InputPeerUser):
        return str(peer.user_id)
    return None


async def list_folders(client: TelegramClient) -> list[dict[str, Any]]:
    """List the user's Telegram chat-list folders (not to be confused with
    individual chats/channels) so a whole folder can be imported at once."""
    from telethon.tl.functions.messages import GetDialogFiltersRequest
    from telethon.tl.types import DialogFilter

    response = await client(GetDialogFiltersRequest())
    raw_filters = getattr(response, "filters", response)

    folders: list[dict[str, Any]] = []
    for f in raw_filters:
        if not isinstance(f, DialogFilter):
            continue  # skips the implicit "All chats" pseudo-filter
        title = getattr(f, "title", None)
        title_text = getattr(title, "text", title) or "Folder"
        chat_refs = [ref for ref in (_peer_ref(p) for p in f.include_peers) if ref is not None]
        if not chat_refs:
            continue
        folders.append({"id": f.id, "title": str(title_text), "chat_refs": chat_refs})
    return folders
