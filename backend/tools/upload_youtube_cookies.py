"""Validate a YouTube cookies.txt export and push it to Render in one step.

Usage:
    python tools/upload_youtube_cookies.py path\\to\\cookies.txt --api-key rnd_xxx
    python tools/upload_youtube_cookies.py path\\to\\cookies.txt          (validate only)

With an API key (flag or RENDER_API_KEY env var) it sets SMA_YTDLP_COOKIES_TEXT
on the `supermediaapp-api` service and triggers a redeploy. Without one it just
validates the file so you can paste it into the Render dashboard yourself.

Stdlib only — runs with any Python 3.9+.
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

# Cookies that a signed-in YouTube session must carry for yt-dlp to be useful.
REQUIRED_COOKIES = {"__Secure-3PSID", "__Secure-3PAPISID"}
NICE_TO_HAVE = {"SAPISID", "LOGIN_INFO", "__Secure-1PSID"}


def fail(message: str) -> None:
    print(f"[x] {message}")
    sys.exit(1)


def validate(path: Path) -> str:
    if not path.is_file():
        fail(f"File not found: {path}")
    text = path.read_text(encoding="utf-8", errors="replace").strip()
    if not text:
        fail("The cookie file is empty.")

    names: set[str] = set()
    youtube_lines = 0
    newest_expiry = 0
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        fields = line.split("\t")
        if len(fields) != 7:
            fail(
                "This is not a Netscape-format export (each cookie line needs 7 tab-separated fields).\n"
                "    Use a 'Get cookies.txt LOCALLY'-style extension and export for youtube.com.",
            )
        domain, _, _, _, expiry, name, _ = fields
        if "youtube.com" in domain or "google.com" in domain:
            youtube_lines += 1
            names.add(name)
            try:
                newest_expiry = max(newest_expiry, int(float(expiry)))
            except ValueError:
                pass

    if youtube_lines == 0:
        fail("No youtube.com / google.com cookies in this file — export while on youtube.com.")

    missing = REQUIRED_COOKIES - names
    if missing:
        fail(
            f"Missing signed-in session cookies: {', '.join(sorted(missing))}.\n"
            "    You are probably not logged in — sign in to YouTube in a private window first, then export.",
        )

    absent_nice = NICE_TO_HAVE - names
    if absent_nice:
        print(f"[!] Heads up, some optional cookies are absent: {', '.join(sorted(absent_nice))}")
    if newest_expiry and newest_expiry < time.time():
        fail("Every cookie in this export is already expired — do a fresh export.")

    print(f"[ok] Looks like a valid signed-in export: {youtube_lines} YouTube/Google cookies.")
    if not text.startswith("# Netscape HTTP Cookie File"):
        text = "# Netscape HTTP Cookie File\n" + text
    return text


def render_call(api_key: str, method: str, path: str, payload: dict | None = None):
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
        detail = error.read().decode(errors="replace")[:300]
        fail(f"Render API {method} {path} -> {error.code}: {detail}")


def push_to_render(api_key: str, service_name: str, cookies_text: str) -> None:
    services = render_call(api_key, "GET", f"/services?name={urllib.parse.quote(service_name)}&limit=20") or []
    match = next((s["service"] for s in services if s.get("service", {}).get("name") == service_name), None)
    if match is None:
        fail(f"No Render service named '{service_name}' visible to this API key.")
    service_id = match["id"]
    print(f"[ok] Found service {service_name} ({service_id})")

    render_call(api_key, "PUT", f"/services/{service_id}/env-vars/SMA_YTDLP_COOKIES_TEXT", {"value": cookies_text})
    print("[ok] SMA_YTDLP_COOKIES_TEXT updated.")

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
        print("[i] No Render API key given — validation only.")
        print("    Paste the file's full contents into Render > supermediaapp-api >")
        print("    Environment > SMA_YTDLP_COOKIES_TEXT, then Manual Deploy > Deploy latest commit.")
        print("    Or rerun with --api-key rnd_... to do both automatically.")
        return

    push_to_render(args.api_key, args.service, cookies_text)


if __name__ == "__main__":
    main()
