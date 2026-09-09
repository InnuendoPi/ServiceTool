import hashlib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError

import app
from test_migration import image


class MaintenanceRepairTests(unittest.TestCase):
    def test_reset_posts_without_body_and_without_retry(self):
        response = MagicMock()
        response.__enter__.return_value.status = 200
        with patch.object(app.request, "urlopen", return_value=response) as send:
            self.assertTrue(app.maintenance_reset_brew_state("http://device")["ok"])
            req = send.call_args.args[0]
            self.assertEqual(req.full_url, "http://device/api/brew-state/reset")
            self.assertEqual(req.method, "POST")
            self.assertIsNone(req.data)
            self.assertIsNone(req.get_header("X-service-token"))
            send.assert_called_once()

    def test_reset_errors_preserve_http_status_and_release_lock(self):
        for code in (401, 409, 500):
            with patch.object(app.request, "urlopen", side_effect=HTTPError("http://device", code, "error", {}, None)) as send:
                self.assertEqual(app.maintenance_reset_brew_state("http://device"), {"ok": False, "status": code})
                send.assert_called_once()
                self.assertFalse(app.MIGRATION_LOCK.locked())

    def test_firmware_upload_only_sends_main_image(self):
        with tempfile.TemporaryDirectory() as folder:
            directory = Path(folder)
            payload = image("BrautomatMain")
            (directory / "firmware.bin").write_bytes(payload)
            for name in ("bootloader.bin", "partitions.bin", "boot_app0.bin", "Littlefs.bin", "serviceapp.bin"):
                (directory / name).write_bytes(b"must not be uploaded")
            response = MagicMock()
            response.__enter__.return_value.status = 200
            with (patch.object(app, "resolve_package", return_value=directory),
                  patch.object(app.request, "urlopen", return_value=response) as send,
                  patch.object(app, "ensure_esptool_available") as tool):
                app.maintenance_firmware_job(app.Job(id="repair", type="flash", title="Repair"), "http://device", "local", folder, "")
                req = send.call_args.args[0]
                self.assertEqual(req.full_url, "http://device/api/firmware")
                self.assertEqual(req.method, "PUT")
                self.assertEqual(req.data, payload)
                self.assertIsNone(req.get_header("X-service-token"))
                self.assertEqual(req.get_header("X-sha256"), hashlib.sha256(payload).hexdigest())
                self.assertEqual(req.get_header("Content-length"), str(len(payload)))
                tool.assert_not_called()

    def test_reset_blocked_by_migration(self):
        with app.MIGRATION_LOCK, patch.object(app.request, "urlopen") as send:
            with self.assertRaises(RuntimeError):
                app.maintenance_reset_brew_state("http://device")
            send.assert_not_called()

    def test_wifi_save_uses_serial_and_does_not_claim_connected(self):
        reply = {"cmd": "wifi_set", "ok": True, "data": {"saved": True, "rebootScheduled": True}}
        with (patch.object(app, "serial_json_command", return_value=reply) as send,
              patch.object(app, "observe_wifi_reboot") as observe):
            result = app.wifi_save("", "test", "", "COM4", 921600, maintenance=True)
            self.assertEqual(send.call_args.args[1], 115200)
            self.assertEqual(send.call_args.args[2]["cmd"], "wifi_set")
            self.assertTrue(result["saved"])
            self.assertNotIn("verification", result)
            observe.assert_not_called()

    def test_wifi_rejection_is_not_reported_as_saved(self):
        with patch.object(app, "serial_json_command", return_value={"cmd": "wifi_set", "ok": False, "error": "operation_busy"}):
            with self.assertRaisesRegex(RuntimeError, "operation_busy"):
                app.wifi_save("", "test", "", "COM4", maintenance=True)

    def test_wifi_requires_serial_in_service_mode(self):
        with patch.object(app.request, "urlopen") as http:
            with self.assertRaises(ValueError):
                app.wifi_save("http://device", "test", "", maintenance=True)
            http.assert_not_called()
