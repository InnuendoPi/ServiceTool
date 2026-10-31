import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import app
import config_store as store
from designer import DesignerStore


class CentralConfigTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.path = self.root / "config.json"
        self.legacy = self.root / "designer" / "settings.json"
        self.designer = DesignerStore(self.legacy.parent, self.path)
        patcher = patch.object(app, "CONFIG_FILE", self.path)
        patcher.start()
        self.addCleanup(patcher.stop)

    def legacy_settings(self, value):
        self.legacy.parent.mkdir(parents=True, exist_ok=True)
        self.legacy.write_text(json.dumps(value), encoding="utf-8")

    def test_optional_settings_and_defaults(self):
        for legacy in (None, {}, {"import_options": {"boil_temp": 98}}):
            with self.subTest(legacy=legacy):
                self.path.unlink(missing_ok=True)
                if legacy is not None:
                    self.legacy_settings(legacy)
                settings = self.designer.settings()
                self.assertEqual(settings["import_options"], dict(store.IMPORT_DEFAULTS,
                    boil_temp=98 if legacy else 100))
                self.assertFalse(settings["key_saved"])
                self.assertFalse(self.legacy.exists())

    def test_migration_preserves_central_values_and_external_database(self):
        database = self.root / "external.sqlite"
        database.write_bytes(b"External data must remain untouched")
        self.path.write_text(json.dumps({"device_url": "http://device", "recipe_sources": {
            "brewfather_user": "current", "import_options": {"boil_temp": 99}}}), encoding="utf-8")
        self.legacy_settings({"brewfather_user": "old", "brewfather_key": "secret-bf",
                              "kbh_path": str(database), "import_options": {"boil_temp": 98, "mash_out_temp": 77}})
        config = app.load_app_config()
        sources = config["recipe_sources"]
        self.assertEqual(sources["brewfather_user"], "current")
        self.assertEqual(sources["brewfather_key"], "secret-bf")
        self.assertEqual(sources["import_options"], dict(store.IMPORT_DEFAULTS, boil_temp=99, mash_out_temp=77))
        self.assertEqual(config["device_url"], "http://device")
        self.assertFalse(self.legacy.exists())
        self.assertNotIn("secret-bf", self.path.read_text())
        self.assertEqual(database.read_bytes(), b"External data must remain untouched")

    def test_startup_imports_legacy_over_preexisting_empty_defaults(self):
        # Reproduce the failed startup: central defaults exist before migration.
        store.write_config(self.path, app.default_config())
        self.legacy_settings({"brewfather_user": "original-user",
                              "brewfather_key": "original-key", "kbh_path": "C:/original.sqlite",
                              "import_options": {"boil_temp": 98, "first_wort_temp": 74}})
        loaded = app.load_app_config()
        self.assertEqual(loaded["recipe_sources"]["brewfather_key"], "original-key")
        shown = self.designer.settings()
        self.assertEqual(shown["brewfather_user"], "original-user")
        self.assertEqual(shown["kbh_path"], "C:/original.sqlite")
        self.assertTrue(shown["key_saved"])
        self.assertEqual(shown["import_options"]["boil_temp"], 98)
        self.assertEqual(shown["import_options"]["first_wort_temp"], 74)
        self.assertNotIn("_legacy_settings_imported", shown)
        self.assertNotIn("original-key", self.path.read_text())
        self.assertFalse(self.legacy.exists())
        self.assertEqual(app.load_app_config()["recipe_sources"], loaded["recipe_sources"])

    def test_snapshot_does_not_read_or_migrate_settings(self):
        self.legacy_settings({"brewfather_key": "must-stay-in-source"})
        original = self.legacy.read_bytes()
        with patch("designer.load_config", side_effect=AssertionError("Unexpected settings access")):
            self.designer.handle("snapshot-save", {"profile": "test", "config": {}})
            self.designer.handle("snapshot-load", {"profile": "test"})
        self.assertEqual(self.legacy.read_bytes(), original)
        self.assertFalse(self.path.exists())

    def test_all_stored_credentials_roundtrip_without_plaintext(self):
        config = app.default_config()
        for index, parts in enumerate(store.SECRET_PATHS):
            store._parent(config, parts)[parts[-1]] = f"test-secret-{index}"
        original = copy.deepcopy(config)
        store.write_config(self.path, config)
        self.assertEqual(config, original)
        self.assertNotIn("test-secret-", self.path.read_text())
        self.assertEqual(store.load_config(self.path), config)
        first = json.loads(self.path.read_text())["secrets"]
        store.write_config(self.path, config)
        self.assertNotEqual(first, json.loads(self.path.read_text())["secrets"])

    def test_plaintext_telegraf_credentials_are_encrypted_and_preserved(self):
        config = app.default_config()
        config["telegraf"]["save_passwords"] = True
        for target, field in (("influxdb", "token"), ("postgres", "password"),
                              ("mysql", "password"), ("mqtt", "password")):
            config["telegraf"][target][field] = "legacy-secret-" + target
        self.path.write_text(json.dumps(config), encoding="utf-8")
        loaded = app.load_app_config()
        self.assertEqual(loaded["telegraf"], config["telegraf"])
        self.assertNotIn("legacy-secret-", self.path.read_text())
        app.save_app_config(loaded)
        self.assertEqual(app.load_app_config()["telegraf"], config["telegraf"])
        self.assertNotIn("legacy-secret-", self.path.read_text())

    def test_encrypted_config_is_not_rewritten_on_read(self):
        config = app.default_config()
        config["telegraf"]["save_passwords"] = True
        config["telegraf"]["mqtt"]["password"] = "saved-secret"
        store.write_config(self.path, config)
        before = self.path.read_bytes()
        self.assertEqual(app.load_app_config(), config)
        self.assertEqual(self.path.read_bytes(), before)

    def test_settings_api_masks_key_and_general_saves_preserve_sources(self):
        cfg = app.load_app_config()
        response = self.designer.settings({"brewfather_key": "secret-bf", "kbh_path": "C:/kbh.sqlite"})
        self.assertTrue(response["key_saved"])
        self.assertNotIn("brewfather_key", response)
        cfg["language"] = "de"
        app.save_app_config(cfg)
        self.assertTrue(self.designer.settings({"brewfather_key": ""})["key_saved"])
        self.assertEqual(store.load_config(self.path)["recipe_sources"]["brewfather_key"], "secret-bf")
        self.assertNotIn("secret-bf", json.dumps(app.public_app_config(app.load_app_config())))
        self.assertFalse(self.designer.settings({"clear_key": True})["key_saved"])
        self.assertFalse(self.designer.settings()["key_saved"])
        self.assertEqual(app.load_app_config()["language"], "de")

    def test_key_is_only_returned_for_explicit_reveal(self):
        self.designer.settings({"brewfather_key": "visible-on-request"})
        before = self.path.read_bytes()
        self.assertNotIn("brewfather_key", self.designer.handle("settings", {}))
        self.assertEqual(self.designer.handle("reveal-key", {}),
                         {"brewfather_key": "visible-on-request"})
        self.assertEqual(self.path.read_bytes(), before)
        self.designer.settings({"clear_key": True})
        self.assertEqual(self.designer.handle("reveal-key", {}), {"brewfather_key": ""})

    def test_save_passwords_option_still_clears_telegraf_secrets(self):
        cfg = app.load_app_config()
        cfg["telegraf"]["mqtt"]["password"] = "not-retained"
        cfg["telegraf"]["save_passwords"] = False
        app.save_app_config(cfg)
        self.assertEqual(app.load_app_config()["telegraf"]["mqtt"]["password"], "")

    def test_failed_write_or_verification_keeps_legacy(self):
        self.legacy_settings({"brewfather_key": "keep-me"})
        with patch.object(store, "write_config", side_effect=OSError("disk full")):
            with self.assertRaises(OSError):
                store.load_config(self.path)
        self.assertTrue(self.legacy.exists())
        with patch.object(store, "_read", side_effect=lambda path: {}):
            with self.assertRaisesRegex(ValueError, "verification failed"):
                store.load_config(self.path)
        self.assertTrue(self.legacy.exists())
        self.assertEqual(store.load_config(self.path)["recipe_sources"]["brewfather_key"], "keep-me")
        self.assertFalse(self.legacy.exists())

    def test_failed_legacy_delete_can_be_retried_without_overwrite(self):
        self.legacy_settings({"brewfather_key": "old-key"})
        original = Path.unlink
        def unlink(path, *args, **kwargs):
            if path == self.legacy:
                raise PermissionError("locked")
            return original(path, *args, **kwargs)
        with patch.object(Path, "unlink", unlink):
            with self.assertRaises(PermissionError):
                store.load_config(self.path)
        config = store._read(self.path)
        config["recipe_sources"]["brewfather_key"] = ""
        store.write_config(self.path, config)
        self.assertEqual(store.load_config(self.path)["recipe_sources"]["brewfather_key"], "")
        self.assertFalse(self.legacy.exists())

    def test_invalid_encryption_or_json_never_resets_files(self):
        store.load_config(self.path)
        encoded = json.loads(self.path.read_text())
        encoded["secrets"]["ciphertext"] = "AAAA"
        self.legacy_settings({"brewfather_key": "retained"})
        for content in (json.dumps(encoded), "{broken"):
            self.path.write_text(content, encoding="utf-8")
            with self.assertRaises(ValueError):
                app.load_app_config()
            self.assertEqual(self.path.read_text(), content)
            self.assertTrue(self.legacy.exists())


if __name__ == "__main__":
    unittest.main()
