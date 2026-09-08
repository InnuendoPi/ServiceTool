# Konfigurationsversionen im lokalen Inventar anzeigen

Status: abgeschlossen

Ziel: Mit „Version erstellen“ gespeicherte Konfigurationsdateien im Untertab
Konfiguration sichtbar machen.

Betroffene Datei: `app.py`, Funktion `local_inventory_file_allowed`.

Ergebnis: Der lokale Filter akzeptiert neben den Originalnamen auch deren
nummerierte Versionen mit positivem ganzzahligem Suffix.

Akzeptanzkriterien und Prüfung: Kopieren und anschließendes Auflisten von je
zwölf Versionen beider Konfigurationsdateien in einem temporären Unterordner
erfolgreich geprüft. Originale bleiben erhalten, fremde Dateinamen werden
ausgefiltert. Python-Syntaxprüfung und alle neun vorhandenen Core-Tests bestanden.

Offene Risiken: Keine bekannten für die Filteränderung. Die gebaute Anwendung
wurde nicht neu erstellt und die Browseroberfläche nicht separat getestet.
