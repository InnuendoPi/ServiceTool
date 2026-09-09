# Aktive ServiceTool-Aufgaben

## Geräteabnahme für Migration und Wartung

**Status:** Implementiert; vollständige Geräteabnahme offen.

**Betroffene Dateien:** `migration.py`, `maintenance.py`, `app.py`, `static/`, Tests.

**Bereits am Gerät bestätigt:** Migration, Start der ServiceApp, LittleFS-Zugriff
und Speicherung von WLAN-Zugangsdaten im Wartungsmodus.

**Noch prüfen:**

- Migration aus beiden alten OTA-Slots und mit unterstützten älteren Versionen;
  Wiederherstellung nach Strom-/USB-Unterbrechung.
- Wartungseinstieg bei abstürzender Hauptfirmware und gespeichertem Braustatus.
- Firmware-Reparatur mit Erhalt der übrigen Partitionen; persistenter Braustatusreset.
- Ersetzen und Löschen von Dateien; Erhalt der bisherigen Datei bei Uploadabbruch.
- Rückkehr zur Hauptfirmware, Timeoutfälle und WLAN-Verbindung nach Speicherung.
- Bedienung mit älterer Firmware sowie Windows-, Linux- und macOS-Releasepakete.

**Akzeptanz:** Fehler dürfen nicht als Erfolg erscheinen. Reparaturen müssen
unbeteiligte Einstellungen und Dateien erhalten. Geräteprüfungen ergänzen die
automatisierten Tests und werden vor Enduser-Freigabe abgeschlossen.

**Offene Schnittstellen:** Erkennung eines vorhandenen Braustatus sowie WLAN-
Auslesen, Scan und Reset in der ServiceApp. Entwicklungsversion 1.66 verwendet
bereits den Migrations- und Wartungsweg der Zielversion 1.70.

## Repository-Ausgliederung

**Status:** abgeschlossen

**Ziel:** Das ServiceTool als eigenständiges Repository für gemeinsame
Entwicklung bereitstellen.

**Ergebnis:**

- Produktquellen, Buildskripte und statische UI-Dateien sind übernommen.
- Release-Binärdateien und lokale Laufzeitdaten sind ausgeschlossen.
- GitHub Actions baut manuell für Windows, Linux und macOS und lädt nur
  Workflow-Artefakte hoch.
- Der Test-Runner bleibt im privaten Firmware-Repository.

**Releasekanal:**

- `version.json` und die Anwendung verwenden das Repository `ServiceTool`.
- Endnutzerpakete werden als GitHub Release Assets veröffentlicht.

## Migration bestehender Installationen

**Status:** externe Folgeaufgabe

**Ziel:** Bereits installierte ServiceTool-Versionen auf den neuen
Releasekanal umleiten.

**Erforderliche externe Aktion:**

- Im bisherigen Brautomat32-Repository einmalig ein höheres ServiceTool-
  Update-Manifest veröffentlichen, das auf einen Release im Repository
  `ServiceTool` verweist.

**Begründung:**

- Bereits veröffentlichte Anwendungen kennen noch die frühere Manifest-URL.
- Ein README-Verweis reicht für deren automatische Update-Prüfung nicht aus.
