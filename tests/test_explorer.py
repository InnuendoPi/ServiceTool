import base64
import hashlib
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
                fs.action({"side": "local", "path": "/plan.json", "action": "transfer", "target": "/Rezepte/plan.json", "overwrite": True})
                write.assert_called_once_with("/Rezepte/plan.json", b"{}")
            result = app.remove_explorer_folder(selected["token"])
            self.assertEqual(result["folders"], [])
            self.assertEqual(app.load_app_config()["explorer_folders"], [])
            self.assertTrue((Path(other) / "plan.json").is_file())
            with self.assertRaises(ValueError):
                app.file_explorer("http://device", selected["token"])


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
