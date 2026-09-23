"""Regression coverage for the ServiceTool/ServiceApp compatibility review."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from contextlib import nullcontext
from unittest.mock import Mock, patch
from urllib.error import URLError

import app
import migration
import telegraf
from test_migration import package, image, table


def job():
    return app.Job(id="regression", type="test", title="Test")


class WifiTests(unittest.TestCase):
    def test_rejected_save_and_missing_confirmation(self):
        for reply in ({"cmd": "wifi_set", "ok": False, "error": "invalid-wifi-credentials"},
                      {"cmd": "info", "ok": True, "data": {"saved": True}},
                      {"cmd": "wifi_set", "ok": True, "data": {"saved": False}}):
            with self.subTest(reply=reply), patch.object(app, "serial_json_command", return_value=reply):
                with self.assertRaises(RuntimeError):
                    app.wifi_save("", "network", "short", "MOCK")

    def test_http_save_contract(self):
        payload = {"ok": True, "rebootScheduled": True}
        with patch.object(app, "try_base_urls", return_value=("http://device", json.dumps(payload))):
            result = app.wifi_save("http://device", " spaced ", "password")
            self.assertTrue(result["saved"])
            self.assertTrue(result["rebootScheduled"])
        for response in ('{"ok":false}', 'ok', '[]'):
            with patch.object(app, "try_base_urls", return_value=("http://device", response)):
                with self.assertRaises(RuntimeError):
                    app.wifi_save("http://device", "network", "password")

    def test_new_boot_markers(self):
        for marker, expected in (("wlan online ip=192.0.2.1", "success"),
                                 ("wifi recovery AP ready ip=192.168.4.1", "failed")):
            handle = Mock()
            handle.__enter__ = Mock(return_value=handle)
            handle.__exit__ = Mock(return_value=False)
            handle.readline.return_value = (marker + "\n").encode()
            with (self.subTest(marker=marker),
                  patch.object(app, "ensure_serial_command_port_available"),
                  patch.object(app, "exclusive_serial_access", return_value=nullcontext()),
                  patch.object(app, "has_pyserial", return_value=True),
                  patch.object(app, "open_serial_port", return_value=handle)):
                self.assertEqual(app.observe_wifi_reboot("MOCK", 115200)["result"], expected)

    def test_serial_ignores_unrelated_and_malformed_replies(self):
        handle = Mock()
        handle.__enter__ = Mock(return_value=handle)
        handle.__exit__ = Mock(return_value=False)
        handle.readline.side_effect = [b'BST:broken\n', b'BST:{"cmd":"info","ok":true}\n',
                                       b'BST:{"cmd":"wifi_reset","ok":false,"error":"busy"}\n']
        with (patch.object(app, "ensure_serial_command_port_available"),
              patch.object(app, "exclusive_serial_access", return_value=nullcontext()),
              patch.object(app, "has_pyserial", return_value=True),
              patch.object(app.time, "sleep"),
              patch.object(app, "open_serial_port", return_value=handle)):
            with self.assertRaisesRegex(RuntimeError, "busy"):
                app.serial_json_command("MOCK", 115200, {"cmd": "wifi_reset"})


class FlashTests(unittest.TestCase):
    def test_supported_migration_targets_and_unknown_target(self):
        with tempfile.TemporaryDirectory() as folder:
            for version in ("1.67.0", "1.68.0", "1.70.0", "2.0.0"):
                root = package(Path(folder) / version, version)
                self.assertEqual(migration.validate_package(root, version)["version"], version)
            with self.assertRaisesRegex(ValueError, "Migration target"):
                migration.validate_package(root, "1.66.99")

    def test_serviceapp_flash_and_preflight(self):
        with tempfile.TemporaryDirectory() as folder:
            root = package(Path(folder) / "package", "1.67.0")
            proc = Mock(stdout=[], wait=Mock(return_value=0))
            with (patch.object(app, "resolve_package", return_value=root),
                  patch.object(app, "ensure_esptool_available", return_value=Path("MOCK")),
                  patch.object(app, "prepare_esptool_serial_handover", return_value={}) as handover,
                  patch.object(app, "exclusive_serial_access", return_value=nullcontext()),
                  patch.object(app.subprocess, "Popen", return_value=proc) as spawn):
                app.flash_job(job(), "MOCK", 115200, "open", str(root), "", True, False)
                command = spawn.call_args.args[0]
                self.assertEqual(command[command.index(str(root / "serviceapp.bin")) - 1], "0x220000")
                for bad in (b"corrupt", image("BrautomatMain")):
                    (root / "serviceapp.bin").write_bytes(bad)
                    handover.reset_mock()
                    with self.assertRaises(ValueError):
                        app.flash_job(job(), "MOCK", 115200, "open", str(root), "", True, False)
                    handover.assert_not_called()
                (root / "serviceapp.bin").unlink()
                with self.assertRaisesRegex(ValueError, "serviceapp.bin"):
                    app.validate_flash_serviceapp(root)

    def test_legacy_package_and_firmware_only_service_rejection(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "firmware.bin").write_bytes(image())
            (root / "partitions.bin").write_bytes(table(migration.OLD_LAYOUT))
            self.assertFalse(app.validate_flash_serviceapp(root))
            (root / "firmware.bin").write_bytes(image("BrautomatMain"))
            with self.assertRaisesRegex(ValueError, "matching partition"):
                app.validate_flash_serviceapp(root)

    def test_remote_package_pins_all_files_and_avoids_stale_cache(self):
        with tempfile.TemporaryDirectory() as folder:
            root = package(Path(folder) / "fixture", "1.67.0")
            sha = "a" * 40
            urls = []
            def download(url, **kwargs):
                urls.append(url)
                return (root / url.rsplit("/", 1)[-1]).read_bytes()
            with (patch.object(app, "CACHE_DIR", Path(folder) / "cache"),
                  patch.object(app, "json_request", return_value={"sha": sha}),
                  patch.object(app, "package_location", return_value={"base_url": f"https://raw.githubusercontent.com/InnuendoPi/Brautomat32/{sha}/Updates/ESP32-IDF5"}),
                  patch.object(app, "download_bytes", side_effect=download),
                  patch.object(app, "write_package_metadata")):
                first = app.prepare_remote_package(job(), "release", False)
                second = app.prepare_remote_package(job(), "release", False, require_base_files=False)
                self.assertNotEqual(first, second)
                self.assertTrue((second / "serviceapp.bin").is_file())
                self.assertTrue(all("/" + sha + "/" in url for url in urls))

    def test_app0_repair_downloads_only_firmware(self):
        with tempfile.TemporaryDirectory() as folder:
            with (patch.object(app, "CACHE_DIR", Path(folder)),
                  patch.object(app, "json_request", return_value={"sha": "a" * 40}),
                  patch.object(app, "package_location", return_value={"base_url": "https://example.test/Updates/ESP32-IDF5"}),
                  patch.object(app, "download_bytes", return_value=image("BrautomatMain")) as download):
                root = app.resolve_package(job(), "release", "", False, require_base_files=False, firmware_only=True)
                download.assert_called_once()
                self.assertTrue(download.call_args.args[0].endswith("/firmware.bin"))
                self.assertEqual({p.name for p in root.iterdir()}, {"firmware.bin", "package.json"})


class RestoreAndStateTests(unittest.TestCase):
    content = b'{"config":[{"config":{}}]}'

    def test_restore_connection_failure_is_not_success(self):
        with patch.object(app, "post_multipart", side_effect=URLError(ConnectionRefusedError("offline"))):
            with self.assertRaisesRegex(RuntimeError, "not confirmed"):
                app.restore_job(job(), "http://device", "backup.json", self.content)

    def test_restore_rejects_invalid_backup_before_upload(self):
        with patch.object(app, "post_multipart") as upload:
            for value in (b'bad', b'{}', b'[]', b'{"config":[]}'):
                with self.assertRaises(ValueError):
                    app.restore_backup("http://device", "backup.json", value)
            upload.assert_not_called()

    def test_restore_waits_for_public_status(self):
        with (patch.object(app, "post_multipart", return_value="OK"),
              patch.object(app.time, "sleep"),
              patch.object(app, "json_request", side_effect=[OSError("rebooting"),
                           {"firm": "1.67.0"}, {"firm": "1.67.0"}]) as probe):
            result = app.restore_job(job(), "http://device", "backup.json", self.content)
            self.assertTrue(result["readyPassed"])
            self.assertEqual(probe.call_count, 3)
            self.assertTrue(all(call.args[0] == "http://device/reqVis" for call in probe.call_args_list))

    def test_restore_timeout_is_failure(self):
        with (patch.object(app, "post_multipart", return_value="OK"),
              patch.object(app.time, "sleep"),
              patch.object(app.time, "monotonic", side_effect=[0, 100])):
            with self.assertRaisesRegex(RuntimeError, "availability"):
                app.restore_job(job(), "http://device", "backup.json", self.content)

    def test_service_rename_uses_only_edit(self):
        with patch.object(app, "json_request") as get, patch.object(app, "post_empty") as post, patch.object(app, "put_form") as put:
            for kind in ("profiles", "mashplans", "fermenterplans", "config"):
                app.rename_device_inventory("http://device", kind, "old.json", "new.json", maintenance=True)
                self.assertEqual(put.call_args.args[0], "http://device/edit")
            get.assert_not_called()
            post.assert_not_called()

    def test_unknown_process_blocks_update(self):
        with patch.object(app, "json_request", side_effect=TimeoutError()):
            self.assertEqual(app.device_process_status("http://device"), {"state": "unknown"})
        with patch.object(app, "firmware_update_status", return_value={"available": True, "device": {"active_process": {"state": "unknown"}}}), patch.object(app, "post_empty") as send:
            with self.assertRaisesRegex(RuntimeError, "unknown"):
                app.firmware_webupdate_job(job(), "http://device", False)
            send.assert_not_called()

    def test_tool_update_requires_checksum_before_download(self):
        with (patch.object(app, "service_tool_update_status", return_value={"available": True, "url": "http://mock"}),
              patch.object(app, "download_to_file") as download):
            with self.assertRaisesRegex(RuntimeError, "SHA256"):
                app.download_service_tool_update(False)
            download.assert_not_called()


class LifecycleTests(unittest.TestCase):
    def test_delayed_restart_preserves_user_monitor(self):
        state = app.ServiceState()
        state.serial = Mock(running=True)
        with patch.object(app, "ensure_migration_port_unlocked"), patch.object(app, "SerialSession") as create:
            state.start_serial("MOCK", 115200, only_if_stopped=True)
            create.assert_not_called()
            state.serial.stop.assert_not_called()

    def test_delayed_restart_never_forces_a_busy_port(self):
        with (patch.object(app.threading, "Thread") as thread,
              patch.object(app.time, "sleep"),
              patch.object(app.STATE, "active_serial_config", return_value=None),
              patch.object(app.STATE, "start_serial", side_effect=RuntimeError("busy")) as start,
              patch.object(app.STATE, "append_serial_line") as log):
            app.schedule_serial_restart("MOCK", 115200)
            thread.call_args.kwargs["target"]()
            self.assertEqual(start.call_count, 40)
            self.assertTrue(all(call.kwargs["only_if_stopped"] for call in start.call_args_list))
            self.assertIn("remains stopped", log.call_args.args[0])

    def test_monitor_start_respects_port_lock(self):
        state = app.ServiceState()
        with state.serial_access_lock, patch.object(app, "ensure_migration_port_unlocked"), patch.object(app, "SerialSession") as serial:
            with self.assertRaisesRegex(RuntimeError, "busy"):
                state.start_serial("MOCK", 115200)
            serial.assert_not_called()

    def test_exclusive_access_closes_monitor_before_operation(self):
        state = app.ServiceState()
        monitor = {"port": "MOCK", "baud": 115200, "running": True}
        with (patch.object(app, "STATE", state),
              patch.object(state, "active_serial_config", return_value=monitor),
              patch.object(state, "stop_serial") as stop,
              patch.object(app, "schedule_serial_restart") as restart):
            with app.exclusive_serial_access():
                stop.assert_called_once()
                self.assertTrue(state.serial_access_lock.locked())
            restart.assert_called_once_with("MOCK", 115200)

    def test_serial_disconnect_ends_monitor(self):
        session = app.SerialSession("MOCK", 115200, app.deque())
        session._serial = Mock(readline=Mock(side_effect=OSError("disconnected")))
        session.running = True
        session._pump()
        self.assertFalse(session.running)
        session._serial.close.assert_called_once()
        self.assertIn("disconnected", " ".join(session.lines))

    def test_telegraf_failed_start_cleans_state_and_credentials(self):
        with tempfile.TemporaryDirectory() as folder:
            with (patch.object(telegraf, "resolve_telegraf_binary", return_value="MOCK"),
                  patch.object(app, "CACHE_DIR", Path(folder)),
                  patch.object(telegraf, "ensure_csv_header"),
                  patch.object(telegraf.subprocess, "Popen", side_effect=OSError("launch failed"))):
                session = telegraf.TelegrafSession()
                with self.assertRaises(OSError):
                    session.start(telegraf.default_telegraf_config())
                self.assertFalse(session.snapshot()["running"])
                self.assertEqual(session.snapshot()["status"], "failed")
                self.assertFalse(list(Path(folder).rglob("*.conf")))
                self.assertFalse(session.stop()["running"])

    def test_telegraf_csv_failure_also_cleans_config(self):
        with tempfile.TemporaryDirectory() as folder:
            with (patch.object(telegraf, "resolve_telegraf_binary", return_value="MOCK"),
                  patch.object(app, "CACHE_DIR", Path(folder)),
                  patch.object(telegraf, "ensure_csv_header", side_effect=OSError("CSV denied")),
                  patch.object(telegraf.subprocess, "Popen") as spawn):
                session = telegraf.TelegrafSession()
                with self.assertRaisesRegex(OSError, "CSV denied"):
                    session.start(telegraf.default_telegraf_config())
                self.assertEqual(session.snapshot()["status"], "failed")
                self.assertFalse(list(Path(folder).rglob("*.conf")))
                spawn.assert_not_called()

    def test_telegraf_stop_escalates_after_timeout(self):
        session = telegraf.TelegrafSession()
        session._proc = Mock()
        session._proc.wait.side_effect = [subprocess.TimeoutExpired("MOCK", 3), 0]
        session._thread = Mock()
        session.stop()
        session._proc.kill.assert_called_once()
        session._thread.join.assert_called_once_with(timeout=3)

    @unittest.skipUnless(shutil.which("node"), "Node.js unavailable")
    def test_frontend_contracts(self):
        subprocess.run(["node", str(Path(__file__).with_name("frontend_regressions.js"))],
                       cwd=Path(app.__file__).parent, check=True, capture_output=True, text=True)
