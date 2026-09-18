# ServiceTool-Anleitung

## Erste Schritte

Das ServiceTool verbindet deinen Computer mit einem Brautomat. Wähle zuerst das
richtige Gerät aus. Alle Geräteaktionen beziehen sich auf diese Auswahl.

### Den Brautomat verbinden

1. Schließe den Brautomat per USB an deinen Computer an.
2. Öffne **Gerät**. Wähle den COM-Port. Fehlt er in der Liste, klicke auf den
   kreisförmigen Pfeil neben der Auswahl.
3. Trage die Geräte-URL ein. Nutze die Adresse, die du für diesen Brautomat
   eingerichtet hast.
4. Klicke neben der URL auf die Verbindungsprüfung. Lies das Statusbadge oben
   rechts.

### Wo finde ich was?

- **Gerät:** Verbindung und WLAN einrichten.
- **Firmware:** Firmware installieren, Webdateien aktualisieren und die
  Websprache ändern.
- **Daten:** Dateien verwalten und Sicherungen bearbeiten.
- **Service:** Serial Monitor, Telegraf, Wartung, Migration und gegebenenfalls
  Test Runner.
- **Drei-Punkte-Menü:** Einstellungen, ServiceTool-Updates und diese Hilfe.

Die Hilfe öffnet das Kapitel zum aktuellen Bereich. Die Suche links durchsucht
auch die Kapiteltexte. Ein Suchbegriff wie **WLAN**, **Backup** oder
**Migration** grenzt die Kapitel ein.

### Die Kopfzeile lesen

Links wählst du das aktive Gerät. Daneben stehen COM-Port, URL und erkannte
Firmwareversion, jeweils durch einen Punkt getrennt. Rechts steht der
Verbindungs- und Prozessstatus. So kannst du vor einer Aktion kontrollieren,
welches Gerät angesprochen wird.

Das Drei-Punkte-Menü rechts oben enthält **Einstellungen**, **Auf Updates
prüfen** und **Hilfe**. Die Vor- und Zurück-Schaltflächen unten in dieser Hilfe
wechseln das Kapitel. Auf schmalen Fenstern steht die Kapitelübersicht über dem
Text.

### Zwei unterschiedliche Updates

**Firmware** aktualisiert den Brautomat. **Auf Updates prüfen** im
Drei-Punkte-Menü prüft das ServiceTool auf deinem Computer.

Weiter mit [Geräte & WLAN](#geräte--wlan).

## Geräte & WLAN

### Den Verbindungsstatus verstehen

- **Online · Kein Prozess aktiv:** Der Brautomat ist per HTTP erreichbar und
  meldet keinen aktiven Prozess.
- **Online · Prozessstatus unbekannt:** Das Gerät ist erreichbar, aber sein
  Prozesszustand konnte nicht ermittelt werden. Das bestätigt keinen
  Ruhezustand.
- **Online** mit Prozessangabe: Ein Maisch- oder Fermenterprozess wurde
  gemeldet.
- **Seriell verbunden:** Das ServiceTool hat das Gerät über USB erkannt. Das
  bedeutet nicht, dass es über WLAN erreichbar ist.
- **Kein Gerät:** Verbindung und Auswahl prüfen.

### WLAN einrichten

1. Wähle oben das gewünschte Gerät und unter **Gerät** dessen COM-Port aus.
2. Klicke im WLAN-Bereich auf den Scan-Pfeil. Warte auf das Ende des Scans.
3. Wähle dein Netzwerk aus oder trage die SSID ein. Gib das Passwort ein.
4. Klicke auf das Speichersymbol. Das Gerät übernimmt die Zugangsdaten und
   startet neu.
5. Warte den Neustart ab und prüfe die Verbindung erneut. Kontrolliere die URL,
   falls das Gerät weiterhin nur seriell erkannt wird.

**WLAN Reset** setzt die WLAN-Konfiguration zurück. Verwende diese Aktion nicht
als Ersatz für einen erneuten Scan.

### Zwischen Geräten wechseln

Die Auswahl **Aktives Gerät** schaltet das gespeicherte Paar aus COM-Port und
URL um. Ein einzelnes Profil heißt **Brautomat**. Bei mehreren Profilen heißen
sie **Master**, **worker1**, **worker2** und **worker3**.

Neue Geräte richtest du unter [Einstellungen → Geräte](#einstellungen) ein.
Während laufender Geräteaktionen kann ein Profilwechsel gesperrt sein. Warte den
Abschluss ab.

### Ein neues Gerät hat noch kein WLAN

Schließe das neue Gerät zunächst per USB an. Speichere sein Profil mit dem
erkannten COM-Port und der URL, die du für dieses Gerät verwenden möchtest.
Anschließend wählst du dieses Profil und richtest dessen WLAN ein.

Das Speichern einer URL im ServiceTool ändert nicht den Netzwerknamen des
Brautomaten. Die eingetragene Adresse muss zur tatsächlichen Gerätekonfiguration
passen. Verwende bei mehreren Geräten eindeutige Adressen.

:::details Technischer Hintergrund

Online-Erkennung und Prozessstatus stammen aus getrennten Geräteabfragen. Daher
sind Erreichbarkeit und unbekannter Prozessstatus kombinierbar. Bei mehreren
Profilen wird ein fehlender gespeicherter COM-Port nicht durch einen anderen
erkannten Port ersetzt.

:::

## Firmware

### Ein Firmwarepaket auswählen

1. Öffne **Firmware** und kontrolliere oben das aktive Gerät und dessen Version.
2. Wähle eine Paketquelle: **Latest Release** für die veröffentlichte Fassung,
   **Latest Development** für die Entwicklungsversion oder **Special Version**
   für eine bestimmte angebotene Version.
3. Bei **Special Version** wähle zusätzlich die Version. Bei **Open directory**
   wähle das lokale Paketverzeichnis.
4. Prüfe die angezeigte Paketquelle und die verfügbaren Aktionen. Fehlende
   Paketbestandteile müssen vor der Installation geklärt werden.

### Per USB installieren

1. Stelle unter **Gerät** den richtigen COM-Port ein und gehe zurück zu
   **Firmware**.
2. Wähle die Flash-Baudrate. Prüfe die Optionen **Flash löschen** und **Flash
   LittleFS** bewusst: Sie betreffen den Gerätespeicher beziehungsweise das
   Dateisystem.
3. Starte **Ausgewähltes Paket über USB installieren** und beobachte Fortschritt
   und Statusmeldung. USB und Stromversorgung während des Schreibens verbunden
   lassen.

Für den Wechsel vom alten Partitionslayout auf das ServiceApp-Layout verwende
[Migration](#migration).

### Über WLAN aktualisieren

1. Prüfe, dass das Gerät **Online** ist und keinen aktiven Prozess meldet.
2. Klicke im Abschnitt **Veröffentlichte Firmware aktualisieren** auf
   **Nach Firmware-Update suchen**. Diese Aktion sucht auf GitHub nach einer
   veröffentlichten Firmware; sie verwendet nicht das oben ausgewählte Paket.
3. Vergleiche im Dialog die aktuelle und die angebotene Firmwareversion.
4. Starte das angebotene Update erst nach dieser Kontrolle. Bei aktivem oder
   unbekanntem Prozesszustand bleibt der Start gesperrt.

### Ein heruntergeladenes ZIP verwenden

Entpacke das Firmwarepaket zuerst. Wähle **Open directory** und über das
Ordnersymbol das passende Verzeichnis mit den Firmwaredateien. Ein ZIP-Archiv
selbst ist kein Paketverzeichnis. Fehlen Dateien oder kann die Version nicht
bestimmt werden, lies die Fehlermeldung, statt Dateien verschiedener Versionen
zu mischen.

### Webdateien aktualisieren

Wähle zuerst das gewünschte Firmwarepaket. Klicke dann auf **Webdateien
aktualisieren**. Der Brautomat muss über WLAN erreichbar sein. Diese Aktion
aktualisiert die Browseroberfläche und Sprachdateien, nicht die Hauptfirmware.

Wähle dafür eine Repository-Paketquelle. Bei **Open directory** sind das
separate Webdateien-Update und die Sprachinstallation nicht verfügbar.

### Die Brautomat-Websprache ändern

Wähle unter **Brautomat Websprache** eine angebotene Sprache und klicke auf
**Sprache wechseln**. Die Sprachdateien stammen aus der ausgewählten
Paketquelle. Fehlt die Liste, prüfe Paketversion und Verbindung und beachte die
Fehlermeldung.

Die Sprache des ServiceTools selbst stellst du unter **Einstellungen** um.

:::details Paketpfade und ältere Firmware

Die Paketgeneration bestimmt die Verzeichnisse: vor Firmware 1.66 wird build
verwendet, ab 1.66 Updates. ServiceApp-Pakete benötigen zusätzlich die passende
ServiceApp. Eine lokale Paketquelle muss die zusammengehörigen Dateien
enthalten.

:::

## Daten

### Dateien übertragen

1. Öffne **Daten → Dateien** und wähle Maischepläne, Fermenterpläne, Profile
   oder Konfiguration.
2. Prüfe, welche Seite das Gerät und welche das lokale Inventar zeigt.
3. Wähle die Datei und die gewünschte Kopieraktion. Beachte mögliche Rückfragen
   beim Überschreiben.
4. Kontrolliere die Statusmeldung. Umbenennen und Löschen wirken auf die
   jeweilige Auswahl.

### Konfiguration sichern und wiederherstellen

1. Öffne **Daten → Sichern & Wiederherstellen**.
2. Erstelle ein Konfigurationsbackup. Es wird lokal gespeichert und in der Liste
   angeboten.
3. Zur Wiederherstellung wähle das passende Backup oder eine externe JSON-Datei.
4. Kontrolliere vor dem Wiederherstellen das aktive Gerät und die ausgewählte
   Sicherung.

### Welche Sicherung brauche ich?

- Ein **Konfigurationsbackup** sichert die über die Backup-Funktion
  bereitgestellten Geräteeinstellungen.
- **Firmware Backup** sichert die aktive App-Partition über USB.
- Das **Migrationsbackup** enthält den vollständigen Flash und gehört zur
  Wiederherstellung einer Migration.

Diese Sicherungsarten sind nicht austauschbar. Für eine unterbrochene Migration
lies [Migration](#migration).

Für **Firmware Backup** verlangt die Oberfläche zusätzlich eine
Online-Verbindung. Ein gespeichertes Firmware-Image ist kein vollständiges
Backup von Einstellungen und Dateisystem.

## Service

### Serial Monitor

1. Öffne **Service → Serial Monitor**.
2. Kontrolliere Port und Baudrate und starte den Monitor.
3. Nutze die Ausgabe zur Fehlersuche. Kopiere relevante Meldungen einschließlich
   der Fehlermeldung.

Flash und Firmwarebackup benötigen den seriellen Port ebenfalls. Das ServiceTool
führt dafür eine Portübergabe durch. Beachte den angezeigten Zustand nach der
Aktion.

### Telegraf

Telegraf überträgt Gerätedaten an konfigurierte Ziele. Öffne **Service →
Telegraf**, um Programmdatei, Abrufintervall, Vorlagen und Ziele einzustellen.

1. Prüfe die bestehende Konfiguration und aktiviere nur die benötigten Ziele.
2. Trage die Zielverbindung und erforderliche Zugangsdaten ein.
3. Speichere die Konfiguration und starte Telegraf über die angebotene
   Startaktion.
4. Kontrolliere Status und Protokoll. Zum Beenden verwende die Stoppaktion.

Das Speichern von Passwörtern wird über die dafür vorgesehene Option gesteuert.
Eine laufende Telegraf-Sitzung kann einen Geräteprofilwechsel verhindern.

### Wartung

Unter **Service → Wartung** kannst du den Wartungsmodus starten beziehungsweise
beenden. Beachte Hinweise auf laufende Prozesse und auf eine blockierte
Hauptfirmware.

Wenn eine Reparatur angeboten wird, lies den angezeigten Grund und verwende den
vorgesehenen Reparaturablauf. Weitere Hinweise: [Brautomat startet
nicht](#fehlerbehebung).

### Eine blockierte Hauptfirmware reparieren

1. Lies unter **Service → Wartung** den angezeigten Grund. Die Reparatur wird
   bei unvollständig geschriebener Hauptfirmware angeboten.
2. Wähle unter **Firmware** die gewünschte Paketquelle und gegebenenfalls die
   Version aus.
3. Kehre zu **Service → Wartung** zurück und klicke auf **Hauptfirmware
   reparieren**.
4. Kontrolliere das im Bestätigungsdialog genannte Paket. Bestätige die
   Übertragung und warte auf Prüfung und Ergebnis.

Ein Zurücksetzen des Braustatus ist eine andere Aktion als die
Firmware-Reparatur. Nutze es nicht als allgemeinen Ersatz für die angezeigte
Reparatur.

### Test Runner

Dieser Bereich erscheint nur mit der erforderlichen lokalen
Entwicklungsumgebung. Für normale Wartungsaufgaben wird er nicht benötigt.

:::details Voraussetzungen für den Test Runner

Die Erkennung benötigt die Test-Automation-Dokumente, das Test-Runner-Projekt,
mindestens eine gültige Suite-Konfiguration und Node.js. Fehlen diese
Voraussetzungen, bleibt der Eintrag verborgen. Eine ausdrückliche Ausblendung
über hide_test bleibt wirksam.

:::

## Migration

Die Migration wechselt das Partitionslayout älterer Geräte auf das
ServiceApp-Layout. Sie ist mehr als ein normales Firmwareupdate.

### Voraussetzungen

Unterstützt werden Ausgangsversionen **1.62.0 bis 1.65.5** und Zielversionen
**1.66.x, 1.67.x oder 1.70.x** auf unterstützten ESP32-Geräten mit 4 MiB Flash
und altem symmetrischen Layout. Das ServiceTool prüft das Gerät vor dem
Schreiben.

### Migration durchführen

1. Beende Brau- und Fermenterprozesse. Verbinde den Brautomat per USB und stelle
   sicher, dass seine URL erreichbar ist.
2. Kontrolliere das aktive Gerät und den COM-Port unter **Gerät**.
3. Öffne **Service → Migration** und wähle Paketquelle und Zielpaket.
4. Starte die Migration. Halte USB und Stromversorgung bis zum Abschluss
   verbunden.
5. Lies das Ergebnis. Ein gestarteter Vorgang ist noch kein erfolgreicher
   Abschluss.

Zuerst entsteht eine vollständige Flash-Sicherung. Danach werden die neuen
Images installiert und die erhaltenen Daten geprüft.

### Nach einem Abbruch

Beachte die angezeigte Wiederherstellungssitzung. **Migration fortsetzen** ist
möglich, wenn die benötigten Installationsdateien noch im Cache vorhanden sind.
Alternativ verwende **Restore Backup** und wähle den passenden
Migrationsbackupordner.

Das Backup gehört zum gesicherten Gerät. Zur Wiederherstellung wird USB
benötigt; WLAN ist dafür nicht erforderlich. Andere serielle Aktionen können bis
zur Wiederherstellung gesperrt bleiben.

:::details Was wird gesichert und geprüft?

Migrationssicherungen liegen unter backups/migrations. Sie enthalten
flash-backup.bin, nvs.bin und report.json. Die normale Migration liest einmal
den vollständigen Flash als Backup. Nach dem Schreiben werden NVS und LittleFS
zurückgelesen; die Images prüft esptool. Eine Backup-Wiederherstellung verwendet
eine vollständige Rückleseprüfung.

:::

## Einstellungen

Öffne das **Drei-Punkte-Menü → Einstellungen**.

### Sprache und Debug-Ausgabe

Die Sprachwahl betrifft das ServiceTool. Die Websprache des Brautomaten änderst
du unter **Firmware**. Die Debug-Ausgabe blendet zusätzliche Statusinformationen
für die Fehlersuche ein.

### Ein weiteres Gerät einrichten

1. Wähle im Abschnitt **Geräte** die Aktion **Gerät hinzufügen**.
2. Wähle den COM-Port des neuen Geräts und trage seine eindeutige URL ein.
3. Speichere das Profil. Die Oberfläche wird mit dem gewählten Gerät neu
   geladen.
4. Richte bei Bedarf unter **Gerät** das WLAN ein.

COM-Port und URL sind Pflicht. Die URL muss beim Speichern noch nicht erreichbar
sein. Für das erste Gerät lautet der Standard `http://brautomat`; vorhandene
Einstellungen bleiben erhalten. Ab dem zweiten Gerät ist das URL-Feld zunächst
leer.

### Ein Profil bearbeiten oder entfernen

Wähle oben das betreffende Gerät. Unter **Einstellungen → Geräte** zeigt die
Zusammenfassung die aktuelle Auswahl. **Profil bearbeiten** öffnet dessen
COM-Port und URL.

Zusätzliche Geräte lassen sich im Profildialog entfernen. Das erste Profil
bleibt erhalten. Das Entfernen eines Profils löscht keine Daten auf dem
Brautomat.

### Das ServiceTool aktualisieren

Wähle **Drei-Punkte-Menü → Auf Updates prüfen**. Ein angebotenes Update wird als
ZIP heruntergeladen und anhand seiner Prüfsumme geprüft. Ob die Installation
automatisch erfolgen kann, zeigt der Updatedialog an. Bei unterstützter
Installation verlangt das ServiceTool eine Bestätigung, bevor es beendet,
aktualisiert und neu gestartet wird. Andernfalls wird das Paket zur manuellen
Installation bereitgestellt.

## Fehlerbehebung

### Kein COM-Port gefunden

Prüfe USB-Verbindung und Stromversorgung. Klicke unter **Gerät** neben der
Portauswahl auf den Scan-Pfeil. Bei mehreren Profilen prüfe den gespeicherten
Port unter **Einstellungen → Geräte**; ein anderes angeschlossenes Gerät wird
nicht automatisch übernommen.

### Nur seriell verbunden

Prüfe WLAN-Zugangsdaten und die für dieses Gerät eingetragene URL. Nach einem
Neustart warte auf den Verbindungsaufbau und starte die Geräteprüfung erneut.

### WLAN-Scan läuft nicht durch

Warte eine laufende Prüfung ab und wiederhole den Scan. Bei **No serial
response** prüfe den COM-Port und ob ein anderes Programm ihn verwendet. Kopiere
die genaue Statusmeldung, falls der Fehler bestehen bleibt.

### Online, aber Prozessstatus unbekannt

Starte die Geräteprüfung erneut. Der Status bedeutet, dass die Prozessabfrage
keine verwertbare Antwort geliefert hat. Er beweist weder einen laufenden noch
einen beendeten Prozess. Aktionen, die einen sicheren Ruhezustand benötigen,
können deshalb gesperrt sein.

### Brautomat startet nicht in die Hauptfirmware

Wenn die ServiceApp erreichbar ist, prüfe unter **Service → Wartung** den
angezeigten Startblocker. Wird **Hauptfirmware reparieren** angeboten, wähle
eine passende Firmwarequelle und folge diesem Ablauf. Für die Übertragung muss
das Gerät über WLAN erreichbar sein.

Ein erneutes Flashen allein beseitigt nicht jeden gespeicherten Startblocker.
Ändere dafür keine NVS-Einträge auf Verdacht. Bei einer unterbrochenen Migration
verwende die [Migrationswiederherstellung](#migration).

### Sprachdateien oder Firmwarepaket fehlen

Kontrolliere die ausgewählte Quelle. **Special Version** benötigt eine konkrete
Version. Onlinepakete benötigen eine erreichbare Paketquelle; bei lokalen
Verzeichnissen müssen die passenden Dateien vorliegen.

### Angaben für eine Fehlermeldung

- ServiceTool-Version und angezeigte Firmwareversion.
- Aktives Gerät, Verbindungsstatus und betroffene Aktion.
- Genaue Fehlermeldung sowie die relevanten Statuszeilen.

Entferne Passwörter und andere Zugangsdaten aus Texten oder Bildern, bevor du
sie weitergibst.
