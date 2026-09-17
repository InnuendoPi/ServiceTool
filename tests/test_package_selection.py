import unittest
from unittest.mock import patch
from urllib.error import HTTPError
import app


class PackageSelectionTests(unittest.TestCase):
    def test_generation_boundary(self):
        for version, root in (("1.65.5", "build"), ("1.66.0", "Updates"),
                              ("Brautomat32 V 1.67.2 Develop", "Updates"), ("", "Updates")):
            self.assertEqual(app.package_root_for_firmware(version), root)

    def test_display_and_pinned_download_use_same_directory(self):
        for source, kind, root, directory in (
                ("release", "Release", "build", "ESP32-IDF5"),
                ("development", "Development", "Updates", "ESP32-IDF5dev"),
                ("special", "Development", "Updates", "ESP32-IDF5dev"),
                ("special", "Release", "Updates", "ESP32-IDF5")):
            required = app.REQUIRED_PACKAGE_FILES + (["serviceapp.bin"] if root == "Updates" else [])
            def query(url, **kwargs):
                if url.endswith("version.json"):
                    return {"version":"1.67.2", "type":kind}
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
        with patch.object(app,"json_request",side_effect=[{"type":"Development"},
                [{"name":name,"type":"file"} for name in app.REQUIRED_PACKAGE_FILES]]):
            with self.assertRaisesRegex(ValueError,"serviceapp.bin"):
                app.package_location("development","","Updates")

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

    def test_wifi_update_checks_current_generation_manifest(self):
        for version, path in (("1.65.5", "/development/version.json"),
                              ("1.67.2", "/development/Updates/version.json")):
            with (self.subTest(version=version),
                  patch.object(app,"device_status",return_value={"firmware":version,"dev":True}),
                  patch.object(app,"json_request",return_value={"version":version,"type":"Development"}) as query):
                self.assertFalse(app.firmware_update_status("http://device")["available"])
                self.assertTrue(query.call_args.args[0].endswith(path))
