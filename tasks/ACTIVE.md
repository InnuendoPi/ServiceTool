# Aktive ServiceTool-Aufgaben

Die Quellkorrekturen für 1.7.7 sind im
[Abschlussbericht](archive/servicetool-1.7.7-review-fixes.md) dokumentiert.
Die nachfolgenden Geräte- und Releaseprüfungen bleiben davon getrennt.

Dokumentationsabgleich: 18.09.2026. Diese Liste ist kein Auftrag zur Ausführung
der aufgeführten Prüfungen. Frühere Gerätebestätigungen gelten für den damals
getesteten Stand und belegen keine Abnahme späterer Änderungen, insbesondere
des verkürzten Migrationsablaufs von 1.7.11.

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

**Versionsabhängige Schnittstellen:** Den früher als offen erfassten Stand von
Braustatus-Erkennung sowie WLAN-Auslesen, Scan und Reset nicht pauschal auf
neuere Firmware übertragen. Verfügbarkeit für die tatsächlich eingesetzte
Hauptfirmware und ServiceApp anhand ihres Schnittstellenvertrags klären.
Die Paketprüfung unterstützt Ziele ab 1.67.0 mit passender
ServiceApp-Partitionstabelle; die Versionsnummer allein genügt nicht.

## Repository-Ausgliederung

**Status:** abgeschlossen

**Ziel:** Das ServiceTool als eigenständiges Repository für gemeinsame
Entwicklung bereitstellen.

**Ergebnis:**

- Produktquellen, Buildskripte und statische UI-Dateien sind übernommen.
- Release-Binärdateien und lokale Laufzeitdaten sind ausgeschlossen.
- GitHub Actions baut manuell für Windows, Linux und macOS. Ohne
  `Publish release` entstehen Workflow-Artefakte; mit dieser Option werden
  zusätzlich Release und Update-Manifest veröffentlicht.
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
