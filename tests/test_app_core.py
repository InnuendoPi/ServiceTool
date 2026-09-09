import json
import pathlib
import tempfile
import unittest
from urllib import error
from unittest.mock import Mock, patch

import app


def create_test_runner_fixture(root: pathlib.Path) -> None:
    tasks_dir = root / "tasks" / "test-automation"
    runner_dir = root / "tools" / "test-runner"
    tasks_dir.mkdir(parents=True)
    (tasks_dir / "README.md").write_text("runner docs\n", encoding="utf-8")
    (tasks_dir / "ACTIVE.md").write_text("active\n", encoding="utf-8")
    (runner_dir / "src").mkdir(parents=True)
    (runner_dir / "package.json").write_text('{"name":"test-runner"}\n', encoding="utf-8")
    (runner_dir / "src" / "index.js").write_text("console.log('runner');\n", encoding="utf-8")
    (runner_dir / "sample-config.json").write_text(
        json.dumps(
            {
                "publicSuiteName": "Sample",
                "items": [{"id": "one", "publicGroup": "core"}],
            }
        ),
        encoding="utf-8",
    )


class DeviceUrlFallbackTests(unittest.TestCase):
    def test_http_error_does_not_switch_to_ap_fallback(self) -> None:
        visited: list[str] = []

        def action(candidate: str) -> None:
            visited.append(candidate)
            raise error.HTTPError(
                f"{candidate}/scanWifi",
                404,
                "Not Found",
                hdrs=None,
                fp=None,
            )

        with self.assertRaises(error.HTTPError) as raised:
            app.try_base_urls("http://brautomat.local", action)

        self.assertEqual(raised.exception.code, 404)
        raised.exception.close()
        self.assertEqual(visited, ["http://brautomat.local"])

    def test_connection_failure_uses_ap_fallback(self) -> None:
        visited: list[str] = []

        def action(candidate: str) -> str:
            visited.append(candidate)
            if candidate == "http://brautomat.local":
                raise error.URLError(ConnectionRefusedError("offline"))
            return "ok"

        base_url, result = app.try_base_urls("http://brautomat.local", action)

        self.assertEqual(base_url, "http://192.168.4.1")
        self.assertEqual(result, "ok")
        self.assertEqual(
            visited,
            ["http://brautomat.local", "http://192.168.4.1"],
        )

    def test_non_connection_url_error_does_not_switch_target(self) -> None:
        visited: list[str] = []

        def action(candidate: str) -> None:
            visited.append(candidate)
            raise error.URLError("unsupported URL scheme")

        with self.assertRaises(error.URLError):
            app.try_base_urls("http://brautomat.local", action)

        self.assertEqual(visited, ["http://brautomat.local"])


class SerialHandoverTests(unittest.TestCase):
    def setUp(self) -> None:
        self.job = app.Job(id="test-job", type="flash", title="Test")

    def test_flash_preflight_failure_does_not_stop_serial_monitor(self) -> None:
        with (
            patch.object(app, "resolve_package", side_effect=RuntimeError("package unavailable")),
            patch.object(app, "prepare_esptool_serial_handover") as handover,
        ):
            with self.assertRaisesRegex(RuntimeError, "package unavailable"):
                app.flash_job(
                    self.job,
                    "COM1",
                    115200,
                    "open",
                    "missing",
                    "",
                    False,
                    False,
                )

        handover.assert_not_called()

    def test_flash_failure_after_handover_schedules_monitor_restart(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            package = pathlib.Path(temp_dir)
            (package / "firmware.bin").write_bytes(b"firmware")
            restart = Mock()
            with (
                patch.object(app, "resolve_package", return_value=package),
                patch.object(app, "ensure_esptool_available", return_value=package / "esptool"),
                patch.object(
                    app,
                    "prepare_esptool_serial_handover",
                    return_value={"restart": True, "port": "COM1", "baud": 115200},
                ),
                patch.object(
                    app,
                    "exclusive_serial_access",
                    side_effect=RuntimeError("serial lock busy"),
                ),
                patch.object(app, "schedule_serial_restart", restart),
            ):
                with self.assertRaisesRegex(RuntimeError, "serial lock busy"):
                    app.flash_job(
                        self.job,
                        "COM1",
                        115200,
                        "open",
                        temp_dir,
                        "",
                        False,
                        False,
                    )

        restart.assert_called_once_with("COM1", 115200, delay_seconds=2.5)

    def test_firmware_backup_preflight_failure_does_not_stop_monitor(self) -> None:
        with (
            patch.object(app, "ensure_esptool_available", return_value=pathlib.Path("esptool")),
            patch.object(app, "firmware_slot", side_effect=RuntimeError("slot unavailable")),
            patch.object(app, "prepare_esptool_serial_handover") as handover,
        ):
            with self.assertRaisesRegex(RuntimeError, "slot unavailable"):
                app.backup_firmware_job(
                    self.job,
                    "http://brautomat.local",
                    "COM1",
                    115200,
                )

        handover.assert_not_called()

    def test_migration_rejects_out_of_range_before_handover(self) -> None:
        with (
            patch.object(app, "current_firmware_version", return_value=("1.65.6", (1, 65, 6))),
            patch.object(app, "prepare_esptool_serial_handover") as handover,
        ):
            with self.assertRaisesRegex(RuntimeError, "1.62.0 through 1.65.5"):
                app.migration_job(self.job, "http://device", False, "COM1", 921600,
                                  "release", "", "", False, True)
        handover.assert_not_called()


class TestRunnerEnvironmentTests(unittest.TestCase):
    def test_environment_variable_is_read_at_detection_time(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = pathlib.Path(temp_dir)
            source_root = temp_root / "source"
            service_root = temp_root / "ServiceTool"
            service_root.mkdir()
            create_test_runner_fixture(source_root)

            with (
                patch.dict(app.os.environ, {app.TEST_RUNNER_SOURCE_ROOT_ENV: str(source_root)}),
                patch.object(app, "APP_ROOT", service_root),
                patch.object(app, "DATA_ROOT", temp_root / "data"),
                patch.object(app.subprocess, "check_output", return_value="v22.0.0\n"),
            ):
                catalog = app.detect_test_runner_environment()

        self.assertTrue(catalog["enabled"], catalog["reasons"])
        self.assertEqual(catalog["tasks_dir"], str((source_root / "tasks" / "test-automation").resolve()))
        self.assertEqual(catalog["tools_dir"], str((source_root / "tools" / "test-runner").resolve()))
        self.assertEqual([suite["id"] for suite in catalog["suites"]], ["sample"])

    def test_private_checkout_can_be_detected_as_sibling_by_markers(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = pathlib.Path(temp_dir)
            service_root = temp_root / "ServiceTool"
            sibling_root = temp_root / "FirmwareCheckout"
            service_root.mkdir()
            create_test_runner_fixture(sibling_root)

            with (
                patch.dict(app.os.environ, {app.TEST_RUNNER_SOURCE_ROOT_ENV: ""}),
                patch.object(app, "APP_ROOT", service_root),
                patch.object(app, "DATA_ROOT", temp_root / "data"),
                patch.object(app.subprocess, "check_output", return_value="v22.0.0\n"),
            ):
                catalog = app.detect_test_runner_environment()

        self.assertTrue(catalog["enabled"], catalog["reasons"])
        self.assertEqual(catalog["tasks_dir"], str((sibling_root / "tasks" / "test-automation").resolve()))
        self.assertEqual(catalog["tools_dir"], str((sibling_root / "tools" / "test-runner").resolve()))


if __name__ == "__main__":
    unittest.main()
