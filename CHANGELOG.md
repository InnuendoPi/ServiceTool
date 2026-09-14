# Changelog

## 1.7.7 - 2026-09-14

- Installiert und prüft beim normalen USB-Flash die ServiceApp des passenden
  Pakets. Remote-Paketdateien stammen aus demselben Commit und einem frischen Cache.
- Unterstützt Migration auf 1.67.x zusätzlich zu 1.66.x und 1.70.x.
- Meldet abgelehnte WLAN-Zugangsdaten als Fehler, erhält SSIDs unverändert und
  unterscheidet laufende, fehlgeschlagene und veraltete WLAN-Scans.
- Erkennt die aktuellen WLAN-Verbindungs- und Recovery-AP-Meldungen.
- Verwendet beim Umbenennen im Wartungsmodus die ServiceApp-Dateischnittstelle.
- Validiert Backup-JSON vor Übertragung und wartet nach Restore auf erneute
  Geräteerreichbarkeit. Unbestätigte Übertragungen erscheinen nicht als Erfolg.
- Verhindert konkurrierende serielle Monitorstarts und meldet getrennte Ports.
- Bereinigt fehlgeschlagene Telegraf-Starts und beendet Unterprozesse beim Schließen.
- Zeigt unbekannte Prozesszustände an und sperrt dann Firmware-WebUpdates.
- Lehnt ServiceTool-Updates ohne gültige SHA256-Prüfsumme ab.

## 1.7.6 - 2026-09-09

- Neuer Wartungsmodus zur Reparatur über die ServiceApp: Hauptfirmware ersetzen,
  Konfiguration, Maische-/Fermenterpläne und Profile verwalten sowie gespeicherten
  Braustatus zurücksetzen.
- Wartungsmodus über USB starten und beenden, auch bei nicht antwortender
  Hauptfirmware. Automatische Statusanzeige und verständliche Aktionsbuttons.
- WLAN-Zugangsdaten auch im Wartungsmodus über USB speichern.
- Kürzere Startdauer des Wartungsmodus und ausführliche, lesbare Debug-Ausgaben.
- Migration von Firmware 1.62–1.65.5 auf 1.70 mit vollständigem Backup und Erhalt
  von WLAN-Einstellungen und Nutzdaten. Firmwareauswahl, COM-Port und aktueller
  Arbeitsschritt direkt im Migrationstab.
- Verständliche Backupnamen mit Firmwareversion und Datum. Wiederherstellung
  über die Ordnerauswahl, auch nach erfolgreicher Migration.
- Behebt Migrationsabbrüche bei leeren Dateien, Fehler bei der ESP32-Prüfung
  und eine fälschliche Migrationssperre beim Laden der WLAN-Zugangsdaten.
- Verwendet automatisch das neueste stabile esptool; bei fehlender
  Internetverbindung werden vorhandene lokale Versionen verwendet.
- Zeigt nummerierte Konfigurationsversionen im lokalen Inventar korrekt an.
- Verbessert die Wiederaufnahme des seriellen Monitors, die Verbindung über
  die Geräte-AP-Adresse und die Bereitstellung von ServiceTool-Updates.

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
