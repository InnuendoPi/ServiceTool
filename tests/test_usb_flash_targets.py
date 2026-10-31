"""USB plans use only temporary packages and mocked serial/process operations."""
from contextlib import nullcontext
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch

import app
import migration
from test_migration import image, package, table


class UsbFlashTargetsTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.modern = package(self.root / "modern", "1.70.4")
        self.legacy = self.root / "legacy"
        self.legacy.mkdir()
        for name, content in {
            "bootloader.bin": image(), "partitions.bin": table(migration.OLD_LAYOUT),
            "boot_app0.bin": b"\xff" * 8192, "firmware.bin": image(version="1.66.0"),
        }.items():
            (self.legacy / name).write_bytes(content)
        for root in (self.modern, self.legacy):
            (root / "Littlefs.bin").write_bytes(b"filesystem")

    def test_exact_commands_for_both_targets_and_all_checkbox_combinations(self):
        for root, slot1, second in ((self.modern, 0x220000, "serviceapp.bin"),
                                    (self.legacy, 0x1B0000, "firmware.bin")):
            for erase in (False, True):
                for littlefs in (False, True):
                    with self.subTest(target=root.name, erase=erase, littlefs=littlefs), \
                            patch.object(app, "ensure_esptool_available", return_value=Path("MOCK")), \
                            patch.object(app, "prepare_esptool_serial_handover", return_value={}), \
                            patch.object(app, "exclusive_serial_access", return_value=nullcontext()), \
                            patch.object(app.STATE, "append_serial_line"), \
                            patch.object(app.subprocess, "Popen", return_value=Mock(stdout=[], wait=Mock(return_value=0))) as spawn:
                        app.flash_job(app.Job("test", "flash", "Test"), "MOCK", 115200,
                                      "open", str(root), "", erase, littlefs,
                                      source_firmware="1.66.0" if root == self.modern else "1.70.4")
                        self.assertEqual(spawn.call_count, 2 if erase else 1)
                        if erase:
                            self.assertIn("erase-flash", spawn.call_args_list[0].args[0])
                        command = spawn.call_args.args[0]
                        pairs = command[command.index("-z") + 1:]
                        expected = [(0x1000, "bootloader.bin"), (0x8000, "partitions.bin"),
                                    (0xE000, "boot_app0.bin"), (0x10000, "firmware.bin"), (slot1, second)]
                        if littlefs:
                            expected.append((0x350000, "Littlefs.bin"))
                        self.assertEqual(pairs, [value for offset, name in expected
                                                for value in (hex(offset), str(root / name))])

    def test_normal_legacy_flash_does_not_write_app1(self):
        for version in ("1.66.0", "1.66.99", ""):
            with self.subTest(version=version):
                plan = app.usb_flash_plan(self.legacy, False, version)
                self.assertEqual([(name, offset) for name, _, offset in plan if name == "firmware.bin"],
                                 [("firmware.bin", 0x10000)])

    def test_duplicate_firmware_progress_tracks_slot_address(self):
        job = app.Job("test", "flash", "Test")
        files = [("firmware.bin", 100, 0x10000), ("firmware.bin", 100, 0x1B0000)]
        state = {"index": 0}
        app.update_flash_progress(job, "Writing 'firmware.bin' at 0x001b0000", files, state)
        self.assertEqual(state["index"], 1)
        self.assertEqual(state["per_file_progress"][0], 1.0)

    def test_missing_files_fail_before_serial_or_erase_even_without_erase_selected(self):
        for root, name, littlefs in ((self.legacy, "bootloader.bin", False),
                                     (self.legacy, "partitions.bin", False),
                                     (self.legacy, "boot_app0.bin", False),
                                     (self.modern, "serviceapp.bin", False),
                                     (self.modern, "Littlefs.bin", True)):
            target = root / name
            content = target.read_bytes()
            target.unlink()
            try:
                with self.subTest(name=name), patch.object(app, "prepare_esptool_serial_handover") as handover, \
                        patch.object(app, "ensure_esptool_available") as esptool, \
                        patch.object(app.subprocess, "Popen") as spawn:
                    with self.assertRaises((ValueError, FileNotFoundError, RuntimeError)):
                        app.flash_job(app.Job("test", "flash", "Test"), "MOCK", 115200,
                                      "open", str(root), "", False, littlefs)
                    handover.assert_not_called()
                    esptool.assert_not_called()
                    spawn.assert_not_called()
            finally:
                target.write_bytes(content)

    def test_unknown_layout_and_oversized_firmware_are_rejected(self):
        wrong = list(migration.OLD_LAYOUT)
        wrong[3] = ("app1", 0, 17, 0x1B0000, 0x190000)
        (self.legacy / "partitions.bin").write_bytes(table(wrong))
        with self.assertRaises(ValueError):
            app.usb_flash_plan(self.legacy, False)
        (self.legacy / "partitions.bin").write_bytes(table(migration.OLD_LAYOUT))
        (self.legacy / "firmware.bin").write_bytes(b"x" * (0x1A0000 + 1))
        with self.assertRaisesRegex(RuntimeError, "does not fit"):
            app.usb_flash_plan(self.legacy, False)


if __name__ == "__main__":
    unittest.main()
