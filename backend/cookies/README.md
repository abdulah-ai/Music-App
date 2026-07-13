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

YouTube may challenge datacenter IPs as bots. On Render, upload the export as a
Secret File named `youtube_cookies.txt`, then set:

```text
SMA_YTDLP_COOKIES_FILE=/etc/secrets/youtube_cookies.txt
```

Delete any old `SMA_YTDLP_COOKIES_TEXT` or `SMA_YTDLP_COOKIES_B64` values.
Putting a full browser export in an environment variable can exceed Linux's
process environment limit and stop the Render build before Python starts.

Validate an export, and optionally upload it to Render and redeploy, with:

```powershell
python tools/upload_youtube_cookies.py path\to\cookies.txt
$env:RENDER_API_KEY = Read-Host "Render API key"
python tools/upload_youtube_cookies.py path\to\cookies.txt
Remove-Item Env:RENDER_API_KEY
```

Cookies expire and may be invalidated by YouTube. Rotate them when the job
message says the configured cookies were rejected. Never put cookie data in a
frontend environment variable or inside the APK.
