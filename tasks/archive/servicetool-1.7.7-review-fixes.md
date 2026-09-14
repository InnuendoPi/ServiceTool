# ServiceTool 1.7.7: Korrekturen aus der Quellprüfung

Status: Quellkorrekturen abgeschlossen, 14.09.2026.

Ziel: ServiceApp-/WLAN-Kompatibilität herstellen und belegte Fehler in Flash,
Restore, Dateiverwaltung, serieller Sitzung und Telegraf beheben.

Betroffene Dateien: `app.py`, `migration.py`, `telegraf.py`, `static/`, Tests,
Versionsmanifest und öffentliche Dokumentation.

Ergebnis:

- Normales Flashen validiert und schreibt beide App-Images im ServiceApp-Layout.
  Reine HTTP-Reparatur bleibt auf App0 beschränkt. Downloads sind an einen Commit gebunden.
- Migration akzeptiert 1.67.x zusätzlich zu den ausdrücklich unterstützten Zielen.
- WLAN-Ablehnungen, Scanfehler, Cachezustände und aktuelle Netzwerkmarker werden
  ausgewertet; SSIDs bleiben unverändert.
- ServiceApp-Umbenennung, Restore-Bestätigung und erneute Erreichbarkeit korrigiert.
- Monitorstart respektiert die Exklusivsperre; Portfehler beenden die Sitzung.
- Fehlgeschlagene Telegraf-Starts bereinigen Status und temporäre Konfiguration.
- Unbekannter Prozesszustand sperrt WebUpdate. Self-Update verlangt eine Prüfsumme.

Prüfstand: 98 Python-Unittests einschließlich ausgeführter Node-Frontendtests
bestanden. Python-/JavaScript-Syntax, Ruff (`E9,F63,F7,F82`) und Diffprüfung
bestanden. Paketvalidierung für ein vorhandenes 1.67.0-Paket bestanden.

Akzeptanz auf Hostebene: Ablehnungen und unbestätigte Vorgänge erscheinen nicht
als Erfolg; ServiceApp-Datei wird vor Flash verlangt und mitgeschrieben;
serielle Sperren und Startup-Bereinigung sind durch Regressionstests abgesichert.

Grenzen: Keine neuen Geräteversuche, keine Windows-/Linux-/macOS-Releasepakete
gebaut oder veröffentlicht. Hardwareabnahme der geänderten Abläufe bleibt unter
`tasks/ACTIVE.md` offen. Version 1.7.7 ist im Quellstand vorbereitet; Release-URLs
und Hashwerte werden erst aus den gebauten Paketen veröffentlicht.

## Nachtrag: Windows-Build und Startkorrektur

Am 14.09.2026 wurde das Windows-Paket gebaut und lokal deployt. Der erste Build
mit Python 3.14 enthielt keine Tcl/Tk-Daten und brach bereits im PyInstaller-
Runtime-Hook ab. Die vorherige Archivprüfung hatte diesen Startfehler nicht erkannt.

Neubau mit Python 3.12.11, passend zur CI-Basis. Das Windows-Buildskript bevorzugt
jetzt die lokale `.venv` und prüft Tcl/Tk vor dem Build sowie im fertigen EXE-Archiv.
Fehlende Daten verhindern künftig das Erstellen eines Releasepakets.

98 Tests mit Python 3.12 bestanden. Korrigiertes Paket erneut lokal deployt;
echte EXE gestartet, HTTP 200 und Version 1.7.7 bestätigt, Start-Fehlerprotokoll leer.
Windows-ZIP SHA256:
`eeef5d170732897a8bcc09b75f7c618864c595e362cb7eb599b987a02a0dd927`.
Keine Veröffentlichung und keine neuen Geräte-/Flashversuche.
