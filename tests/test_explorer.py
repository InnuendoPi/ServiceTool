import base64
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch
from explorer import FileExplorer, clean_path
import app


class ExplorerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.config_patch = patch.object(app, "CONFIG_FILE", self.root / "settings.json")
        self.config_patch.start()
        self.addCleanup(self.config_patch.stop)
        self.read = Mock(return_value=b"log\r\n")
        self.write, self.delete, self.put, self.rename = Mock(), Mock(), Mock(), Mock()
        self.listing = Mock(return_value=[{"type": "file", "name": "/webUpdateLog.txt", "size": 5},
                                          {"type": "file", "name": "config.txt", "size": 2},
                                          {"type": "dir", "name": "Rezepte"}])
        self.fs = FileExplorer(self.root, listing=self.listing, read=self.read,
                              write=self.write, delete=self.delete, put=self.put, rename=self.rename)

    def test_inventory_transfer_requires_choice_and_keeps_versions(self):
        target = self.root / "config.txt"
        target.write_bytes(b"old")
        request = {"side": "device", "action": "transfer", "path": "/config.txt",
                   "target": "/config.txt", "overwrite": True}
        result = self.fs.action(request)
        self.assertTrue(result["conflict"])
        self.assertFalse(result["done"])
        self.assertEqual(target.read_bytes(), b"old")
        self.read.assert_not_called()
        self.fs.action(dict(request, conflict="version"))
        self.assertEqual(target.read_bytes(), b"log\r\n")
        self.assertEqual((self.root / "config_1.txt").read_bytes(), b"old")
        self.read.return_value = b"newer"
        self.fs.action(dict(request, conflict="version"))
        self.assertEqual((self.root / "config_2.txt").read_bytes(), b"log\r\n")
        self.read.return_value = b"updated"
        self.fs.action(dict(request, conflict="replace"))
        self.assertEqual(target.read_bytes(), b"updated")
        self.assertFalse((self.root / "config_3.txt").exists())
        self.fs.action(dict(request, target="/new.txt"))
        self.assertEqual((self.root / "new.txt").read_bytes(), b"updated")

    def test_device_rejects_custom_directories_and_nested_uploads(self):
        for path in ("/Brautomat32", "/Rezepte/Brautomat32", "/Rezepte/Testdevice"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                self.fs.action({"side": "device", "action": "mkdir", "path": path})
        for path in ("/worker1/Rezepte/Plan.json", "/Rezepte/Testdevice/Plan.json", "/Other/Plan.json"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                self.fs.action({"side": "device", "action": "upload", "path": path,
                                "content": "e30=", "overwrite": True})
        (self.root / "Plan.json").write_text("{}")
        with self.assertRaises(ValueError):
            self.fs.action({"side": "local", "action": "transfer", "path": "/Plan.json",
                            "target": "/Rezepte/Testdevice/Plan.json", "overwrite": True})
        with self.assertRaises(ValueError):
            self.fs.action({"side": "device", "action": "rename", "path": "/Rezepte", "name": "Other"})
        self.put.assert_not_called()
        self.write.assert_not_called()
        self.rename.assert_not_called()

    def test_recipe_version_transfer_binds_path_without_changing_inventory(self):
        import json
        original = {"misc": [{"File": "/Rezepte/Alt.json", "Sudname": "Märzen"}],
                    "mash": [{"Rast": "Rast", "Temperatur": 65, "Dauer": 40}]}
        content = json.dumps(original, ensure_ascii=False).encode("utf-8")
        source = self.root / "Maerzen_1.json"
        source.write_bytes(content)
        self.fs.action({"side": "local", "action": "transfer", "path": "/Maerzen_1.json",
                        "target": "/Rezepte/Maerzen_1.json", "overwrite": True})
        path, uploaded = self.write.call_args.args
        self.assertEqual(path, "/Rezepte/Maerzen_1.json")
        result = json.loads(uploaded)
        self.assertEqual(result["misc"][0]["File"], path)
        self.assertEqual(result["misc"][0]["Sudname"], "Märzen")
        self.assertEqual(result["mash"], original["mash"])
        self.assertEqual(source.read_bytes(), content)
        # Uploads use the same target binding; a matching plan stays byte-identical.
        self.fs.action({"side": "device", "action": "upload", "path": path,
                        "content": base64.b64encode(uploaded).decode(), "overwrite": True})
        self.assertEqual(self.write.call_args.args[1], uploaded)
        for unrelated in (b'{"setting":true}', b'not JSON', b'{"mash":[],"misc":{}}'):
            self.write.reset_mock()
            with self.assertRaises(ValueError):
                self.fs.write("device", path, unrelated, overwrite=True)
            self.write.assert_not_called()

    def test_native_upload_formats_and_rejected_writes(self):
        formats = {
            "/Rezepte/Test.json": {"misc": [{"Sudname": "Test"}], "mash": [{"Rast": "Rast", "Temperatur": "65", "Dauer": "30"}]},
            "/Fermenter/Test.json": {"misc": [{"Fername": "Test"}], "ferm": [{"step": "Gärung", "startTemp": 18, "endTemp": 20, "duration": 1440}]},
            "/Profile/Test.json": {"profile": [{"pname": "Test", "enabled": 1}]},
            "/config.txt": {"misc": [{}], "actors": [], "sensors": [], "kettles": []},
            "/log_cfg.json": {"SYS": 3, "MAS": 0},
        }
        brewfather = {"name": "Original", "mash": {"steps": [{"name": "Rast", "stepTemp": 65, "stepTime": 30}]}}
        for path, value in formats.items():
            with self.subTest(path=path):
                content = json.dumps(value, ensure_ascii=False).encode("utf-8")
                self.fs.action({"side": "device", "action": "upload", "path": path,
                                "content": base64.b64encode(b"\xef\xbb\xbf" + content).decode(), "overwrite": True})
                actual = json.loads(self.write.call_args.args[1])
                if "mash" in value or "ferm" in value:
                    self.assertEqual(actual["misc"][0]["File"], path)
                else:
                    self.assertEqual(actual, value)
                for invalid in (b"not json", b"[]", b"{}", json.dumps(brewfather).encode()):
                    self.write.reset_mock()
                    with self.assertRaisesRegex(ValueError, "Datei wurde nicht übertragen"):
                        self.fs.action({"side": "device", "action": "upload", "path": path,
                                        "content": base64.b64encode(invalid).decode(), "overwrite": True})
                    self.write.assert_not_called()
        # Wrong native category, corrupt numeric fields and incomplete structures.
        for path, value in (("/Rezepte/Test.json", formats["/Profile/Test.json"]),
                            ("/Rezepte/config.txt", formats["/config.txt"]),
                            ("/Profile/Test.json", {"profile": [{"pname": "Test", "enabled": "bad"}]}),
                            ("/config.txt", {"misc": [{}], "actors": []}),
                            ("/Fermenter/Test.json", {"misc": [{"Fername": "Test"}], "ferm": [{"step": "Test", "startTemp": 18, "endTemp": 20}]})):
            with self.subTest(path=path), self.assertRaises(ValueError):
                self.fs.write("device", path, json.dumps(value).encode(), overwrite=True)
        self.write.assert_not_called()
        (self.root / "Rezepte").mkdir()
        target = self.root / "Rezepte" / "Test.json"
        target.write_bytes(b"unchanged")
        with self.assertRaisesRegex(ValueError, "Rezept Planer"):
            self.fs.action({"side": "local", "action": "upload", "path": "/Rezepte/Test.json",
                            "content": base64.b64encode(json.dumps(brewfather).encode()).decode(), "overwrite": True})
        self.assertEqual(target.read_bytes(), b"unchanged")
        with self.assertRaises(ValueError):
            self.fs.action({"side": "device", "view": "config", "action": "upload", "path": "/original.json",
                            "content": base64.b64encode(json.dumps(brewfather).encode()).decode(), "overwrite": True})
        self.write.assert_not_called()

    def test_device_default_directories_cannot_be_deleted(self):
        self.listing.return_value = []
        for path in ("/Fermenter", "/language", "/Profile", "/Rezepte"):
            with self.subTest(path=path), self.assertRaisesRegex(ValueError, "Standardordner"):
                self.fs.action({"side": "device", "action": "delete", "path": path})
        self.delete.assert_not_called()
        self.listing.assert_not_called()

    def test_device_allows_files_in_standard_directories(self):
        for folder in ("", "/language"):
            path = folder + "/Plan.json"
            self.fs.action({"side": "device", "action": "upload", "path": path,
                            "content": "e30=", "overwrite": True})
            self.write.assert_called_with(path, b"{}")

    def test_plan_navigation_filters_config_and_preserves_folders(self):
        for directory in ("worker1/Rezepte", "Rezepte/worker1"):
            folder = self.root / directory
            folder.mkdir(parents=True)
            (folder / "Plan.json").write_text('{"mash":[],"misc":[]}', encoding="utf-8")
            (folder / "config.json").write_text('{"actors":[]}', encoding="utf-8")
            rows = self.fs.list("local", "/" + directory, "mashplans")["files"]
            self.assertEqual([row["name"] for row in rows], ["Plan.json"])
            self.assertEqual(rows[0]["kind"], "mashplan")
        self.assertEqual({row["name"] for row in self.fs.list("local", "/", "mashplans")["files"]}, {"worker1", "Rezepte"})

    def test_open_folder_keeps_inventory_and_limits_paths(self):
        with tempfile.TemporaryDirectory() as other, patch.dict(app.EXPLORER_LOCAL_FOLDERS, {}, clear=True), patch.object(app, "inventory_root_dir", return_value=self.root), patch.object(app, "pick_directory", return_value=other):
            selected = app.pick_explorer_folder()
            repeated = app.pick_explorer_folder()
            self.assertEqual(repeated["token"], selected["token"])
            self.assertEqual(len(app.load_app_config()["explorer_folders"]), 1)
            app.EXPLORER_LOCAL_FOLDERS.clear()
            fs = app.file_explorer("http://device", selected["token"])
            self.assertEqual(fs.root, Path(other).resolve())
            self.assertEqual(app.file_explorer("http://device").root, self.root.resolve())
            self.assertIsNone(fs.local_delete)
            self.assertIsNone(fs.local_rename)
            with self.assertRaises(ValueError):
                fs.local("/../outside")
            with self.assertRaises(ValueError):
                app.file_explorer("http://device", "unknown")
            (Path(other) / "plan.json").write_text('{}', encoding="utf-8")
            with patch.object(fs, "device_write") as write:
                with self.assertRaises(ValueError):
                    fs.action({"side": "local", "path": "/plan.json", "action": "transfer", "target": "/Rezepte/plan.json", "overwrite": True})
                write.assert_not_called()
            result = app.remove_explorer_folder(selected["token"])
            self.assertEqual(result["folders"], [])
            self.assertEqual(app.load_app_config()["explorer_folders"], [])
            self.assertTrue((Path(other) / "plan.json").is_file())
            with self.assertRaises(ValueError):
                app.file_explorer("http://device", selected["token"])


    def test_local_inventory_api_without_device_url(self):
        (self.root / "Rezepte").mkdir()
        (self.root / "Rezepte" / "Plan.json").write_text('{"mash": []}', encoding="utf-8")
        with patch.object(app, "inventory_root_dir", return_value=self.root), patch.object(app, "json_request") as network:
            handler = Mock()
            handler.path = "/api/explorer/list?side=local&path=/Rezepte"
            app.AppHandler._route_api_get(handler, "/api/explorer/list")
            self.assertEqual(handler._send_json.call_args.args[0]["files"][0]["name"], "Plan.json")
            handler.path = "/api/explorer/preview?side=local&path=/Rezepte/Plan.json"
            app.AppHandler._route_api_get(handler, "/api/explorer/preview")
            self.assertEqual(handler._send_json.call_args.args[0]["text"], '{"mash": []}')
            network.assert_not_called()

    def test_explorer_api_errors_are_json_responses(self):
        with patch.object(app, "inventory_root_dir", return_value=self.root), patch.object(app, "json_request") as network:
            handler = Mock()
            handler.path = "/api/explorer/list?side=device&path=/"
            app.AppHandler._route_api_get(handler, "/api/explorer/list")
            handler._send_json.assert_called_with({"error": "Device URL missing"}, status=400)
            handler.path = "/api/explorer/preview?side=local&path=/missing.json"
            app.AppHandler._route_api_get(handler, "/api/explorer/preview")
            self.assertEqual(handler._send_json.call_args.kwargs["status"], 404)
            network.assert_not_called()

    def test_cancel_folder_picker(self):
        with patch.object(app, "pick_directory", return_value=""):
            self.assertEqual(app.pick_explorer_folder(), {})

    def test_device_filters_do_not_mix_logs_and_config(self):
        self.assertEqual([r["name"] for r in self.fs.list("device", "/", "logs")["files"]], ["webUpdateLog.txt"])
        self.assertEqual([r["name"] for r in self.fs.list("device", "/", "config")["files"]], ["config.txt"])
        self.assertEqual(self.fs.list("device", "/")["files"][0]["type"], "dir")

    def test_local_config_view_keeps_versioned_files(self):
        (self.root / "config").mkdir()
        for name in ("config.txt", "config_1.txt", "log_cfg_2.json", "binary.bin"):
            (self.root / "config" / name).write_bytes(b"{}")
        names = [row["name"] for row in self.fs.list("local", "/config", "config")["files"]]
        self.assertEqual(names, ["config.txt", "config_1.txt", "log_cfg_2.json"])

    def test_local_config_view_keeps_device_subdirectories(self):
        folder = self.root / "config" / "TestDevice"
        folder.mkdir(parents=True)
        (folder / "config.txt").write_bytes(b"{}")
        (folder / "config_1.txt").write_bytes(b"{}")
        (folder / "binary.bin").write_bytes(b"data")
        rows = self.fs.list("local", "/config", "config")["files"]
        self.assertEqual([(row["name"], row["type"], row["path"]) for row in rows],
                         [("TestDevice", "dir", "/config/TestDevice")])
        files = self.fs.list("local", rows[0]["path"], "config")["files"]
        self.assertEqual([row["name"] for row in files], ["config.txt", "config_1.txt"])
        self.listing.assert_not_called()

    def test_nested_device_listing_ignores_other_directories(self):
        self.listing.return_value = [{"type": "file", "name": "/Rezepte/a.json"},
                                    {"type": "file", "name": "b.json"},
                                    {"type": "file", "name": "/config.txt"},
                                    {"type": "file", "name": "../bad"}]
        self.assertEqual([r["name"] for r in self.fs.list("device", "/Rezepte")["files"]], ["a.json", "b.json"])

    def test_local_navigation_and_preview(self):
        (self.root / "Rezepte").mkdir()
        (self.root / "Rezepte" / "plan.json").write_text('{"name":"test"}', encoding="utf-8")
        self.assertEqual(self.fs.list("local", "/")["files"][0]["path"], "/Rezepte")
        result = self.fs.preview("local", "/Rezepte/plan.json")
        self.assertTrue(result["editable"])
        self.assertEqual(result["text"], '{"name":"test"}')
        self.read.assert_not_called()

    def test_paths_rejected(self):
        for path in ("/../outside", "/a/../../b", "C:/file", "a\\b", "/a:stream", "/NUL.txt", "/.inventory-info.json", "/a//b"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                clean_path(path)

    def test_symlink_escape_rejected(self):
        with tempfile.TemporaryDirectory() as outside:
            try:
                (self.root / "link").symlink_to(outside, target_is_directory=True)
            except OSError:
                self.skipTest("Symlink creation unavailable")
            with self.assertRaises(ValueError):
                self.fs.local("/link/data.txt")

    def test_edit_preserves_crlf_and_checks_json(self):
        path = self.root / "config.txt"
        original = b'{\r\n  "value": 1\r\n}\r\n'
        path.write_bytes(original)
        self.fs.action({"side":"local", "path":"/config.txt", "action":"save", "sha256":hashlib.sha256(original).hexdigest(), "text":'{\n  "value": 2\n}\n'})
        self.assertEqual(path.read_bytes(), original.replace(b'1', b'2'))
        with self.assertRaises(ValueError):
            self.fs.action({"side":"local", "path":"/config.txt", "action":"save", "sha256":hashlib.sha256(path.read_bytes()).hexdigest(), "text":"invalid json"})
        self.assertIn(b'2', path.read_bytes())

    def test_concurrent_change_prevents_save(self):
        (self.root / "a.txt").write_bytes(b"new")
        with self.assertRaisesRegex(ValueError, "changed"):
            self.fs.action({"side":"local", "path":"/a.txt", "action":"save", "sha256":hashlib.sha256(b"old").hexdigest(), "text":"overwrite"})
        self.assertEqual((self.root / "a.txt").read_bytes(), b"new")

    def test_binary_is_not_editable(self):
        self.read.return_value = b"\x00\xffbinary"
        result = self.fs.preview("device", "/firmware.bin")
        self.assertFalse(result["editable"])
        self.assertIsNone(result["text"])

    def test_create_rename_transfer_and_delete_local(self):
        self.fs.action({"side":"local", "path":"/plans", "action":"mkdir"})
        self.fs.action({"side":"local", "path":"/plans/a.json", "action":"new-file"})
        self.fs.action({"side":"local", "path":"/plans/a.json", "action":"rename", "name":"b.json"})
        self.fs.action({"side":"local", "path":"/plans/b.json", "action":"transfer", "target":"/new.json"})
        self.write.assert_called_once_with("/new.json", b"{}\n")
        self.fs.action({"side":"local", "path":"/plans/b.json", "action":"delete"})
        self.fs.action({"side":"local", "path":"/plans", "action":"delete"})
        self.assertFalse((self.root / "plans").exists())

    def test_upload_requires_overwrite_and_deletion_keeps_nonempty_folder(self):
        (self.root / "a.txt").write_bytes(b"original")
        data = {"side":"local", "path":"/a.txt", "action":"upload", "content":base64.b64encode(b"new").decode()}
        with self.assertRaises(FileExistsError):
            self.fs.action(data)
        self.fs.action({**data, "overwrite":True})
        self.assertEqual((self.root / "a.txt").read_bytes(), b"new")
        (self.root / "folder").mkdir()
        (self.root / "folder" / "keep.txt").write_text("keep")
        with self.assertRaises(ValueError):
            self.fs.action({"side":"local", "path":"/folder", "action":"delete"})

    def test_device_rename_uses_existing_plan_contract(self):
        with patch.object(app, "rename_device_inventory") as rename:
            fs = app.file_explorer("http://device")
            fs.device_rename("/Rezepte/old.json", "/Rezepte/new.json", False)
            rename.assert_called_once_with("http://device", "mashplans", "old.json", "new.json", False)

    def test_local_rename_preserves_inventory_notes(self):
        (self.root / "Rezepte").mkdir()
        (self.root / "Rezepte" / "old.json").write_text("{}")
        (self.root / "Rezepte" / ".inventory-info.json").write_text('{"old.json":"note"}')
        with patch.object(app, "inventory_root_dir", return_value=self.root):
            app.file_explorer("http://device").action({"side":"local", "path":"/Rezepte/old.json", "action":"rename", "name":"new.json"})
        self.assertIn('new.json', (self.root / "Rezepte" / ".inventory-info.json").read_text())
