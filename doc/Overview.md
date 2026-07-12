# ServiceTool – Architekturüberblick

**Grundidee:** Kein klassisches Desktop-GUI-Framework (kein Qt/Tkinter-UI), sondern eine lokale Web-App: Ein Python-Backend startet einen HTTP-Server auf `127.0.0.1`, öffnet automatisch den Browser, das Frontend ist eine Vanilla-JS-SPA. Verpackt wird das Ganze via PyInstaller zu einer eigenständigen exe/App.

## Struktur

```
app.py            → gesamtes Backend, ~5400 Zeilen, single-file
static/
  index.html      → SPA-Grundgerüst (Tab-Navigation)
  app.js          → ~4200 Zeilen Frontend-Logik, I18N, State, fetch()-Calls
  styles.css
Brautomat32ServiceTool.spec   → PyInstaller-Build-Config
.github/workflows/servicetool-build.yml → Cross-Platform CI-Build (Win/Linux/macOS)
version.json      → Self-Update-Manifest
```

## Fachlicher Zweck

Begleit-Tool für "Brautomat32"-Geräte (ESP32-Brausteuerungen): Firmware flashen, Backup/Restore, WLAN-Provisionierung, Rezept-/Fermenter-Plan-Verwaltung, Serial-Monitor, Telemetrie-Forwarding (Telegraf → InfluxDB/MariaDB/MQTT/CSV).

## Sprachen & Frameworks

- **Backend:** Python 3.12, ausschließlich Standardbibliothek für den HTTP-Server (`http.server.BaseHTTPRequestHandler` / `ThreadingHTTPServer`), kein Flask/FastAPI.
- **Externe Abhängigkeiten** (`requirements.txt`): `zeroconf==0.148.0`, `ifaddr==0.2.0` (mDNS-Advertising), `pyserial==3.5` (serielle Kommunikation), `certifi` (TLS-Zertifikate).
- `tkinter`/`tkinter.filedialog` wird nur für native Datei-/Verzeichnisauswahl-Dialoge genutzt, nicht als GUI-Framework.
- **Frontend:** Vanilla JavaScript, HTML, CSS – kein React/Vue/Angular. Eigenes I18N-Objekt (`I18N` in `app.js`) für Deutsch/Englisch.
- **Packaging:** PyInstaller (`Brautomat32ServiceTool.spec`), Cross-Platform-Build via GitHub Actions für Windows/Linux/macOS.
- Externe Tools werden bei Bedarf heruntergeladen/gebündelt: `esptool` (ESP32-Flash-Tool) und `Telegraf` (Telemetrie-Forwarder).

`app.py` enthält kein Klassenframework im klassischen MVC-Sinn, sondern ist ein sehr großes, funktional strukturiertes Modul mit ca. 190 Top-Level-Funktionen und ca. 8 Klassen (`Job`, `JobStore`, `SerialSession`, `TelegrafSession`, `ServiceState`, `TestRunnerSession`, `MdnsAdvertiser`, `AppHandler`). Es gibt keine separaten Python-Module/Packages – alles Backend-Logik liegt in dieser einen Datei.

## Wesentliche Architektur- und Design-Patterns

**Gesamtarchitektur: Lokaler Web-Server als Desktop-App ("localhost SPA")**
- `main()` (app.py:5349) startet `ThreadingHTTPServer` auf `127.0.0.1:8765` (Port-Fallback via `choose_listen_port`, app.py:5314), registriert mDNS (`serviceBrautomat32.local`) und öffnet automatisch den Standardbrowser (`start_browser`, app.py:5340).
- Kein MVC im UI-Sinn, sondern Client-Server-Trennung: Backend liefert reine JSON-API + statische Dateien, Frontend (app.js) ist eine reine Single-Page-App mit Tab-Umschaltung (Firmware, Verwaltung, Backup & Restore, Logging, Telegraf, Migration, Test Runner – `static/index.html:49-55`).

**Routing-Pattern:** `AppHandler(BaseHTTPRequestHandler)` (app.py:4879) implementiert manuelles Routing über lange `if path == "/api/..."`-Ketten in `_route_api_get` (GET, app.py:4913) und `do_POST` (app.py:5042) – kein Framework-Routing, sondern klassisches "Big-If-Dispatch".

**Job/Task-Pattern (asynchrone Hintergrundoperationen):**
- `Job` (Dataclass, app.py:1883) kapselt Status, Fortschritt, Logs einer langlaufenden Operation (Flash, Backup, Migration, WebUpdate...).
- `JobStore` (app.py:1907) ist ein Thread-sicherer In-Memory-Store (`threading.Lock`), Jobs werden per `run_job()` (app.py:2522) in eigenen Threads gestartet; Frontend pollt `/api/jobs/<id>` für Fortschritt/Logs – ein Polling-basiertes "Task-Queue"-Pattern statt WebSockets.

**Session-/State-Objekte (ähnlich Singleton via globalem State):**
- `ServiceState` (app.py:2210) ist ein globaler Zustand (`STATE`) mit `JobStore`, `SerialSession`, `TelegrafSession`, `TestRunnerSession` und Locks – zentraler Anwendungszustand, threadsicher über `threading.Lock`/`RLock`.
- `SerialSession` (app.py:1927): kapselt seriellen Port entweder über `pyserial` oder – als Fallback ohne pyserial – über einen **PowerShell-Subprozess**, der `System.IO.Ports.SerialPort` nutzt (app.py:1945-1962) – ungewöhnliches, plattformspezifisches Fallback-Pattern.
- `TelegrafSession` (app.py:2127) und `TestRunnerSession` (app.py:2282) folgen demselben Muster: Subprozess starten, Ausgabe in eigenem Thread einlesen (`_pump`-Methode), Status/Logs threadsicher exponieren.

**Kontextmanager-Pattern:** `exclusive_serial_access` (app.py:2512, `@contextmanager`) sorgt dafür, dass Flash-/Backup-/Migrationsoperationen den seriellen Port exklusiv reservieren (Serial Monitor wird pausiert und danach automatisch neugestartet, siehe `handover`-Logik in `flash_job`, app.py:4578-4712).

**Retry/Fallback-Pattern:** `try_base_urls` (app.py:691) probiert die konfigurierte Geräte-URL und als Fallback den ESP32-AP-Modus (`192.168.4.1`) durch (`candidate_base_urls`, app.py:682-688).

**Update-Mechanismus (Self-Update):** `service_tool_update_status()`/`download_service_tool_update()`/`install_service_tool_update()` (app.py:1206-1356) prüfen `version.json` im GitHub-Repo, laden ZIP mit SHA256-Verifikation, und für Windows sogar ein automatisiertes Self-Replace (`schedule_service_tool_shutdown`, app.py:1269).

## GUI-Aufbau

`static/index.html` definiert eine Tab-basierte SPA (kein Cookie/Client-Router, sondern reines Zeigen/Verstecken von `<section class="tab-panel">`):
- Header mit Geräte-URL-Eingabe, Verbindungsstatus-Badge (`#deviceConnectionState`), Sprachumschaltung, Debug-Output-Toggle.
- Tabs: **Firmware** (Flash-Einstellungen, Paketquelle Release/Development/Special/Open-Directory, COM-Port/Baudrate, Flash-Erase/Web-Dateien-Optionen), **Verwaltung** (Inventar: Mash-/Fermenter-Pläne, Profile, Konfiguration – lokale/Geräte-Dateiliste mit Sortierung/Umbenennen/Löschen), **Backup & Restore**, **Logging** (Serial Monitor), **Telegraf** (Telemetrie-Ziele konfigurieren), **Migration**, **Test Runner** (versteckt, nur bei privatem Dev-Setup sichtbar).
- `static/app.js` verwaltet den gesamten Client-Zustand rein imperativ mit globalen Objekten (`managementSortState`, `managementListCache` usw., app.js:426-432) und `fetch()`-Aufrufen gegen die REST-API; kein Component-Framework, State wird direkt im DOM synchron gehalten.
- I18N über ein zentrales Objekt `I18N` (app.js:1) mit `text(key)`-Helper (app.js:446) und `applyLanguage()` (app.js:625).

## Hardware-Kommunikation

Zwei parallele Kommunikationskanäle, klar abstrahiert:

**a) Seriell (USB):**
- Primär über `pyserial` (`serial.Serial`, siehe `open_serial_port`, app.py:862), mit PowerShell-`SerialPort`-Fallback, falls `pyserial` fehlt.
- `list_serial_ports()` (app.py:941) mit Fallback `fallback_serial_ports()` (app.py:913, über `wmic`/PowerShell wenn `pyserial.tools.list_ports` fehlt).
- Serielle JSON-Kommandos: `serial_json_command()` (app.py:2946), Firmware-Versionsermittlung über Boot-Banner: `serial_firmware_version()` (app.py:2695).
- Geräteflashen via externem Subprozess `esptool` (app.py:4578 `flash_job`) – kein Python-esptool-API-Aufruf, sondern CLI-Subprozess mit Fortschritts-Parsing der Ausgabezeilen (`update_flash_progress`, app.py:2548).

**b) Netzwerk (HTTP-API des Geräts):**
- Reiner `urllib.request`-basierter HTTP-Client (kein `requests`), Helper wie `json_request`, `post_json`, `post_form`, `post_multipart`, `download_fs_file` (app.py:702-830) für Dateisystem-Operationen, Konfigurationsabruf, Reboot, WLAN-Scan/-Save, Telemetrie (`/telemetry`-Endpoint) usw.
- `combined_device_status()` (app.py:2825) kombiniert seriellen und Netzwerkstatus zu einem einheitlichen Verbindungszustand (State-Machine `No device/Checking/Serial/Online`).
- mDNS-Erkennung über `MdnsAdvertiser` (app.py:625) und Hostname `serviceBrautomat32.local`; zusätzlich `host_wifi_scan()` (app.py:987) für lokale WLAN-Scans über das Host-System.

## Konfiguration, Logging, Fehlerbehandlung

- **Konfiguration:** `config.json` im laufzeitspezifischen Datenverzeichnis (`DATA_ROOT`, app.py:73), verwaltet über `default_config()`/`load_app_config()`/`save_app_config()` (app.py:433-503). Merge-Strategie: bekannte Schlüssel werden aus gespeicherter Config übernommen, unbekannte verworfen (defensive Migration bei Versionswechsel). Telegraf-Zugangsdaten werden standardmäßig NICHT persistiert (`save_passwords`-Flag, app.py:498-500).
- **Datenverzeichnis-Trennung** je Plattform (`detect_data_root()`, app.py:61-70): Windows neben der exe, macOS `~/Library/Application Support/...`, Linux `~/.local/share/...` – sauber getrennt von Programmdateien (wichtig bei signierten/read-only App-Bundles).
- **Logging:** Kein Standard-`logging`-Modul; eigenes simples File-Logging nur für Fehler: `log_runtime_error()` (app.py:579) schreibt in `logs/service-tool-runtime.log`. Ansonsten Job-Logs im Speicher (`Job.log()`, app.py:1897) und Serial-/Telegraf-/TestRunner-Logs in `deque`s mit `maxlen`.
- **Fehlerbehandlung:** Durchgehend sehr defensiv mit breiten `except Exception` (`# noqa: BLE001`-Kommentare zeigen bewusste Lint-Ausnahme). API-Handler fangen Exceptions und geben JSON `{"error": ...}` mit Statuscode 500/502 zurück (`do_POST`, app.py:5307-5311). `HTTPError` wird separat behandelt und Body zur Diagnose mitgeliefert.

## Tests und Build/Packaging

- **Keine automatisierten Python-Tests** im Repository (kein `pytest`, kein `tests/`-Ordner). Der einzige "Test Runner" ist eine optionale Node.js-Integration aus einem privaten Firmware-Repo (`tools/test-runner/`, siehe `CONTRIBUTING.md:74-96`), die nur aktiviert wird, wenn `BRAUTOMAT32_SOURCE_ROOT` gesetzt ist und bestimmte Dateien existieren – das ServiceTool selbst enthält nur die Anbindung (`TestRunnerSession`, `detect_test_runner_environment()`, app.py:345-424).
- **Build/Packaging:** `Brautomat32ServiceTool.spec` (PyInstaller) sammelt `zeroconf`, `ifaddr`, `serial`, `certifi` per `collect_all` und bündelt `static/` als Datenverzeichnis; Onefile-artige EXE-Konfiguration mit `console=True`, UPX-Kompression.
  - `build_servicetool.cmd`: einfacher lokaler Windows-Build.
  - `build_servicetool_windows_release.ps1`: kompletter Release-Build inkl. ZIP-Erstellung und SHA256-Aktualisierung in `version.json`.
  - `.github/workflows/servicetool-build.yml`: manueller (`workflow_dispatch`) Cross-Platform-Build für Windows (PyInstaller-spec), Linux (PyInstaller + eigenes AppImage-Packaging inklusive generiertem PNG-Icon per Python-Skript direkt im Workflow) und macOS (PyInstaller `--windowed --onedir` + `.app`-Bundle via `ditto`). Ein separater `publish-release`-Job (mit GitHub-Environment-Gate `release`) aktualisiert `version.json` mit SHA256/URLs, committet auf `main` und erstellt den GitHub Release mit allen drei ZIPs.

## Wichtigste Dateien

| Pfad | Rolle |
|---|---|
| `app.py` | Gesamtes Backend: HTTP-Server, Routing, Gerätekommunikation (seriell+HTTP), Job-System, Konfiguration, Update-Mechanismus |
| `static/index.html` | SPA-Grundgerüst, Tab-Struktur |
| `static/app.js` | Gesamte Frontend-Logik, I18N, State-Management, API-Calls |
| `static/styles.css` | Styling |
| `Brautomat32ServiceTool.spec` | PyInstaller-Build-Konfiguration |
| `build_servicetool_windows_release.ps1` | lokaler Windows-Release-Build inkl. Versionierung |
| `.github/workflows/servicetool-build.yml` | CI-Build/Release-Pipeline für alle drei Plattformen |
| `version.json` | Update-Manifest (Selbst-Update-Mechanismus) |
| `requirements.txt` | Abhängigkeiten: zeroconf, ifaddr, pyserial, certifi |
| `CONTRIBUTING.md` | Release-Prozess, Testrunner-Setup, Repo-Governance |
| `README.md` | Endnutzer- und Entwicklerdokumentation |
| `tasks/ACTIVE.md`, `tasks/README.md` | interne, im Repo geführte Aufgabenverwaltung (auf Deutsch) |

---

*Erstellt am 2026-07-12 als Architektur-Analyse des Repos. Bei größeren strukturellen Änderungen (z. B. Aufteilung von `app.py` in Module) sollte dieses Dokument aktualisiert werden.*
