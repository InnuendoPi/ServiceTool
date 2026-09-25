import hashlib
import json
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch
import zlib

import migration as m
import app


def table(layout):
    data = b"".join(struct.pack("<HBBII16sI", 0x50AA, kind, subtype, offset, size,
                                name.encode(), 0) for name, kind, subtype, offset, size in layout)
    return (data + b"\xeb\xeb" + b"\xff" * 14 + hashlib.md5(data).digest()).ljust(4096, b"\xff")


def image(role=None, version="1.67.0"):
    header = bytearray(24)
    header[0:4] = bytes((0xE9, 1, 2, 0x20))
    header[23] = 1
    segment = bytearray(512)
    struct.pack_into("<I", segment, 0, 0xABCD5432)
    segment[16:23] = b"buildid"
    if role:
        struct.pack_into("<16sII", segment, 256, role.encode(), 1, 24)
    segment[400:400 + len(version) + 2] = b"\0" + version.encode() + b"\0"
    body = bytes(header) + struct.pack("<II", 0x3F400020, len(segment)) + segment
    checksum = 0xEF
    for byte in segment:
        checksum ^= byte
    body += b"\0" * (15 - len(body) % 16) + bytes((checksum,))
    return body + hashlib.sha256(body).digest()


def nvs(active=False, records=None):
    page = bytearray(b"\xff" * 4096)
    struct.pack_into("<II", page, 0, 0xFFFFFFFE, 1)
    page[8] = 0xFE
    struct.pack_into("<I", page, 28, zlib.crc32(page[4:28], 0xFFFFFFFF))
    if records is None:
        records = ((0, 1, "settings", 1), (1, 0x12, "step", 2 if active else -1), (1, 0x14, "second", -1))
    for index, (ns, kind, key, value) in enumerate(records):
        entry = bytearray(b"\xff" * 32)
        entry[:4] = bytes((ns, kind, 1, 255))
        entry[8:24] = key.encode().ljust(16, b"\0")
        struct.pack_into({1: "<B", 0x12: "<h", 0x14: "<i"}[kind], entry, 24, value)
        struct.pack_into("<I", entry, 4, zlib.crc32(entry[:4] + entry[8:], 0xFFFFFFFF))
        page[64 + index * 32:96 + index * 32] = entry
        page[32 + index // 4] &= ~(1 << (2 * (index % 4)))
    return bytes(page).ljust(0x5000, b"\xff")


def package(root, version="1.67.0"):
    root.mkdir()
    contents = {"firmware.bin": image("BrautomatMain", version),
                "serviceapp.bin": image("BrautomatSvcApp"),
                "bootloader.bin": image(), "partitions.bin": table(m.NEW_LAYOUT),
                "boot_app0.bin": b"\xff" * 8192}
    for name, content in contents.items():
        (root / name).write_bytes(content)
    webfiles = {}
    for name in app.WEBUPDATE_TOOL_FILES:
        path = root / "webfiles" / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"web-content")
        webfiles["webfiles/" + name] = m.digest(b"web-content")
    return root


class Device:
    def __init__(self, slot=0):
        self.flash = bytearray(b"\xa5" * m.FLASH_SIZE)
        self.flash[0x8000:0x9000] = table(m.OLD_LAYOUT)
        self.flash[0x9000:0xE000] = nvs()
        for offset in (0x10000, 0x1B0000):
            self.flash[offset:offset + len(image(version="1.65.5"))] = image(version="1.65.5")
        self.flash[0xE000:0x10000] = b"\xff" * 8192
        sequence = struct.pack("<I", slot + 1)
        self.flash[0xE000:0xE020] = sequence + b"\xff" * 24 + struct.pack("<I", zlib.crc32(sequence, 0xFFFFFFFF))
        self.mac = "01:02:03:04:05:06"
        self.writes = 0
        self.boots = 0
        self.fail_after = None

    def identity(self):
        return self.mac

    def read(self, offset, size, target):
        data = bytes(self.flash[offset:offset + size])
        target.write_bytes(data)
        return data

    def write(self, files):
        self.writes += 1
        for index, (offset, path) in enumerate(files):
            data = path.read_bytes()
            self.flash[offset:offset + len(data)] = data
            if self.fail_after == index:
                raise RuntimeError("simulated power failure")

    def boot(self):
        self.boots += 1


class MigrationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.package = package(self.root / "input")

    def session(self):
        return m.Session.create(self.root / "backups", self.package, m.validate_package(self.package, "1.67.0"), app.migration_webfiles(self.package))

    def api_session(self):
        session = m.ApiSession.create(self.root / "backups", self.package,
                                      m.validate_package(self.package, "1.67.0"),
                                      app.migration_webfiles(self.package))
        payload = json.dumps({"config": [{"wifi": {"ssid": "test", "password": "secret"},
                                        "log_cfg": {"enabled": True}}],
                              "recipes": [{"name": "mash"}], "fermenter": [{"name": "plan"}],
                              "profiles": [{"name": "profile"}], "future_field": [42]}).encode()
        session.save(base_url="http://device", source_version="1.66.1", target_version="1.67.0", user_files={})
        session.capture_api(payload)
        return session, payload

    def test_api_install_and_reload_never_read_flash(self):
        session, payload = self.api_session()
        loaded = m.Session.load_directory(session.directory)
        self.assertIsInstance(loaded, m.ApiSession)
        self.assertEqual(loaded.backup(), payload)
        device = Device()
        before = bytes(device.flash)
        with patch.object(device, "read", side_effect=AssertionError("must not read flash")):
            loaded.install(device, lambda _: None)
        self.assertEqual(device.flash[0x9000:0xE000], before[0x9000:0xE000])
        self.assertEqual(device.flash[0x350000:], before[0x350000:])
        self.assertFalse((session.directory / "flash-backup.bin").exists())
        self.assertEqual(loaded.report["write_verification"], "esptool-md5")

    def test_api_modified_backup_blocks_install(self):
        session, payload = self.api_session()
        (session.directory / "backup.json").write_bytes(payload + b" ")
        device = Device()
        with self.assertRaisesRegex(RuntimeError, "modified"):
            session.install(device, lambda _: None)
        self.assertEqual(device.writes, 0)

    def test_api_restore_preserves_all_fields_and_never_uses_serial(self):
        session, payload = self.api_session()
        with (patch.object(app, "migration_require_idle"),
              patch.object(app, "restore_job", return_value={"readyPassed": True}) as restore,
              patch.object(app, "ensure_esptool_available") as tool,
              patch.object(app, "prepare_esptool_serial_handover") as serial):
            job = app.Job(id="test", type="migration", title="Test")
            result = app.migration_recovery_job(job, "", "", 921600, "restore",
                                                str(session.directory), "http://selected")
            restore.assert_called_once_with(job, "http://selected", "backup.json", payload)
            self.assertTrue(result["restored"])
            tool.assert_not_called()
            serial.assert_not_called()

    def test_api_restore_failure_is_not_reported_as_restored(self):
        session, _ = self.api_session()
        with (patch.object(app, "migration_require_idle"),
              patch.object(app, "restore_job", side_effect=RuntimeError("restore not confirmed")),
              patch.object(app, "ensure_esptool_available") as tool):
            with self.assertRaisesRegex(RuntimeError, "not confirmed"):
                app.migration_recovery_job(app.Job(id="test", type="migration", title="Test"),
                                           "", "", 921600, "restore", str(session.directory))
            tool.assert_not_called()
        saved = m.Session.load_directory(session.directory)
        self.assertNotEqual(saved.report["phase"], "restored")
        self.assertIn("not confirmed", saved.report["error"])

    def test_api_resume_after_boot_never_reads_flash(self):
        session, _ = self.api_session()
        device = Device()
        session.save("booting", mac=device.mac)
        with (patch.object(app, "migration_root", return_value=session.directory.parent),
              patch.object(app, "ensure_esptool_available", return_value=Path("tool")),
              patch.object(app, "prepare_esptool_serial_handover", return_value={}),
              patch.object(m, "Esptool", return_value=device),
              patch.object(device, "read", side_effect=AssertionError("must not read flash")),
              patch.object(app, "finish_migration", return_value={"ok": True})):
            result = app.migration_recovery_job(app.Job(id="test", type="migration", title="Test"),
                                                session.report["id"], "COM3", 921600, "resume")
            self.assertEqual(result, {"ok": True})
        self.assertEqual(device.writes, 1)
        self.assertEqual(device.boots, 1)

    def test_api_backup_download_keeps_entire_payload(self):
        _, payload = self.api_session()
        with (patch.object(app, "post_empty") as post,
              patch.object(app, "download_bytes", return_value=payload)):
            self.assertEqual(app.download_config_backup("http://device", True), payload)
            post.assert_called_once_with("http://device/backup?api=1")

    def test_both_old_slots_preserve_every_byte_outside_target_regions(self):
        for slot in (0, 1):
            with self.subTest(slot=slot):
                device = Device(slot)
                original = bytes(device.flash)
                session = self.session()
                session.capture(device)
                session.install(device, lambda _: None)
                for offset, size in m.PRESERVED.values():
                    self.assertEqual(device.flash[offset:offset + size], original[offset:offset + size])
                self.assertEqual(device.boots, 0)
                self.assertEqual(session.report["phase"], "flash-verified")
                self.assertEqual(session.report["source_slot"], slot)
                self.assertTrue(session.report["preserved_verified"])

    def test_power_failure_at_each_write_can_restore_original_on_same_device(self):
        for position in range(6):
            with self.subTest(position=position):
                device = Device()
                original = bytes(device.flash)
                session = self.session()
                session.capture(device)
                device.fail_after = position
                with self.assertRaisesRegex(RuntimeError, "power failure"):
                    session.install(device, lambda _: None)
                self.assertEqual(device.boots, 0)
                device.fail_after = None
                resumed = m.Session.load(self.root / "backups", session.report["id"])
                resumed.restore(device, lambda _: None)
                self.assertEqual(device.flash, original)
                self.assertEqual(resumed.report["phase"], "recovery-verified")

    def test_interrupted_install_can_resume_using_saved_package(self):
        device = Device()
        session = self.session()
        session.capture(device)
        device.fail_after = 1
        with self.assertRaises(RuntimeError):
            session.install(device, lambda _: None)
        device.fail_after = None
        session.install(device, lambda _: None)
        self.assertEqual(session.report["phase"], "flash-verified")

    def test_wrong_device_and_tampered_backup_never_write(self):
        device = Device()
        session = self.session()
        session.capture(device)
        device.mac = "11:22:33:44:55:66"
        with self.assertRaisesRegex(RuntimeError, "another device"):
            session.restore(device, lambda _: None)
        self.assertEqual(device.writes, 0)
        (session.directory / "flash-backup.bin").write_bytes(b"corrupt")
        with self.assertRaisesRegex(RuntimeError, "modified"):
            session.install(device, lambda _: None)
        self.assertEqual(device.writes, 0)

    def test_unknown_source_layout_never_writes(self):
        device = Device()
        device.flash[0x8000:0x9000] = table(m.NEW_LAYOUT)
        with self.assertRaisesRegex(ValueError, "Unknown partition"):
            self.session().capture(device)
        self.assertEqual(device.writes, 0)

    def test_changed_preserved_data_prevents_resume(self):
        device = Device()
        session = self.session()
        session.capture(device)
        device.flash[0x350001] ^= 1
        with self.assertRaisesRegex(RuntimeError, "differs from backup"):
            session.install(device, lambda _: None)
        self.assertEqual(device.writes, 0)

    def test_readback_mismatch_prevents_boot(self):
        device = Device()
        session = self.session()
        session.capture(device)
        write = device.write
        def corrupt(files):
            write(files)
            device.flash[0x9001] ^= 1
        device.write = corrupt
        with self.assertRaisesRegex(RuntimeError, "verification failed"):
            session.install(device, lambda _: None)
        self.assertEqual(device.boots, 0)
        self.assertNotEqual(session.report["phase"], "flash-verified")

    def test_fresh_migration_reads_only_one_backup_and_preserved_regions(self):
        device = Device()
        session = self.session()
        with patch.object(device, "read", wraps=device.read) as reads:
            session.capture(device)
            session.install(device, lambda _: None, fresh_capture=True)
        self.assertEqual([(call.args[0], call.args[1]) for call in reads.call_args_list],
                         [(0, m.FLASH_SIZE), *m.PRESERVED.values()])
        self.assertNotIn("installed_sha256", session.report)
        self.assertEqual(session.report["write_verification"], "esptool-md5")

    def test_incomplete_backup_never_writes(self):
        device = Device()
        read = device.read
        device.read = lambda offset, size, target: read(offset, size, target)[:-1]
        with self.assertRaisesRegex(RuntimeError, "Incomplete"):
            self.session().capture(device)
        self.assertEqual(device.writes, 0)

    def test_esptool_requires_confirmation_for_each_written_image(self):
        tool = m.Esptool(Path("esptool"), "COM4", 921600, lambda _: None)
        files = [(0x1000, Path("bootloader.bin")), (0x10000, Path("firmware.bin"))]
        with patch.object(tool, "command", return_value="Hash of data verified.\n" * 2):
            tool.write(files)
        for output in ("", "Hash of data verified.\n"):
            with patch.object(tool, "command", return_value=output), self.assertRaisesRegex(RuntimeError, "verification"):
                tool.write(files)

    def test_write_verification_failure_never_marks_install_verified(self):
        device = Device()
        session = self.session()
        session.capture(device)
        with patch.object(device, "write", side_effect=RuntimeError("write verification failed")):
            with self.assertRaisesRegex(RuntimeError, "verification"):
                session.install(device, lambda _: None, fresh_capture=True)
        self.assertEqual(device.boots, 0)
        self.assertEqual(session.report["phase"], "writing")

    def test_active_persisted_process_refused(self):
        device = Device()
        device.flash[0x9000:0xE000] = nvs(active=True)
        session = self.session()
        session.capture(device)
        with self.assertRaisesRegex(ValueError, "active"):
            session.install(device, lambda _: None)
        self.assertEqual(device.writes, 0)

    def test_missing_settings_uses_firmware_defaults_during_migration(self):
        device = Device()
        original_nvs = nvs(records=((0, 1, "misc", 1), (0, 1, "nvs.net80211", 2), (0, 1, "phy", 3)))
        device.flash[0x9000:0xE000] = original_nvs
        session = self.session()
        session.capture(device)
        session.install(device, lambda _: None)
        self.assertEqual(session.report["phase"], "flash-verified")
        self.assertEqual(bytes(device.flash[0x9000:0xE000]), original_nvs)
        session.verify_installed(device)
        session.restore(device, lambda _: None)
        self.assertEqual(session.report["phase"], "recovery-verified")

    def test_missing_process_keys_use_defaults_but_present_active_values_block(self):
        namespace = ((0, 1, "settings", 1),)
        for records in (namespace, namespace + ((1, 0x12, "step", -1),)):
            m.check_persisted_idle(nvs(records=records))
        for key, kind in (("step", 0x12), ("second", 0x14), ("play", 1), ("idson", 1)):
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, "active"):
                m.check_persisted_idle(nvs(records=namespace + ((1, kind, key, 1),)))

    def test_ambiguous_settings_and_corruption_still_rejected(self):
        with self.assertRaisesRegex(ValueError, "ambiguous"):
            m.check_persisted_idle(nvs(records=((0, 1, "settings", 1), (0, 1, "settings", 2))))
        corrupted = bytearray(nvs(records=((0, 1, "misc", 1),)))
        corrupted[68] ^= 1
        with self.assertRaisesRegex(ValueError, "checksum"):
            m.check_persisted_idle(bytes(corrupted))

    def test_package_versions_roles_checksums_and_layout(self):
        self.assertEqual(m.validate_package(self.package, "1.67.0")["version"], "1.67.0")
        other = package(self.root / "enduser", "1.70.2")
        self.assertEqual(m.validate_package(other, "1.70.2")["version"], "1.70.2")
        for name in m.IMAGES:
            data = (self.package / name).read_bytes()
            (self.package / name).write_bytes(data[:-1])
            with self.subTest(name=name), self.assertRaises(ValueError):
                m.validate_package(self.package, "1.67.0")
            (self.package / name).write_bytes(data)
        with self.assertRaisesRegex(ValueError, "role"):
            m.check_image(image("BrautomatMain"), "BrautomatSvcApp")
        with self.assertRaisesRegex(ValueError, "checksum|SHA256"):
            m.check_image(image()[:-1] + b"x")

    def test_webfiles_cannot_target_user_files(self):
        self.assertFalse(app.migration_webfile_allowed("webfiles/config.txt"))
        self.assertFalse(app.migration_webfile_allowed("webfiles/language/../../config.txt"))
        self.assertEqual(len(app.migration_webfiles(self.package)), len(app.WEBUPDATE_TOOL_FILES))

    def test_cli_never_erases_all_or_resets_before_verification(self):
        tool = m.Esptool(Path("esptool"), "COM1", 921600, lambda _: None)
        with patch.object(m.subprocess, "run") as run:
            run.return_value.returncode = 0
            run.return_value.stdout = "Hash of data verified.\n"
            tool.write([(0x10000, Path("firmware.bin"))])
            command = run.call_args.args[0]
            self.assertIn("no-reset-stub", command)
            self.assertNotIn("erase-flash", command)
            self.assertNotIn("hard-reset", command)
            tool.boot()
            self.assertIn("hard-reset", run.call_args.args[0])

    def test_read_failure_keeps_stub_and_records_original_output(self):
        logs = []
        tool = m.Esptool(Path("esptool"), "COM1", 921600, logs.append)
        with patch.object(m.subprocess, "run") as run:
            run.return_value.returncode = 2
            run.return_value.stdout = "Serial data stream stopped: original read failure"
            with self.assertRaisesRegex(RuntimeError, "read-flash failed"):
                tool.read(0, m.FLASH_SIZE, self.root / "failed-read.bin")
            command = run.call_args.args[0]
            self.assertEqual(command[command.index("--after") + 1], "no-reset-stub")
            self.assertEqual(command[command.index("--before") + 1], "default-reset")
            self.assertIn(run.return_value.stdout, logs)
            run.assert_called_once()
            self.assertFalse((self.root / "failed-read.bin").exists())

    def test_job_forces_backup_even_if_old_api_flags_are_false(self):
        device = Device(1)
        job = app.Job(id="test", type="migration", title="Test")
        with (
            patch.object(app, "BACKUP_DIR", self.root / "runtime"),
            patch.object(app, "current_firmware_version", return_value=("1.65.5", (1, 65, 5))),
            patch.object(app, "migration_require_idle"),
            patch.object(app, "download_config_backup", return_value=b'{"config": [{}]}'),
            patch.object(app, "prepare_migration_package", return_value=(self.package, m.validate_package(self.package, "1.67.0"))),
            patch.object(app, "migration_user_files", return_value={"/config.txt": m.digest(b"config")}),
            patch.object(app, "ensure_esptool_available", return_value=Path("esptool")),
            patch.object(app, "prepare_esptool_serial_handover", return_value={}),
            patch.object(app.migration_engine, "Esptool", return_value=device),
            patch.object(device, "read", side_effect=AssertionError("no flash read in API migration")),
            patch.object(app, "finish_migration", return_value={"ok": True}),
            patch.object(app, "start_http_preupdate_to_minimum_migration_version") as preupdate,
        ):
            self.assertEqual(app.migration_job(job, "http://device", False, "COM1", 921600,
                                             "open", str(self.package), "", False, False), {"ok": True})
            self.assertTrue(app.migration_sessions()[0]["backup_verified"])
            preupdate.assert_not_called()
        self.assertEqual(device.boots, 1)

    def test_failed_job_does_not_restart_monitor_or_device(self):
        device = Device()
        device.fail_after = 0
        with (
            patch.object(app, "BACKUP_DIR", self.root / "runtime"),
            patch.object(app, "current_firmware_version", return_value=("1.65.5", (1, 65, 5))),
            patch.object(app, "migration_require_idle"),
            patch.object(app, "download_config_backup", return_value=b'{"config": [{}]}'),
            patch.object(app, "prepare_migration_package", return_value=(self.package, m.validate_package(self.package, "1.67.0"))),
            patch.object(app, "migration_user_files", return_value={"/config.txt": "hash"}),
            patch.object(app, "ensure_esptool_available", return_value=Path("esptool")),
            patch.object(app, "prepare_esptool_serial_handover", return_value={"restart": True, "port": "COM1", "baud": 115200}),
            patch.object(app.migration_engine, "Esptool", return_value=device),
            patch.object(device, "read", side_effect=AssertionError("no flash read in API migration")),
            patch.object(app, "schedule_serial_restart") as restart,
        ):
            with self.assertRaisesRegex(RuntimeError, "power failure"):
                app.migration_job(app.Job(id="test", type="migration", title="Test"), "http://device",
                                  False, "COM1", 921600, "open", str(self.package), "", False, False)
            restart.assert_not_called()
            with self.assertRaisesRegex(RuntimeError, "Incomplete migration"):
                app.ensure_migration_port_unlocked("COM1")
        self.assertEqual(device.boots, 0)

    def test_finish_never_reports_success_if_user_files_changed(self):
        session = self.session()
        session.save(target_version="1.67.0", user_files={"/config.txt": m.digest(b"original")})
        with (
            patch.object(app, "json_request", return_value={"firm": "Brautomat32 1.67.0"}),
            patch.object(app, "migration_require_idle"),
            patch.object(app, "download_config_backup", return_value=b'{"config": [{}]}'),
            patch.object(app, "download_fs_file", return_value=b"changed"),
            patch.object(app, "post_file_to_fs") as upload,
        ):
            with self.assertRaisesRegex(RuntimeError, "User file changed"):
                app.finish_migration(app.Job(id="test", type="migration", title="Test"), session, "http://device")
            upload.assert_not_called()
        self.assertNotEqual(session.report["phase"], "complete")

    def test_legacy_process_route_fallback_requires_explicit_idle_flag(self):
        from urllib.error import HTTPError
        for flag, succeeds in ((False, True), (True, False), (None, False)):
            with self.subTest(flag=flag), patch.object(app, "json_request", side_effect=[
                HTTPError("http://device/reqProcessStatus", 404, "missing", {}, None), {"brauen": flag}
            ]):
                if succeeds:
                    app.migration_require_idle("http://device")
                else:
                    with self.assertRaises(RuntimeError):
                        app.migration_require_idle("http://device")

    def test_post_boot_resume_rechecks_code_before_restarting(self):
        device = Device()
        session = self.session()
        session.capture(device)
        session.install(device, lambda _: None)
        session.verify_installed(device)
        device.flash[0x220020] ^= 1
        with self.assertRaisesRegex(RuntimeError, "code changed"):
            session.verify_installed(device)
        self.assertEqual(device.boots, 0)

    def test_source_range_has_no_preupdate_and_rejects_unknown_targets(self):
        self.assertTrue(m.contains_version(b"\0" + b"1.67" + b"\0", "1.67.0"))
        self.assertTrue(m.contains_version(b"\0" + b"1.67.0" + b"\0", "1.67"))
        for version in ("1.65.5", "1.66.0", "1.66.99"):
            bad = package(self.root / version, version)
            with self.subTest(version=version), self.assertRaisesRegex(ValueError, "target"):
                m.validate_package(bad, version)
        for version, parsed in (("1.62", (1, 62, 0)), ("1.63.4", (1, 63, 4)), ("1.65.5", (1, 65, 5)), ("1.65.6", (1, 65, 6)), ("1.66.0", (1, 66, 0)), ("1.66.99", (1, 66, 99))):
            with (
                self.subTest(source=version),
                patch.object(app, "current_firmware_version", return_value=(version, parsed)),
                patch.object(app, "migration_require_idle"),
            patch.object(app, "download_config_backup", return_value=b'{"config": [{}]}'),
                patch.object(app, "prepare_migration_package", side_effect=RuntimeError("package gate")) as prepare,
                patch.object(app, "start_http_preupdate_to_minimum_migration_version") as preupdate,
            ):
                with self.assertRaisesRegex(RuntimeError, "package gate"):
                    app.migration_job(app.Job(id="test", type="migration", title="Test"), "http://device",
                                      False, "COM1", 921600, "open", "", "", False, True)
                prepare.assert_called_once()
                preupdate.assert_not_called()

    def test_http_recovery_endpoint_dispatches_without_online_precondition(self):
        import threading
        from urllib.request import Request, urlopen
        server = app.ThreadingHTTPServer(("127.0.0.1", 0), app.AppHandler)
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        try:
            with patch.object(app, "run_job") as run:
                request = Request(f"http://127.0.0.1:{server.server_port}/api/migration/recovery",
                                  data=json.dumps({"session_id": "a" * 32, "port": "COM1", "action": "restore", "baud": 921600}).encode(),
                                  headers={"Content-Type": "application/json"})
                with urlopen(request) as response:
                    self.assertIn("job_id", json.load(response))
                self.assertIs(run.call_args.args[1], app.migration_recovery_job)
                self.assertEqual(run.call_args.args[2:], ("a" * 32, "COM1", 921600, "restore"))
                request = Request(f"http://127.0.0.1:{server.server_port}/api/migration/recovery",
                                  data=json.dumps({"backup_dir": str(self.root), "port": "COM1", "action": "restore"}).encode(),
                                  headers={"Content-Type": "application/json"})
                with urlopen(request) as response:
                    self.assertIn("job_id", json.load(response))
                self.assertEqual(run.call_args.kwargs, {"backup_dir": str(self.root)})
            session = self.session()
            session.capture(Device())
            with patch.object(app, "pick_directory", return_value=str(session.directory)):
                request = Request(f"http://127.0.0.1:{server.server_port}/api/migration/backup/pick", data=b"{}")
                with urlopen(request) as response:
                    self.assertEqual(json.load(response)["directory"], str(session.directory))
        finally:
            server.shutdown()
            server.server_close()
            worker.join(timeout=2)

    def test_local_build_without_migration_manifest(self):
        import shutil
        project = self.root / "firmware-project"
        build = project / "build" / "ESP32-IDF5"
        build.parent.mkdir(parents=True)
        shutil.copytree(self.package, build)
        shutil.move(str(build / "webfiles"), str(project / "data"))
        (project / "platformio.ini").write_text("[env:ESP32_IDF5]\n")
        metadata = project / ".pio" / "build" / "ESP32_IDF5" / "idedata.json"
        metadata.parent.mkdir(parents=True)
        metadata.write_text(json.dumps({"defines": ['BRAUTOMAT_FIRMWARE_VERSION="1.67.0"']}))
        selected, checked = app.prepare_migration_package(
            app.Job(id="test", type="migration", title="Test"), "open", str(build), "")
        self.assertEqual(selected, build.resolve())
        self.assertEqual(checked["version"], "1.67.0")
        self.assertFalse((build / "migration.json").exists())
        self.assertNotIn("/config.txt", app.migration_webfiles(build))

    def test_local_binary_zip_without_metadata(self):
        import shutil
        from littlefs import LittleFS
        fs = LittleFS(block_size=4096, block_count=176)
        fs.mkdir("/language")
        for name in app.WEBUPDATE_TOOL_FILES + ["language/english.json", "config.txt"]:
            with fs.open("/" + name, "wb") as handle:
                handle.write(b"asset" if name != "config.txt" else b"private settings")
        fs.unmount()
        (self.package / "Littlefs.bin").write_bytes(fs.context.buffer)
        shutil.rmtree(self.package / "webfiles")
        (self.package / "firmware.bin").write_bytes(image("BrautomatMain", "1.67.2"))
        before = {path.name: path.read_bytes() for path in self.package.iterdir()}
        selected, metadata = app.prepare_migration_package(
            app.Job(id="test", type="migration", title="Test"), "open", str(self.package), "")
        self.assertEqual(metadata["version"], "1.67.2")
        webfiles = app.migration_webfiles(selected)
        self.assertEqual(len(webfiles), len(app.WEBUPDATE_TOOL_FILES) + 1)
        self.assertEqual(webfiles["/language/english.json"], b"asset")
        self.assertNotIn("/config.txt", webfiles)
        session = m.Session.create(self.root / "backups", selected, metadata, webfiles)
        self.assertEqual((session.work / "package/webfiles/language/english.json").read_bytes(), b"asset")
        self.assertEqual(before, {path.name: path.read_bytes() for path in self.package.iterdir()})

    def test_binary_version_rejects_ambiguous_wrong_role_and_damaged_images(self):
        damaged = bytearray(image("BrautomatMain", "1.67.2"))
        damaged[-1] ^= 1
        for payload in (image("BrautomatMain", "1.67.2\0\x001.70.0"),
                        image("BrautomatSvcApp", "1.67.2"), bytes(damaged)):
            with self.subTest(payload=payload[:4]):
                (self.package / "firmware.bin").write_bytes(payload)
                with self.assertRaises((ValueError, RuntimeError)):
                    app.local_package_version(str(self.package))

    def test_embedded_legacy_target_still_rejected(self):
        for version in ("1.66.0", "1.66.99"):
            with self.subTest(version=version):
                (self.package / "firmware.bin").write_bytes(image("BrautomatMain", version))
                with self.assertRaisesRegex(ValueError, "Migration target"):
                    app.prepare_migration_package(app.Job(id="test", type="migration", title="Test"),
                                                  "open", str(self.package), "")

    def test_embedded_serviceapp_target_with_matching_layout_accepted(self):
        for version in ("1.67.0", "1.68.0", "1.70.0"):
            with self.subTest(version=version):
                (self.package / "firmware.bin").write_bytes(image("BrautomatMain", version))
                _, metadata = app.prepare_migration_package(
                    app.Job(id="test", type="migration", title="Test"), "open", str(self.package), "")
                self.assertEqual(metadata["version"], version)

    def test_filesystem_image_invalid_or_missing_webfiles_rejected(self):
        from littlefs import LittleFS
        fs = LittleFS(block_size=4096, block_count=176)
        fs.mkdir("/language")
        fs.unmount()
        for payload in (b"broken", bytes(fs.context.buffer)):
            (self.package / "Littlefs.bin").write_bytes(payload)
            with self.assertRaises(ValueError):
                app.migration_image_webfiles(self.package)

    def test_updates_directory_uses_adjacent_data(self):
        import shutil
        updates = self.root / "Updates"
        updates.mkdir()
        build = updates / "ESP32-IDF5dev"
        shutil.copytree(self.package, build)
        shutil.move(str(build / "webfiles"), str(updates / "data"))
        self.assertEqual(len(app.migration_webfiles(build)), len(app.WEBUPDATE_TOOL_FILES))

    def test_staged_webfile_change_is_rejected(self):
        session = self.session()
        path = session.work / "package" / "webfiles" / app.WEBUPDATE_TOOL_FILES[0]
        path.write_bytes(b"changed")
        with self.assertRaisesRegex(RuntimeError, "webfiles changed"):
            app.finish_migration(app.Job(id="test", type="migration", title="Test"), session, "http://device")

    def test_named_backup_contains_only_restore_files_and_supports_completed_restore(self):
        import shutil
        sessions = [m.Session.create(self.root / "named", self.package,
                    m.validate_package(self.package, "1.67.0"), app.migration_webfiles(self.package),
                    "1.65.5", self.root / "cache") for _ in range(2)]
        session = sessions[0]
        self.assertRegex(session.directory.name, r"^backup_1_65_5_\d{8}$")
        self.assertEqual(sessions[1].directory.name, session.directory.name + "_1")
        device = Device()
        original = bytes(device.flash)
        steps = []
        session.status = steps.append
        session.capture(device)
        session.install(device, lambda _: None)
        self.assertEqual(steps[:3], ["migrationStepDevice", "migrationStepBackupFirst", "migrationStepBackupCheck"])
        self.assertLess(steps.index("migrationStepInstall"), steps.index("migrationStepPreservedAfter"))
        session.save("complete")
        self.assertEqual({p.name for p in session.directory.iterdir()},
                         {"flash-backup.bin", "nvs.bin", "report.json"})
        selected = self.root / "selected-backup"
        shutil.copytree(session.directory, selected)
        loaded = m.Session.load_directory(selected)
        with patch.object(device, "read", wraps=device.read) as reads:
            loaded.restore(device, lambda _: None)
            reads.assert_called_once_with(0, m.FLASH_SIZE, loaded.work / "recovery-readback.bin")
        self.assertEqual(bytes(device.flash), original)
        (selected / "nvs.bin").write_bytes(b"invalid")
        writes = device.writes
        with self.assertRaisesRegex(RuntimeError, "NVS backup"):
            loaded.restore(device, lambda _: None)
        self.assertEqual(device.writes, writes)

    def test_classic_esp32_security_registers(self):
        tool = m.Esptool(Path("esptool.exe"), "COM4", 921600, lambda _: None)
        identity = "Detected flash size: 4MB\nMAC: 02:00:00:00:00:01\n"
        for crypt, secure, allowed in ((0, 0, True), (3 << 20, 0, True),
                                        (1 << 20, 0, False), (0, 16, False), (0, 32, False)):
            with self.subTest(crypt=crypt, secure=secure), patch.object(tool, "command", side_effect=[
                identity, f"0x3ff5a000 = {crypt:#010x}\n", f"0x3ff5a018 = {secure:#010x}\n"
            ]) as command:
                if allowed:
                    self.assertEqual(tool.identity(), "02:00:00:00:00:01")
                else:
                    with self.assertRaisesRegex(RuntimeError, "enabled"):
                        tool.identity()
                self.assertEqual(command.call_args_list[1].args, ("read-mem", "0x3ff5a000"))
        with patch.object(tool, "command", return_value="unknown response"):
            with self.assertRaisesRegex(RuntimeError, "security register"):
                tool.read_register(0x3FF5A000)

    def test_empty_file_http_failure_requires_confirmed_zero_size(self):
        from io import BytesIO
        from urllib.error import HTTPError
        for size, body, accepted in ((0, b"Invalid data in handler", True),
                                     (1, b"Invalid data in handler", False),
                                     (None, b"Invalid data in handler", False),
                                     (0, b"Other server failure", False)):
            with (
                self.subTest(size=size, body=body),
                patch.object(app, "download_fs_file", side_effect=HTTPError(
                    "http://device/download", 500, "error", {}, BytesIO(body))),
                patch.object(app, "json_request", return_value=[{
                    "name": "empty.txt", "type": "file", "size": size}]),
            ):
                if accepted:
                    self.assertEqual(app.migration_read_file("http://device", "/Profile/empty.txt"), b"")
                else:
                    with self.assertRaisesRegex(RuntimeError, "/Profile/empty.txt"):
                        app.migration_read_file("http://device", "/Profile/empty.txt")

    def test_remote_source_uses_existing_files_at_same_commit(self):
        sha = "a" * 40
        urls = []
        def download(url, **kwargs):
            urls.append(url)
            self.assertIn("/" + sha + "/", url)
            relative = url.split("/" + sha + "/", 1)[1]
            if relative.startswith("Updates/ESP32-IDF5dev/"):
                return (self.package / relative.removeprefix("Updates/ESP32-IDF5dev/")).read_bytes()
            self.assertTrue(relative.startswith("Updates/data/"))
            return (self.package / "webfiles" / relative.removeprefix("Updates/data/")).read_bytes()
        with (
            patch.object(app, "CACHE_DIR", self.root / "cache"),
            patch.object(app, "json_request", return_value={"sha": sha}),
            patch.object(app, "package_location", return_value={"version":"1.67.0", "base_url":f"https://raw.githubusercontent.com/InnuendoPi/Brautomat32/{sha}/Updates/ESP32-IDF5dev"}) as version,
            patch.object(app, "download_bytes", side_effect=download),
        ):
            selected, metadata = app.prepare_migration_package(
                app.Job(id="test", type="migration", title="Test"), "development_170", "", "")
        version.assert_called_once_with("development_170", "", "Updates", sha)
        self.assertEqual(metadata["version"], "1.67.0")
        self.assertFalse((selected / "migration.json").exists())
        self.assertEqual(len(urls), len(m.IMAGES) + len(app.WEBUPDATE_TOOL_FILES))

    def test_migration_controls_are_unique_and_connected(self):
        from html.parser import HTMLParser
        class IDs(HTMLParser):
            def __init__(self):
                super().__init__()
                self.ids = []
            def handle_starttag(self, tag, attrs):
                self.ids.extend(value for key, value in attrs if key == "id")
        parser = IDs()
        parser.feed((Path(app.STATIC_DIR) / "index.html").read_text(encoding="utf-8"))
        script = (Path(app.STATIC_DIR) / "app.js").read_text(encoding="utf-8")
        for name in ("migrationSession", "migrationProgress", "migrationRefresh", "migrationResume", "migrationRestore"):
            self.assertEqual(parser.ids.count(name), 1)
            self.assertIn(f'$("{name}")', script)
        for name in ("migrationRefresh", "migrationResume", "migrationRestore"):
            self.assertIn(f'$("{name}").addEventListener("click"', script)

    def test_corrupt_report_keeps_serial_access_blocked(self):
        session = self.session()
        (session.directory / "report.json").write_text("broken")
        with patch.object(app, "migration_root", return_value=self.root / "backups"):
            self.assertEqual(app.migration_sessions()[0]["phase"], "unreadable")
            with self.assertRaisesRegex(RuntimeError, "unreadable"):
                app.ensure_migration_port_unlocked("COM1")
