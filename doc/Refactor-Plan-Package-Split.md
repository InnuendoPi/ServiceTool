# Plan: `app.py` in ein Package aufteilen (nach UI-Aufgabenbereichen)

*Status: geplant, noch nicht umgesetzt.*

## Kontext

`app.py` ist auf ~5400 Zeilen mit ~190 Funktionen und 8 Klassen gewachsen, alles in einer Datei. Ziel: den Code in ein Python-Package aufteilen, **ohne Verhalten zu ändern** (reines Verschieben, keine Logikänderung) und **ohne den PyInstaller-Build zu brechen**.

Statt rein technischer Schichten (HTTP-Layer, Datenklassen, ...) richtet sich die Aufteilung an den **fachlichen Aufgabenbereichen, die sich aus der Benutzeroberfläche ergeben** aus (`static/index.html`-Tabs: Firmware, Verwaltung, Backup & Restore, Logging, Telegraf, Migration, Test Runner) plus zwei globalen, tab-übergreifenden Belangen (Verbindungsstatus-Badge, Self-Update). Jede Datei soll damit einer Frage entsprechen, die man sich als Entwickler stellt: „Wo ändere ich etwas an der Migrations-Funktion?" → `migration.py`. „Wo wird das Telegraf-Tab bedient?" → `telegraf.py`.

Eine dünne, gemeinsame `core/`-Schicht bleibt nötig, weil mehrere Features dieselben Low-Level-Bausteine brauchen (HTTP-Client zum Gerät, serielle Grundfunktionen, Job-Tracking, der globale Anwendungszustand). Diese Schicht ist bewusst klein gehalten und enthält keine Fach-Logik.

## Kritische Design-Entscheidungen (das „Warum")

### 1. `paths.configure()` statt Pfad-Erkennung neu im Package zu berechnen

`app.py` berechnet `BUNDLE_ROOT`/`APP_ROOT` heute über `pathlib.Path(__file__).resolve().parent` (Fallback für den Nicht-PyInstaller-Fall). Läge dieselbe Zeile künftig in `servicetool/core/paths.py`, würde `__file__` auf diese Datei zeigen — `.parent` wäre dann `servicetool/core/`, nicht mehr das Repo-Root, in dem `static/`, `esptool/`, `telegraf/`, `tasks/` liegen. Ergebnis: `python app.py` (Source-Run) würde beim Ausliefern der Weboberfläche ein 404 auf `static/` werfen.

Lösung: `app.py` (Repo-Root) bleibt der Ort, der diese beiden Wurzelpfade berechnet — genau wie heute —, und reicht sie einmalig per `paths.configure(BUNDLE_ROOT, APP_ROOT)` an das Package durch. Alle abgeleiteten Konstanten (`DATA_ROOT`, `STATIC_DIR`, `BACKUP_DIR`, ...) werden in `core/paths.py` aus diesen beiden Werten berechnet.

### 2. `STATE.port` / `STATE.http_server` statt freier Modul-Globals `PORT`/`HTTP_SERVER`

`main()` mutiert heute zwei Modul-Globals per `global HTTP_SERVER, PORT`. Andere Stellen lesen sie (API-Statusroute liest `PORT`, Self-Update-Code liest `HTTP_SERVER` zum sauberen Shutdown vor dem Selbst-Ersetzen der exe). Verteilt man den Code auf Module und macht anderswo `from servicetool.core.state import PORT`, kopiert Python beim Import den *aktuellen* Wert einmalig — spätere `PORT = ...`-Neuzuweisungen in `main()` kämen bei anderen Modulen nie an (Stale-Import-Bug).

Lösung: `PORT` und `HTTP_SERVER` werden zu Attributen auf dem bereits existierenden `STATE`-Objekt (`STATE.port`, `STATE.http_server`). `STATE` selbst wird nur **einmal** erzeugt und nie neu zugewiesen (nur seine Attribute ändern sich) — `from servicetool.core.state import STATE` ist dafür sicher, weil alle Module dieselbe Objektinstanz referenzieren.

### 3. `Job`/`JobStore` und `run_job`/`exclusive_serial_access` bleiben getrennt

`ServiceState` (in `core/state.py`) erzeugt bei der Initialisierung eine `JobStore()` — `state.py` muss also `jobs.py` importieren. Gleichzeitig brauchen `run_job()`/`exclusive_serial_access()` Zugriff auf `STATE.serial_access_lock` — sie müssten also `state.py` importieren. Läge beides in derselben Datei, entstünde ein Importzirkel. Deshalb: `core/jobs.py` (reine Datenklassen, keine Abhängigkeit auf `state`) und `core/job_runtime.py` (generische Ausführungslogik, hängt von `state.py` ab) bleiben getrennte Dateien.

### 4. PyInstaller-Build

Die `.spec`-Datei braucht **keine Änderung**: `Analysis(['app.py'])` bleibt der Einstiegspunkt, PyInstaller analysiert die `import`-Statements statisch und bündelt automatisch alle `servicetool.*`-Submodule (im Code gibt es keine dynamischen Imports, die PyInstaller übersehen könnte). `collect_all(...)` für Drittanbieter-Pakete und `datas=[('static','static')]` sind unberührt.

## Zielstruktur

```text
app.py                          # dünner Launcher, PyInstaller-Entry-Point (unverändert referenziert)
servicetool/
    __init__.py                 # leer
    core/                       # gemeinsame Low-Level-Bausteine, keine Fach-Logik
        paths.py                # Bootstrap: configure(), DATA_ROOT, STATIC_DIR, ensure_runtime_dirs
        settings.py             # config.json, Versions-/URL-/Log-Helfer, REMOTE_PACKAGES/INVENTORY_SPECS
        http_client.py          # HTTP-Aufrufe ans Gerät (json_request, post_json, download_fs_file, ...)
        serial_io.py            # Serielle Grundfunktionen (open_serial_port, list_serial_ports, host_wifi_scan)
        downloads.py            # generische Download/Cache/Extract-Helfer (von esptool- UND Telegraf-Provisionierung genutzt)
        mdns.py                 # MdnsAdvertiser
        jobs.py                 # Job, JobStore (reine Datenklassen)
        state.py                # ServiceState, STATE-Singleton (inkl. port/http_server)
        job_runtime.py          # run_job, exclusive_serial_access (generisch)
    device_status.py            # Verbindungsstatus-Badge (No device/Checking/Serial/Online) — tab-übergreifend
    firmware.py                 # Firmware-Tab: Paketkatalog, esptool-Provisionierung, flash_job, backup_firmware_job, WebUpdate
    wifi.py                     # WiFi-Provisionierung (Teil des Firmware-Tabs, auch von Migration genutzt)
    backup.py                   # Backup & Restore-Tab
    serial_monitor.py           # Logging-Tab (SerialSession)
    telegraf.py                 # Telegraf-Tab (Config-Erzeugung + Subprozess-Session)
    migration.py                # Migration-Tab (nutzt firmware.flash_job, backup.create_backup_job, wifi.*)
    inventory.py                # Verwaltung-Tab (Rezepte/Fermenter/Profile/Konfiguration)
    test_runner.py              # Test Runner-Tab (nur aktiv mit privatem Dev-Setup)
    self_update.py              # Self-Update des ServiceTool selbst (global, kein Tab)
    handlers.py                 # AppHandler: HTTP-Routing, importiert praktisch alle Feature-Module
    server.py                   # choose_listen_port, start_browser, main()
```

**Abhängigkeitsregel:** Jedes Feature-Modul (`firmware.py`, `backup.py`, `inventory.py`, ...) darf nur auf `core/*` importieren — nie umgekehrt. Cross-Feature-Importe sind auf die tatsächlich beobachteten Fälle beschränkt:
- `migration.py` → `firmware.py` (ruft `flash_job` für den eigentlichen Flash-Schritt auf), `backup.py` (`create_backup_job` als Sicherheitsbackup vor der Migration), `wifi.py` (WiFi-Übernahme über den Flash-Vorgang hinweg)
- `handlers.py` → alle Feature-Module (es ist die Komposition-Wurzel, die `/api/*`-Routen auf die passenden Funktionen verteilt)

Keine Feature-Datei importiert `handlers.py` — Abhängigkeitsrichtung bleibt eindeutig.

## Vorgehen

1. `servicetool/__init__.py` und `servicetool/core/` anlegen; `core/`-Module zuerst befüllen (sie haben keine Abhängigkeiten auf Feature-Module).
2. Feature-Module einzeln befüllen, in dieser Reihenfolge, damit Cross-Feature-Importe beim Verschieben schon auflösbar sind: `device_status.py` → `wifi.py` → `backup.py` → `firmware.py` → `migration.py` → `inventory.py` → `serial_monitor.py` → `telegraf.py` → `test_runner.py` → `self_update.py`.
3. Nach jedem verschobenen Modul: `python -m py_compile` auf die geänderten Dateien, um Importfehler sofort einer kleinen, überschaubaren Änderung zuzuordnen statt am Ende einen einzigen großen Traceback zu debuggen.
4. `handlers.py` (AppHandler) und `server.py` (main) zuletzt befüllen — sie hängen von allem anderen ab.
5. `app.py` durch den dünnen Launcher ersetzen (siehe Design-Entscheidung 1).
6. `CONTRIBUTING.md` (Release-Prozess nennt „Update the version in app.py") und `CLAUDE.md` (Architekturabschnitt beschreibt aktuell die Single-File-Struktur) an die neue Modulstruktur anpassen.
7. Lokalen Build fahren (`build_servicetool.cmd`) und die erzeugte exe **aus einem sauberen Verzeichnis außerhalb des Repos** starten, um zu verifizieren, dass `STATIC_DIR`/`DATA_ROOT` im gefrorenen Zustand korrekt auflösen.

## Verifikation

- `python -m py_compile` über alle neuen Module und `app.py`.
- `python app.py` aus dem Quellcode starten, UI im Browser öffnen, mindestens die Tabs Firmware, Verwaltung, Backup & Restore, Logging antesten (bestätigt, dass `handlers.py` korrekt an die verschobenen Feature-Module delegiert).
- `build_servicetool.cmd` lokal bauen, die exe aus einem Verzeichnis außerhalb des Repos starten (damit kein zufälliges Auffinden von `static/`/`config.json` aus dem Repo-Root passiert), UI-Start und Verbindungsstatus (`No device`/`Checking`) prüfen.
- Stichprobenartiger Diff-Review: da es sich um reines Verschieben handelt, sollte der Funktionskörper jeder verschobenen Funktion unverändert sein (nur Imports/Modulzugehörigkeit ändern sich).
