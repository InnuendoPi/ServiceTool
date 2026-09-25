import tempfile
import unittest
from contextlib import ExitStack
from pathlib import Path
from unittest.mock import MagicMock, patch
import app


class MigrationStagingTests(unittest.TestCase):
    def check_staging(self, fail_download):
        with tempfile.TemporaryDirectory() as directory, ExitStack() as stack:
            root = Path(directory)
            expected = list(app.migration_engine.IMAGES) + [
                "webfiles/" + name for name in app.WEBUPDATE_TOOL_FILES]
            downloads = []
            sha = "a" * 40
            base = f"https://raw.githubusercontent.com/InnuendoPi/Brautomat32/{sha}/Updates/ESP32-IDF5dev"
            def download(url, **kwargs):
                self.assertIn(sha, url)
                downloads.append(url)
                if fail_download and len(downloads) == len(expected):
                    raise OSError("download interrupted")
                return b"test artifact"

            def validate(package, version):
                self.assertEqual(version, "1.70.0")
                self.assertEqual(len(downloads), len(expected))
                for name in expected:
                    self.assertEqual((package / name).read_bytes(), b"test artifact")
                return {"version": version}

            def handover(*args):
                packages = list(root.glob("migration-*"))
                self.assertEqual(len(packages), 1)
                validate(packages[0], "1.70.0")
                return {}

            values = {
                "CACHE_DIR": root,
            }
            for name, value in values.items():
                stack.enter_context(patch.object(app, name, value))
            returns = {
                "ensure_migration_port_unlocked": None,
                "ensure_esptool_port_available": None,
                "current_firmware_version": ("1.66.1", (1, 66, 1)),
                "migration_require_idle": None, "download_config_backup": b'{"config": [{}]}', "migration_webfiles": {},
                "migration_user_files": {}, "ensure_esptool_available": Path("tool"),
                "json_request": {"sha": sha},
                "package_location": {"base_url": base, "version": "1.70.0"},
                "finish_migration": {"ok": True},
            }
            for name, value in returns.items():
                stack.enter_context(patch.object(app, name, return_value=value))
            stack.enter_context(patch.object(app, "download_bytes", side_effect=download))
            validation = stack.enter_context(patch.object(app.migration_engine, "validate_package", side_effect=validate))
            serial = stack.enter_context(patch.object(app, "prepare_esptool_serial_handover", side_effect=handover))
            session = MagicMock()
            session.report = {"id": "test"}
            create = stack.enter_context(patch.object(app.migration_engine.ApiSession, "create", return_value=session))
            device = stack.enter_context(patch.object(app.migration_engine, "Esptool"))
            args = (app.Job(id="test", type="migration", title="Test"),
                    "http://device", False, "COM3", 921600, "development_170", "", "", False, True)
            if fail_download:
                with self.assertRaisesRegex(OSError, "download interrupted"):
                    app.migration_job(*args)
                serial.assert_not_called()
                create.assert_not_called()
                device.assert_not_called()
                validation.assert_not_called()
            else:
                self.assertEqual(app.migration_job(*args), {"ok": True})
                serial.assert_called_once()
                session.capture_api.assert_called_once_with(b'{"config": [{}]}')
                session.install.assert_called_once()
                self.assertEqual(device.call_args.args[2], 921600)

    def test_all_online_artifacts_are_local_before_esptool(self):
        self.check_staging(False)

    def test_last_download_failure_prevents_esptool_and_backup(self):
        self.check_staging(True)
