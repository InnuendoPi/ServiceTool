# Plan: Telegraf-Funktionen aus app.py separieren

*Status: geplant, noch nicht umgesetzt.*

Dies ist eine kleinere, in sich geschlossene erste Scheibe des größeren Umbaus in [Refactor-Plan-Package-Split.md](Refactor-Plan-Package-Split.md): **nur** die Telegraf-Funktionalität wandert in ein eigenes Modul (`telegraf.py`, direkt neben `app.py`), der Rest von `app.py` bleibt vorerst unverändert. Kein Package, kein `core/`-Layer — das kommt erst mit dem großen Umbau, falls gewünscht.

## Kontext

Telegraf ist der am saubersten abgegrenzte Teil des Codes: eine Session-Klasse (`TelegrafSession`) plus ein paar reine Konfigurations-/Download-Funktionen, mit fast keiner Kopplung an den globalen `STATE` (nur die Instanziierung `self.telegraf = TelegrafSession()` in `ServiceState.__init__`). Das macht es zu einem risikoarmen ersten Testlauf für den Verschiebe-Ansatz, bevor der große Umbau angegangen wird — und liefert schon für sich einen Nutzen (Telegraf-Änderungen betreffen dann nur noch eine ~350-Zeilen-Datei statt der 5400-Zeilen-`app.py`).

## Was nach `telegraf.py` verschoben wird

Reines Verschieben, keine Logikänderung:

- `default_telegraf_config()`
- `toml_string()`, `normalize_telegraf_config()`, `resolve_telegraf_binary()`, `telemetry_url()`, `test_telegraf_device()`, `write_telegraf_config()`
- `telegraf_platform_asset()`, `cached_telegraf_path()`, `bundled_telegraf_path()`, `ensure_telegraf_available()`
- `TelegrafSession`-Klasse
- Konstanten `TELEGRAF_VERSION`, `TELEGRAF_REPO_BASE`, `LOCAL_TELEGRAF_DIR` (werden ausschließlich hier verwendet, geprüft per Grep über ganz `app.py`)

## Was in `app.py` bleibt (und von `telegraf.py` importiert wird)

Diese Bausteine sind generisch und werden auch von anderem Code (v. a. der esptool-Provisionierung) mitgenutzt, deshalb bleiben sie vorerst in `app.py`:

- `CACHE_DIR`, `TOOLS_CACHE_DIR` (Cache-Verzeichnisse)
- `normalize_base_url()` (für `telemetry_url()`)
- `mark_executable()`, `download_to_file()` (generische Download-Helfer)
- `extract_esptool_archive()` — **Hinweis:** trotz des Namens ist das eine generische Zip/Tar-Extraktionsfunktion (keine esptool-spezifische Logik), die auch `ensure_telegraf_available()` nutzt. Das ist ein bestehender Namens-Schönheitsfehler im Code, kein neues Problem durch diesen Plan — nicht mit umbenennen, das würde den Diff unnötig aufblähen.

## Design-Entscheidung: Import-Richtung & Zirkularität

`app.py` braucht `telegraf.py` für drei Stellen: `ServiceState.__init__` (`TelegrafSession()`), `default_config()` (`default_telegraf_config()`) und `AppHandler` (`normalize_telegraf_config()`, `test_telegraf_device()`, `TELEGRAF_VERSION` im Status-Payload). Umgekehrt braucht `telegraf.py` die oben genannten, weiterhin in `app.py` verbleibenden Helfer/Konstanten.

Ein `from app import CACHE_DIR, ...` **am Dateianfang** von `telegraf.py` würde zwar heute funktionieren (weil `app.py` diese Namen vor der Stelle definiert, an der aktuell der Telegraf-Code steht), macht den Import aber **fragil**: verschiebt jemand später in `app.py` die `from telegraf import ...`-Zeile nach oben (z. B. weil eine andere Funktion früher schon `TelegrafSession` braucht), bricht der Start mit einem `ImportError`, weil `app.py` zu diesem Zeitpunkt `CACHE_DIR` noch nicht definiert hat.

Deshalb: die Handvoll `app.py`-Importe in `telegraf.py` als **funktionslokale Importe** (innerhalb der jeweiligen Funktion, nicht am Modulanfang) schreiben, z. B.:

```python
def ensure_telegraf_available() -> pathlib.Path:
    from app import TOOLS_CACHE_DIR, mark_executable, download_to_file, extract_esptool_archive
    ...
```

Das macht `telegraf.py` unabhängig von der Position der `from telegraf import ...`-Zeile in `app.py` — ein bewusster, dokumentierter Kompromiss für diese Zwischenstufe, der hinfällig wird, sobald (falls) der größere Umbau die gemeinsamen Helfer in ein eigenes `core`-Modul auslagert.

## Anpassungen in `app.py`

- `ServiceState.__init__`: `self.telegraf = TelegrafSession()` bleibt unverändert, nur der Import ändert sich.
- `default_config()`: `"telegraf": default_telegraf_config()` bleibt unverändert.
- `AppHandler`: Aufrufe von `normalize_telegraf_config(...)`, `test_telegraf_device(...)` und die Nutzung von `TELEGRAF_VERSION` im Status-Payload bleiben unverändert — nur der Import am Dateianfang von `app.py` ändert sich zu `from telegraf import TelegrafSession, default_telegraf_config, normalize_telegraf_config, test_telegraf_device, TELEGRAF_VERSION`.
- `STATE.telegraf.snapshot()` / `.start()` / `.stop()` / `.clear()` — keine Änderung, das ist die öffentliche API von `TelegrafSession`, die unverändert bleibt.

## PyInstaller

Keine Änderung an der `.spec`-Datei nötig — gleiche Begründung wie im größeren Plan: PyInstaller analysiert die `import`-Statements ab `app.py` statisch und bündelt `telegraf.py` automatisch mit.

## Vorgehen

1. `telegraf.py` neu anlegen, die oben gelisteten Funktionen/Klasse/Konstanten unverändert dorthin verschieben.
2. In den verschobenen Funktionen die App-seitigen Abhängigkeiten (`CACHE_DIR`, `TOOLS_CACHE_DIR`, `normalize_base_url`, `mark_executable`, `download_to_file`, `extract_esptool_archive`) als funktionslokale Importe aus `app.py` ergänzen.
3. In `app.py`: den verschobenen Code entfernen, an der gleichen Stelle einen `from telegraf import (...)`-Import einfügen.
4. `python -m py_compile app.py telegraf.py`.
5. Smoke-Test: `python app.py` starten, Telegraf-Tab öffnen, „Test Device", „Start", „Stop" durchklicken, prüfen dass die Konfiguration weiterhin korrekt in `config.json` landet (`save_passwords`-Verhalten unverändert testen).

## Verifikation

- `python -m py_compile app.py telegraf.py`
- Laufzeit-Smoke-Test des Telegraf-Tabs (siehe Schritt 5 oben)
- Diff-Review: Funktionskörper der verschobenen Funktionen sind byte-identisch zur bisherigen Fassung, nur Imports sind neu hinzugekommen
