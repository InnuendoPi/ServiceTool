import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

import app


class RunnerReportTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name).resolve()
        self.session = app.TestRunnerSession()
        for name, value in (("test_runner_reports_root", lambda: self.root),
                            ("STATE", SimpleNamespace(test_runner=self.session))):
            stub = patch.object(app, name, value)
            stub.start()
            self.addCleanup(stub.stop)
        self.run_dir = self.root / "complete-suite" / "20260918-120000"
        self.run_dir.mkdir(parents=True)
        self.report = self.run_dir / "report.json"
        self.report.write_text(json.dumps({"status": "PASS", "counts": {"pass": 74, "fail": 0},
                                           "summary": "All passed", "items": []}), encoding="utf-8")
        (self.run_dir / "report.html").write_text("<h1>Report</h1>", encoding="utf-8")
        (self.run_dir / "service-tool-run.log").write_text("Finished suite", encoding="utf-8")

    def test_new_session_recovers_report_counts_and_logs(self):
        snapshot = app.test_runner_status()
        self.assertEqual(snapshot["counts"]["pass"], 74)
        self.assertEqual(snapshot["status"], "PASS")
        self.assertFalse(snapshot["running"])
        self.assertEqual(snapshot["lines"], ["Finished suite"])
        self.assertEqual(snapshot["out_dir"], str(self.run_dir))
        self.assertTrue(snapshot["report_url"].endswith("/complete-suite/20260918-120000/report.html"))
        self.assertIn("All passed", snapshot["result_summary"])

    def test_completed_in_memory_state_is_not_replaced(self):
        self.session.status = "failed"
        self.session.report_path = str(self.report)
        self.session.suite_label = "Current run"
        self.session.counts = {"fail": 1}
        snapshot = app.test_runner_status()
        self.assertEqual(snapshot["suite_label"], "Current run")
        self.assertEqual(snapshot["status"], "failed")
        self.assertEqual(snapshot["counts"], {"fail": 1})
        self.assertIn("report_url", snapshot)

    def test_json_report_available_without_html(self):
        (self.run_dir / "report.html").unlink()
        self.assertTrue(app.test_runner_status()["report_url"].endswith("report.json"))

    def test_missing_reports_do_not_offer_broken_link(self):
        self.report.unlink()
        self.assertNotIn("report_url", app.test_runner_status())

    def test_report_path_stays_in_report_directory(self):
        self.assertEqual(app.test_runner_report_file("complete-suite/20260918-120000/report.html"), self.run_dir / "report.html")
        with self.assertRaises(FileNotFoundError):
            app.test_runner_report_file("../outside.txt")
        with self.assertRaises(FileNotFoundError):
            app.test_runner_report_file(str(Path(app.__file__).resolve()))

    def test_invalid_report_does_not_break_status(self):
        self.report.write_text("[]", encoding="utf-8")
        self.assertEqual(app.test_runner_status()["status"], "idle")
