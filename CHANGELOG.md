# Changelog

## Unreleased

## 1.7.2 - 2026-07-22

- Erweitert die Telegraf-Integration um lesbare Feldnamen, feste CSV-Spalten,
  MQTT-Flattening und SQL-Typmapping.
- Ergänzt Log-Level-Auswahl, eigene Telegraf-Templates und Template-Export.
- Prüft Telegraf-Downloads per SHA256 und lehnt ungültige Archive ab.
- Speichert relative CSV-Dateien dauerhaft im ServiceTool-Datenverzeichnis.
- Behebt PowerShell-/Serial-Probleme mit nicht-lateinischen Zeichen unter
  Windows.
- Ergänzt lokale Telegraf-Testhilfen: Mock-Telemetrie, Docker-Testdienste und
  portable Grafana-Dashboards.

## 1.7.1

- Adds a verified self-update for the packaged Windows application.
- Keeps manual, verified update downloads for Linux and macOS.
- Clarifies the local Test Runner setup and its firmware detection.

## 1.7.0

- Adds Telegraf telemetry forwarding and esptool 5.3.1.
