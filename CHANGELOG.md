# Changelog

## 1.8.3 - Unveröffentlicht

- Sichert bei neuen Migrationen die Einstellungen über die API statt per
  Flash-Auslesen; NVS und LittleFS bleiben erhalten.
- Stellt API-Backups ohne Firmware-Rückwechsel wieder her und unterstützt
  weiterhin vorhandene vollständige Flash-Sicherungen.
- Passt Migrationsanzeige und Hilfe an den neuen Ablauf an.

## 1.8.1 - Unveröffentlicht

- Erlaubt eigene Profilnamen und mehrfach verwendete COM-Ports und Geräte-URLs.
- Korrigiert die Generationsgrenze: bis 1.66.x Legacy, ab 1.67 ServiceApp;
  normale WebUpdates zwischen diesen Generationen werden gesperrt.
- Prüft Sprachpakete gegen die Gerätegeneration und bindet sie an einen Commit.
  Sprachdateien werden vor Aktivierung nach dem Upload zurückgelesen.
- Nutzt für Reportabschnitte die volle Breite und bricht lange Dateipfade um.
- Korrigiert die veraltete Migrationstesterwartung für Version 1.68.

## 1.8.0 - 2026-09-18

- Modernisiert die Oberfläche mit vier Hauptbereichen, einheitlichen Bedienelementen und Drei-Punkte-Menü.
- Speichert bis zu vier Geräteprofile mit COM-Port und URL; Gerätewechsel über die Kopfzeile.
- Bündelt Verbindung und Prozesszustand in einem Statusbadge.
- Ergänzt lokale Hilfe auf Deutsch und Englisch mit Suche und aufgabenbezogenen Anleitungen.

## 1.7.11 - 2026-09-18

- Beschleunigt die Migration: ein vollständiges Flash-Backup statt zweier Lesedurchläufe.
- Nutzt die esptool-Schreibprüfung und liest anschließend nur NVS und LittleFS zur Kontrolle zurück.
- Prüft erhaltene Daten vor dem Schreiben nur bei Wiederaufnahme; vollständige Restore-Prüfung bleibt erhalten.

## 1.7.10 - 2026-09-17

- Behebt den Migrationsabbruch bei fehlendem NVS-Bereich settings; verwendet die Firmware-Standardwerte.
- Erkennt entpackte GitHub-Firmwarepakete ohne Versionsmetadaten.
- Liest Migrations-Webdateien aus Littlefs.bin; Nutzerdaten bleiben ausgeschlossen.
- Unterstützt Updates/data als lokale Webdateiquelle.
- Vervollständigt die Sprachauswahl bei GitHub-API-Ausfällen und ignoriert veraltete Antworten.
- Verschiebt das WLAN-Firmwareupdate in den Firmwarebereich und kennzeichnet USB- und WLAN-Installation.

## 1.7.9 - 2026-09-15

- Unterscheidet alte Firmwarepakete unter build/ und neue Pakete ab 1.66 unter
  Updates/. Fehlende Pakete werden gesperrt; veraltete Paket-URLs verschwinden.
- Zeigt den Ladevorgang für Special Version und lädt aus demselben Buildverzeichnis
  wie in der Auswahl. Fehlende historische Pakete verbergen andere Versionen nicht.
- Verwendet passende Sprach- und Webdateipfade für die jeweilige Generation.
- Wartet bei Special Version auf die Versionsauswahl, bevor Sprachen abgefragt
  werden. Fehler bei der Sprachabfrage werden als API-Fehlermeldung beantwortet.
- Bietet eine geführte Reparatur bei gesperrter Hauptfirmware mit Prüfung der
  Freigabe und anschließendem Start. Einstellungen bleiben erhalten.

## 1.7.8 - 2026-09-14

- Behebt den lokalen Windows-Build: bevorzugt die Python-3.12-Umgebung
  und prüft erforderliche Tcl/Tk-Daten vor und nach dem Packen der EXE.
- Verhindert dadurch Windows-Pakete, die wegen fehlender Tcl/Tk-Daten
  beim Start mit einem Python-Fehler abbrechen.

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
