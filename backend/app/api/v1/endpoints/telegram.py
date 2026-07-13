import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from telethon.errors import SessionPasswordNeededError

from app.api.deps import get_current_user
from app.core.secrets import encrypt_secret
from app.db.session import get_db
from app.models.job import Job, JobType
from app.models.telegram_account import TelegramAccount
from app.models.user import User
from app.schemas.job import JobOut
from app.schemas.telegram import (
    TelegramCodeIn,
    TelegramDialogOut,
    TelegramFolderOut,
    TelegramImportIn,
    TelegramPasswordIn,
    TelegramSettingsIn,
    TelegramStatusOut,
)
from app.services.admin_events import log_event
from app.services.telegram import telegram_service
from app.workers import job_engine
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/telegram", tags=["telegram"])


async def _get_account(user_id: str, db: AsyncSession) -> TelegramAccount | None:
    return await db.get(TelegramAccount, user_id)


def _store_durable_session(account: TelegramAccount, session: str | None) -> None:
    if not session:
        raise RuntimeError("Telegram authorized the client without a reusable session")
    account.session_encrypted = encrypt_secret(session)


@router.get("/status", response_model=TelegramStatusOut)
async def telegram_status(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> TelegramStatusOut:
    account = await _get_account(current_user.id, db)
    if account is None:
        return TelegramStatusOut(configured=False, authorized=False)
    try:
        authorized, session = await telegram_service.authorization_snapshot(account)
    except Exception:  # noqa: BLE001 - bad credentials shouldn't 500 the status check
        authorized = False
        session = None
    # Migrate an already-authorized legacy SQLite session on its first status
    # check. Commit before deleting the local copy so a failed DB write never
    # destroys the only working authorization.
    if authorized and session and not account.session_encrypted:
        _store_durable_session(account, session)
        await db.commit()
        telegram_service.clear_legacy_session_files(current_user.id)
    return TelegramStatusOut(configured=True, authorized=authorized, phone=telegram_service.account_phone(account))


@router.post("/settings", response_model=TelegramStatusOut)
async def save_settings(
    payload: TelegramSettingsIn,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TelegramStatusOut:
    account = await _get_account(current_user.id, db)
    if account is None:
        account = TelegramAccount(
            user_id=current_user.id,
            api_id=payload.api_id,
            api_hash="encrypted",
            phone="encrypted",
            api_hash_encrypted=encrypt_secret(payload.api_hash),
            phone_encrypted=encrypt_secret(payload.phone),
        )
        db.add(account)
    else:
        account.api_id = payload.api_id
        account.api_hash = "encrypted"
        account.phone = "encrypted"
        account.api_hash_encrypted = encrypt_secret(payload.api_hash)
        account.phone_encrypted = encrypt_secret(payload.phone)
        # Saving a new credential set starts an intentional re-link. Never
        # carry a previous phone account's authorization into that flow.
        account.session_encrypted = None
    await db.commit()
    telegram_service.clear_legacy_session_files(current_user.id)
    return TelegramStatusOut(configured=True, authorized=False, phone=payload.phone)


@router.post("/send-code")
async def send_code(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    account = await _get_account(current_user.id, db)
    if account is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Save your Telegram API settings first")

    await telegram_service.drop_pending(current_user.id)

    client = telegram_service.make_client(account)
    await client.connect()
    if await client.is_user_authorized():
        if not account.session_encrypted:
            _store_durable_session(account, telegram_service.export_session(client))
            await db.commit()
        await client.disconnect()
        telegram_service.clear_legacy_session_files(current_user.id)
        return {"status": "authorized"}

    try:
        phone = telegram_service.account_phone(account)
        await client.send_code_request(phone)
    except Exception as exc:  # noqa: BLE001 - surface Telegram's reason to the user
        await client.disconnect()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Telegram rejected the request: {exc}")

    telegram_service.pending_logins[current_user.id] = {"client": client, "phone": phone}
    return {"status": "code_sent", "phone": phone}


@router.post("/verify-code")
async def verify_code(
    payload: TelegramCodeIn, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    pending = telegram_service.pending_logins.get(current_user.id)
    if not pending:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Request a login code first")
    client = pending["client"]
    try:
        await client.sign_in(phone=pending["phone"], code=payload.code.strip())
    except SessionPasswordNeededError:
        return {"status": "password_required"}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Sign-in failed: {exc}")

    if await client.is_user_authorized():
        account = await _get_account(current_user.id, db)
        if account is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Telegram settings disappeared; start again")
        _store_durable_session(account, telegram_service.export_session(client))
        await log_event(db, "telegram_linked", user_id=current_user.id)
        await db.commit()
        await telegram_service.drop_pending(current_user.id)
        telegram_service.clear_legacy_session_files(current_user.id)
        return {"status": "authorized"}
    return {"status": "code_sent"}


@router.post("/verify-password")
async def verify_password(
    payload: TelegramPasswordIn, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    pending = telegram_service.pending_logins.get(current_user.id)
    if not pending:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No pending Telegram login")
    client = pending["client"]
    try:
        await client.sign_in(password=payload.password)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"2FA sign-in failed: {exc}")
    if not await client.is_user_authorized():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Telegram did not authorize this session")
    account = await _get_account(current_user.id, db)
    if account is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Telegram settings disappeared; start again")
    _store_durable_session(account, telegram_service.export_session(client))
    await log_event(db, "telegram_linked", user_id=current_user.id)
    await db.commit()
    await telegram_service.drop_pending(current_user.id)
    telegram_service.clear_legacy_session_files(current_user.id)
    return {"status": "authorized"}


@router.delete("/connection", response_model=TelegramStatusOut)
async def disconnect_telegram(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> TelegramStatusOut:
    """Revoke Telegram authorization and forget its durable local secret.

    Local state is cleared even if Telegram cannot be reached: after an
    explicit disconnect this app must not retain an account-equivalent
    session token. Telegram's own active-sessions screen can revoke a remote
    session if the network failed before ``log_out`` reached it.
    """
    account = await _get_account(current_user.id, db)
    if account is None:
        return TelegramStatusOut(configured=False, authorized=False)

    phone = telegram_service.account_phone(account)
    await telegram_service.drop_pending(current_user.id)
    client = None
    try:
        client = telegram_service.make_client(account)
        await client.connect()
        if await client.is_user_authorized():
            await client.log_out()
    except Exception:  # noqa: BLE001 - local revocation remains mandatory
        pass
    finally:
        if client is not None:
            try:
                await client.disconnect()
            except Exception:  # noqa: BLE001 - best-effort teardown
                pass

    account.session_encrypted = None
    await db.commit()
    telegram_service.clear_legacy_session_files(current_user.id)
    return TelegramStatusOut(configured=True, authorized=False, phone=phone)


@router.get("/dialogs", response_model=list[TelegramDialogOut])
async def list_dialogs(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[TelegramDialogOut]:
    account = await _get_account(current_user.id, db)
    if account is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Save your Telegram API settings first")

    client = telegram_service.make_client(account)
    dialogs: list[TelegramDialogOut] = []
    try:
        await client.connect()
        if not await client.is_user_authorized():
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Telegram is not linked yet")
        async for dialog in client.iter_dialogs(limit=100):
            dialogs.append(
                TelegramDialogOut(
                    id=str(dialog.entity.id),
                    title=dialog.name or "Untitled chat",
                    username=getattr(dialog.entity, "username", None),
                )
            )
    finally:
        await client.disconnect()
    return dialogs


@router.get("/folders", response_model=list[TelegramFolderOut])
async def list_folders(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[TelegramFolderOut]:
    account = await _get_account(current_user.id, db)
    if account is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Save your Telegram API settings first")

    client = telegram_service.make_client(account)
    try:
        await client.connect()
        if not await client.is_user_authorized():
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Telegram is not linked yet")
        folders = await telegram_service.list_folders(client)
    finally:
        await client.disconnect()
    return [TelegramFolderOut(id=f["id"], title=f["title"], chat_count=len(f["chat_refs"])) for f in folders]


@router.post("/import", response_model=JobOut, status_code=status.HTTP_202_ACCEPTED)
async def start_import(
    payload: TelegramImportIn,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> JobOut:
    if payload.media_kind not in {"music", "video"}:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "media_kind must be 'music' or 'video'")
    if not payload.chats and payload.folder_id is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Provide chats or a folder_id")

    account = await _get_account(current_user.id, db)
    if account is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Save your Telegram API settings first")

    chat_refs = list(payload.chats)
    label = f"{len(chat_refs)} chat{'s' if len(chat_refs) != 1 else ''}"

    if payload.folder_id is not None:
        client = telegram_service.make_client(account)
        try:
            await client.connect()
            if not await client.is_user_authorized():
                raise HTTPException(status.HTTP_403_FORBIDDEN, "Telegram is not linked yet")
            folders = await telegram_service.list_folders(client)
        finally:
            await client.disconnect()
        match = next((f for f in folders if f["id"] == payload.folder_id), None)
        if match is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "That folder no longer exists")
        chat_refs = match["chat_refs"]
        label = match["title"]
        if not chat_refs:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "That folder has no chats")

    job = Job(
        user_id=current_user.id,
        job_type=JobType.DOWNLOAD,
        source_url=f"telegram:{label}",
        request_payload=json.dumps(
            {"kind": "telegram", "chat_refs": chat_refs, "media_kind": payload.media_kind, "limit": payload.limit}
        ),
    )
    db.add(job)
    await log_event(
        db, "job_created", user_id=current_user.id, detail=f"telegram import: {label} ({len(chat_refs)} chat(s))"
    )
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(
        job_engine.run_telegram_import_job,
        job.id,
        current_user.id,
        chat_refs,
        payload.media_kind,
        payload.limit,
    )
    return JobOut.model_validate(job)
