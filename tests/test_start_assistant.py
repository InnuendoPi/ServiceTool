
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from zipfile import ZipFile

import app


USB = {"port": "COM4", "deviceId": "USB VID:PID=10C4:EA60 SER=123", "name": "CP210x"}
BASE = "http://192.168.1.23"
LEGACY = {"firmware": "Brautomat32 V 1.66.6", "port": "COM4",
          "device_id": USB["deviceId"], "base_url": BASE}


class StartAssistantTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        runtime = patch.object(app, "DATA_ROOT", Path(directory.name))
        runtime.start()
        self.addCleanup(runtime.stop)

    @patch.object(app.STATE.jobs, "snapshot", return_value=[])
    def test_wifi_scan_poll_keeps_the_bound_port_without_restarting(self, _snapshot):
        request = {"kind": "setup", "action": "scan", "device": LEGACY}
        with (patch.object(app, "guided_unique_device", return_value=LEGACY) as discover,
              patch.object(app, "guided_check_binding") as check_binding,
              patch.object(app, "wifi_scan", side_effect=[{"status": "running"}, {"networks": ["Test"]}]) as scan):
            self.assertEqual(app.guided_request(request), {"status": "running"})
            self.assertEqual(app.guided_request({**request, "refresh": False}), {"networks": ["Test"]})
            self.assertEqual([call.args for call in scan.call_args_list], [("", True, "COM4"), ("", False, "COM4")])
            discover.assert_called_once_with("setup")
            check_binding.assert_called_once_with(LEGACY)

    def test_usb_and_network_view_of_same_device_count_once(self):
        online = {"base_url": BASE, "firmware": "Brautomat32 V 1.66.6"}
        with patch.object(app, "list_serial_ports", return_value=[USB]), \
                patch.object(app.STATE, "active_serial_config", return_value=None), \
                patch.object(app, "serial_firmware_version", return_value={"ip": "192.168.1.23"}), \
                patch.object(app, "guided_network_addresses", return_value={"brautomat.local"}), \
                patch.object(app, "guided_http_device", return_value=online):
            self.assertEqual(app.guided_unique_device("setup"), LEGACY)

    def test_usb_discovery_ignores_unrelated_modem_but_rejects_two_brautomats(self):
        other = {"port": "COM5", "name": "USB modem", "deviceId": "USB VID:PID=2C7C:0125"}
        status = {"firmware": LEGACY["firmware"], "ip": "192.168.1.23"}
        with (patch.object(app, "list_serial_ports", return_value=[USB, other]),
              patch.object(app.STATE, "active_serial_config", return_value=None),
              patch.object(app, "guided_network_addresses", return_value=set()),
              patch.object(app, "guided_http_device", return_value=None),
              patch.object(app, "serial_firmware_version", side_effect=[status, RuntimeError("No firmware")]) as serial):
            self.assertEqual(app.guided_unique_device("backup")["port"], "COM4")
            serial.side_effect = [status, status]
            with self.assertRaisesRegex(RuntimeError, "guided_multiple"):
                app.guided_unique_device("setup")
            serial.side_effect = RuntimeError("No firmware")
            with self.assertRaisesRegex(RuntimeError, "guided_usb_ambiguous"):
                app.guided_unique_device("setup")

    def test_multiple_wifi_devices_are_rejected(self):
        addresses = {BASE, "http://192.168.1.24"}
        with patch.object(app, "list_serial_ports", return_value=[]), \
                patch.object(app, "guided_network_addresses", return_value=addresses), \
                patch.object(app, "guided_http_device", side_effect=lambda url: {
                    **LEGACY, "base_url": url
                }):
            with self.assertRaisesRegex(RuntimeError, "guided_multiple"):
                app.guided_unique_device("update")

    def test_running_firmware_offers_setup_choice_without_selecting_a_package(self):
        with patch.object(app, "guided_release") as remote:
            self.assertEqual(app.guided_target("setup", LEGACY), {"action": "setup_existing"})
            self.assertEqual(app.guided_target("setup", {**LEGACY, "base_url": ""}), {"action": "setup_existing"})
            remote.assert_not_called()

    @patch.object(app.STATE.jobs, "snapshot", return_value=[])
    def test_factory_setup_prepares_a_target_and_requires_explicit_erase_confirmation(self, _snapshot):
        request = {"kind": "setup", "device": LEGACY}
        plan = {"action": "reset", "source": "release_idf6", "version": "1.71.0"}
        with (patch.object(app, "guided_unique_device", return_value=LEGACY),
              patch.object(app, "guided_release", return_value={"version": "1.71.0"}),
              patch.object(app.STATE.jobs, "create") as job,
              patch.object(app, "run_job") as run):
            self.assertEqual(app.guided_request({**request, "action": "prepare_reset"}), plan)
            with self.assertRaisesRegex(RuntimeError, "guided_erase_confirmation"):
                app.guided_request({**request, "action": "start", "plan": plan})
            job.assert_not_called()
            run.assert_not_called()
            app.guided_request({**request, "action": "start", "plan": plan, "confirm_erase": True})
            run.assert_called_once_with(job.return_value, app.guided_run, LEGACY, plan)

    @patch.object(app.STATE.jobs, "snapshot", return_value=[])
    def test_factory_backup_starts_only_for_the_bound_device_online(self, _snapshot):
        request = {"kind": "setup", "action": "backup", "device": LEGACY}
        with (patch.object(app, "guided_unique_device", return_value=LEGACY) as discover,
              patch.object(app.STATE.jobs, "create") as create,
              patch.object(app, "run_job") as run):
            discover.return_value = {**LEGACY, "base_url": "http://192.168.1.24"}
            with self.assertRaisesRegex(RuntimeError, "guided_device_changed"):
                app.guided_request(request)
            discover.return_value = {**LEGACY, "base_url": ""}
            with self.assertRaisesRegex(RuntimeError, "guided_network_required"):
                app.guided_request({**request, "device": discover.return_value})
            create.assert_not_called()
            run.assert_not_called()
            discover.return_value = LEGACY
            self.assertEqual(app.guided_request(request), {"job_id": create.return_value.id})
            run.assert_called_once_with(create.return_value, app.create_backup_job, BASE, True)

    @patch.object(app.STATE.jobs, "snapshot", return_value=[])
    def test_standalone_backup_needs_network_and_no_firmware_package(self, _snapshot):
        network = {**LEGACY, "port": "", "device_id": ""}
        usb = {**LEGACY, "base_url": ""}
        with (patch.object(app, "guided_unique_device", return_value=network) as discover,
              patch.object(app, "guided_target") as package,
              patch.object(app.STATE.jobs, "create") as create,
              patch.object(app, "run_job") as run):
            request = {"kind": "backup", "action": "probe"}
            self.assertEqual(app.guided_request(request)["plan"], {"action": "backup"})
            package.assert_not_called()
            create.assert_not_called()
            app.guided_request({**request, "action": "backup", "device": network})
            run.assert_called_once_with(create.return_value, app.create_backup_job, BASE, True)
            discover.return_value = usb
            self.assertEqual(app.guided_request(request)["plan"], {"action": "backup_connection"})
            with self.assertRaisesRegex(RuntimeError, "guided_network_required"):
                app.guided_request({**request, "action": "backup", "device": usb})

    def test_backups_in_same_second_keep_both_files(self):
        now = app.datetime(2026, 11, 27, 12, 0, 0)
        with (patch.object(app, "BACKUP_DIR", app.DATA_ROOT),
              patch.object(app, "datetime") as clock,
              patch.object(app, "download_config_backup", side_effect=[b"first", b"second"])):
            clock.now.return_value = now
            first = app.store_config_backup(BASE, True)
            second = app.store_config_backup(BASE, True)
            self.assertNotEqual(first["backup_file"], second["backup_file"])
            self.assertEqual(Path(first["backup_file"]).read_bytes(), b"first")
            self.assertEqual(Path(second["backup_file"]).read_bytes(), b"second")

    def test_factory_setup_validates_complete_package_and_idle_device_before_erase(self):
        plan = {"action": "reset", "source": "release_idf6", "version": "1.71.0"}
        with tempfile.TemporaryDirectory() as temp:
            package = Path(temp)
            (package / "package.json").write_text('{"version":"1.71.0"}', encoding="utf-8")
            job = app.Job(id="guided-reset-test", type="guided", title="Test")
            with (patch.object(app, "prepare_remote_package", return_value=package) as prepare,
                  patch.object(app, "ensure_esptool_available"),
                  patch.object(app, "guided_check_binding"),
                  patch.object(app, "guided_flash_table", return_value=("legacy", "mac")),
                  patch.object(app, "migration_require_idle") as idle,
                  patch.object(app, "flash_job") as flash):
                idle.side_effect = RuntimeError("Device running")
                with self.assertRaisesRegex(RuntimeError, "Device running"):
                    app.guided_run(job, LEGACY, plan)
                flash.assert_not_called()
                idle.side_effect = None
                app.guided_run(job, LEGACY, plan)
                prepare.assert_called_with(job, "release_idf6", True)
                flash.assert_called_once_with(job, "COM4", 460800, "open", str(package), "", True, True,
                                              source_firmware=LEGACY["firmware"], guided_device=LEGACY)

    def test_unknown_flash_is_never_overwritten_as_blank(self):
        with patch.object(app, "ensure_esptool_available"), \
                patch.object(app, "guided_flash_table", return_value=("legacy", "mac")), \
                patch.object(app, "guided_release") as remote:
            with self.assertRaisesRegex(RuntimeError, "guided_unknown_firmware"):
                app.guided_target("setup", {**LEGACY, "firmware": ""})
            remote.assert_not_called()

    def test_development_reset_stages_complete_archive_and_bypasses_github(self):
        filenames = {"bootloader.bin", "partitions.bin", "boot_app0.bin", "firmware.bin", "serviceapp.bin", "Littlefs.bin"}
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            archive = root / "Brautomat32.zip"
            (root / "development-firmware.json").write_text('{"package":' + app.json.dumps(str(archive)) + '}', encoding="utf-8")
            with ZipFile(archive, "w") as bundle:
                bundle.writestr("version.json", '{"version":"1.71.0","type":"Development"}')
                for name in filenames:
                    bundle.writestr(name, name)
            job = app.Job(id="local-development", type="guided", title="Test")
            def verify_stage(_job, _device, _plan, package):
                self.assertEqual({item.name for item in package.iterdir()}, filenames)
                self.assertEqual((package / "Littlefs.bin").read_text(), "Littlefs.bin")
                return {"staged": True}
            with (patch.object(app, "DATA_ROOT", root),
                  patch.object(app, "guided_release") as remote,
                  patch.object(app, "prepare_remote_package") as download,
                  patch.object(app, "check_remote_package_layout"),
                  patch.object(app, "check_idf6_package_main"),
                  patch.object(app, "check_idf6_package_channel"),
                  patch.object(app, "guided_flash_package", side_effect=verify_stage) as flash):
                plan = app.guided_target("setup", LEGACY, reset=True)
                self.assertEqual((plan["source"], plan["version"]), ("local_development", "1.71.0"))
                self.assertEqual(app.guided_run(job, LEGACY, plan), {"staged": True})
                with archive.open("ab") as handle:
                    handle.write(b"changed")
                with self.assertRaisesRegex(RuntimeError, "guided_package_changed"):
                    app.guided_run(job, LEGACY, plan)
                flash.assert_called_once()
                remote.assert_not_called()
                download.assert_not_called()

    def test_blank_device_prefers_public_idf6_and_falls_back_only_on_404(self):
        missing_idf6 = HTTPError("", 404, "Not found", {}, None)
        device = {**LEGACY, "firmware": ""}
        with patch.object(app, "ensure_esptool_available"), \
                patch.object(app, "guided_flash_table", return_value=("blank", "mac")), \
                patch.object(app, "guided_release", side_effect=[missing_idf6, {"version": "1.66.6"}]) as remote:
            plan = app.guided_target("setup", device)
        self.assertEqual(plan, {"action": "install", "source": "release", "version": "1.66.6"})
        self.assertEqual(device["mac"], "mac")
        self.assertEqual([call.args[0] for call in remote.call_args_list], ["release_idf6", "release"])

    def test_legacy_update_prefers_wifi_and_idf6_usb_reads_channel_over_wifi(self):
        update = {"decision": "same_generation", "version": "1.66.7"}
        with patch.object(app, "firmware_update_status", return_value=update):
            self.assertEqual(app.guided_target("update", LEGACY), {"action": "web", "version": "1.66.7"})
        with patch.object(app, "guided_release") as remote:
            device = {**LEGACY, "base_url": "", "firmware": "Brautomat32 V 1.71.2 Develop"}
            self.assertEqual(app.guided_target("update", device), {"action": "update_network_connection"})
            remote.assert_not_called()

    def test_configured_channel_switch_uses_usb_even_at_same_version(self):
        device = {**LEGACY, "firmware": "Brautomat32 V 1.71.0 Release"}
        installed = {"version": "1.71.0", "variant": "Release", "idfMajor": 6,
                     "layout": {name: {"offset": offset, "size": size}
                                for name, kind, _, offset, size in app.migration_engine.IDF6_LAYOUT if kind == 0}}
        manifest = app.github_raw_language_base("development") + "Updates/version-idf6.json"
        target = {"channel": "Development", "transport": "usb", "idfMajor": 6, "manifest": manifest}
        with (patch.object(app, "json_request", return_value={"installed": installed, "target": target}) as query,
              patch.object(app, "remote_repo_version_manifest", return_value={"version": "1.71.0", "type": "Development"}) as read):
            plan = app.guided_target("update", device)
            self.assertEqual(plan, {"action": "usb", "source": "development_idf6",
                                    "version": "1.71.0", "channel": "Development"})
            query.assert_called_once_with(f"{BASE}/api/firmware/update-info", timeout=4.0)
            read.assert_called_once_with("development", "Updates", idf6=True)
            self.assertEqual(app.guided_target("update", {**device, "port": ""})["action"], "usb_connection")
            read.return_value["version"] = "1.70.9"
            with self.assertRaisesRegex(ValueError, "not an IDF6"):
                app.guided_target("update", device)
            read.side_effect = HTTPError(manifest, 404, "missing", {}, None)
            with self.assertRaisesRegex(RuntimeError, "guided_development_unavailable"):
                app.guided_target("update", device)
            self.assertTrue(all(call.args[0] == "development" for call in read.call_args_list))
            target["manifest"] = "http://other-device/version.json"
            read.reset_mock()
            with self.assertRaisesRegex(ValueError, "public channel"):
                app.guided_target("update", device)
            read.assert_not_called()

    def test_configured_release_uses_web_only_on_matching_channel(self):
        device = {**LEGACY, "firmware": "Brautomat32 V 1.71.1 Release"}
        info = {"source": "release_idf6", "channel": "Release", "ref": "main", "transport": "web",
                "installed": {"idfMajor": 6, "variant": "Release", "version": "1.71.1"}}
        with (patch.object(app, "read_firmware_update_info", return_value=info),
              patch.object(app, "remote_repo_version_manifest", return_value={"version": "1.71.2", "type": "Release"})):
            self.assertEqual(app.guided_target("update", device), {"action": "web", "channel": "Release",
                                                                    "source": "release_idf6", "version": "1.71.2"})
            info["transport"] = "usb"
            self.assertEqual(app.guided_target("update", device)["action"], "usb")
            info["installed"].update(variant="Development", version="1.71.3")
            self.assertEqual(app.guided_target("update", device)["action"], "current")

    def test_idf5_beta_requires_migration_and_both_connections(self):
        device = {**LEGACY, "firmware": "Brautomat32 V 1.70.6 Develop"}
        with (patch.object(app, "guided_release", return_value={"version": "1.71.0"}),
              patch.object(app, "read_firmware_update_info", return_value=None)):
            for unavailable in ("port", "base_url"):
                self.assertEqual(app.guided_target("update", {**device, unavailable: ""})["action"],
                                 "migration_connection")
            self.assertEqual(app.guided_target("update", device)["action"], "migration")

    @patch.object(app.STATE.jobs, "snapshot", return_value=[])
    def test_changed_device_or_package_cannot_start_a_job(self, _snapshot):
        data = {"kind": "update", "action": "start", "device": LEGACY, "plan": {}}
        with patch.object(app, "guided_unique_device", return_value={**LEGACY, "port": "COM5"}), \
                patch.object(app, "run_job") as run:
            with self.assertRaisesRegex(RuntimeError, "guided_device_changed"):
                app.guided_request(data)
            run.assert_not_called()
        with patch.object(app, "guided_unique_device", return_value=LEGACY), \
                patch.object(app, "guided_target", return_value={"action": "web", "version": "1.66.7"}), \
                patch.object(app, "run_job") as run:
            with self.assertRaisesRegex(RuntimeError, "guided_package_changed"):
                app.guided_request(data)
            run.assert_not_called()

    def test_changed_address_must_be_reported_by_same_usb_after_reboot(self):
        target = "http://192.168.1.24"
        with patch.object(app, "list_serial_ports", return_value=[USB]), \
                patch.object(app, "serial_firmware_version", return_value={"ip": "192.168.1.24"}), \
                patch.object(app, "guided_http_device", return_value={**LEGACY, "base_url": target}), \
                patch.object(app, "device_process_status", return_value={"state": "idle"}):
            with self.assertRaisesRegex(RuntimeError, "guided_device_changed"):
                app.guided_check_binding(LEGACY, network=True)
            self.assertEqual(app.guided_check_binding(LEGACY, network=True, reconnect=True)["base_url"], target)

