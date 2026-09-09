import json
import unittest
from unittest.mock import patch, MagicMock
import maintenance as m
import app

STATUS = {"protocol": "brautomat-maintenance", "api": 1, "type": "status", "mode": "service",
          "running": "app1", "boot": "app1", "state": "idle", "can_boot_main": True,
          "update_active": False, "app_dirty": False, "fs_dirty": False,
          "system_pending": False, "tools_pending": False, "reason": None}
BOOT = {"protocol": "brautomat-maintenance", "api": 1, "type": "boot",
        "accepted": True, "target": "app0", "reason": None}
MAIN = {"ok": True, "cmd": "info", "data": {"firmware": "Brautomat32 V 1.66.0 Develop", "version": "1.66.0"}}


class Serial:
    def __init__(self, reply):
        self.data = bytearray(b"stale reply\n")
        self.reply = reply
        self.written = []
        self.cleared = False
    def reset_input_buffer(self):
        self.data.clear()
        self.cleared = True
    def write(self, command):
        self.written.append(command)
        self.data.extend(self.reply)
    def flush(self):
        pass
    def read(self, count):
        if self.data:
            return bytes([self.data.pop(0)])
        return b""


class SerialMaintenanceTests(unittest.TestCase):
    def test_fresh_framed_status_amid_logs_and_crlf(self):
        handle = Serial(b"boot log\n" + json.dumps(STATUS).encode() + b"\r\n")
        self.assertEqual(m.query(handle, "BRAUTOMAT STATUS", "status"), STATUS)
        self.assertTrue(handle.cleared)
        self.assertEqual(handle.written, [b"BRAUTOMAT STATUS\n"])

    def test_invalid_or_unrelated_replies_are_ignored(self):
        for line in (b"Service token: abc", b"{}", b"BST:{}", b"[]",
                     json.dumps({**STATUS, "api": 2}).encode(),
                     json.dumps({**STATUS, "api": True}).encode(),
                     b"[log] " + json.dumps(STATUS).encode()):
            self.assertIsNone(m.parse_reply(line, "status"))
        self.assertIsNone(m.parse_reply(b'BST:{"ok":true,"cmd":"info","data":{"firmware":"other","version":"1"}}', "main"))

    def test_main_confirmation_needs_no_network_fields(self):
        self.assertEqual(m.parse_reply(b"BST:" + json.dumps(MAIN).encode(), "main"), MAIN)
        with patch.object(m, "query", side_effect=[None, MAIN]):
            self.assertFalse(m.detect(None)["active"])

    def test_old_main_reply_does_not_confirm_new_request(self):
        handle = Serial(b"")
        handle.data = bytearray(b"BST:" + json.dumps(MAIN).encode() + b"\n")
        self.assertIsNone(m.query(handle, 'BST:{"cmd":"info"}', "main", timeout=0.001))

    def test_boot_acceptance_waits_for_fresh_main_confirmation(self):
        with (patch.object(m, "detect", return_value={"active": True}),
              patch.object(m, "query", return_value=BOOT) as query,
              patch.object(m, "wait_for_mode", return_value={"active": None, "reason": "main_start_unconfirmed"}) as wait):
            result = m.leave_service(None, lambda _: None)
            self.assertIsNone(result["active"])
            query.assert_called_once_with(None, "BRAUTOMAT BOOT MAIN", "boot")
            wait.assert_called_once_with(None, False)

    def test_boot_timeout_detects_mode_without_repeating_boot(self):
        with (patch.object(m, "detect", side_effect=[{"active": True}, {"active": None}]) as detect,
              patch.object(m, "query", return_value=None) as query):
            self.assertIsNone(m.leave_service(None, lambda _: None)["active"])
            self.assertEqual(detect.call_count, 2)
            query.assert_called_once()

    def test_unknown_rejection_reason_is_preserved(self):
        reply = {**BOOT, "accepted": False, "reason": "future_reason"}
        with patch.object(m, "detect", return_value={"active": True}), patch.object(m, "query", return_value=reply):
            self.assertEqual(m.leave_service(None, lambda _: None), {"active": True, "reason": "future_reason"})

    def test_switch_timeout_is_unknown(self):
        with patch.object(m, "query", return_value=None):
            self.assertIsNone(m.wait_for_mode(None, False, timeout=0.001)["active"])

    def test_status_locks_serial_without_claiming_migration(self):
        def detect(handle):
            self.assertFalse(app.MIGRATION_LOCK.locked())
            self.assertTrue(app.STATE.serial_access_lock.locked())
            return {"active": False}

        with (patch.object(app, "prepare_esptool_serial_handover", return_value={}),
              patch.object(app, "migration_sessions", return_value=[]),
              patch.object(app, "open_serial_port", return_value=MagicMock()),
              patch.object(m, "detect", side_effect=detect)):
            self.assertFalse(app.maintenance_status("", "COM4")["active"])
            self.assertFalse(app.MIGRATION_LOCK.locked())

    def test_status_respects_running_migration(self):
        with app.MIGRATION_LOCK, patch.object(app, "open_serial_port") as opened:
            self.assertEqual(app.maintenance_status("", "COM4")["reason"], "operation_busy")
            opened.assert_not_called()

    def test_device_detection_recognizes_service_without_main_probe(self):
        with (patch.object(app, "device_status", side_effect=OSError("offline")),
              patch.object(app, "has_pyserial", return_value=True),
              patch.object(app, "maintenance_status", return_value={"active": True, "service": STATUS}),
              patch.object(app, "serial_firmware_version") as main_probe):
            result = app.combined_device_status("http://device", "COM4")
            self.assertEqual(result["mode"], "service")
            self.assertEqual(result["firmware"], "Brautomat32 ServiceApp")
            self.assertEqual(result["raw"], STATUS)
            main_probe.assert_not_called()

    def test_device_detection_reuses_confirmed_main_reply(self):
        with (patch.object(app, "device_status", side_effect=OSError("offline")),
              patch.object(app, "has_pyserial", return_value=True),
              patch.object(app, "maintenance_status", return_value={"active": False, "main": MAIN["data"]}),
              patch.object(app, "serial_firmware_version") as main_probe):
            result = app.combined_device_status("http://device", "COM4")
            self.assertEqual(result["firmware"], MAIN["data"]["firmware"])
            self.assertNotEqual(result.get("mode"), "service")
            main_probe.assert_not_called()

    def test_stop_uses_serial_and_never_http_or_esptool(self):
        with (patch.object(app, "prepare_esptool_serial_handover", return_value={}),
              patch.object(app, "open_serial_port", return_value=MagicMock()) as opened,
              patch.object(m, "leave_service", return_value={"active": False}),
              patch.object(app, "ensure_esptool_available") as tool,
              patch.object(app.request, "urlopen") as http):
            result = app.maintenance_job(app.Job(id="test", type="maintenance", title="Test"), "", "COM4", 921600, "stop")
            self.assertFalse(result["active"])
            opened.assert_called_once_with("COM4", 115200, timeout=0.1)
            tool.assert_not_called()
            http.assert_not_called()
