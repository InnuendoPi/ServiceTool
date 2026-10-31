import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch

import app


class AppearanceTests(unittest.TestCase):
    def test_central_config_roundtrip_and_defaults(self):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / "config.json"
            with patch.object(app, "CONFIG_FILE", path):
                config = app.load_app_config()
                self.assertEqual(config["appearance"], "light")
                config["device_url"] = "http://test-device"
                for choice in ("dark", "system", "light"):
                    config["appearance"] = choice
                    app.save_app_config(config)
                    loaded = app.load_app_config()
                    self.assertEqual(loaded["appearance"], choice)
                    self.assertEqual(loaded["device_url"], "http://test-device")
                    self.assertEqual(json.loads(path.read_text())["appearance"], choice)
                for invalid in ("unknown", None, [], {}):
                    config["appearance"] = invalid
                    self.assertEqual(app.save_app_config(config)["appearance"], "light")
                raw = json.loads(path.read_text())
                raw["appearance"] = "unknown"
                path.write_text(json.dumps(raw), encoding="utf-8")
                self.assertEqual(app.load_app_config()["appearance"], "light")


if __name__ == "__main__":
    unittest.main()
