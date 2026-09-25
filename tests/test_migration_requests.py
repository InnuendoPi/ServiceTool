import io
import unittest
from contextlib import ExitStack
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError
import app


class MigrationRequestTests(unittest.TestCase):
    def setUp(self):
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.stack.enter_context(patch.object(app, "GITHUB_JSON_CACHE", {}))
        self.stack.enter_context(patch.object(app, "GITHUB_RETRY_AT", 0))
        self.open = self.stack.enter_context(patch.object(app.request, "urlopen"))
        self.open.side_effect = lambda *a, **k: io.BytesIO(b'{"value": 1}')

    def test_api_cache_is_isolated_and_expires(self):
        url = "https://api.github.com/repos/test/commits/main"
        with patch.object(app.time, "time", return_value=100):
            first = app.json_request(url)
            first["value"] = 2
            self.assertEqual(app.json_request(url), {"value": 1})
        self.assertEqual(self.open.call_count, 1)
        with patch.object(app.time, "time", return_value=161):
            app.json_request(url)
        self.assertEqual(self.open.call_count, 2)

    def test_device_requests_never_cached(self):
        for _ in range(2):
            app.json_request("http://brautomat/reqVis")
        self.assertEqual(self.open.call_count, 2)

    def test_limit_suppresses_requests_until_reset(self):
        url = "https://api.github.com/repos/test"
        self.open.side_effect = HTTPError(url, 403, "limit", {
            "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": "200"}, None)
        with patch.object(app.time, "time", return_value=100):
            for _ in range(2):
                with self.assertRaisesRegex(HTTPError, "retry at.*101 s"):
                    app.json_request(url)
        self.assertEqual(self.open.call_count, 1)
        self.open.side_effect = lambda *a, **k: io.BytesIO(b'{}')
        with patch.object(app.time, "time", return_value=201):
            self.assertEqual(app.json_request(url), {})

    def test_other_forbidden_errors_do_not_block_api(self):
        self.open.side_effect = HTTPError("url", 403, "forbidden", {}, None)
        for _ in range(2):
            with self.assertRaises(HTTPError):
                app.json_request("https://api.github.com/repos/private")
        self.assertEqual(self.open.call_count, 2)
        self.assertEqual(app.GITHUB_RETRY_AT, 0)

    def test_catalog_keeps_url_but_not_availability(self):
        with patch.object(app, "package_location", side_effect=OSError("limit")):
            catalog = app.package_catalog("1.66.1", purpose="migration")
        item = next(p for p in catalog["packages"] if p["key"] == "development_170")
        self.assertIn("development/Updates/", item["path"])
        self.assertFalse(item["available"])
        self.assertEqual(item["error"], "limit")

    def test_api_backup_failure_never_enters_bootloader(self):
        session = MagicMock()
        session.report = {"id": "test"}
        session.capture.side_effect = RuntimeError("serial read failed")
        mocks = {
            "ensure_migration_port_unlocked": None, "ensure_esptool_port_available": None,
            "current_firmware_version": ("1.66.1", (1, 66, 1)),
            "migration_require_idle": None, "download_config_backup": b'{"config": [{}]}',
            "prepare_migration_package": ("package", {"version": "1.70.0"}),
            "migration_webfiles": {}, "migration_user_files": {},
            "ensure_esptool_available": "tool", "prepare_esptool_serial_handover": {},
        }
        for name, value in mocks.items():
            self.stack.enter_context(patch.object(app, name, return_value=value))
        self.stack.enter_context(patch.object(app.migration_engine.ApiSession, "create", return_value=session))
        device = self.stack.enter_context(patch.object(app.migration_engine, "Esptool")).return_value
        self.stack.enter_context(patch.object(app, "download_config_backup", side_effect=RuntimeError("API backup failed")))
        with self.assertRaisesRegex(RuntimeError, "API backup failed"):
            app.migration_job(app.Job(id="test", type="migration", title="Test"),
                              "http://device", False, "COM3", 115200, "open", "package", "", False, True)
        session.install.assert_not_called()
        device.boot.assert_not_called()
