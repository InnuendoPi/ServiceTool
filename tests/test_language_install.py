"""Language downloads follow package catalog paths, not device filesystem paths."""
import unittest
from unittest.mock import Mock, patch
import app


class LanguageInstallTests(unittest.TestCase):
    def test_language_api_missing_special_ref_returns_json_error(self):
        for ref in ("", "&ref=%20%20"):
            handler = app.AppHandler.__new__(app.AppHandler)
            handler.path = "/api/languages/repo?source=special" + ref
            handler._send_json = Mock()
            with patch.object(app, "list_remote_languages") as catalog:
                handler.do_GET()
            catalog.assert_not_called()
            handler._send_json.assert_called_once_with(
                {"error": "Please select a firmware version first."}, status=400)

    def test_language_api_catalog_failure_returns_json_error(self):
        handler = app.AppHandler.__new__(app.AppHandler)
        handler.path = "/api/languages/repo?source=development&package_root=Updates"
        for error in (OSError("offline"), RuntimeError("incomplete catalog")):
            handler._send_json = Mock()
            with patch.object(app, "list_remote_languages", side_effect=error):
                handler.do_GET()
            handler._send_json.assert_called_once_with({"error": str(error)}, status=502)

    def test_catalog_paths_for_old_and_new_packages(self):
        for ref in ("v1.65.5", "v1.66.0"):
            for name, path in (("deutsch.json", "data/language/deutsch.json"),
                               ("english.json", "language/english.json"),
                               ("english.json", "data/language/english.json")):
                with (self.subTest(ref=ref, path=path),
                      patch.object(app, "list_remote_languages", return_value=[{"filename": name, "path": path}]),
                      patch.object(app, "download_bytes", return_value=b'{"label":"test"}') as download,
                      patch.object(app, "post_file_to_fs", return_value="ok") as upload,
                      patch.object(app, "try_base_urls", return_value=("http://device", "ok"))):
                    app.install_language_job(app.Job(id="lang", type="language", title="Language"),
                                             "http://device", "special", name, ref)
                    self.assertEqual(download.call_args.args[0],
                        f"https://raw.githubusercontent.com/InnuendoPi/Brautomat32/{ref}/{path}")
                    self.assertEqual(upload.call_args.args[1], "/language/" + name)

    def test_unknown_unsafe_and_invalid_language_never_uploaded(self):
        cases = [([], b'{}'),
                 ([{"filename":"deutsch.json", "path":"other/deutsch.json"}], b'{}'),
                 ([{"filename":"deutsch.json", "path":"data/language/deutsch.json"}], b'[]'),
                 ([{"filename":"deutsch.json", "path":"data/language/deutsch.json"}], b'<html>error</html>')]
        for catalog, content in cases:
            with (self.subTest(catalog=catalog, content=content),
                  patch.object(app, "list_remote_languages", return_value=catalog),
                  patch.object(app, "download_bytes", return_value=content),
                  patch.object(app, "post_file_to_fs") as upload):
                with self.assertRaises(ValueError):
                    app.install_language_job(app.Job(id="lang", type="language", title="Language"),
                                             "http://device", "release", "deutsch.json")
                upload.assert_not_called()

    def test_fallback_finds_both_languages_under_data(self):
        def download(url, **kwargs):
            if "/data/language/" in url:
                return b'{}'
            raise OSError("not found")
        with (patch.object(app, "json_request", side_effect=OSError("catalog unavailable")),
              patch.object(app, "download_bytes", side_effect=download)):
            rows = app.list_remote_languages("special", "v1.66.0")
        self.assertEqual(len(rows), 12)
        self.assertTrue(all(row["path"].startswith("data/language/") for row in rows))
        self.assertIn("svenska.json", [row["filename"] for row in rows])

    def test_partial_catalog_failure_checks_all_languages(self):
        from urllib.error import HTTPError
        def catalog(url, **kwargs):
            if "/contents/language?" in url:
                raise HTTPError(url,403,"rate limited",{},None)
            return [{"filename":"deutsch.json","name":"deutsch.json","path":"data/language/deutsch.json"}]
        with (patch.object(app,"json_request",side_effect=catalog),
              patch.object(app,"download_bytes",return_value=b'{}')):
            rows=app.list_remote_languages("development")
        self.assertEqual(len(rows),12)

    def test_raw_download_failure_does_not_return_partial_list(self):
        def download(url, **kwargs):
            if url.endswith("english.json"): raise OSError("connection lost")
            return b'{}'
        with (patch.object(app,"json_request",side_effect=OSError("rate limited")),
              patch.object(app,"download_bytes",side_effect=download)):
            with self.assertRaisesRegex(RuntimeError,"completely"):
                app.list_remote_languages("development")
