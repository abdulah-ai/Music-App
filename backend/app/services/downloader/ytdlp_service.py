"""Thin wrapper around yt-dlp. Blocking by design — callers must run it off
the event loop (e.g. via asyncio.to_thread)."""
from __future__ import annotations

import os
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional

import imageio_ffmpeg
import yt_dlp

ProgressCallback = Callable[[int, str], None]

# Modern YouTube requires solving JS challenges (signature + n-token) or most
# formats 403. The solver script ships as the `yt-dlp-ejs` package and needs a
# JS runtime; deno is yt-dlp's default, and we fall back to node when that's
# what the machine has.
_JS_RUNTIMES: dict = {}
if shutil.which("deno"):
    _JS_RUNTIMES = {"deno": {}}
elif shutil.which("node"):
    _JS_RUNTIMES = {"node": {}}

# Optional cookies for age-restricted / bot-checked videos and datacenter IPs
# (e.g. Render) that YouTube blocks outright. In priority order:
#   1. SMA_YTDLP_COOKIES_TEXT — the raw contents of a Netscape cookies.txt
#      export, pasted into an env var (how the Render deployment receives it).
#   2. YTDLP_COOKIES_FILE — path to a cookies.txt.
#   3. backend/cookies/youtube_cookies.txt (or cookies.txt) on disk.
#   4. YTDLP_COOKIES_FROM_BROWSER — e.g. "firefox".
_COOKIES_DIR = Path(__file__).resolve().parents[3] / "cookies"
_ENV_COOKIES_PATH: Optional[Path] = None


def _cookies_from_env_text() -> Optional[Path]:
    """Materialize SMA_YTDLP_COOKIES_TEXT into a file once per process."""
    global _ENV_COOKIES_PATH
    text = os.environ.get("SMA_YTDLP_COOKIES_TEXT", "").strip()
    if not text:
        return None
    if _ENV_COOKIES_PATH is None or not _ENV_COOKIES_PATH.is_file():
        _COOKIES_DIR.mkdir(parents=True, exist_ok=True)
        target = _COOKIES_DIR / "env_cookies.txt"
        # yt-dlp requires the Netscape header line; pasted env values often lose it.
        if not text.lstrip().startswith("# Netscape HTTP Cookie File"):
            text = "# Netscape HTTP Cookie File\n" + text
        target.write_text(text + "\n", encoding="utf-8")
        _ENV_COOKIES_PATH = target
    return _ENV_COOKIES_PATH


def _cookie_opts() -> dict:
    env_file = _cookies_from_env_text()
    if env_file:
        return {"cookiefile": str(env_file)}
    explicit = os.environ.get("YTDLP_COOKIES_FILE")
    if explicit and Path(explicit).is_file():
        return {"cookiefile": explicit}
    for name in ("youtube_cookies.txt", "cookies.txt"):
        candidate = _COOKIES_DIR / name
        if candidate.is_file():
            return {"cookiefile": str(candidate)}
    browser = os.environ.get("YTDLP_COOKIES_FROM_BROWSER")
    if browser:
        return {"cookiesfrombrowser": (browser,)}
    return {}


def _is_auth_challenge(error: Exception) -> bool:
    text = str(error).lower()
    return any(
        marker in text
        for marker in ("sign in to confirm", "not a bot", "cookies", "age-restricted", "age restricted", "login required")
    )


@dataclass
class DownloadResult:
    file_path: Path
    title: Optional[str]
    artist: Optional[str]
    thumbnail_url: Optional[str]
    duration_seconds: Optional[float]


def _pick_output_file(out_dir: Path, video_id: str) -> Path:
    candidates = sorted(
        (p for p in out_dir.glob(f"{video_id}.*") if p.suffix not in {".part", ".ytdl"}),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not candidates:
        raise RuntimeError("yt-dlp finished but produced no output file")
    return candidates[0]


AUDIO_FORMATS = {"mp3-320", "mp3-192", "m4a", "source"}
VIDEO_QUALITIES = {"2160p", "1080p", "720p", "source"}


def download_media(
    url: str,
    media_type: str,
    out_dir: Path,
    progress_callback: Optional[ProgressCallback] = None,
    audio_format: str = "mp3-192",
    video_quality: str = "1080p",
) -> DownloadResult:
    out_dir.mkdir(parents=True, exist_ok=True)

    def hook(d: dict) -> None:
        if progress_callback is None:
            return
        if d.get("status") == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            downloaded = d.get("downloaded_bytes", 0)
            # Reserve the last 10% of the bar for postprocessing (mux/extract-audio).
            pct = int(downloaded / total * 90) if total else 0
            progress_callback(pct, "downloading")
        elif d.get("status") == "finished":
            progress_callback(90, "processing")

    ydl_opts: dict = {
        "outtmpl": str(out_dir / "%(id)s.%(ext)s"),
        "ffmpeg_location": imageio_ffmpeg.get_ffmpeg_exe(),
        "progress_hooks": [hook],
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "restrictfilenames": True,
        **_cookie_opts(),
    }
    if _JS_RUNTIMES:
        ydl_opts["js_runtimes"] = _JS_RUNTIMES

    if media_type == "audio":
        ydl_opts["format"] = "bestaudio/best"
        if audio_format != "source":
            codec, _, quality = audio_format.partition("-")
            postprocessor: dict = {"key": "FFmpegExtractAudio", "preferredcodec": codec}
            if quality:
                postprocessor["preferredquality"] = quality
            ydl_opts["postprocessors"] = [postprocessor]
    else:
        if video_quality == "source":
            ydl_opts["format"] = "bestvideo+bestaudio/best"
        else:
            height = video_quality.rstrip("p")
            ydl_opts["format"] = f"bestvideo[height<={height}]+bestaudio/best[height<={height}]/best"
        ydl_opts["merge_output_format"] = "mp4"

    # Attempt ladder: the default web client first; on a bot-check/login wall,
    # retry with clients that skip those checks (tv, then embedded players).
    client_ladder: list[Optional[list[str]]] = [None, ["tv"], ["tv_embedded", "web_embedded"]]
    info = None
    last_error: Optional[Exception] = None
    for clients in client_ladder:
        attempt_opts = dict(ydl_opts)
        if clients:
            attempt_opts["extractor_args"] = {"youtube": {"player_client": clients}}
        try:
            with yt_dlp.YoutubeDL(attempt_opts) as ydl:
                info = ydl.extract_info(url, download=True)
            break
        except yt_dlp.utils.DownloadError as error:
            last_error = error
            if _is_auth_challenge(error):
                continue  # next rung of the ladder
            raise
    else:
        raise RuntimeError(
            "YouTube is asking for a signed-in session for this video. "
            "Export your browser cookies (Netscape format) to backend/cookies/youtube_cookies.txt and retry.",
        ) from last_error

    if info is None:
        raise RuntimeError("yt-dlp returned no result for this URL")

    # Search queries (ytsearch1:...) and playlist-shaped URLs come back as a
    # wrapper with an "entries" list rather than a flat video dict — the
    # wrapper's own "id" doesn't match the actual downloaded file's id.
    entries = info.get("entries")
    if entries is not None:
        entries = list(entries)
        if not entries:
            raise RuntimeError("No results found for that search or URL")
        info = entries[0]

    if progress_callback:
        progress_callback(95, "finalizing")

    result_path = _pick_output_file(out_dir, info["id"])

    if progress_callback:
        progress_callback(100, "complete")

    return DownloadResult(
        file_path=result_path,
        title=info.get("title"),
        artist=info.get("artist") or info.get("uploader") or info.get("channel"),
        thumbnail_url=info.get("thumbnail"),
        duration_seconds=info.get("duration"),
    )
