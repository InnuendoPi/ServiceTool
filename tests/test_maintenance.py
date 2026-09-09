import struct
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import zlib
import app
import migration as m
import maintenance
from test_migration import Device, image, table, nvs


class MaintenanceTests(unittest.TestCase):
    def device(self):
        device = Device()
        device.flash[0x8000:0x9000] = table(m.NEW_LAYOUT)
        payload = image("BrautomatSvcApp")
        device.flash[0x220000:0x220000 + len(payload)] = payload
        return device

    def test_entry_changes_only_boot_selection(self):
        device = self.device()
        before = bytes(device.flash)
        with tempfile.TemporaryDirectory() as directory:
            maintenance.select_service(device, Path(directory), lambda _: None)
            self.assertEqual((Path(directory) / "otadata-backup.bin").read_bytes(), before[0xE000:0x10000])
        self.assertEqual(device.flash[:0xE000], before[:0xE000])
        self.assertEqual(device.flash[0x10000:], before[0x10000:])
        self.assertEqual(m.source_slot(device.flash), 1)
        self.assertEqual(device.boots, 0)

    def test_wrong_layout_and_image_reject_without_write(self):
        for failure in ("layout", "image"):
            device = self.device()
            if failure == "layout":
                device.flash[0x8000:0x9000] = table(m.OLD_LAYOUT)
            elif failure == "image":
                device.flash[0x220020] ^= 1
            else:
                device.flash[0x9000:0xE000] = nvs(active=True)
            with tempfile.TemporaryDirectory() as directory, self.assertRaises(ValueError):
                maintenance.select_service(device, Path(directory), lambda _: None)
            self.assertEqual(device.writes, 0)

    def test_dirty_service_state_rejected(self):
        data = bytearray(nvs())
        for index, namespace, key, value in ((3, 0, "braut-service", 2), (4, 2, "app-dirty", 1)):
            entry = bytearray(b"\xff" * 32)
            entry[:4] = bytes((namespace, 1, 1, 255))
            entry[8:24] = key.encode().ljust(16, b"\0")
            entry[24] = value
            struct.pack_into("<I", entry, 4, zlib.crc32(entry[:4] + entry[8:], 0xFFFFFFFF))
            data[64 + index * 32:96 + index * 32] = entry
            data[32 + index // 4] &= ~(1 << (2 * (index % 4)))
        with self.assertRaisesRegex(RuntimeError, "Incomplete"):
            maintenance.check_no_pending_update(bytes(data))

    def test_status_uses_serial_detection_after_restart(self):
        with patch.object(app, "maintenance_job", return_value={"active": True}) as job:
            self.assertTrue(app.maintenance_status("http://device", "COM4")["active"])
            self.assertEqual(job.call_args.args[-1], "status")

    def test_unknown_device_is_not_reported_as_confirmed_main(self):
        with patch.object(app, "maintenance_job", side_effect=OSError("offline")):
            self.assertIsNone(app.maintenance_status("http://device", "COM4")["active"])

    def test_saved_brew_state_does_not_block_recovery_entry(self):
        device = self.device()
        device.flash[0x9000:0xE000] = nvs(active=True)
        with tempfile.TemporaryDirectory() as directory:
            maintenance.select_service(device, Path(directory), lambda _: None)
        self.assertEqual(device.writes, 1)
        with self.assertRaises(ValueError):
            m.check_persisted_idle(nvs(active=True))
