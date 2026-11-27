import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import app


class DeviceProfilesTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.path = Path(temp.name) / "config.json"
        self.addCleanup(patch.stopall)
        patch.object(app, "CONFIG_FILE", self.path).start()
        patch.object(app, "STATE", app.ServiceState()).start()
        config = app.default_config()
        config.update(device_url="http://existing.local", serial_port="COM4")
        app.save_app_config(config)

    def test_legacy_connection_preserved_and_two_profiles_switch_together(self):
        original = app.load_app_config()
        self.assertEqual(app.configured_device_profiles(original)[0],
                         {"id": "primary", "port": "COM4", "url": "http://existing.local"})
        added = app.change_device_profile({"action": "add", "port": "COM5", "url": "http://worker1"})
        self.assertEqual((added["serial_port"], added["device_url"]), ("COM5", "http://worker1"))
        selected = app.change_device_profile({"action": "select", "id": "primary"})
        self.assertEqual((selected["serial_port"], selected["device_url"]), ("COM4", "http://existing.local"))
        self.assertEqual(selected["telegraf"], original["telegraf"])
        self.assertEqual(len(app.load_app_config()["device_profiles"]), 2)

    def test_edit_and_remove_inactive_profile_keep_active_connection(self):
        added = app.change_device_profile({"action": "add", "name": "Worker", "port": "COM5", "url": "http://worker"})
        worker = added["active_device_id"]
        app.change_device_profile({"action": "select", "id": "primary"})
        edited = app.change_device_profile({"action": "update", "id": worker,
            "name": "Test device", "port": "COM9", "url": "http://test"})
        self.assertEqual(edited["active_device_id"], "primary")
        self.assertEqual((edited["serial_port"], edited["device_url"]), ("COM4", "http://existing.local"))
        self.assertEqual(edited["device_profiles"][1]["port"], "COM9")
        removed = app.change_device_profile({"action": "remove", "id": worker})
        self.assertEqual(removed["active_device_id"], "primary")
        self.assertEqual(removed["serial_port"], "COM4")

    def test_empty_and_invalid_connections_do_not_change_config(self):
        before = self.path.read_bytes()
        for port, url in (("", "http://worker"), ("COM5", ""), ("COM5", "file:///bad")):
            with self.subTest(port=port, url=url), self.assertRaises(ValueError):
                app.change_device_profile({"action": "add", "port": port, "url": url})
            self.assertEqual(self.path.read_bytes(), before)

    def test_shared_connections_and_custom_names_survive_switch_and_edit(self):
        app.change_device_profile({"action": "update", "id": "primary",
            "name": "Master", "port": "COM4", "url": "http://existing.local"})
        for name, port, url in (("Same port", "COM4", "http://worker"),
                                ("Same URL", "COM5", "http://existing.local"),
                                ("Singledevice", "COM4", "http://existing.local")):
            saved = app.change_device_profile({"action": "add", "name": name, "port": port, "url": url})
            identity = saved["active_device_id"]
            self.assertNotEqual(identity, "primary")
            self.assertEqual(saved["device_profiles"][-1]["name"], name)
        selected = app.change_device_profile({"action": "select", "id": "primary"})
        self.assertEqual(selected["device_profiles"][0]["name"], "Master")
        saved = app.change_device_profile({"action": "update", "id": identity,
            "name": " Standalone ", "port": "COM4", "url": "http://existing.local"})
        self.assertEqual(saved["device_profiles"][-1]["name"], "Standalone")
        self.assertEqual(app.load_app_config()["device_profiles"], saved["device_profiles"])

    def test_twenty_profile_limit_and_remove_returns_single_device(self):
        for index in range(1, 20):
            app.change_device_profile({"action": "add", "port": f"COM{4+index}", "url": f"http://worker{index}"})
        self.assertEqual(len(app.load_app_config()["device_profiles"]), 20)
        with self.assertRaisesRegex(ValueError, "20 Geräteprofile"):
            app.change_device_profile({"action": "add", "port": "COM24", "url": "http://worker20"})
        for profile in app.load_app_config()["device_profiles"][1:]:
            app.change_device_profile({"action": "remove", "id": profile["id"]})
        config = app.load_app_config()
        self.assertEqual(len(config["device_profiles"]), 1)
        self.assertEqual(config["serial_port"], "COM4")

    def test_remove_first_and_last_profile_restores_defaults(self):
        added = app.change_device_profile({"action": "add", "port": "COM5", "url": "http://worker"})
        worker = added["active_device_id"]
        original = app.load_app_config()
        remaining = app.change_device_profile({"action": "remove", "id": "primary"})
        self.assertEqual([p["id"] for p in remaining["device_profiles"]], [worker])
        self.assertEqual(remaining["device_url"], "http://worker")
        empty = app.change_device_profile({"action": "remove", "id": worker})
        self.assertEqual(empty["device_profiles"], [])
        self.assertEqual(empty["active_device_id"], "")
        for key in ("device_url", "serial_port"):
            self.assertEqual(empty[key], app.default_config()[key])
        for key in ("inventory_root", "telegraf", "baud_rate"):
            self.assertEqual(empty[key], original[key])
        self.assertEqual(app.load_app_config(), empty)
        added = app.change_device_profile({"action": "add", "port": "COM9", "url": "http://new"})
        self.assertEqual(len(added["device_profiles"]), 1)
        self.assertEqual(added["device_profiles"][0]["id"], added["active_device_id"])
        self.assertEqual(added["serial_port"], "COM9")

    def test_remove_active_first_selects_remaining_profile(self):
        added = app.change_device_profile({"action": "add", "port": "COM5", "url": "http://worker"})
        app.change_device_profile({"action": "select", "id": "primary"})
        remaining = app.change_device_profile({"action": "remove", "id": "primary"})
        self.assertEqual(remaining["active_device_id"], added["active_device_id"])
        self.assertEqual((remaining["device_url"], remaining["serial_port"]), ("http://worker", "COM5"))
        before = self.path.read_bytes()
        with self.assertRaises(ValueError):
            app.change_device_profile({"action": "remove", "id": "unknown"})
        self.assertEqual(self.path.read_bytes(), before)

    def test_remove_legacy_connection_and_add_first_profile(self):
        empty = app.change_device_profile({"action": "remove", "id": "primary"})
        self.assertEqual(empty["device_profiles"], [])
        self.assertEqual(empty["serial_port"], "")
        created = app.change_device_profile({"action": "add", "port": "COM7", "url": "http://first"})
        self.assertEqual(len(created["device_profiles"]), 1)

    def test_busy_job_and_sessions_block_profile_change_without_stopping(self):
        before = self.path.read_bytes()
        job = app.STATE.jobs.create("flash", "Flash")
        with self.assertRaises(ValueError):
            app.change_device_profile({"action": "select", "id": "primary"})
        job.status = "success"
        for session in (app.STATE.telegraf, app.STATE.test_runner):
            session.status = "running"
            with self.assertRaises(ValueError):
                app.change_device_profile({"action": "select", "id": "primary"})
            self.assertEqual(session.status, "running")
            session.status = "idle"
        self.assertEqual(self.path.read_bytes(), before)

    def test_active_profile_edits_do_not_change_other_profiles(self):
        config = app.change_device_profile({"action": "add", "port": "COM5", "url": "http://worker1"})
        config["device_url"] = "http://worker-new"
        saved = app.save_app_config(config)
        self.assertEqual(saved["device_profiles"][1]["url"], "http://worker-new")
        self.assertEqual(saved["device_profiles"][0]["url"], "http://existing.local")

    def test_profile_switch_off_keeps_direct_connection_and_preserves_saved_profiles(self):
        added = app.change_device_profile({"action": "add", "port": "COM5", "url": "http://worker1"})
        self.assertTrue(added["profiles_enabled"])
        direct = app.change_device_profile({"action": "mode", "enabled": False})
        self.assertFalse(direct["profiles_enabled"])
        self.assertEqual((direct["serial_port"], direct["device_url"]), ("COM5", "http://worker1"))
        direct.update(serial_port="COM9", device_url="http://direct.local")
        app.save_app_config(direct)
        enabled = app.change_device_profile({"action": "mode", "enabled": True})
        self.assertEqual(enabled["device_profiles"], added["device_profiles"])
        self.assertEqual((enabled["serial_port"], enabled["device_url"]), ("COM5", "http://worker1"))

    def test_direct_usb_uses_only_the_address_reported_by_the_device(self):
        network = {"state": "online", "base_url": "http://192.168.1.24", "resolved_ip": "192.168.1.24"}
        with (patch.object(app, "has_pyserial", return_value=False),
              patch.object(app, "serial_firmware_version", return_value={"ip": "192.168.1.24", "firmware": "1.71.0"}),
              patch.object(app, "device_status", return_value=network) as query):
            result = app.combined_device_status("http://brautomat.local", "COM3")
            query.assert_called_once_with("http://192.168.1.24", strict=True)
            self.assertTrue(result["serial_confirmed"])
            self.assertEqual(result["base_url"], network["base_url"])

    def test_profile_network_does_not_claim_a_different_usb_device(self):
        network = {"state": "online", "base_url": "http://worker1", "resolved_ip": "192.168.1.25"}
        with (patch.object(app, "has_pyserial", return_value=False),
              patch.object(app, "serial_firmware_version", return_value={"ip": "192.168.1.24", "firmware": "1.71.0"}),
              patch.object(app, "device_status", return_value=network) as query):
            result = app.combined_device_status("http://worker1", "COM3", profile_bound=True)
            query.assert_called_once_with("http://worker1", strict=True)
            self.assertFalse(result["serial_confirmed"])
            self.assertTrue(result["serial_mismatch"])

    def test_access_point_fallback_only_for_single_device(self):
        self.assertEqual(app.candidate_base_urls("http://existing.local"), ["http://existing.local", "http://192.168.4.1"])
        app.change_device_profile({"action": "add", "port": "COM5", "url": "http://worker1"})
        self.assertEqual(app.candidate_base_urls("http://worker1"), ["http://worker1"])
