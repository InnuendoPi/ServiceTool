# Migration mit ServiceApp

Die Migration unterstützt ESP32-Geräte mit 4 MiB Flash.

- **1.62.0 bis 1.66.x** können direkt auf ein kompatibles ServiceApp-Paket
  ab 1.67 wechseln.
- **1.70 IDF5 Beta** wechselt auf ein **IDF6-Paket**. Bei der Umstellung
  auf IDF6 prüft das ServiceTool auch die Partitionstabelle des Geräts.

## Migration durchführen

1. Alle Brau- und Fermenterprozesse beenden. Den Brautomat per USB anschließen
   und sicherstellen, dass er über seine Geräte-URL erreichbar ist.
2. **Assistenten → Firmware migrieren** öffnen und das Gerät prüfen lassen.
   Soll ein Paket manuell gewählt werden, **Service → Migration** öffnen und
   unter **Gerät** den COM-Port kontrollieren.
3. Zielversion prüfen und **Migration starten** wählen. USB und Stromversorgung
   bis zum Abschluss verbunden lassen. Der aktuelle Arbeitsschritt wird
   angezeigt.

Das ServiceTool speichert zuerst das vollständige API-Backup als
`backup.json`. Danach schreibt es Hauptfirmware, Partitionstabelle,
ServiceApp und Bootdateien. NVS und LittleFS bleiben beim Flashen erhalten.
Nach dem Start aktualisiert das Tool die zum Paket passenden Webdateien.
Beim Wechsel auf IDF6 spielt es anschließend das API-Backup automatisch
zurück und wartet auf die erneute Erreichbarkeit des Geräts.

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

Für **Restore Backup** unter **Service → Migration** das Gerät über seine URL
verbinden und den Backupordner wählen. Die Einstellungen werden über die
Restore-API zurückgespielt.
Die installierte Firmware bleibt erhalten; ein Firmware-Rückwechsel erfolgt
nicht. Die API muss dafür erreichbar sein.

Bei einem unterbrochenen Schreibvorgang **Migration fortsetzen** verwenden,
solange das geprüfte Paket im Cache liegt. Nach erfolgreichem Start können
Webdatei-Update und automatischer Restore über die Geräte-URL fortgesetzt
werden. Nach fehlgeschlagener Schreibprüfung erfolgt kein Neustart.

Ältere Sicherungen mit `flash-backup.bin` und `nvs.bin` bleiben unterstützt.
Nur deren Wiederherstellung verwendet USB, ersetzt auch die Firmware und
prüft den vollständigen Flash durch Rücklesen.
