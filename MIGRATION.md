# Migration mit ServiceApp

Die Migration unterstützt Brautomat32 von **1.62.0 bis 1.65.5 auf 1.66.x, 1.67.x oder 1.70.x**.
Ein vorheriges Zwischenupdate ist nicht erforderlich. Unterstützt werden
ESP32-Geräte mit 4 MiB Flash und dem bisherigen symmetrischen Partitionslayout.
Das ServiceTool prüft Firmware und Partitionstabelle vor dem Schreiben.

## Migration durchführen

1. Gerät per USB anschließen und sicherstellen, dass es über die Geräte-URL
   erreichbar ist. Alle Brau- und Fermenterprozesse müssen beendet sein.
2. Im Tab **Migration** die Paketquelle, das Firmwarepaket und den COM-Port
   auswählen. Diese Auswahl wird mit dem Firmwaretab geteilt.
3. **Migration starten** wählen. USB und Stromversorgung bis zum Abschluss
   verbunden lassen. Der aktuelle Arbeitsschritt wird angezeigt.

Zuerst wird der vollständige Flash gesichert und geprüft. Anschließend werden
Hauptfirmware, ServiceApp und die zugehörigen Bootdateien installiert. WLAN-
Einstellungen und Nutzdateien bleiben erhalten; die Webdateien werden aktualisiert.
Geschriebene Daten und erhaltene Nutzdateien werden überprüft.

Ab ServiceTool 1.7.11 wird der vollständige Flash einmal für das Backup gelesen. Die geschriebenen
Images prüft esptool direkt auf dem Gerät; anschließend liest das ServiceTool
nur NVS und LittleFS zum Vergleich mit dem Backup zurück. Bei einer Wiederaufnahme
werden diese Bereiche zusätzlich vor dem Schreiben geprüft. Die vollständige
Rückleseprüfung nach einer Backup-Wiederherstellung bleibt erhalten.

## Firmwarepaket

Ein lokales Paket benötigt `bootloader.bin`, `partitions.bin`, `boot_app0.bin`,
`firmware.bin` und `serviceapp.bin` sowie die passenden Webdateien.
Fehlen Versionsmetadaten, kann die eindeutige Produktversion aus dem geprüften
Hauptfirmware-Image ermittelt werden. Eine zusätzliche `migration.json` oder
eine lokale PlatformIO-Umgebung ist nicht erforderlich.
`Littlefs.bin` wird bei der Migration nicht geflasht.

Bei Release- oder Development-Paketen lädt das ServiceTool die zusammengehörigen
Dateien herunter. Bei lokalen Builds werden Webdateien aus `data` oder `webfiles`
im Paketverzeichnis beziehungsweise aus `data` des zugehörigen Projekts verwendet.
Bei Paketen unter `Updates/` wird dessen `data/` berücksichtigt. Enthält ein
entpacktes Binärpaket nur `Littlefs.bin`, werden daraus die freigegebenen
Web- und Sprachdateien gelesen; Konfigurationen aus diesem Image werden nicht übernommen.
Unvollständige oder unpassende Pakete werden abgelehnt.

## Backup wiederherstellen

Sicherungen liegen unter `backups/migrations/`. Die Ordnernamen enthalten
Firmwareversion und Datum, beispielsweise `backup_1_65_5_20260908`. Weitere
Sicherungen desselben Tages erhalten einen nummerierten Zusatz.

Ein Backupordner enthält:

- `flash-backup.bin`: vollständige Flash-Sicherung.
- `nvs.bin`: separate Sicherung der Einstellungen einschließlich WLAN-Zugangsdaten.
- `report.json`: Angaben zu Gerät, Sicherung und Prüfungen.

Für eine Wiederherstellung den COM-Port auswählen, **Restore Backup** anklicken
und den Backupordner öffnen. Das funktioniert auch nach erfolgreicher Migration
und benötigt keine WLAN-Verbindung. Die Sicherung wird geprüft und darf nur auf
das zugehörige Gerät zurückgespielt werden. Wiederhergestellt wird dessen Zustand
zum Sicherungszeitpunkt.

Nach einem unterbrochenen Schreibvorgang kann die Migration über
**Migration fortsetzen** weitergeführt werden, sofern die benötigten
Installationsdateien noch im Cache liegen. Alternativ das Backup wiederherstellen.
Andere serielle Aktionen bleiben während einer unvollständigen Migration gesperrt.
Bei fehlgeschlagener Schreib- oder Rückleseprüfung erfolgt kein automatischer Neustart.
