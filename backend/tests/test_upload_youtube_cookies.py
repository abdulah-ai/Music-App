from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from tools import upload_youtube_cookies


class UploadYoutubeCookiesTests(unittest.TestCase):
    def test_validate_keeps_only_youtube_and_google_cookies(self) -> None:
        export = "\n".join(
            (
                "# Netscape HTTP Cookie File",
                "#HttpOnly_.youtube.com\tTRUE\t/\tTRUE\t4102444800\tLOGIN_INFO\tlogin",
                ".youtube.com\tTRUE\t/\tTRUE\t4102444800\tSAPISID\tsid",
                ".google.com\tTRUE\t/\tTRUE\t4102444800\tNID\tgoogle",
                ".example.com\tTRUE\t/\tTRUE\t4102444800\tPRIVATE\tunrelated",
            )
        )
        with tempfile.TemporaryDirectory() as tmp:
            cookie_path = Path(tmp) / "cookies.txt"
            cookie_path.write_text(export, encoding="utf-8")
            scoped = upload_youtube_cookies.validate(cookie_path)

        self.assertTrue(scoped.startswith("# Netscape HTTP Cookie File\n"))
        self.assertIn("#HttpOnly_.youtube.com", scoped)
        self.assertIn(".google.com", scoped)
        self.assertNotIn("example.com", scoped)
        self.assertNotIn("unrelated", scoped)

    def test_validate_rejects_missing_login_info(self) -> None:
        export = "\n".join(
            (
                "# Netscape HTTP Cookie File",
                ".youtube.com\tTRUE\t/\tTRUE\t4102444800\tSAPISID\tsid",
            )
        )
        with tempfile.TemporaryDirectory() as tmp:
            cookie_path = Path(tmp) / "cookies.txt"
            cookie_path.write_text(export, encoding="utf-8")
            with self.assertRaises(SystemExit):
                upload_youtube_cookies.validate(cookie_path)

    def test_validate_rejects_expired_auth_cookies_even_with_fresh_google_cookie(self) -> None:
        export = "\n".join(
            (
                "# Netscape HTTP Cookie File",
                ".youtube.com\tTRUE\t/\tTRUE\t1\tLOGIN_INFO\texpired-login",
                ".youtube.com\tTRUE\t/\tTRUE\t1\tSAPISID\texpired-sid",
                ".google.com\tTRUE\t/\tTRUE\t4102444800\tNID\tfresh-but-not-auth",
            )
        )
        with tempfile.TemporaryDirectory() as tmp:
            cookie_path = Path(tmp) / "cookies.txt"
            cookie_path.write_text(export, encoding="utf-8")
            with self.assertRaises(SystemExit):
                upload_youtube_cookies.validate(cookie_path)

    def test_validate_rejects_login_info_without_sid_auth_cookie(self) -> None:
        export = "\n".join(
            (
                "# Netscape HTTP Cookie File",
                ".youtube.com\tTRUE\t/\tTRUE\t4102444800\tLOGIN_INFO\tlogin",
                ".youtube.com\tTRUE\t/\tTRUE\t4102444800\tPREF\tnot-auth",
            )
        )
        with tempfile.TemporaryDirectory() as tmp:
            cookie_path = Path(tmp) / "cookies.txt"
            cookie_path.write_text(export, encoding="utf-8")
            with self.assertRaises(SystemExit):
                upload_youtube_cookies.validate(cookie_path)

    def test_push_uses_secret_file_and_removes_raw_cookie_envs(self) -> None:
        calls: list[tuple[str, str, dict | None, set[int] | None]] = []

        def fake_render_call(
            _api_key: str,
            method: str,
            path: str,
            payload: dict | None = None,
            *,
            ignore_statuses: set[int] | None = None,
        ):
            calls.append((method, path, payload, ignore_statuses))
            if method == "GET":
                return [{"service": {"id": "srv-test", "name": "supermediaapp-api"}}]
            if method == "POST":
                return {"id": "dep-test"}
            return None

        with patch.object(upload_youtube_cookies, "render_call", fake_render_call):
            upload_youtube_cookies.push_to_render("rnd_test", "supermediaapp-api", "cookie text")

        self.assertIn(
            (
                "PUT",
                "/services/srv-test/secret-files/youtube_cookies.txt",
                {"content": "cookie text"},
                None,
            ),
            calls,
        )
        self.assertIn(
            (
                "PUT",
                "/services/srv-test/env-vars/SMA_YTDLP_COOKIES_FILE",
                {"value": "/etc/secrets/youtube_cookies.txt"},
                None,
            ),
            calls,
        )
        for key in upload_youtube_cookies.LEGACY_COOKIE_ENV_KEYS:
            self.assertIn(("DELETE", f"/services/srv-test/env-vars/{key}", None, {404}), calls)
        self.assertIn(
            ("POST", "/services/srv-test/deploys", {"clearCache": "do_not_clear"}, None),
            calls,
        )


if __name__ == "__main__":
    unittest.main()
