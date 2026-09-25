# Migration mit ServiceApp

Die Migration unterstützt Brautomat32 von **1.62.0 bis einschließlich 1.66.x**
auf **1.67.0 oder neuer mit kompatiblem ServiceApp-Layout**.
Ein vorheriges Zwischenupdate ist nicht erforderlich. Unterstützt werden
ESP32-Geräte mit 4 MiB Flash und dem bisherigen symmetrischen Partitionslayout.
Das ServiceTool prüft Firmware und Partitionstabelle des Zielpakets vor
dem Schreiben. Die Quellversion wird über die Geräte-API ermittelt.

## Migration durchführen

1. Gerät per USB anschließen und sicherstellen, dass es über die Geräte-URL
   erreichbar ist. Alle Brau- und Fermenterprozesse müssen beendet sein.
2. Im Tab **Migration** die Paketquelle, das Firmwarepaket und den COM-Port
   auswählen. Diese Auswahl wird mit dem Firmwaretab geteilt.
3. **Migration starten** wählen. USB und Stromversorgung bis zum Abschluss
   verbunden lassen. Der aktuelle Arbeitsschritt wird angezeigt.

Zuerst wird das API-Backup als `backup.json` gespeichert. Der gesamte von der
Firmware gelieferte Inhalt bleibt erhalten: Einstellungen, WLAN-Zugangsdaten,
Maischepläne, Fermenterpläne, Profile und Logging-Konfiguration.
Danach werden Hauptfirmware, ServiceApp und Bootdateien installiert.
NVS und LittleFS werden nicht überschrieben; Webdateien werden aktualisiert.
Es gibt keinen `read-flash`-Durchlauf. esptool bestätigt die geschriebenen Images.
Die Firmware selbst ist nicht Bestandteil dieses Backups.

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

Ein neuer Backupordner enthält:

- `backup.json`: unverändertes API-Backup der Firmware.
- `report.json`: Angaben zur Sicherung und zum Migrationsverlauf.

Für **Restore Backup** das Gerät über seine URL verbinden und den Backupordner
wählen. Die Einstellungen werden über die Restore-API zurückgespielt.
Die installierte Firmware bleibt erhalten; ein Firmware-Rückwechsel erfolgt
nicht. Die API muss dafür erreichbar sein.

Nach einem unterbrochenen Schreibvorgang **Migration fortsetzen** verwenden,
sofern die Installationsdateien noch im Cache liegen. Das geprüfte Paket wird
erneut installiert, ohne Flash auszulesen. Andere serielle Aktionen bleiben
während einer unvollständigen Migration gesperrt. Nach fehlgeschlagener
Schreibprüfung erfolgt kein automatischer Neustart.

Ältere Sicherungen mit `flash-backup.bin` und `nvs.bin` bleiben unterstützt.
Nur deren Wiederherstellung verwendet USB, ersetzt auch die Firmware und
prüft den vollständigen Flash durch Rücklesen.
