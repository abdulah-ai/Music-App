# Optional YouTube cookies

Most videos download without any cookies. If a specific video fails with a
"sign in" / "not a bot" message even after the automatic client fallbacks,
drop a Netscape-format cookie export here as:

```
backend/cookies/youtube_cookies.txt
```

How to export: install a "Get cookies.txt" style browser extension (or use
`yt-dlp --cookies-from-browser firefox --cookies youtube_cookies.txt` on a
machine with Firefox), while signed in to YouTube, and save the file. The
downloader picks it up automatically on the next job — no restart needed.

You can also set the `YTDLP_COOKIES_FILE` environment variable to point at a
cookie file elsewhere, or `YTDLP_COOKIES_FROM_BROWSER=firefox` to read
cookies live from a local browser profile.

## Hosted deployments (Render)

Hosted datacenter IPs are blocked by YouTube as bots, so cookies are
*required* there. Set the env var `SMA_YTDLP_COOKIES_TEXT` to the full
contents of the cookies.txt export (it takes priority over every option
above). Validate the export — and optionally push it + redeploy in one step —
with:

```
python tools/upload_youtube_cookies.py path\to\cookies.txt --api-key rnd_...
```

