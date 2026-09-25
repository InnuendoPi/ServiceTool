"""Language downloads follow package catalog paths, not device filesystem paths."""
import unittest
from unittest.mock import Mock, patch
import app


class LanguageInstallTests(unittest.TestCase):
    def setUp(self):
        self.revision = "a" * 40
        for name, value in (
                ("device_status", {"firmware": "1.66.0", "base_url": "http://device"}),
                ("json_request", {"sha": self.revision}),
                ("remote_repo_version_manifest", {"version": "1.66.0"})):
            patcher = patch.object(app, name, return_value=value)
            patcher.start()
            self.addCleanup(patcher.stop)

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
                      patch.object(app, "download_fs_file", return_value=b'{"label":"test"}'),
                      patch.object(app, "post_json", return_value="ok")):
                    app.install_language_job(app.Job(id="lang", type="language", title="Language"),
                                             "http://device", "special", name, ref)
                    self.assertEqual(download.call_args.args[0],
                        f"https://raw.githubusercontent.com/InnuendoPi/Brautomat32/{self.revision}/{path}")
                    self.assertEqual(upload.call_args.args[1], "/language/" + name)

    def test_unknown_unsafe_and_invalid_language_never_uploaded(self):
        cases = [([{"filename":"deutsch.json", "path":"data/language/deutsch.json"}], b'{}'),
                 ([], b'{}'),
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

    def test_language_generation_and_unknown_device_block_upload(self):
        for device, target, root in (("", "1.66.0", "build"),
                                     ("1.66.0", "1.70.0", "build"),
                                     ("1.67.2", "1.66.0", "Updates"),
                                     ("1.66.0", "1.70.0", "Updates")):
            with (self.subTest(device=device, target=target, root=root),
                  patch.object(app, "device_status", return_value={"firmware": device}),
                  patch.object(app, "remote_repo_version_manifest", return_value={"version": target}),
                  patch.object(app, "post_file_to_fs") as upload,
                  patch.object(app, "post_json") as activate):
                with self.assertRaises(ValueError):
                    app.install_language_job(app.Job("lang", "language", "Language"),
                                             "http://device", "release", "english.json", package_root=root)
                upload.assert_not_called()
                activate.assert_not_called()

    def test_modern_language_is_pinned_and_verified_before_activation(self):
        events = []
        content = b'{"label":"English"}'
        def upload(*args, **kwargs):
            events.append("upload")
            return "ok"
        def verify(*args, **kwargs):
            events.append("verify")
            return content
        def activate(*args, **kwargs):
            events.append("activate")
            return "ok"
        with (patch.object(app, "device_status", return_value={"firmware": "1.67.2"}),
              patch.object(app, "remote_repo_version_manifest", return_value={"version": "1.70.0"}) as manifest,
              patch.object(app, "list_remote_languages", return_value=[{
                  "filename": "english.json", "path": "Updates/data/language/english.json"}]) as catalog,
              patch.object(app, "download_bytes", return_value=content) as download,
              patch.object(app, "post_file_to_fs", side_effect=upload),
              patch.object(app, "download_fs_file", side_effect=verify),
              patch.object(app, "post_json", side_effect=activate)):
            result = app.install_language_job(app.Job("lang", "language", "Language"),
                                              "http://device", "development_170", "english.json", package_root="Updates")
        self.assertEqual(events, ["upload", "verify", "activate"])
        manifest.assert_called_once_with(self.revision, "Updates")
        catalog.assert_called_once_with("special", self.revision, "Updates")
        self.assertIn(f"/{self.revision}/Updates/data/language/english.json", download.call_args.args[0])
        self.assertEqual(result["commit"], self.revision)

    def test_failed_download_upload_or_readback_never_activates_language(self):
        content = b'{"label":"English"}'
        for failing in ("download", "upload", "readback", "mismatch"):
            with (self.subTest(failing=failing),
                  patch.object(app, "list_remote_languages", return_value=[{
                      "filename": "english.json", "path": "language/english.json"}]),
                  patch.object(app, "download_bytes", return_value=content,
                               side_effect=OSError("offline") if failing == "download" else None),
                  patch.object(app, "post_file_to_fs", return_value="ok",
                               side_effect=OSError("upload") if failing == "upload" else None),
                  patch.object(app, "download_fs_file", return_value=b'{}' if failing == "mismatch" else content,
                               side_effect=OSError("readback") if failing == "readback" else None),
                  patch.object(app, "post_json") as activate):
                with self.assertRaises((OSError, RuntimeError)):
                    app.install_language_job(app.Job("lang", "language", "Language"),
                                             "http://device", "release", "english.json")
                activate.assert_not_called()

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
