"""Telethon plumbing for the in-app Telegram importer.

Clients are short-lived: every endpoint connects, does its work, and
disconnects, so the on-disk session file is the only long-lived state.
The one exception is a pending login (code sent, waiting for the user to
type it), which must keep its client instance alive in memory because
Telegram ties the code to that connection.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

from telethon import TelegramClient

from app.core.config import settings
from app.models.telegram_account import TelegramAccount

SESSION_DIR = settings.media_storage_dir / "_telegram_sessions"

# user_id -> {"client": TelegramClient, "phone": str}
pending_logins: dict[str, dict[str, Any]] = {}


def session_path(user_id: str) -> Path:
    SESSION_DIR.mkdir(parents=True, exist_ok=True)
    return SESSION_DIR / f"user_{user_id}"


def make_client(account: TelegramAccount) -> TelegramClient:
    return TelegramClient(str(session_path(account.user_id)), account.api_id, account.api_hash)


async def is_authorized(account: TelegramAccount) -> bool:
    client = make_client(account)
    try:
        await client.connect()
        return await client.is_user_authorized()
    finally:
        await client.disconnect()


async def drop_pending(user_id: str) -> None:
    pending = pending_logins.pop(user_id, None)
    if pending:
        try:
            await pending["client"].disconnect()
        except Exception:  # noqa: BLE001 - best-effort cleanup
            pass


def _peer_ref(peer: Any) -> str | None:
    """Extract the bare numeric id from an InputPeer* so it can be resolved
    the same way a manually-picked dialog id is (client.get_entity(int(ref))
    relies on Telethon's session entity cache, which GetDialogFiltersRequest
    already populates for every peer it returns)."""
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
