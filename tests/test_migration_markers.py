import unittest
from unittest.mock import Mock, MagicMock, patch, call
from contextlib import ExitStack
from urllib.error import HTTPError

import app


class MigrationMarkerTests(unittest.TestCase):
    def test_resume_cleanup_only_before_first_flash(self):
        for phase, writing, expected in (("backup-verified", False, True),
                                         ("writing", True, False),
                                         ("booting", True, False)):
            with self.subTest(phase=phase), ExitStack() as stack:
                session = MagicMock(spec=app.migration_engine.ApiSession)
                session.report = {"phase": phase, "write_started": writing, "base_url": "http://test"}
                stack.enter_context(patch.object(app.migration_engine.Session, "load", return_value=session))
                stack.enter_context(patch.object(app, "migration_require_idle"))
                cleanup = stack.enter_context(patch.object(app, "clear_migration_webupdate_markers", return_value=[]))
                stack.enter_context(patch.object(app, "ensure_esptool_available", return_value="test-tool"))
                stack.enter_context(patch.object(app, "prepare_esptool_serial_handover", return_value={}))
                stack.enter_context(patch.object(app, "finish_migration", return_value={"ok": True}))
                device = stack.enter_context(patch.object(app.migration_engine, "Esptool"))
                app.migration_recovery_job(Mock(), "test", "COM-test", 115200, "resume")
                self.assertEqual(cleanup.call_count, int(expected))
                device.return_value.boot.assert_called_once()

    def test_only_known_markers_removed_and_logged(self):
        markers = list(app.MIGRATION_WEBUPDATE_MARKERS)
        untouched = ["/dev.txt", "/webUpdateLog.txt", "/config.txt",
                     "/testflow_webupdate_source.txt", "/Rezepte/Test.json"]
        rows = lambda names: [{"name": name, "type": "file"} for name in names]
        job = Mock()
        with patch.object(app, "json_request", side_effect=[rows(markers + untouched), rows(untouched)]), \
                patch.object(app, "delete_fs_path") as delete:
            self.assertEqual(app.clear_migration_webupdate_markers(job, "http://test"), markers)
            self.assertEqual(delete.call_args_list, [call("http://test", name) for name in markers])
        for name in markers:
            job.log.assert_any_call(f"Migration: stale WebUpdate marker found: {name}")
            job.log.assert_any_call(f"Migration: WebUpdate marker removal verified: {name}")

    def test_no_markers_no_delete(self):
        with patch.object(app, "json_request", return_value=[]), patch.object(app, "delete_fs_path") as delete:
            self.assertEqual(app.clear_migration_webupdate_markers(Mock(), "http://test"), [])
            delete.assert_not_called()

    def test_relative_names_and_failed_verification(self):
        rows = [{"name": "updateSys.txt", "type": "file"}]
        with patch.object(app, "json_request", return_value=rows), patch.object(app, "delete_fs_path") as delete:
            with self.assertRaisesRegex(RuntimeError, "cleanup failed"):
                app.clear_migration_webupdate_markers(Mock(), "http://test")
            delete.assert_called_once_with("http://test", "/updateSys.txt")

    def test_new_marker_during_cleanup_blocks_flash(self):
        with patch.object(app, "json_request", side_effect=[[], [{"name": "/updateService.txt", "type": "file"}]]):
            with self.assertRaisesRegex(RuntimeError, "cleanup failed"):
                app.clear_migration_webupdate_markers(Mock(), "http://test")

    def test_listing_and_delete_errors_are_not_ignored(self):
        for response in ({}, [None], [{"type": "file"}], [{"name": "updateSys.txt", "type": "unknown"}]):
            with self.subTest(response=response), patch.object(app, "json_request", return_value=response), \
                    patch.object(app, "delete_fs_path") as delete:
                with self.assertRaisesRegex(RuntimeError, "invalid device file list"):
                    app.clear_migration_webupdate_markers(Mock(), "http://test")
                delete.assert_not_called()
        for code in (404, 500):
            with self.subTest(code=code), patch.object(app, "json_request", return_value=[
                    {"name": "/updateSys.txt", "type": "file"}]), \
                    patch.object(app, "delete_fs_path", side_effect=HTTPError("http://test/edit", code, "test", {}, None)):
                with self.assertRaises(HTTPError):
                    app.clear_migration_webupdate_markers(Mock(), "http://test")


if __name__ == "__main__":
    unittest.main()
