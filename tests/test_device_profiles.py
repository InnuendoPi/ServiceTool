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

    def test_four_device_limit_and_remove_returns_single_device(self):
        for index in range(1, 4):
            app.change_device_profile({"action": "add", "port": f"COM{4+index}", "url": f"http://worker{index}"})
        with self.assertRaises(ValueError):
            app.change_device_profile({"action": "add", "port": "COM9", "url": "http://worker4"})
        for profile in app.load_app_config()["device_profiles"][1:]:
            app.change_device_profile({"action": "remove", "id": profile["id"]})
        config = app.load_app_config()
        self.assertEqual(len(config["device_profiles"]), 1)
        self.assertEqual(config["serial_port"], "COM4")

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

    def test_access_point_fallback_only_for_single_device(self):
        self.assertEqual(app.candidate_base_urls("http://existing.local"), ["http://existing.local", "http://192.168.4.1"])
        app.change_device_profile({"action": "add", "port": "COM5", "url": "http://worker1"})
        self.assertEqual(app.candidate_base_urls("http://worker1"), ["http://worker1"])
