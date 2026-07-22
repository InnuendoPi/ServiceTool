from __future__ import annotations

import pathlib
import shutil
import tempfile
import unittest
from unittest import mock

import app
import telegraf


class TelegrafConfigTests(unittest.TestCase):
    def test_requires_an_enabled_destination_even_with_custom_templates(self) -> None:
        config = telegraf.default_telegraf_config()
        config["templates_dir"] = "C:/custom-telegraf-templates"
        for target in ("csv", "influxdb", "postgres", "mysql", "mqtt"):
            config[target]["enabled"] = False

        with self.assertRaisesRegex(RuntimeError, "Enable at least one Telegraf destination"):
            telegraf.normalize_telegraf_config(config)

    def test_generates_all_enabled_destination_configs_without_placeholders(self) -> None:
        config = telegraf.default_telegraf_config()
        config.update(
            {
                "influxdb": {"enabled": True, "url": "http://localhost:8086", "token": "token", "org": "org", "bucket": "bucket"},
                "postgres": {"enabled": True, "host": "localhost", "port": "5432", "database": "db", "user": "user", "password": "password"},
                "mysql": {"enabled": True, "host": "localhost", "port": "3306", "database": "db", "user": "user", "password": "password"},
                "mqtt": {"enabled": True, "server": "tcp://localhost:1883", "topic": "topic", "client_id": "client", "username": "", "password": "", "qos": 0},
            }
        )
        app.ensure_runtime_dirs()
        work_dir = telegraf.write_telegraf_config(telegraf.normalize_telegraf_config(config))
        try:
            expected = {
                "telegraf.conf",
                "telegraf.d/processors-rename.conf",
                "telegraf.d/outputs-csv.conf",
                "telegraf.d/outputs-influxdb.conf",
                "telegraf.d/outputs-postgres.conf",
                "telegraf.d/outputs-mysql.conf",
                "telegraf.d/outputs-mqtt.conf",
            }
            generated = {str(path.relative_to(work_dir)).replace("\\", "/") for path in work_dir.rglob("*.conf")}
            self.assertEqual(generated, expected)
            self.assertFalse(any("{{" in path.read_text(encoding="utf-8") for path in work_dir.rglob("*.conf")))
        finally:
            shutil.rmtree(work_dir, ignore_errors=True)

    def test_writes_csv_header_once(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            config = telegraf.default_telegraf_config()
            telegraf.ensure_csv_header(config, pathlib.Path(temp_dir))
            telegraf.ensure_csv_header(config, pathlib.Path(temp_dir))
            content = (pathlib.Path(temp_dir) / "brautomat.csv").read_text(encoding="utf-8")

        self.assertEqual(content, ",".join(telegraf.csv_header_columns()) + "\n")

    def test_rejects_a_telegraf_archive_with_wrong_checksum(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            cache_dir = pathlib.Path(temp_dir)

            def write_invalid_archive(_url: str, target: pathlib.Path, _progress) -> None:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(b"not a telegraf archive")

            platform_key = telegraf.telegraf_platform_key()
            with (
                mock.patch.object(app, "TOOLS_CACHE_DIR", cache_dir),
                mock.patch.object(telegraf, "_download_with_progress", side_effect=write_invalid_archive),
                mock.patch.dict(telegraf.TELEGRAF_CHECKSUMS, {platform_key: "0" * 64}),
            ):
                with self.assertRaisesRegex(RuntimeError, "SHA256"):
                    telegraf.download_telegraf()

            asset_name, _ = telegraf.telegraf_platform_asset()
            self.assertFalse((cache_dir / asset_name).exists())


if __name__ == "__main__":
    unittest.main()
