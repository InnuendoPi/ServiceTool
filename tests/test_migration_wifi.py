import unittest
from unittest.mock import patch

import app


class MigrationWifiTests(unittest.TestCase):
    def test_capture_preserves_spaces_and_prefers_serial(self):
        with patch.object(app, "wifi_credentials", return_value={
            "found": True, "ssid": " network ", "pass": " secret ",
        }) as read:
            result = app.capture_migration_wifi("http://device", "COM1", 115200)
        self.assertEqual(result["ssid"], " network ")
        self.assertEqual(result["password"], " secret ")
        read.assert_called_once_with("", serial_port="COM1", serial_baud=115200)

    def test_incomplete_credentials_stop_capture(self):
        for payload in ({}, {"ssid": "test"}, {"ssid": "test", "pass": None},
                        {"found": False, "ssid": "test", "pass": "secret"},
                        {"ssid": "test", "pass": "", "hasPassword": True}):
            with self.subTest(payload=payload), patch.object(app, "wifi_credentials", return_value=payload):
                with self.assertRaisesRegex(RuntimeError, "before erase"):
                    app.capture_migration_wifi("http://device", "COM1", 115200)

    def test_restore_requires_save_connection_and_matching_readback(self):
        good = {"saved": True, "verification": {"result": "success"}}
        for response, readback, success in (
            ({"saved": False}, {}, False),
            ({"saved": True, "verification": {"result": "unknown"}}, {}, False),
            (good, {"ssid": "test", "pass": "wrong"}, False),
            (good, {"ssid": "test", "pass": " secret "}, True),
        ):
            with (
                self.subTest(response=response, success=success),
                patch.object(app.time, "sleep"),
                patch.object(app.STATE, "active_serial_config", return_value=None),
                patch.object(app, "wifi_save", return_value=response) as save,
                patch.object(app, "wifi_credentials", return_value=readback),
            ):
                job = app.Job(id="wifi-test", type="migration", title="Test")
                if success:
                    result = app.restore_migration_wifi(job, "COM1", 115200, {"ssid": "test", "password": " secret "})
                    self.assertTrue(result["verified"])
                    self.assertNotIn("secret", str(result))
                    save.assert_called_once_with("", "test", " secret ", serial_port="COM1", serial_baud=115200)
                else:
                    with self.assertRaisesRegex(RuntimeError, "Unable to restore"):
                        app.restore_migration_wifi(job, "COM1", 115200, {"ssid": "test", "password": " secret "})
