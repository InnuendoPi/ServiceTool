# Changelog

## 1.7.6 - 2026-09-08

- Zeigt unter Verwaltung > Konfiguration auch lokal erstellte nummerierte
  Dateiversionen an, die bisher vom Dateifilter ausgeblendet wurden.
- Startet einen zuvor laufenden Serial Monitor auch nach fehlgeschlagenen
  Flash-, Backup- und Migrationsschritten wieder.
- Verwendet die AP-Adresse nur noch als Fallback bei Verbindungsfehlern und
  erhält HTTP-Fehler des ausgewählten Geräts.
- Veröffentlicht Release-Artefakte commitgebunden und aktualisiert das
  Update-Manifest erst nach erfolgreicher Prüfung.

## 1.7.5 - 2026-07-24

- Verhindert einen zweiten Neustart nach einem Reboot über die Geräte-API,
  wenn die HTTP-Verbindung während des Neustarts abbricht.

## 1.7.4 - 2026-07-23

- Stabilisiert den automatischen Windows-Self-Update:
  separater PowerShell-Startpfad, Job-Breakaway, Diagnose-Log ab
  Updater-Start und entkoppelter Neustart per Windows Task Scheduler.

## 1.7.3 - 2026-07-23

- Nimmt die lokalen Telegraf-Testhilfen in die Release-Pakete auf:
  Mock-Telemetrie, Docker-Compose-Testdienste und portable Grafana-Dashboards.

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
