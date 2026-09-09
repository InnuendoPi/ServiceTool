import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import app


class LatestEsptoolTests(unittest.TestCase):
    def test_latest_cache_beats_older_bundle(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            cached = root / "latest"
            bundled = root / "bundled"
            cached.touch()
            bundled.touch()
            release = {"tag_name": "v5.4.0", "assets": [{"name": app.esptool_platform_asset("5.4.0")[0]}]}
            with (patch.object(app, "json_request", return_value=release),
                  patch.object(app, "cached_esptool_path", return_value=cached),
                  patch.object(app, "bundled_esptool_path", return_value=bundled),
                  patch.object(app, "esptool_binary_version", return_value="5.4.0"),
                  patch.object(app, "download_to_file") as download):
                self.assertEqual(app.ensure_esptool_available(), cached)
                download.assert_not_called()

    def test_offline_uses_verified_bundle(self):
        with tempfile.TemporaryDirectory() as directory:
            bundled = Path(directory) / "esptool"
            bundled.touch()
            with (patch.object(app, "json_request", side_effect=OSError("offline")),
                  patch.object(app, "TOOLS_CACHE_DIR", Path(directory)),
                  patch.object(app, "bundled_esptool_path", return_value=bundled),
                  patch.object(app, "esptool_binary_version", return_value="5.3.1")):
                self.assertEqual(app.ensure_esptool_available(), bundled)

    def test_missing_asset_and_prerelease_are_rejected(self):
        for release in ({"tag_name": "v5.4.0", "assets": []},
                        {"tag_name": "v5.5.0", "prerelease": True}):
            with patch.object(app, "json_request", return_value=release):
                with self.assertRaises(RuntimeError):
                    app.ensure_esptool_available()

    def test_all_platforms_use_selected_release(self):
        for system, arch, suffix in [("Windows", "AMD64", "windows-amd64.zip"),
                ("Linux", "x86_64", "linux-amd64.tar.gz"),
                ("Linux", "aarch64", "linux-aarch64.tar.gz"),
                ("Linux", "armv7l", "linux-armv7.tar.gz"),
                ("Darwin", "arm64", "macos-arm64.tar.gz"),
                ("Darwin", "x86_64", "macos-amd64.tar.gz")]:
            with patch.object(app.platform, "system", return_value=system), patch.object(app.platform, "machine", return_value=arch):
                self.assertEqual(app.esptool_platform_asset("5.4.0")[0], "esptool-v5.4.0-" + suffix)
