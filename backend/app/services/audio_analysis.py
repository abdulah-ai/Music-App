"""Track edge-silence detection via ffmpeg's silencedetect filter.

Crossfade timing used to be one fixed duration for every track (see the
frontend's playerStore). This gives each track its own fade_in_ms/fade_out_ms
— how much genuine silence sits at the very start/end — so a crossfade only
spans real silence instead of chopping into audible content on a track that
has none, or under-using a track that fades out slowly over many seconds.

Runs two short ffmpeg probes (head/tail slices, not a full decode) so this
stays cheap even for long tracks. Best-effort: any failure just leaves both
fields None, and callers fall back to the old fixed crossfade duration.

Local-storage mode only — same constraint as thumbnails.py, since S3-backed
media bytes aren't on local disk to sample.
"""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

import imageio_ffmpeg

_SILENCE_START_RE = re.compile(r"silence_start:\s*(-?[\d.]+)")
_SILENCE_END_RE = re.compile(r"silence_end:\s*(-?[\d.]+)")

# Only probe this many seconds from each end — long tracks don't need a full
# decode just to find edge silence, and this keeps analysis cheap.
_PROBE_WINDOW_SECONDS = 15.0
_NOISE_FLOOR_DB = "-40dB"
_MIN_SILENCE_SECONDS = "0.3"

# Sanity bounds so a false-positive detection (e.g. a very quiet intro/outro
# misread as full silence) can't produce an unusably long or pointless fade.
_MIN_FADE_MS = 500
_MAX_FADE_MS = 8000


def _run_silencedetect(ffmpeg: str, leading_args: list[str]) -> str:
    """silencedetect writes its silence_start/silence_end markers to stderr,
    not stdout — same capture pattern thumbnails.py uses for ffmpeg errors."""
    result = subprocess.run(
        [
            ffmpeg, "-hide_banner", "-loglevel", "info", *leading_args,
            "-af", f"silencedetect=noise={_NOISE_FLOOR_DB}:d={_MIN_SILENCE_SECONDS}",
            "-f", "null", "-",
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )
    return result.stderr


def _trailing_silence_seconds(stderr: str, probed_duration: float) -> float | None:
    """The start of whatever silence period runs to the end of the probed
    window — either it never got a matching silence_end (still-open when the
    stream ended), or ffmpeg emitted a closing silence_end right at EOF
    (which it does when the stream ends mid-silence). Either way this is
    trailing silence, not just a quiet passage in the middle of the probe."""
    starts = _SILENCE_START_RE.findall(stderr)
    ends = _SILENCE_END_RE.findall(stderr)
    if not starts:
        return None
    try:
        last_start = float(starts[-1])
    except ValueError:
        return None
    if len(ends) < len(starts):
        return last_start
    try:
        last_end = float(ends[-1])
    except ValueError:
        return None
    if last_end >= probed_duration - 0.2:
        return last_start
    return None


def _leading_silence_seconds(stderr: str) -> float | None:
    """The first silence_end, but only if that silence period started at
    (or extremely near) the very beginning of the probed window."""
    starts = _SILENCE_START_RE.findall(stderr)
    ends = _SILENCE_END_RE.findall(stderr)
    if not starts or not ends:
        return None
    try:
        first_start = float(starts[0])
        first_end = float(ends[0])
    except ValueError:
        return None
    if first_start > 0.5:
        return None  # audio starts immediately — no leading silence to trim into
    return first_end


def analyze_track_edges(file_path: str, duration_seconds: float) -> dict[str, int | None] | None:
    """Best-effort fade_in_ms/fade_out_ms for one audio file. None on any
    failure — callers should treat that the same as "not analyzed yet"."""
    source = Path(file_path)
    if not source.exists() or duration_seconds <= 0:
        return None

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    try:
        head_stderr = _run_silencedetect(
            ffmpeg, ["-i", str(source), "-t", str(min(_PROBE_WINDOW_SECONDS, duration_seconds))]
        )
        tail_start = max(0.0, duration_seconds - _PROBE_WINDOW_SECONDS)
        tail_stderr = _run_silencedetect(ffmpeg, ["-ss", str(tail_start), "-i", str(source)])
    except (subprocess.TimeoutExpired, OSError):
        return None

    fade_in_ms: int | None = None
    leading = _leading_silence_seconds(head_stderr)
    if leading is not None:
        candidate = round(leading * 1000)
        if _MIN_FADE_MS <= candidate <= _MAX_FADE_MS:
            fade_in_ms = candidate

    fade_out_ms: int | None = None
    trailing_relative = _trailing_silence_seconds(tail_stderr, duration_seconds - tail_start)
    if trailing_relative is not None:
        absolute_start = tail_start + trailing_relative
        candidate = round((duration_seconds - absolute_start) * 1000)
        if _MIN_FADE_MS <= candidate <= _MAX_FADE_MS:
            fade_out_ms = candidate

    return {"fade_in_ms": fade_in_ms, "fade_out_ms": fade_out_ms}
