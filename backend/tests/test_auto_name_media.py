import asyncio
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from sqlalchemy import event, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.models.admin_event import AdminEvent  # noqa: F401 - register table metadata
from app.models.job import Job
from app.models.media import Media, MediaSource, MediaType
from app.models.playlist import Playlist, PlaylistItem  # noqa: F401 - resolve User relationships
from app.models.user import User
from app.services.recognition import shazam_service
from app.workers import job_engine


class AutoNameMediaTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        temp_path = Path(self.temp_dir.name)
        self.engine = create_async_engine(f"sqlite+aiosqlite:///{temp_path / 'auto-name.db'}")

        @event.listens_for(self.engine.sync_engine, "connect")
        def enable_foreign_keys(dbapi_connection, _connection_record) -> None:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False, class_=AsyncSession)
        self.session_patch = patch.object(job_engine, "SessionLocal", self.sessions)
        self.session_patch.start()

        async with self.sessions() as session:
            user = User(email="auto-name@example.com", display_name="Auto Name", hashed_password="hash")
            session.add(user)
            await session.commit()
            await session.refresh(user)
            self.user_id = user.id

    async def asyncTearDown(self) -> None:
        self.session_patch.stop()
        await self.engine.dispose()
        self.temp_dir.cleanup()

    async def _seed_media(self, count: int, media_type: MediaType = MediaType.AUDIO) -> list[str]:
        async with self.sessions() as session:
            rows = [
                Media(
                    user_id=self.user_id,
                    media_type=media_type,
                    source=MediaSource.TELEGRAM,
                    title=f"A93bcD02efG45hiJ{i:02d}",
                    file_path=str(Path(self.temp_dir.name) / f"media-{i}.mp4"),
                    storage_backend="local",
                )
                for i in range(count)
            ]
            session.add_all(rows)
            await session.commit()
            return [row.id for row in rows]

    async def test_processes_every_eligible_item_beyond_old_ten_track_cap(self) -> None:
        media_ids = await self._seed_media(12)
        worker = AsyncMock()

        with patch.object(job_engine, "run_recognition_job", worker):
            await job_engine.auto_name_media(self.user_id, media_ids)

        self.assertEqual(media_ids, [call.args[3] for call in worker.await_args_list])
        self.assertTrue(all(call.kwargs["cleanup"] is False for call in worker.await_args_list))
        async with self.sessions() as session:
            self.assertEqual(12, await session.scalar(select(func.count()).select_from(Job)))

    async def test_video_is_eligible_for_existing_audio_extraction_path(self) -> None:
        [media_id] = await self._seed_media(1, MediaType.VIDEO)
        worker = AsyncMock()

        with patch.object(job_engine, "run_recognition_job", worker):
            await job_engine.auto_name_media(self.user_id, [media_id])

        worker.assert_awaited_once()
        args = worker.await_args.args
        self.assertEqual(self.user_id, args[1])
        self.assertEqual(media_id, args[3])
        self.assertEqual(Path(self.temp_dir.name) / "media-0.mp4", args[2])
        self.assertFalse(worker.await_args.kwargs["cleanup"])

    async def test_concurrent_batches_share_one_recognition_slot(self) -> None:
        first_ids = await self._seed_media(2)
        second_ids = await self._seed_media(2, MediaType.VIDEO)
        active = 0
        peak_active = 0

        async def worker(*_args, **_kwargs) -> None:
            nonlocal active, peak_active
            active += 1
            peak_active = max(peak_active, active)
            await asyncio.sleep(0)
            active -= 1

        with patch.object(job_engine, "run_recognition_job", side_effect=worker):
            await asyncio.gather(
                job_engine.auto_name_media(self.user_id, first_ids),
                job_engine.auto_name_media(self.user_id, second_ids),
            )

        self.assertEqual(1, peak_active)

    def test_recognition_fallback_extracts_audio_from_video_container(self) -> None:
        commands: list[list[str]] = []

        def run(command: list[str], **_kwargs) -> SimpleNamespace:
            commands.append(command)
            Path(command[-1]).write_bytes(b"normalized audio")
            return SimpleNamespace(returncode=0, stderr="")

        with (
            patch.object(shazam_service.imageio_ffmpeg, "get_ffmpeg_exe", return_value="ffmpeg"),
            patch.object(shazam_service.subprocess, "run", side_effect=run),
        ):
            sample = shazam_service._convert_sample(Path(self.temp_dir.name) / "video.mp4")

        try:
            self.assertTrue(sample.exists())
            self.assertIn("-vn", commands[0])
            self.assertEqual(".mp3", sample.suffix)
        finally:
            sample.unlink(missing_ok=True)
            sample.parent.rmdir()


if __name__ == "__main__":
    unittest.main()
