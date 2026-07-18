# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Brautomat32 ServiceTool is the desktop companion app for Brautomat32 devices (ESP32-based brewing controllers). It runs a local HTTP server with a browser-based UI (no Qt/Tkinter GUI framework) and is packaged as a standalone desktop app via PyInstaller for Windows, Linux, and macOS.

See [doc/Overview.md](doc/Overview.md) for a full architecture writeup with file/line references.

## Commands

### Run from source

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

or simply `start_servicetool.cmd`. The UI opens automatically on `http://127.0.0.1:8765` (or the next free port).

### Build

- `build_servicetool.cmd` — local Windows-only PyInstaller build (`dist\Brautomat32ServiceTool.exe`).
- `build_servicetool_windows_release.ps1` — full Windows release build: builds the exe, zips it, and updates the Windows SHA256 in `version.json`.
- Linux and macOS are **not** built locally — only via the manual GitHub Actions workflow `.github/workflows/servicetool-build.yml` (`workflow_dispatch`). Enabling `Publish release` in that workflow updates `version.json`, commits it to `main`, and creates the GitHub Release with all three platform ZIPs. Releases may only be published from `main`.

### Tests / linting

There is no automated test suite and no lint config (no `pyproject.toml`/`ruff`/`flake8`) in this repository. Broad `except Exception` blocks in `app.py` carry deliberate `# noqa: BLE001` markers — don't "fix" these into narrower exceptions without checking why they're there first.

The only test integration is an **optional, private** Node.js Test Runner that lives in a separate `privBrautomat32` repository. It is enabled only when all of these are present:
- `$env:BRAUTOMAT32_SOURCE_ROOT` set to a local checkout of that private repo
- `tasks/test-automation/README.md` and `tasks/test-automation/ACTIVE.md`
- `tools/test-runner/package.json` and `tools/test-runner/src/index.js`
- at least one `*-config.json` suite, and a Node.js runtime available

Without these, the Test Runner tab stays hidden (`?hide_test=1` forces it hidden regardless). Do not try to add this integration's source to this repo — it belongs elsewhere.

## Architecture

- **Most backend logic lives in one file, `app.py`** (~5000+ lines, many top-level functions and classes). The one exception is the Telegraf functionality, which was split into a sibling **`telegraf.py`** module (config generation, the `TelegrafSession` subprocess wrapper, binary provisioning). `telegraf.py` pulls the few shared `app.py` helpers (`CACHE_DIR`, `DATA_ROOT`, `now_iso`, `normalize_base_url`, `download_to_file`, …) via **function-local** imports to stay import-order independent. There is otherwise no package layout — search within these two files rather than expecting a multi-module tree.
- **No Flask/FastAPI** — the HTTP server is built directly on `http.server.ThreadingHTTPServer` / `BaseHTTPRequestHandler` (`AppHandler`). Routing is manual `if path == "/api/..."` dispatch in `_route_api_get` (GET) and `do_POST`, not framework routing.
- **Frontend is vanilla JS/HTML/CSS** under `static/` (`app.js` ~4200 lines) — a single-page app with tab-based navigation (`static/index.html`), no component framework. `app.js` keeps state in plain global objects and syncs the DOM directly via `fetch()` calls against the JSON API.
- **Long-running operations (flashing, backup, migration, web-file updates) use a polling Job pattern**: `Job` + thread-safe `JobStore` run each operation in its own thread; the frontend polls `/api/jobs/<id>` for progress/logs. There are no WebSockets.
- **Global session state** (`ServiceState`/`STATE`) holds `SerialSession`, `TelegrafSession`, `TestRunnerSession`, each wrapping a subprocess with a `_pump` thread reading its output into a bounded `deque`.
- **Two independent device channels** that get reconciled into one connection state machine (`No device` → `Checking` → `Serial` → `Online`):
  - **Serial**: normally via `pyserial`; if `pyserial` is unavailable, falls back to a **PowerShell subprocess** using `System.IO.Ports.SerialPort`. Flashing shells out to the `esptool` CLI (bundled on Windows, otherwise downloaded on first use) and parses its stdout for progress — it does not use esptool's Python API.
  - **Network**: plain `urllib.request` (no `requests` library) against the device's local HTTP API, plus mDNS via `MdnsAdvertiser` for `*.local` discovery.
  - `exclusive_serial_access` (a context manager) pauses the Serial Monitor during flash/backup/migration operations that need exclusive port access, then restarts it afterward.
- **Telegraf integration** (`telegraf.py`): ServiceTool generates the Telegraf config from the form and starts/stops the process; the metric forwarding itself is entirely Telegraf's job. The generated config prepares the data fully — it renames the device's short JSON fields to readable names (`processors.rename`), sets `name_override = "brautomat_telemetry"` and `omit_hostname`, writes a fixed-column CSV plus a one-off header, flattens MQTT output via JSONata, and adds SQL type conversion / `ANSI_QUOTES` handling. All of this comes from `builtin_templates()` (internal `{{placeholder}}` templates, no external template engine). A `templates_dir` lets the user supply their own `.conf` files instead (rendered with the same placeholder substitution), and `export_telegraf_templates()` writes the built-in templates (placeholders only, no secrets) as a starting point. Telegraf runs with `cwd = DATA_ROOT` so a relative CSV path persists rather than being deleted with the temp config dir. The binary is downloaded on first use (not bundled) into `cache/tools` and verified against `TELEGRAF_CHECKSUMS` before extraction (fail closed). Destination passwords are not persisted to `config.json` unless the user explicitly opts in.
- **Self-update**: checks `version.json` on GitHub at startup, downloads the release ZIP, verifies SHA256, and on Windows can self-replace the running exe.
- **Runtime data vs. app files are deliberately separated** (`detect_data_root()`): Windows keeps `config.json`/`logs`/`backups`/`cache`/`inventar` next to the exe; Linux uses `~/.local/share/Brautomat32ServiceTool`; macOS uses `~/Library/Application Support/Brautomat32ServiceTool`. These runtime folders are git-ignored — never assume they exist relative to `app.py` on Linux/macOS.

## Conventions

- Never commit real WiFi, database, InfluxDB, or MQTT credentials — Telegraf configs containing them are generated at runtime into a protected temp directory and removed after the process stops.
- **`CSV_TELEGRAF_COLUMNS` (telegraf.py) is the single source for the CSV layout.** Both the generated `csv_columns` and the file header (`csv_header_columns()`, written once by `ensure_csv_header()`) derive from it, so they can't drift. Telegraf itself writes no header (`csv_header = false`).
- **`TELEGRAF_CHECKSUMS` must be bumped together with `TELEGRAF_VERSION` (telegraf.py).** The download is verified against these official per-platform archive SHA256 values (from the GitHub release table) and fails closed on a missing or mismatching entry — raising the version without updating the checksums breaks every download.
- **Development helpers**: `python tools/mock_server.py` serves a fake `/telemetry` device, and `docker compose up -d` starts test databases + a provisioned Grafana (see the README "Testing without hardware" section). Both use the `brautomat` test credentials only — never production data.
- Release ZIPs are never committed to git history; they're published as GitHub Release assets only.
- When bumping the version, update it consistently in `app.py`, `static/app.js`, `static/index.html`, and `version.json` (see `CONTRIBUTING.md`).
- `tasks/ACTIVE.md` and `tasks/archive/` track shared development tasks in German; keep credentials, local paths, and device backup data out of these files.
