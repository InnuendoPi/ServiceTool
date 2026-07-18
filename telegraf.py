"""Telegraf-Funktionalität des ServiceTools.

Erste in sich geschlossene Scheibe des in doc/Refactor-Plan-Telegraf-Split.md
beschriebenen Umbaus: die gesamte Telegraf-Logik (Session, Config-Generierung,
Binary-Download) lebt hier statt in app.py.

Die wenigen weiterhin in app.py verbleibenden, generisch genutzten Helfer
(CACHE_DIR, TOOLS_CACHE_DIR, APP_ROOT, normalize_base_url, now_iso,
mark_executable, download_to_file, extract_esptool_archive) werden bewusst als
**funktionslokale** Importe aus app.py geholt. Das entkoppelt dieses Modul von
der Position der `from telegraf import ...`-Zeile in app.py und vermeidet
Zirkularitäts-/Reihenfolgeprobleme beim Import (siehe Refactor-Plan,
Abschnitt "Design-Entscheidung: Import-Richtung & Zirkularität").
"""
from __future__ import annotations

import json
import os
import pathlib
import platform
import re
import shutil
import subprocess
import tempfile
import threading
import time
from collections import deque
from typing import Any
from urllib import request

# Telegraf-Version, die "telegraf herunterladen" bezieht, und die Basis-URL der
# offiziellen InfluxData-Release-Downloads.
TELEGRAF_VERSION = "1.39.1"
TELEGRAF_REPO_BASE = "https://dl.influxdata.com/telegraf/releases"

# Gültige Werte für das telegraf-eigene Log-Level (steuert debug/quiet im
# [agent]-Block, siehe write_telegraf_config). Default ist "info".
TELEGRAF_LOG_LEVELS = ("quiet", "info", "debug")

# Kurze Geräte-JSON-Feldnamen -> sprechende Namen. Wird global als
# processors.rename für ALLE Ziele gerendert (unabhängig davon, welche aktiv
# sind). "t" fehlt bewusst: json_time_key = "t" verbraucht das Feld bereits als
# Zeitstempel der Metrik, danach existiert kein umzubenennendes Feld "t" mehr.
FIELD_RENAMES = (
    ("m", "mash_temperature"),
    ("mt", "mash_target_temperature"),
    ("mp", "mash_power_percent"),
    ("s", "boil_kettle_temperature"),
    ("st", "boil_kettle_target_temperature"),
    ("sp", "boil_kettle_power_percent"),
    ("h", "hlt_temperature"),
    ("ht", "hlt_target_temperature"),
    ("hp", "hlt_power_percent"),
    ("f", "fermenter_temperature"),
    ("ft", "fermenter_target_temperature"),
)

# Feste CSV-Spaltenreihenfolge (statt telegrafs alphabetischem Default). Die
# "tag."/"field."-Präfixe sind die telegraf-internen Spaltennamen für
# outputs.file (csv_columns); der Datei-Header nutzt dieselbe Reihenfolge ohne
# Präfix (siehe csv_header_columns). Beide stammen aus dieser einen Liste,
# damit Header und tatsächliche Datenspalten nie auseinanderdriften.
CSV_TELEGRAF_COLUMNS = (
    "timestamp",
    "tag.mode",
    "tag.stepName",
    "field.mash_temperature",
    "field.mash_target_temperature",
    "field.mash_power_percent",
    "field.boil_kettle_temperature",
    "field.boil_kettle_target_temperature",
    "field.boil_kettle_power_percent",
    "field.hlt_temperature",
    "field.hlt_target_temperature",
    "field.hlt_power_percent",
    "field.fermenter_temperature",
    "field.fermenter_target_temperature",
)


def csv_header_columns() -> list[str]:
    """CSV-Header-Spalten: CSV_TELEGRAF_COLUMNS ohne den telegraf-internen
    "tag."/"field."-Präfix ("timestamp" bleibt unverändert)."""
    return [col.split(".", 1)[-1] for col in CSV_TELEGRAF_COLUMNS]


def default_telegraf_config() -> dict[str, Any]:
    return {
        "binary": "",
        "device_url": "http://brautomat.local",
        "interval": "30s",
        "log_level": "info",
        "save_passwords": False,
        "csv": {"enabled": True, "path": "brautomat.csv"},
        "influxdb": {"enabled": False, "url": "http://localhost:8086", "token": "", "org": "", "bucket": "brautomat"},
        "postgres": {"enabled": False, "host": "localhost", "port": "5432", "database": "brautomat", "user": "brautomat", "password": ""},
        "mysql": {"enabled": False, "host": "localhost", "port": "3306", "database": "brautomat", "user": "brautomat", "password": ""},
        "mqtt": {"enabled": False, "server": "tcp://localhost:1883", "topic": "brautomat/telemetry", "client_id": "brautomat-telegraf", "username": "", "password": "", "qos": 0},
    }


# ---------------------------------------------------------------------------
# Telegraf binary provisioning
# On-demand download+caching of the Telegraf binary into cache/tools (bundled
# binary next to the exe wins if present).
# ---------------------------------------------------------------------------
def telegraf_platform_asset() -> tuple[str, str]:
    system = platform.system().lower()
    machine = platform.machine().lower()
    executable = "telegraf.exe" if system == "windows" else "telegraf"
    if system == "windows" and machine in {"amd64", "x86_64"}:
        return (f"telegraf-{TELEGRAF_VERSION}_windows_amd64.zip", executable)
    if system == "darwin" and machine in {"amd64", "x86_64"}:
        return (f"telegraf-{TELEGRAF_VERSION}_darwin_amd64.tar.gz", executable)
    if system == "darwin" and machine in {"arm64", "aarch64"}:
        return (f"telegraf-{TELEGRAF_VERSION}_darwin_arm64.tar.gz", executable)
    if system == "linux" and machine in {"amd64", "x86_64"}:
        return (f"telegraf-{TELEGRAF_VERSION}_linux_amd64.tar.gz", executable)
    if system == "linux" and machine in {"arm64", "aarch64"}:
        return (f"telegraf-{TELEGRAF_VERSION}_linux_arm64.tar.gz", executable)
    raise RuntimeError(f"Unsupported platform for Telegraf: {platform.system()} {platform.machine()}")


def cached_telegraf_path() -> pathlib.Path:
    from app import TOOLS_CACHE_DIR
    _, executable = telegraf_platform_asset()
    return TOOLS_CACHE_DIR / f"telegraf-{TELEGRAF_VERSION}" / f"telegraf-{TELEGRAF_VERSION}" / executable


def bundled_telegraf_path() -> pathlib.Path | None:
    from app import APP_ROOT
    local_telegraf_dir = APP_ROOT / "telegraf"
    _, executable = telegraf_platform_asset()
    candidate = local_telegraf_dir / executable
    return candidate if candidate.is_file() else None


def ensure_telegraf_available() -> pathlib.Path:
    from app import TOOLS_CACHE_DIR, mark_executable, download_to_file, extract_esptool_archive
    bundled = bundled_telegraf_path()
    if bundled:
        return bundled
    cached = cached_telegraf_path()
    if cached.is_file():
        mark_executable(cached)
        return cached

    asset_name, _ = telegraf_platform_asset()
    archive_path = TOOLS_CACHE_DIR / asset_name
    target_dir = cached.parent.parent
    download_to_file(f"{TELEGRAF_REPO_BASE}/{asset_name}", archive_path, timeout=300.0)
    extract_esptool_archive(archive_path, target_dir)
    if not cached.is_file():
        raise RuntimeError(f"Telegraf executable missing after extract: {cached}")
    mark_executable(cached)
    return cached


# ---------------------------------------------------------------------------
# Telegraf configuration
# Builds the temporary Telegraf TOML config from the user's destination
# settings; the file (incl. any credentials) is written to a protected temp
# directory and removed once the Telegraf process stops.
# ---------------------------------------------------------------------------
def toml_string(value: Any) -> str:
    return json.dumps(str(value or ""), ensure_ascii=False)


def normalize_telegraf_config(raw: Any) -> dict[str, Any]:
    from app import normalize_base_url
    config = default_telegraf_config()
    if isinstance(raw, dict):
        config.update({key: value for key, value in raw.items() if key in config})
        for target in ("csv", "influxdb", "postgres", "mysql", "mqtt"):
            if isinstance(raw.get(target), dict):
                defaults = default_telegraf_config()[target]
                defaults.update(raw[target])
                config[target] = defaults
    config["device_url"] = normalize_base_url(str(config["device_url"]))
    interval = str(config["interval"] or "").strip()
    if not re.fullmatch(r"\d+(ms|s|m|h)", interval):
        raise RuntimeError("Telegraf interval must use a duration such as 10s, 1m, or 500ms.")
    config["interval"] = interval
    log_level = str(config.get("log_level") or "info").strip().lower()
    config["log_level"] = log_level if log_level in TELEGRAF_LOG_LEVELS else "info"
    config["mqtt"]["qos"] = int(config["mqtt"].get("qos", 0))
    if config["mqtt"]["qos"] not in (0, 1, 2):
        raise RuntimeError("MQTT QoS must be 0, 1, or 2.")
    if not any(bool(config[target].get("enabled")) for target in ("csv", "influxdb", "postgres", "mysql", "mqtt")):
        raise RuntimeError("Enable at least one Telegraf destination.")
    return config


def resolve_telegraf_binary(config: dict[str, Any]) -> str:
    configured = str(config.get("binary") or "").strip()
    if configured:
        candidate = pathlib.Path(configured).expanduser()
        if candidate.is_file():
            return str(candidate.resolve())
        resolved = shutil.which(configured)
        if resolved:
            return resolved
        raise RuntimeError(f"Configured Telegraf executable was not found: {configured}")
    executable = "telegraf.exe" if os.name == "nt" else "telegraf"
    resolved = shutil.which(executable)
    if resolved:
        return resolved
    return str(ensure_telegraf_available())


def telemetry_url(device_url: str) -> str:
    from app import normalize_base_url
    return f"{normalize_base_url(device_url)}/telemetry"


def test_telegraf_device(device_url: str) -> dict[str, Any]:
    url = telemetry_url(device_url)
    req = request.Request(url, headers={"User-Agent": "Brautomat32-ServiceTool"})
    with request.urlopen(req, timeout=5) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, dict) or "t" not in payload:
        raise RuntimeError("The response is not a Brautomat telemetry payload (field 't' is missing).")
    return {"url": url, "timestamp": payload["t"], "mode": payload.get("mode", "")}


def _sql_convert_lines(real_type: str) -> list[str]:
    # Typmapping telegraf -> SQL. Nur "real" unterscheidet sich zwischen
    # Postgres (REAL) und MySQL/MariaDB (DOUBLE).
    return [
        "  [outputs.sql.convert]",
        "    integer = \"INT\"",
        f"    real = {toml_string(real_type)}",
        "    text = \"TEXT\"",
        "    timestamp = \"TIMESTAMP\"",
        "    defaultvalue = \"TEXT\"",
        "    unsigned = \"UNSIGNED\"",
        "    bool = \"BOOL\"",
        "    conversion_style = \"unsigned_suffix\"",
    ]


def write_telegraf_config(config: dict[str, Any]) -> pathlib.Path:
    from app import CACHE_DIR
    work_dir = pathlib.Path(tempfile.mkdtemp(prefix="brautomat-telegraf-", dir=str(CACHE_DIR)))
    try:
        os.chmod(work_dir, 0o700)
        conf_dir = work_dir / "telegraf.d"
        conf_dir.mkdir()

        # telegraf kennt kein einzelnes Log-Level-Feld, sondern nur debug/quiet.
        log_level = config.get("log_level", "info")
        debug = "true" if log_level == "debug" else "false"
        quiet = "true" if log_level == "quiet" else "false"

        main_conf = "\n".join([
            "[agent]",
            f"  interval = {toml_string(config['interval'])}",
            "  round_interval = true",
            f"  flush_interval = {toml_string(config['interval'])}",
            "  omit_hostname = true",
            f"  debug = {debug}",
            f"  quiet = {quiet}",
            "",
            "[[inputs.http]]",
            f"  urls = [{toml_string(telemetry_url(config['device_url']))}]",
            "  name_override = \"brautomat_telemetry\"",
            "  method = \"GET\"",
            "  data_format = \"json\"",
            "  json_time_key = \"t\"",
            "  json_time_format = \"unix\"",
            "  tag_keys = [\"mode\", \"stepName\"]",
            "  timeout = \"5s\"",
            f"  interval = {toml_string(config['interval'])}",
            "",
        ])
        (work_dir / "telegraf.conf").write_text(main_conf, encoding="utf-8")

        # processors.rename gilt immer, unabhängig von den aktiven Zielen -
        # benennt die kurzen Gerätefelder global in sprechende Namen um.
        rename_lines = ["[[processors.rename]]"]
        for field, dest in FIELD_RENAMES:
            rename_lines.append("  [[processors.rename.replace]]")
            rename_lines.append(f"    field = {toml_string(field)}")
            rename_lines.append(f"    dest = {toml_string(dest)}")
        rename_lines.append("")
        (conf_dir / "processors-rename.conf").write_text("\n".join(rename_lines), encoding="utf-8")

        targets = config
        if targets["csv"]["enabled"]:
            csv_columns = ",\n".join(f"    {toml_string(col)}" for col in CSV_TELEGRAF_COLUMNS)
            content = "\n".join([
                "[[outputs.file]]",
                f"  files = [{toml_string(targets['csv']['path'])}]",
                "  data_format = \"csv\"",
                # csv_header bleibt false: der Header wird einmalig von
                # ensure_csv_header geschrieben (telegraf würde ihn sonst bei
                # jedem Flush erneut einfügen).
                "  csv_header = false",
                f"  csv_columns = [\n{csv_columns}\n  ]",
                "",
            ])
            (conf_dir / "outputs-csv.conf").write_text(content, encoding="utf-8")
        if targets["influxdb"]["enabled"]:
            content = "\n".join(["[[outputs.influxdb_v2]]", f"  urls = [{toml_string(targets['influxdb']['url'])}]", f"  token = {toml_string(targets['influxdb']['token'])}", f"  organization = {toml_string(targets['influxdb']['org'])}", f"  bucket = {toml_string(targets['influxdb']['bucket'])}", ""])
            (conf_dir / "outputs-influxdb.conf").write_text(content, encoding="utf-8")
        if targets["postgres"]["enabled"]:
            item = targets["postgres"]
            dsn = f"postgres://{item['user']}:{item['password']}@{item['host']}:{item['port']}/{item['database']}"
            content = "\n".join([
                "[[outputs.sql]]",
                "  driver = \"pgx\"",
                f"  data_source_name = {toml_string(dsn)}",
                "  table_template = \"CREATE TABLE {TABLE}({COLUMNS})\"",
                "  table_update_template = \"ALTER TABLE {TABLE} ADD COLUMN {COLUMN}\"",
                *_sql_convert_lines("REAL"),
                "",
            ])
            (conf_dir / "outputs-postgres.conf").write_text(content, encoding="utf-8")
        if targets["mysql"]["enabled"]:
            item = targets["mysql"]
            dsn = f"{item['user']}:{item['password']}@tcp({item['host']}:{item['port']})/{item['database']}"
            content = "\n".join([
                "[[outputs.sql]]",
                "  driver = \"mysql\"",
                f"  data_source_name = {toml_string(dsn)}",
                "  table_template = \"CREATE TABLE {TABLE}({COLUMNS})\"",
                "  table_exists_template = \"SELECT 1 FROM {TABLE} LIMIT 1\"",
                "  init_sql = \"SET sql_mode='ANSI_QUOTES';\"",
                "  table_update_template = \"ALTER TABLE {TABLE} ADD COLUMN {COLUMN}\"",
                *_sql_convert_lines("DOUBLE"),
                "",
            ])
            (conf_dir / "outputs-mysql.conf").write_text(content, encoding="utf-8")
        if targets["mqtt"]["enabled"]:
            item = targets["mqtt"]
            content = "\n".join([
                "[[outputs.mqtt]]",
                f"  servers = [{toml_string(item['server'])}]",
                f"  topic = {toml_string(item['topic'])}",
                f"  qos = {item['qos']}",
                f"  client_id = {toml_string(item['client_id'])}",
                f"  username = {toml_string(item['username'])}",
                f"  password = {toml_string(item['password'])}",
                "  data_format = \"json\"",
                # JSONata fasst fields, tags und timestamp zu einem flachen
                # JSON-Objekt zusammen (single-quoted TOML-Literal, kein Escaping).
                "  json_transformation = '$merge([fields, tags, {\"timestamp\": timestamp}])'",
                "",
            ])
            (conf_dir / "outputs-mqtt.conf").write_text(content, encoding="utf-8")
        for path in work_dir.rglob("*.conf"):
            os.chmod(path, 0o600)
        return work_dir
    except Exception:
        shutil.rmtree(work_dir, ignore_errors=True)
        raise


def ensure_csv_header(config: dict[str, Any], base_dir: pathlib.Path) -> None:
    """Schreibt die CSV-Kopfzeile einmalig, falls das CSV-Ziel aktiv ist und die
    Datei fehlt oder leer ist. Relative Pfade werden gegen base_dir aufgelöst -
    dasselbe Verzeichnis, in dem telegraf läuft (siehe TelegrafSession.start),
    damit Header und Daten in dieselbe Datei gehen. telegraf selbst schreibt
    bewusst keinen Header (csv_header = false)."""
    csv = config.get("csv") or {}
    raw_path = str(csv.get("path") or "").strip()
    if not csv.get("enabled") or not raw_path:
        return
    path = pathlib.Path(raw_path)
    if not path.is_absolute():
        path = base_dir / path
    if path.exists() and path.stat().st_size > 0:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(",".join(csv_header_columns()) + "\n")


class TelegrafSession:
    """Runs Telegraf as a managed subprocess against a generated temp config.

    Only starts/stops the process and exposes its stdout/stderr; the actual
    metric forwarding logic lives entirely inside Telegraf itself.
    """

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._proc: subprocess.Popen[str] | None = None
        self._thread: threading.Thread | None = None
        self._work_dir: pathlib.Path | None = None
        self._logs: deque[str] = deque(maxlen=4000)
        self.status = "idle"
        self.started_at: str | None = None
        self.finished_at: str | None = None
        self.error = ""
        self.binary = ""

    def _append(self, message: str) -> None:
        from app import now_iso
        self._logs.append(f"[{now_iso()}] {message}")

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return {"running": self.status in {"running", "stopping"}, "status": self.status, "started_at": self.started_at, "finished_at": self.finished_at, "error": self.error, "binary": self.binary, "lines": list(self._logs)}

    def start(self, raw_config: Any) -> dict[str, Any]:
        from app import now_iso, DATA_ROOT
        config = normalize_telegraf_config(raw_config)
        binary = resolve_telegraf_binary(config)
        with self._lock:
            if self._proc:
                raise RuntimeError("Telegraf is already running.")
            self._logs.clear()
            self.error = ""
            self.finished_at = None
            self.started_at = now_iso()
            self.status = "running"
            self.binary = binary
            self._work_dir = write_telegraf_config(config)
            ensure_csv_header(config, DATA_ROOT)
            command = [binary, "--config", str(self._work_dir / "telegraf.conf"), "--config-directory", str(self._work_dir / "telegraf.d")]
            self._append("Starting Telegraf")
            # cwd = DATA_ROOT (nicht das temporäre work_dir): die generierten
            # .conf-Pfade sind absolut, und so landet eine relative CSV-Datei in
            # einem stabilen Verzeichnis statt im work_dir, das beim Stop gelöscht
            # wird (Parität zum Go-Projekt, das telegraf ebenfalls nicht im
            # Tempverzeichnis laufen lässt).
            self._proc = subprocess.Popen(command, cwd=str(DATA_ROOT), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace", bufsize=1)
            self._thread = threading.Thread(target=self._pump, daemon=True)
            self._thread.start()
            return self.snapshot()

    def stop(self) -> dict[str, Any]:
        with self._lock:
            if not self._proc:
                return self.snapshot()
            self.status = "stopping"
            self._append("Stopping Telegraf")
            self._proc.terminate()
            return self.snapshot()

    def clear(self) -> dict[str, Any]:
        with self._lock:
            self._logs.clear()
            return self.snapshot()

    def _pump(self) -> None:
        from app import now_iso
        with self._lock:
            proc = self._proc
        if not proc:
            return
        while True:
            line = proc.stdout.readline() if proc.stdout else ""
            if line:
                with self._lock:
                    self._append(line.rstrip())
                continue
            if proc.poll() is not None:
                break
            time.sleep(0.1)
        code = proc.wait()
        with self._lock:
            if code and self.status != "stopping":
                self.status = "failed"
                self.error = f"Telegraf exited with code {code}."
            else:
                self.status = "stopped"
            self.finished_at = now_iso()
            self._append(self.error or "Telegraf stopped.")
            self._proc = None
            work_dir, self._work_dir = self._work_dir, None
        if work_dir:
            shutil.rmtree(work_dir, ignore_errors=True)
