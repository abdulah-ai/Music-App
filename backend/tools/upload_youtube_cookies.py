"""Validate a YouTube cookies.txt export and push it to Render in one step.

Usage:
    python tools/upload_youtube_cookies.py path\\to\\cookies.txt --api-key rnd_xxx
    python tools/upload_youtube_cookies.py path\\to\\cookies.txt          (validate only)

With an API key (flag or RENDER_API_KEY env var), this uploads a Render Secret
File, points SMA_YTDLP_COOKIES_FILE at it, removes legacy raw-cookie environment
variables, and triggers a redeploy. Without an API key, it validates the export
and prints the manual Render steps.

Stdlib only - runs with any Python 3.9+.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

RENDER_API = "https://api.render.com/v1"
SECRET_FILE_NAME = "youtube_cookies.txt"
SECRET_FILE_PATH = f"/etc/secrets/{SECRET_FILE_NAME}"
LEGACY_COOKIE_ENV_KEYS = ("SMA_YTDLP_COOKIES_TEXT", "SMA_YTDLP_COOKIES_B64")

# This mirrors yt-dlp's YoutubeBaseInfoExtractor._has_auth_cookies check:
# LOGIN_INFO plus at least one SID cookie applicable to www.youtube.com.
LOGIN_COOKIE = "LOGIN_INFO"
SID_COOKIES = {"SAPISID", "__Secure-1PAPISID", "__Secure-3PAPISID"}


def fail(message: str) -> None:
    print(f"[x] {message}")
    sys.exit(1)


def _cookie_fields(raw: str) -> list[str] | None:
    line = raw.strip()
    if not line:
        return None
    if line.startswith("#HttpOnly_"):
        line = line.removeprefix("#HttpOnly_")
    elif line.startswith("#"):
        return None

    fields = line.split("\t")
    if len(fields) != 7:
        fail(
            "This is not a Netscape-format export (each cookie line needs 7 tab-separated fields).\n"
            "    Use a 'Get cookies.txt LOCALLY'-style extension and export for youtube.com.",
        )
    return fields


def _is_youtube_or_google_domain(domain: str) -> bool:
    normalized = domain.lower().lstrip(".")
    return normalized in {"youtube.com", "google.com"} or normalized.endswith((".youtube.com", ".google.com"))


def _is_youtube_domain(domain: str) -> bool:
    normalized = domain.lower().lstrip(".")
    return normalized == "youtube.com" or normalized.endswith(".youtube.com")


def validate(path: Path) -> str:
    if not path.is_file():
        fail(f"File not found: {path}")
    text = path.read_text(encoding="utf-8", errors="replace").strip()
    if not text:
        fail("The cookie file is empty.")

    current_youtube_names: set[str] = set()
    scoped_lines: list[str] = []
    cookie_lines = 0
    now = time.time()
    for raw in text.splitlines():
        fields = _cookie_fields(raw)
        if fields is None:
            continue
        cookie_lines += 1
        domain, _, _, _, expiry, name, _ = fields
        if not _is_youtube_or_google_domain(domain):
            continue
        scoped_lines.append(raw.strip())
        try:
            expiry_value = int(float(expiry))
        except ValueError:
            fail(f"Cookie {name} has an invalid expiry value.")
        if _is_youtube_domain(domain) and (expiry_value <= 0 or expiry_value >= now):
            current_youtube_names.add(name)

    if not scoped_lines:
        fail("No youtube.com / google.com cookies in this file - export while on youtube.com.")

    if LOGIN_COOKIE not in current_youtube_names:
        fail(
            "The export has no current YouTube LOGIN_INFO cookie.\n"
            "    Sign in to YouTube in a private window first, then export that window's YouTube cookies.",
        )
    if not SID_COOKIES.intersection(current_youtube_names):
        fail(
            "The export has LOGIN_INFO but no current YouTube authentication SID cookie.\n"
            "    Re-export only youtube.com cookies from the signed-in private window.",
        )

    print(f"[ok] Looks like a valid signed-in export: {len(scoped_lines)} YouTube/Google cookies.")
    dropped = cookie_lines - len(scoped_lines)
    if dropped:
        print(f"[ok] Removed {dropped} unrelated browser cookies before upload.")
    return "# Netscape HTTP Cookie File\n" + "\n".join(scoped_lines) + "\n"


def render_call(
    api_key: str,
    method: str,
    path: str,
    payload: dict | None = None,
    *,
    ignore_statuses: set[int] | None = None,
):
    req = urllib.request.Request(
        RENDER_API + path,
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            body = res.read()
            return json.loads(body) if body else None
    except urllib.error.HTTPError as error:
        if ignore_statuses and error.code in ignore_statuses:
            return None
        detail = error.read().decode(errors="replace")[:300]
        fail(f"Render API {method} {path} -> {error.code}: {detail}")


def push_to_render(api_key: str, service_name: str, cookies_text: str) -> None:
    services = render_call(api_key, "GET", f"/services?name={urllib.parse.quote(service_name)}&limit=20") or []
    match = next((s["service"] for s in services if s.get("service", {}).get("name") == service_name), None)
    if match is None:
        fail(f"No Render service named '{service_name}' visible to this API key.")
    service_id = match["id"]
    print(f"[ok] Found service {service_name} ({service_id})")

    secret_name = urllib.parse.quote(SECRET_FILE_NAME, safe="")
    render_call(api_key, "PUT", f"/services/{service_id}/secret-files/{secret_name}", {"content": cookies_text})
    print(f"[ok] Render Secret File {SECRET_FILE_NAME} updated.")

    render_call(
        api_key,
        "PUT",
        f"/services/{service_id}/env-vars/SMA_YTDLP_COOKIES_FILE",
        {"value": SECRET_FILE_PATH},
    )
    print(f"[ok] SMA_YTDLP_COOKIES_FILE points to {SECRET_FILE_PATH}.")

    for key in LEGACY_COOKIE_ENV_KEYS:
        encoded_key = urllib.parse.quote(key, safe="")
        render_call(
            api_key,
            "DELETE",
            f"/services/{service_id}/env-vars/{encoded_key}",
            ignore_statuses={404},
        )
    print("[ok] Removed legacy raw-cookie environment variables.")

    deploy = render_call(api_key, "POST", f"/services/{service_id}/deploys", {"clearCache": "do_not_clear"})
    deploy_id = (deploy or {}).get("id", "unknown")
    print(f"[ok] Redeploy triggered ({deploy_id}). Watch it in the Render dashboard.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("cookies_file", type=Path, help="Path to the Netscape cookies.txt export")
    parser.add_argument("--api-key", default=os.environ.get("RENDER_API_KEY"), help="Render API key (or RENDER_API_KEY env)")
    parser.add_argument("--service", default="supermediaapp-api", help="Render service name")
    args = parser.parse_args()

    cookies_text = validate(args.cookies_file)

    if not args.api_key:
        print()
        print("[i] No Render API key given - validation only.")
        print("    In Render > supermediaapp-api > Environment, add a Secret File named")
        print(f"    {SECRET_FILE_NAME}, set SMA_YTDLP_COOKIES_FILE={SECRET_FILE_PATH},")
        print("    and delete SMA_YTDLP_COOKIES_TEXT / SMA_YTDLP_COOKIES_B64 before deploying.")
        print("    Or rerun with --api-key rnd_... to upload and redeploy automatically.")
        return

    push_to_render(args.api_key, args.service, cookies_text)


if __name__ == "__main__":
    main()
