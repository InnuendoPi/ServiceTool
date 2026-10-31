# Changelog

## 2.0.2 - Unveröffentlicht

- Ergänzt unter Einstellungen die Darstellung System, Hell und Dunkel.
  Die Auswahl wird zentral gespeichert; System folgt der Browserpräferenz.
- Führt die ServiceTool-Einstellungen in `config.json` zusammen und übernimmt
  optionale Rezeptquellen-Einstellungen aus der bisherigen `settings.json`.
- Speichert Brewfather- und gespeicherte Telegraf-Zugangsdaten verschlüsselt.
  Die benötigte Bibliothek wird in Windows-, Linux- und macOS-Paketen gebündelt.
- Ergänzt Auge-Buttons zum Anzeigen und Verbergen des Brewfather-API-Keys
  und des WLAN-Passworts.
- Erlaubt das Löschen jedes Geräteprofils, einschließlich des letzten.
  Ohne Profil wird die Standardverbindung verwendet.
- Korrigiert Mengenangaben und fehlende Schrittnamen beim Brewfather-Import.
- Prüft im Explorer vor dem Upload die Formate von Maischeplänen,
  Fermenterplänen, Profilen und Konfigurationen. Fremdrezepte müssen zuerst
  im Rezept Planer übernommen werden.
- Korrigiert den im Maischeplan gespeicherten Dateipfad beim Geräte-Upload.
- Behebt falsche Abbrüche bei der Planübertragung durch temporäre
  Geräteverbindungen und alte Master-Zuordnungen. Explizite Gerätebefehle
  und tatsächliche Gerätewechsel bleiben geprüft.
- Entfernt die Alterswarnung für gespeicherte Gerätekonfigurationen sowie
  die Zielgeneration-Dropdown und ihren Remote-Kompatibilitätshinweis.
- Ermöglicht die USB-Paketwahl für Wechsel zwischen 1.66 und 1.70,
  einschließlich spezieller Versionen. Beim Rückwechsel von 1.7x auf 1.66
  wird die Firmware in beide Anwendungspartitionen geschrieben.
  Flash löschen und Flash LittleFS bleiben unabhängig wählbar.
- Aktualisiert esptool für Windows, Linux und macOS auf 5.6.0 und prüft
  die verwendete Version.
- Speichert GitHub-Paketabfragen zwischen, bündelt parallele Abfragen und
  berücksichtigt API-Sperrfristen. Geräteabfragen bleiben ungecacht.
- Verwendet bereits geladene GitHub-Dateien über Neustarts hinweg erneut.
  Dateien fester Commits werden lokal geprüft; Branch-Dateien werden nach
  Ablauf des Cache-Zeitraums auf Änderungen geprüft.
- Verhindert wiederholte Geräteprüfungen und WLAN-Scans beim Seitenwechsel.
  WLAN-Fehler starten keine erneute Geräteprüfung. Start und manuelle
  Geräteprüfung zeigen einen Spinner; ausbleibende Statusantworten werden
  nach 30 Sekunden mit einem Fehler beendet.
- Entfernt bei neuen Migrationen vor dem Flashen alte WebUpdate-Marker und
  Versuchszähler. Funde und Entfernung werden protokolliert; bei Fehlern
  startet kein Flash. Download und Gerätesicherung erfolgen vorher.
- Aktualisiert die deutsche und englische Hilfe für die aktuellen Bedienabläufe.
- Erweitert die Git-Ausschlüsse für lokale Konfigurationen, deren Kopien,
  Nutzdaten, Datenbanken und private Schlüssel.

## 2.0.1 - Unveröffentlicht

- Korrigiert den Zugriff auf kBh-Datenbanken über UNC-Pfade (NAS).
  Sonderzeichen in Dateipfaden und der schreibgeschützte Zugriff bleiben erhalten.

## 2.0.0 - Unveröffentlicht

- Neuer Rezept Planer mit Schnellstart, Drag-and-drop, Mehrfachauswahl,
  Entwürfen, Versionsverwaltung und Planvergleich.
- Rezepte aus Brautomat JSON, MaischeMalzundMehr, kleinerBrauhelfer2 und
  Brewfather übernehmen und als Maischeplan auf das Gerät übertragen.
- Wiederkehrende Schritte im Dock dauerhaft speichern oder vorübergehend
  ablegen und zwischen Rezepten übernehmen.
- Bekannte Worker-Ressourcen beim Master speichern und für die Planung
  auch bei offline Workern verfügbar halten.
- Einheitliche Versionsdarstellung im Explorer und Rezept Planer;
  vorhandene Inventardateien gezielt aktualisieren oder versionieren.
- Ordnerauswahl beim Speichern im Inventar, zentrale Löschaktion im Explorer
  und Schutz der Standardordner auf dem Gerät.
- Bis zu 20 Geräteprofile; inaktive Profile ohne Gerätewechsel bearbeiten.
- Automatische COM-Auswahl auch mit Profilen; getrennte Behandlung
  abweichender Geräteverbindungen und erneuter WLAN-Scan bei unbekannter Firmware.
- Überarbeitete Einstellungen, einklappbare Bereiche und erweiterte Hilfe
  für Explorer und Rezept Planer mit Screenshots.
- Korrigierte Uploadprüfung: wechselnde Bereitschaftsstatus blockieren
  das Speichern eines Plans bei unveränderter Zuordnung nicht mehr.
- Zeigt während der Firmwareinstallation den laufenden Vorgang an und prüft
  anschließend den Gerätestatus erneut.

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

- Modernisiert die Oberfläche mit vier Hauptbereichen, einheitlichen
  Bedienelementen und Drei-Punkte-Menü.
- Speichert bis zu vier Geräteprofile mit COM-Port und URL; Gerätewechsel über
  die Kopfzeile.
- Bündelt Verbindung und Prozesszustand in einem Statusbadge.
- Ergänzt lokale Hilfe auf Deutsch und Englisch mit Suche und aufgabenbezogenen
  Anleitungen.

## 1.7.11 - 2026-09-18

- Beschleunigt die Migration: ein vollständiges Flash-Backup statt zweier
  Lesedurchläufe.
- Nutzt die esptool-Schreibprüfung und liest anschließend nur NVS und LittleFS
  zur Kontrolle zurück.
- Prüft erhaltene Daten vor dem Schreiben nur bei Wiederaufnahme; vollständige
  Restore-Prüfung bleibt erhalten.

## 1.7.10 - 2026-09-17

- Behebt den Migrationsabbruch bei fehlendem NVS-Bereich settings; verwendet die
  Firmware-Standardwerte.
- Erkennt entpackte GitHub-Firmwarepakete ohne Versionsmetadaten.
- Liest Migrations-Webdateien aus Littlefs.bin; Nutzerdaten bleiben
  ausgeschlossen.
- Unterstützt Updates/data als lokale Webdateiquelle.
- Vervollständigt die Sprachauswahl bei GitHub-API-Ausfällen und ignoriert
  veraltete Antworten.
- Verschiebt das WLAN-Firmwareupdate in den Firmwarebereich und kennzeichnet
  USB- und WLAN-Installation.

## 1.7.9 - 2026-09-15

- Unterscheidet alte Firmwarepakete unter build/ und neue Pakete ab 1.66 unter
  Updates/. Fehlende Pakete werden gesperrt; veraltete Paket-URLs verschwinden.
- Zeigt den Ladevorgang für Special Version und lädt aus demselben
  Buildverzeichnis
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
- Bereinigt fehlgeschlagene Telegraf-Starts und beendet Unterprozesse beim
  Schließen.
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
- Migration von Firmware 1.62–1.65.5 auf 1.70 mit vollständigem Backup und
  Erhalt
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
