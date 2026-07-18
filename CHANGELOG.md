# Changelog

## Unreleased

- Telegraf now prepares the data fully: device fields are renamed to readable
  names, the measurement/table is named `brautomat_telemetry`, CSV files get a
  fixed column order with a header, MQTT output is flattened, and SQL
  destinations gain proper column types — so all destinations hold readable,
  consistent columns.
- Adds a Telegraf log-level selector (quiet / info / debug).
- Adds support for custom Telegraf templates: point the new templates-directory
  field at your own `.conf` files, or use "Export templates" to write the
  built-in templates (with placeholders, no credentials) as a starting point.
- Verifies the downloaded Telegraf archive against a known SHA256 checksum
  before use and refuses unverified downloads.
- Telegraf now writes relative CSV files to a persistent location instead of a
  temporary directory that was deleted on stop.
- Adds development helpers for testing without hardware: a `/telemetry` mock
  server (`tools/mock_server.py`) and a `docker compose` stack with test
  databases and a pre-provisioned Grafana.
- Fixes startup crashes when PowerShell/serial output contained non-Latin-1
  bytes (e.g. German device names) on a German Windows.

## 1.7.1

- Adds a verified self-update for the packaged Windows application.
- Keeps manual, verified update downloads for Linux and macOS.
- Clarifies the local Test Runner setup and its firmware detection.

## 1.7.0

- Adds Telegraf telemetry forwarding and esptool 5.3.1.
