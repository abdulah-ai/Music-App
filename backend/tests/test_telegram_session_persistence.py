import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from telethon.crypto import AuthKey
from telethon.sessions import StringSession

from app.api.v1.endpoints import telegram as telegram_endpoints
from app.core.secrets import decrypt_secret, encrypt_secret
from app.db.base import Base
from app.db import session as db_session
from app.models.admin_event import AdminEvent  # noqa: F401 - register metadata
from app.models.job import Job  # noqa: F401 - register metadata
from app.models.media import Media  # noqa: F401 - resolve User relationships
from app.models.media_state import MediaState  # noqa: F401 - register metadata
from app.models.playlist import Playlist, PlaylistItem  # noqa: F401 - resolve User relationships
from app.models.telegram_account import TelegramAccount
from app.models.user import User
from app.schemas.telegram import TelegramCodeIn
from app.services.telegram import telegram_service


def portable_session() -> str:
    session = StringSession()
    session.set_dc(2, "149.154.167.50", 443)
    session.auth_key = AuthKey(b"s" * 256)
    return session.save()


class TelegramSessionServiceTests(unittest.IsolatedAsyncioTestCase):
    def test_durable_session_is_decrypted_into_string_session(self) -> None:
        serialized = portable_session()
        account = TelegramAccount(
            user_id="user-1",
            api_id=12345,
            api_hash="encrypted",
            phone="encrypted",
            api_hash_encrypted=encrypt_secret("api-hash-value"),
            phone_encrypted=encrypt_secret("+905551112233"),
            session_encrypted=encrypt_secret(serialized),
        )
        captured: dict[str, object] = {}

        def client_factory(session, api_id, api_hash):
            captured.update(session=session, api_id=api_id, api_hash=api_hash)
            return SimpleNamespace()

        with patch.object(telegram_service, "TelegramClient", side_effect=client_factory):
            telegram_service.make_client(account)

        self.assertIsInstance(captured["session"], StringSession)
        self.assertEqual(serialized, captured["session"].save())
        self.assertEqual(12345, captured["api_id"])
        self.assertEqual("api-hash-value", captured["api_hash"])

    def test_legacy_sqlite_auth_can_be_exported_portably(self) -> None:
        auth_key = AuthKey(b"a" * 256)
        legacy_client = SimpleNamespace(
            session=SimpleNamespace(
                dc_id=4,
                server_address="149.154.167.91",
                port=443,
                auth_key=auth_key,
            )
        )

        serialized = telegram_service.export_session(legacy_client)
        restored = StringSession(serialized)

        self.assertEqual(4, restored.dc_id)
        self.assertEqual("149.154.167.91", restored.server_address)
        self.assertEqual(auth_key.key, restored.auth_key.key)

    async def test_numeric_refs_resolve_from_fresh_dialogs_without_entity_cache(self) -> None:
        private_channel = SimpleNamespace(id=123, title="Private channel")
        private_chat = SimpleNamespace(id=456, title="Private chat")
        public_channel = SimpleNamespace(id=789, title="Public channel")

        class FakeClient:
            async def iter_dialogs(self, limit=None):
                self.limit = limit
                yield SimpleNamespace(id=123, entity=private_channel)
                yield SimpleNamespace(id=-100456, entity=private_chat)

            async def get_entity(self, ref):
                if ref == "publicmusic":
                    return public_channel
                raise ValueError("not found")

        client = FakeClient()
        resolved = await telegram_service.resolve_chat_entities(
            client, ["123", "publicmusic", "-100456", "missing", ""]
        )

        self.assertIsNone(client.limit)
        self.assertEqual(
            [("123", private_channel), ("publicmusic", public_channel), ("-100456", private_chat)],
            resolved,
        )


class TelegramSessionEndpointTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        db_path = Path(self.temp_dir.name) / "telegram-session.db"
        self.engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False, class_=AsyncSession)

        async with self.sessions() as session:
            self.user = User(email="telegram@example.com", display_name="Telegram User", hashed_password="hash")
            session.add(self.user)
            await session.flush()
            session.add(
                TelegramAccount(
                    user_id=self.user.id,
                    api_id=12345,
                    api_hash="encrypted",
                    phone="encrypted",
                    api_hash_encrypted=encrypt_secret("api-hash-value"),
                    phone_encrypted=encrypt_secret("+905551112233"),
                )
            )
            await session.commit()

    async def asyncTearDown(self) -> None:
        telegram_service.pending_logins.clear()
        await self.engine.dispose()
        self.temp_dir.cleanup()

    async def test_status_migrates_legacy_session_into_encrypted_database_value(self) -> None:
        serialized = portable_session()
        async with self.sessions() as session:
            user = await session.get(User, self.user.id)
            with (
                patch.object(
                    telegram_service,
                    "authorization_snapshot",
                    AsyncMock(return_value=(True, serialized)),
                ),
                patch.object(telegram_service, "clear_legacy_session_files") as clear_legacy,
            ):
                response = await telegram_endpoints.telegram_status(user, session)

            account = await session.get(TelegramAccount, self.user.id)
            self.assertTrue(response.authorized)
            self.assertIsNotNone(account.session_encrypted)
            self.assertNotIn(serialized, account.session_encrypted)
            self.assertEqual(serialized, decrypt_secret(account.session_encrypted))
            clear_legacy.assert_called_once_with(self.user.id)

    async def test_successful_code_verification_persists_before_pending_client_is_dropped(self) -> None:
        serialized = portable_session()
        fake_client = SimpleNamespace(
            session=StringSession(serialized),
            sign_in=AsyncMock(),
            is_user_authorized=AsyncMock(return_value=True),
            disconnect=AsyncMock(),
        )
        telegram_service.pending_logins[self.user.id] = {
            "client": fake_client,
            "phone": "+905551112233",
        }

        async with self.sessions() as session:
            user = await session.get(User, self.user.id)
            with patch.object(telegram_service, "clear_legacy_session_files") as clear_legacy:
                response = await telegram_endpoints.verify_code(TelegramCodeIn(code="12345"), user, session)

            account = await session.get(TelegramAccount, self.user.id)
            self.assertEqual("authorized", response["status"])
            self.assertEqual(serialized, decrypt_secret(account.session_encrypted))
            self.assertNotIn(self.user.id, telegram_service.pending_logins)
            fake_client.disconnect.assert_awaited_once()
            clear_legacy.assert_called_once_with(self.user.id)

    async def test_disconnect_logs_out_and_clears_durable_session(self) -> None:
        fake_client = SimpleNamespace(
            connect=AsyncMock(),
            is_user_authorized=AsyncMock(return_value=True),
            log_out=AsyncMock(),
            disconnect=AsyncMock(),
        )
        async with self.sessions() as session:
            account = await session.get(TelegramAccount, self.user.id)
            account.session_encrypted = encrypt_secret(portable_session())
            await session.commit()
            user = await session.get(User, self.user.id)

            with (
                patch.object(telegram_service, "make_client", return_value=fake_client),
                patch.object(telegram_service, "clear_legacy_session_files") as clear_legacy,
            ):
                response = await telegram_endpoints.disconnect_telegram(user, session)

            await session.refresh(account)
            self.assertTrue(response.configured)
            self.assertFalse(response.authorized)
            self.assertIsNone(account.session_encrypted)
            fake_client.log_out.assert_awaited_once()
            fake_client.disconnect.assert_awaited_once()
            clear_legacy.assert_called_once_with(self.user.id)

    async def test_startup_migration_adds_session_column_to_existing_table(self) -> None:
        # Simulate the pre-fix schema: create_all sees an existing table as
        # complete and will not add new columns, so the startup migration must.
        async with self.engine.begin() as connection:
            await connection.execute(text("ALTER TABLE telegram_accounts DROP COLUMN session_encrypted"))
            with patch.object(db_session, "engine", self.engine):
                await db_session._add_missing_columns(connection)
            columns = await connection.run_sync(
                lambda sync_connection: {
                    column["name"] for column in inspect(sync_connection).get_columns("telegram_accounts")
                }
            )

        self.assertIn("session_encrypted", columns)


if __name__ == "__main__":
    unittest.main()
