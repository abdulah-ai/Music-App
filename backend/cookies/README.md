# Optional YouTube cookies

Most videos download without cookies. If YouTube returns a "sign in" or
"not a bot" challenge after the automatic transport fallbacks, export a
fresh Netscape-format cookie file while signed in and save it as:

```text
backend/cookies/youtube_cookies.txt
```

One local export method is:

```powershell
yt-dlp --cookies-from-browser firefox --cookies youtube_cookies.txt
```

The backend detects the conventional file on the next job without a restart.
You can instead set `SMA_YTDLP_COOKIES_FILE` to a cookie file elsewhere.
Cookie files contain account credentials, so `backend/cookies/*.txt` is
ignored by Git and Docker and must never be committed.

## Hosted deployments

YouTube may challenge datacenter IPs as bots. Set `SMA_YTDLP_COOKIES_TEXT` to
the full Netscape cookie export; it takes priority over base64 and file-based
settings. `SMA_YTDLP_COOKIES_B64` is available when multiline environment
values are inconvenient.

Validate an export, and optionally upload it to Render and redeploy, with:

```powershell
python tools/upload_youtube_cookies.py path\to\cookies.txt
python tools/upload_youtube_cookies.py path\to\cookies.txt --api-key rnd_...
```

Cookies expire and may be invalidated by YouTube. Rotate them when the job
message says the configured cookies were rejected. Never put cookie data in a
frontend environment variable or inside the APK.
