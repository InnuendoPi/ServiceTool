import unittest
from unittest.mock import patch
from urllib.error import HTTPError
import app


class PackageSelectionTests(unittest.TestCase):
    def test_migration_catalog_uses_target_generation_for_legacy_device(self):
        def query(url, **kwargs):
            if url.endswith("version.json"):
                return {"version": "1.70.0", "type": "Development"}
            return [{"name": name, "type": "file"}
                    for name in app.REQUIRED_PACKAGE_FILES + ["serviceapp.bin"]]
        with patch.object(app, "json_request", side_effect=query):
            catalog = app.package_catalog("1.66.0", purpose="migration")
        self.assertEqual(catalog["package_root"], "Updates")
        selected = next(p for p in catalog["packages"] if p["key"] == "development_170")
        self.assertTrue(selected["available"])
        self.assertEqual(selected["path"],
                         "https://raw.githubusercontent.com/InnuendoPi/Brautomat32/development/Updates/ESP32-IDF5dev")
        self.assertTrue(all(not p["available"] for p in catalog["packages"]
                            if p["key"] in ("release", "development")))

    def test_generation_boundary(self):
        for version, root in (("1.65.5", "build"), ("1.66.0", "build"), ("1.66.99", "build"), ("1.67.0", "Updates"),
                              ("Brautomat32 V 1.67.2 Develop", "Updates"), ("", "Updates")):
            self.assertEqual(app.package_root_for_firmware(version), root)

    def test_display_and_pinned_download_use_same_directory(self):
        for source, kind, root, directory in (
                ("release", "Release", "build", "ESP32-IDF5"),
                ("development_170", "Development", "Updates", "ESP32-IDF5dev"),
                ("special", "Development", "Updates", "ESP32-IDF5dev"),
                ("special", "Release", "Updates", "ESP32-IDF5")):
            required = app.REQUIRED_PACKAGE_FILES + (["serviceapp.bin"] if root == "Updates" else [])
            def query(url, **kwargs):
                if url.endswith("version.json"):
                    return {"version":"1.66.0" if root == "build" else "1.67.2", "type":kind}
                return [{"name":name,"type":"file"} for name in required]
            with self.subTest(source=source, kind=kind), patch.object(app, "json_request", side_effect=query):
                displayed = app.package_location(source, "tag", root)
                pinned = app.package_location(source, "tag", root, "a"*40)
                self.assertTrue(displayed["base_url"].endswith(f"/{root}/{directory}"))
                self.assertTrue(pinned["base_url"].endswith(f"/{root}/{directory}"))
                self.assertIn("/"+"a"*40+"/", pinned["base_url"])

    def test_missing_modern_release_does_not_fall_back(self):
        urls=[]
        def query(url, **kwargs):
            urls.append(url)
            raise HTTPError(url,404,"missing",{},None)
        with patch.object(app,"json_request",side_effect=query):
            catalog=app.package_catalog("1.67.2")
        self.assertTrue(all(not p["available"] and not p["path"] for p in catalog["packages"]))
        self.assertTrue(all("/Updates/" in url for url in urls))

    def test_modern_package_requires_serviceapp(self):
        with patch.object(app,"json_request",side_effect=[{"version":"1.67.2", "type":"Development"},
                [{"name":name,"type":"file"} for name in app.REQUIRED_PACKAGE_FILES]]):
            with self.assertRaisesRegex(ValueError,"serviceapp.bin"):
                app.package_location("development_170","","Updates")

    def test_missing_special_version_does_not_hide_other_commits(self):
        def query(url, **kwargs):
            return [{"tag_name":"missing"}] if "/releases?" in url else [
                {"sha":"a"*40,"commit":{"message":"V 1.67.2"}},
                {"sha":"b"*40,"commit":{"message":"V 1.67.1"}}]
        def location(source,ref,root):
            if ref=="missing": raise ValueError("missing")
            return {"version":"1.67.0","type":"Development","base_url":ref+"/Updates/ESP32-IDF5dev"}
        with patch.object(app,"json_request",side_effect=query), patch.object(app,"package_location",side_effect=location):
            rows=app.list_special_versions("Updates")
        self.assertEqual(len(rows),2)
        self.assertIn("1.67.2",rows[0]["label"])

    def test_wrong_generation_manifest_is_rejected_before_package_lookup(self):
        for root, version in (("build", "1.70.0"), ("Updates", "1.66.99"),
                              ("build", ""), ("Updates", "invalid")):
            with (self.subTest(root=root, version=version),
                  patch.object(app, "json_request", return_value={"version": version}) as query):
                with self.assertRaises(ValueError):
                    app.package_location("development_170" if root == "Updates" else "development", "", root)
                self.assertEqual(query.call_count, 1)

    def test_webupdate_generation_decision_is_enforced_before_device_writes(self):
        for current, target, decision in (
                ("1.66.0", "1.70.0", "migration_required"),
                ("1.67.2", "1.66.99", "invalid_package"),
                ("1.65.5", "1.66.0", "same_generation"),
                ("1.67.2", "1.70.0", "same_generation"),
                ("1.66.0", "1.66.0", "no_newer")):
            with (self.subTest(current=current, target=target),
                  patch.object(app, "device_status", return_value={
                      "firmware": current, "dev": True, "active_process": {"state": "idle"}}),
                  patch.object(app, "remote_repo_version_manifest", return_value={"version": target}),
                  patch.object(app, "post_empty") as backup,
                  patch.object(app, "post_disruptive_empty") as start):
                status = app.firmware_update_status("http://device")
                self.assertEqual(status["decision"], decision)
                self.assertEqual(status["available"], decision == "same_generation")
                if not status["available"]:
                    with self.assertRaises(RuntimeError):
                        app.firmware_webupdate_job(app.Job("update", "update", "Update"), "http://device", True)
                    backup.assert_not_called()
                    start.assert_not_called()

    def test_missing_process_state_does_not_authorize_update(self):
        with (patch.object(app, "device_status", return_value={"firmware": "1.65.5"}),
              patch.object(app, "remote_repo_version_manifest", return_value={"version": "1.66.0"}),
              patch.object(app, "post_empty") as backup):
            with self.assertRaisesRegex(RuntimeError, "state is unknown"):
                app.firmware_webupdate_job(app.Job("update", "update", "Update"), "http://device", True)
            backup.assert_not_called()

    def test_wifi_update_checks_current_generation_manifest(self):
        for version, path in (("1.65.5", "/development/version.json"),
                              ("1.66.99", "/development/version.json"),
                              ("1.67.2", "/development/Updates/version.json")):
            with (self.subTest(version=version),
                  patch.object(app,"device_status",return_value={"firmware":version,"dev":True}),
                  patch.object(app,"json_request",return_value={"version":version,"type":"Development"}) as query):
                self.assertFalse(app.firmware_update_status("http://device")["available"])
                self.assertTrue(query.call_args.args[0].endswith(path))


class BranchRoutingTests(unittest.TestCase):
    def test_generation_specific_branches(self):
        self.assertEqual(app.package_branch("development", "build"), "development")
        self.assertEqual(app.package_branch("release", "build"), "main")
        self.assertEqual(app.package_branch("development_170", "Updates"), "development")
        with self.assertRaisesRegex(ValueError, "legacy layout"):
            app.package_branch("release", "Updates")

    def test_modern_release_is_unavailable_without_network_access(self):
        with patch.object(app, "json_request") as query:
            with self.assertRaises(ValueError):
                app.package_location("release", "", "Updates")
            query.assert_not_called()

    def test_migration_checks_modern_development_manifest(self):
        with patch.object(app, "remote_repo_version_manifest", return_value={"version":"1.70.0"}) as query:
            self.assertEqual(app.migration_target_version("development_170", "", "")[0], "1.70.0")
            query.assert_called_once_with("development", "Updates")

    def test_explicit_channel_overrides_legacy_dev_boolean(self):
        with patch.object(app, "device_status", return_value={"firmware":"1.70.0", "dev":False, "updatechannel":2}), patch.object(app, "remote_repo_version_manifest", return_value={"version":"1.70.0"}) as query:
            self.assertFalse(app.firmware_update_status("http://device")["available"])
            query.assert_called_once_with("development", "Updates")
        with self.assertRaises(ValueError):
            app.package_branch("development", "Updates")
