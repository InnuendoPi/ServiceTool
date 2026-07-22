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

import hashlib
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

# Offiziell veröffentlichte SHA256-Prüfsummen der Release-ARCHIVE (.zip/.tar.gz)
# für TELEGRAF_VERSION, je Plattform-Schlüssel (<os>_<arch>). Quelle: die
# "Packages"-Tabelle des GitHub-Release
# (https://github.com/influxdata/telegraf/releases/tag/v1.39.1) - diese Tabelle
# ist verlässlicher als influxdata.com/downloads bzw. docs.influxdata.com, wo
# beim Nachprüfen widersprüchliche Werte standen.
#
# WICHTIG: Wird TELEGRAF_VERSION angehoben, MÜSSEN diese Werte mit den neuen,
# offiziellen SHA256-Prüfsummen aus der GitHub-Release-Tabelle der neuen Version
# ersetzt werden - sonst schlägt der Download für jede Plattform fehl (fail
# closed, siehe ensure_telegraf_available).
TELEGRAF_CHECKSUMS = {
    "linux_amd64":   "d9194fb73fadc18f88d7d6649a2e018168028bedec1fdbc5fb655aaed120647a",
    "linux_arm64":   "ed46395c24c47f8360db9d1f0c8684640368879d2aa7fc41e6fe0f8a878990cd",
    "windows_amd64": "b68a1cd98c933d02fc5c1adcc2c0e1f19078e692dd47c47cdc122e552cb3b465",
    "windows_arm64": "0d452cf167a6f1c2d82b27b52c4cdd9783aa342925c6138091da0dc5a7438d57",
    "darwin_amd64":  "653c8a4b5afe66b0a6223952853de9f4d9ad4387b62858248fcad1ff4021e060",
    "darwin_arm64":  "cb0be878c76cf64d26da63ef77f9fa683ede2b1a79bcbfcbfed836bad16200e0",
}

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
        "templates_dir": "",
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
def telegraf_platform_key() -> str:
    """Plattform-Schlüssel <os>_<arch>, passend zu TELEGRAF_CHECKSUMS und zum
    Dateinamen des Release-Archivs."""
    system = platform.system().lower()
    machine = platform.machine().lower()
    if system == "windows" and machine in {"amd64", "x86_64"}:
        return "windows_amd64"
    if system == "darwin" and machine in {"amd64", "x86_64"}:
        return "darwin_amd64"
    if system == "darwin" and machine in {"arm64", "aarch64"}:
        return "darwin_arm64"
    if system == "linux" and machine in {"amd64", "x86_64"}:
        return "linux_amd64"
    if system == "linux" and machine in {"arm64", "aarch64"}:
        return "linux_arm64"
    raise RuntimeError(f"Unsupported platform for Telegraf: {platform.system()} {platform.machine()}")


def telegraf_platform_asset() -> tuple[str, str]:
    key = telegraf_platform_key()
    extension = "zip" if key.startswith("windows") else "tar.gz"
    executable = "telegraf.exe" if key.startswith("windows") else "telegraf"
    return (f"telegraf-{TELEGRAF_VERSION}_{key}.{extension}", executable)


def _sha256_file(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


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


def download_telegraf(on_status=None, on_progress=None) -> pathlib.Path:
    """Stellt die Telegraf-Binary bereit und gibt ihren Pfad zurück: eine
    mitgelieferte oder bereits gecachte Binary wird direkt genutzt, sonst wird das
    Release-Archiv heruntergeladen, gegen TELEGRAF_CHECKSUMS geprüft (fail closed)
    und entpackt. Optionale Callbacks: on_status(text) meldet die aktuelle Phase,
    on_progress(done_bytes, total_bytes) den Download-Fortschritt."""
    from app import TOOLS_CACHE_DIR, mark_executable, extract_esptool_archive

    def status(message: str) -> None:
        if on_status:
            on_status(message)

    bundled = bundled_telegraf_path()
    if bundled:
        status(f"Telegraf ist bereits mitgeliefert: {bundled}")
        return bundled
    cached = cached_telegraf_path()
    if cached.is_file():
        mark_executable(cached)
        status(f"Telegraf ist bereits vorhanden: {cached}")
        return cached

    # Fail closed: ohne hinterlegte Prüfsumme wird gar nicht erst geladen.
    platform_key = telegraf_platform_key()
    expected = TELEGRAF_CHECKSUMS.get(platform_key)
    if not expected:
        raise RuntimeError(
            f"Für Telegraf {TELEGRAF_VERSION} ({platform_key}) ist keine SHA256-Prüfsumme "
            "hinterlegt - der Download wird aus Sicherheitsgründen abgelehnt."
        )

    asset_name, _ = telegraf_platform_asset()
    archive_path = TOOLS_CACHE_DIR / asset_name
    target_dir = cached.parent.parent
    status(f"Lade {asset_name} herunter …")
    _download_with_progress(f"{TELEGRAF_REPO_BASE}/{asset_name}", archive_path, on_progress)

    status("Prüfe SHA256-Prüfsumme …")
    actual = _sha256_file(archive_path)
    if actual.lower() != expected.lower():
        archive_path.unlink(missing_ok=True)
        raise RuntimeError(
            f"SHA256-Prüfsumme des Telegraf-Downloads stimmt nicht überein "
            f"(erwartet {expected}, erhalten {actual}) - Datei verworfen, kein Entpacken."
        )

    status("Entpacke Archiv …")
    extract_esptool_archive(archive_path, target_dir)
    if not cached.is_file():
        raise RuntimeError(f"Telegraf executable missing after extract: {cached}")
    mark_executable(cached)
    status(f"Telegraf bereit: {cached}")
    return cached


def _download_with_progress(url: str, target: pathlib.Path, on_progress) -> None:
    from app import ssl_context
    target.parent.mkdir(parents=True, exist_ok=True)
    req = request.Request(url, method="GET", headers={"User-Agent": "Brautomat32-ServiceTool"})
    with request.urlopen(req, timeout=300, context=ssl_context()) as response, target.open("wb") as handle:
        total = int(response.headers.get("Content-Length") or 0)
        done = 0
        while True:
            chunk = response.read(65536)
            if not chunk:
                break
            handle.write(chunk)
            done += len(chunk)
            if on_progress:
                on_progress(done, total)


def ensure_telegraf_available() -> pathlib.Path:
    # Auto-Bereitstellung ohne Fortschritts-Callbacks (z.B. beim Start von
    # Telegraf); der Download-Button nutzt download_telegraf() mit Callbacks.
    return download_telegraf()


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
    config["templates_dir"] = str(config.get("templates_dir") or "").strip()
    config["mqtt"]["qos"] = int(config["mqtt"].get("qos", 0))
    if config["mqtt"]["qos"] not in (0, 1, 2):
        raise RuntimeError("MQTT QoS must be 0, 1, or 2.")
    if not any(bool(config[target].get("enabled")) for target in ("csv", "influxdb", "postgres", "mysql", "mqtt")):
        raise RuntimeError("Enable at least one Telegraf destination.")
    return config


def telegraf_which_name() -> str:
    """Name der Telegraf-Programmdatei fuer die PATH-Suche (shutil.which)."""
    return "telegraf.exe" if os.name == "nt" else "telegraf"


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
    resolved = shutil.which(telegraf_which_name())
    if resolved:
        return resolved
    return str(ensure_telegraf_available())


def describe_telegraf_binary(config: dict[str, Any]) -> dict[str, Any]:
    """Ermittelt rein lesend, welche Telegraf-Programmdatei genutzt würde - ohne
    einen Download auszulösen. Für die Anzeige des gefundenen Pfads in der UI.
    Die Auflösungsreihenfolge spiegelt resolve_telegraf_binary() wider."""
    configured = str(config.get("binary") or "").strip()
    if configured:
        candidate = pathlib.Path(configured).expanduser()
        if candidate.is_file():
            return {"path": str(candidate.resolve()), "source": "configured", "available": True}
        resolved = shutil.which(configured)
        if resolved:
            return {"path": resolved, "source": "configured", "available": True}
        return {"path": "", "source": "configured", "available": False}
    resolved = shutil.which(telegraf_which_name())
    if resolved:
        return {"path": resolved, "source": "path", "available": True}
    bundled = bundled_telegraf_path()
    if bundled:
        return {"path": str(bundled), "source": "bundled", "available": True}
    cached = cached_telegraf_path()
    if cached.is_file():
        return {"path": str(cached.resolve()), "source": "cached", "available": True}
    return {"path": "", "source": "download", "available": False}


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


# Ordnet jeden Template-Namen einem Ziel-Schlüssel zu (None = wird immer
# gerendert). Steuert bei der Standardgenerierung, welche outputs-*.conf je
# nach aktivem Ziel entstehen. Die Reihenfolge bestimmt auch die Reihenfolge
# beim Export.
_TEMPLATE_TARGETS = {
    "telegraf.conf": None,
    "processors-rename.conf": None,
    "outputs-csv.conf": "csv",
    "outputs-influxdb.conf": "influxdb",
    "outputs-postgres.conf": "postgres",
    "outputs-mysql.conf": "mysql",
    "outputs-mqtt.conf": "mqtt",
}

# Platzhalter-Syntax der eingebauten und der benutzerdefinierten Templates:
# {{name}} (dotted, z.B. {{mqtt.password}}). Einzelne geschweifte Klammern
# ({TABLE}, {"timestamp": timestamp}) bleiben unangetastet - nur doppelte
# Klammern sind Platzhalter.
_PLACEHOLDER_RE = re.compile(r"\{\{\s*([\w.]+)\s*\}\}")


def _toml_escape(value: str) -> str:
    """Escaping für die Verwendung INNERHALB eines TOML-Basic-Strings ("..."),
    ohne umschließende Anführungszeichen (die stehen im Template). Deckt die
    injektionsrelevanten Fälle ab (Backslash, Anführungszeichen, Steuerzeichen)
    - jeder eingesetzte Wert kann so einen "-String nicht verlassen."""
    out = []
    for ch in value:
        if ch == "\\":
            out.append("\\\\")
        elif ch == '"':
            out.append('\\"')
        elif ch == "\n":
            out.append("\\n")
        elif ch == "\r":
            out.append("\\r")
        elif ch == "\t":
            out.append("\\t")
        elif ch == "\b":
            out.append("\\b")
        elif ch == "\f":
            out.append("\\f")
        elif ord(ch) < 0x20:
            out.append(f"\\u{ord(ch):04x}")
        else:
            out.append(ch)
    return "".join(out)


def render_template(text: str, context: dict[str, str]) -> str:
    """Ersetzt {{name}}-Platzhalter durch die (TOML-escapten) Werte aus context.
    Unbekannte Platzhalter sind ein Fehler, damit Tippfehler in eigenen
    Templates sofort auffallen statt still leer zu bleiben."""
    def repl(match: "re.Match[str]") -> str:
        key = match.group(1)
        if key not in context:
            raise RuntimeError(f"Unbekannter Platzhalter im Telegraf-Template: {{{{{key}}}}}")
        return _toml_escape(str(context[key]))
    return _PLACEHOLDER_RE.sub(repl, text)


def template_context(config: dict[str, Any]) -> dict[str, str]:
    """Flache Platzhalter->Wert-Zuordnung für render_template. Alle Werte werden
    beim Einsetzen TOML-escaped; String-Platzhalter gehören daher im Template in
    doppelte Anführungszeichen (z.B. password = "{{mqtt.password}}")."""
    log_level = config.get("log_level", "info")
    influx, pg, my, mqtt = config["influxdb"], config["postgres"], config["mysql"], config["mqtt"]
    return {
        "interval": config["interval"],
        "log_level": log_level,
        "log_debug": "true" if log_level == "debug" else "false",
        "log_quiet": "true" if log_level == "quiet" else "false",
        "device_url": config["device_url"],
        "telemetry_url": telemetry_url(config["device_url"]),
        "csv.path": config["csv"]["path"],
        "influxdb.url": influx["url"],
        "influxdb.token": influx["token"],
        "influxdb.org": influx["org"],
        "influxdb.bucket": influx["bucket"],
        "postgres.host": pg["host"],
        "postgres.port": pg["port"],
        "postgres.database": pg["database"],
        "postgres.user": pg["user"],
        "postgres.password": pg["password"],
        "postgres.dsn": f"postgres://{pg['user']}:{pg['password']}@{pg['host']}:{pg['port']}/{pg['database']}",
        "mysql.host": my["host"],
        "mysql.port": my["port"],
        "mysql.database": my["database"],
        "mysql.user": my["user"],
        "mysql.password": my["password"],
        "mysql.dsn": f"{my['user']}:{my['password']}@tcp({my['host']}:{my['port']})/{my['database']}",
        "mqtt.server": mqtt["server"],
        "mqtt.topic": mqtt["topic"],
        "mqtt.qos": str(mqtt["qos"]),
        "mqtt.client_id": mqtt["client_id"],
        "mqtt.username": mqtt["username"],
        "mqtt.password": mqtt["password"],
    }


def _sql_convert(real_type: str) -> str:
    # Typmapping telegraf -> SQL. Nur "real" unterscheidet sich zwischen
    # Postgres (REAL) und MySQL/MariaDB (DOUBLE).
    return (
        "  [outputs.sql.convert]\n"
        '    integer = "INT"\n'
        f'    real = "{real_type}"\n'
        '    text = "TEXT"\n'
        '    timestamp = "TIMESTAMP"\n'
        '    defaultvalue = "TEXT"\n'
        '    unsigned = "UNSIGNED"\n'
        '    bool = "BOOL"\n'
        '    conversion_style = "unsigned_suffix"\n'
    )


def builtin_templates() -> dict[str, str]:
    """Die eingebauten Telegraf-Config-Templates mit {{platzhalter}}. Einzige
    Quelle für die Standardgenerierung (gerendert) UND den Export (unverändert).
    Die strukturellen Teile (Feld-Umbenennung, CSV-Spalten) stammen aus den
    Konstanten FIELD_RENAMES/CSV_TELEGRAF_COLUMNS, damit sie nicht driften."""
    rename = "[[processors.rename]]\n"
    for field, dest in FIELD_RENAMES:
        rename += (
            "  [[processors.rename.replace]]\n"
            f'    field = "{field}"\n'
            f'    dest = "{dest}"\n'
        )
    csv_columns = ",\n".join(f'    "{col}"' for col in CSV_TELEGRAF_COLUMNS)
    return {
        "telegraf.conf": (
            "[agent]\n"
            '  interval = "{{interval}}"\n'
            "  round_interval = true\n"
            '  flush_interval = "{{interval}}"\n'
            "  omit_hostname = true\n"
            "  debug = {{log_debug}}\n"
            "  quiet = {{log_quiet}}\n"
            "\n"
            "[[inputs.http]]\n"
            '  urls = ["{{telemetry_url}}"]\n'
            '  name_override = "brautomat_telemetry"\n'
            '  method = "GET"\n'
            '  data_format = "json"\n'
            '  json_time_key = "t"\n'
            '  json_time_format = "unix"\n'
            '  tag_keys = ["mode", "stepName"]\n'
            '  timeout = "5s"\n'
            '  interval = "{{interval}}"\n'
        ),
        "processors-rename.conf": rename,
        "outputs-csv.conf": (
            "[[outputs.file]]\n"
            '  files = ["{{csv.path}}"]\n'
            '  data_format = "csv"\n'
            # csv_header bleibt false: der Header wird einmalig von
            # ensure_csv_header geschrieben (telegraf würde ihn sonst bei jedem
            # Flush erneut einfügen).
            "  csv_header = false\n"
            "  csv_columns = [\n" + csv_columns + "\n  ]\n"
        ),
        "outputs-influxdb.conf": (
            "[[outputs.influxdb_v2]]\n"
            '  urls = ["{{influxdb.url}}"]\n'
            '  token = "{{influxdb.token}}"\n'
            '  organization = "{{influxdb.org}}"\n'
            '  bucket = "{{influxdb.bucket}}"\n'
        ),
        "outputs-postgres.conf": (
            "[[outputs.sql]]\n"
            '  driver = "pgx"\n'
            '  data_source_name = "postgres://{{postgres.user}}:{{postgres.password}}@{{postgres.host}}:{{postgres.port}}/{{postgres.database}}"\n'
            '  table_template = "CREATE TABLE {TABLE}({COLUMNS})"\n'
            '  table_update_template = "ALTER TABLE {TABLE} ADD COLUMN {COLUMN}"\n'
            + _sql_convert("REAL")
        ),
        "outputs-mysql.conf": (
            "[[outputs.sql]]\n"
            '  driver = "mysql"\n'
            '  data_source_name = "{{mysql.user}}:{{mysql.password}}@tcp({{mysql.host}}:{{mysql.port}})/{{mysql.database}}"\n'
            '  table_template = "CREATE TABLE {TABLE}({COLUMNS})"\n'
            '  table_exists_template = "SELECT 1 FROM {TABLE} LIMIT 1"\n'
            "  init_sql = \"SET sql_mode='ANSI_QUOTES';\"\n"
            '  table_update_template = "ALTER TABLE {TABLE} ADD COLUMN {COLUMN}"\n'
            + _sql_convert("DOUBLE")
        ),
        "outputs-mqtt.conf": (
            "[[outputs.mqtt]]\n"
            '  servers = ["{{mqtt.server}}"]\n'
            '  topic = "{{mqtt.topic}}"\n'
            "  qos = {{mqtt.qos}}\n"
            '  client_id = "{{mqtt.client_id}}"\n'
            '  username = "{{mqtt.username}}"\n'
            '  password = "{{mqtt.password}}"\n'
            '  data_format = "json"\n'
            # JSONata fasst fields, tags und timestamp zu einem flachen
            # JSON-Objekt zusammen (single-quoted TOML-Literal, kein Escaping).
            '  json_transformation = \'$merge([fields, tags, {"timestamp": timestamp}])\'\n'
        ),
    }


def _template_dest(name: str, work_dir: pathlib.Path, conf_dir: pathlib.Path) -> pathlib.Path:
    # telegraf.conf liegt im Hauptverzeichnis, alles andere in telegraf.d/.
    return work_dir / name if name == "telegraf.conf" else conf_dir / name


def _write_builtin_config(config: dict[str, Any], work_dir: pathlib.Path, conf_dir: pathlib.Path) -> None:
    ctx = template_context(config)
    for name, template in builtin_templates().items():
        target_key = _TEMPLATE_TARGETS[name]
        if target_key is not None and not config[target_key].get("enabled"):
            continue
        _template_dest(name, work_dir, conf_dir).write_text(render_template(template, ctx), encoding="utf-8")


def _write_custom_config(src: pathlib.Path, config: dict[str, Any], work_dir: pathlib.Path, conf_dir: pathlib.Path) -> None:
    main = src / "telegraf.conf"
    if not main.is_file():
        raise RuntimeError(f"Templates-Verzeichnis enthält keine telegraf.conf: {src}")
    ctx = template_context(config)
    (work_dir / "telegraf.conf").write_text(render_template(main.read_text(encoding="utf-8"), ctx), encoding="utf-8")
    src_d = src / "telegraf.d"
    if src_d.is_dir():
        for conf in sorted(src_d.glob("*.conf")):
            (conf_dir / conf.name).write_text(render_template(conf.read_text(encoding="utf-8"), ctx), encoding="utf-8")


def write_telegraf_config(config: dict[str, Any]) -> pathlib.Path:
    from app import CACHE_DIR
    work_dir = pathlib.Path(tempfile.mkdtemp(prefix="brautomat-telegraf-", dir=str(CACHE_DIR)))
    try:
        os.chmod(work_dir, 0o700)
        conf_dir = work_dir / "telegraf.d"
        conf_dir.mkdir()
        templates_dir = str(config.get("templates_dir") or "").strip()
        if templates_dir:
            _write_custom_config(pathlib.Path(templates_dir).expanduser(), config, work_dir, conf_dir)
        else:
            _write_builtin_config(config, work_dir, conf_dir)
        for path in work_dir.rglob("*.conf"):
            os.chmod(path, 0o600)
        return work_dir
    except Exception:
        shutil.rmtree(work_dir, ignore_errors=True)
        raise


def export_telegraf_templates(dest_dir: str) -> list[str]:
    """Schreibt die eingebauten Templates (mit {{platzhalter}}, ohne
    Klartext-Zugangsdaten) nach dest_dir als Ausgangspunkt für eigene
    Anpassungen. Das Ergebnisverzeichnis kann anschließend unverändert als
    templates_dir verwendet werden."""
    dest = pathlib.Path(dest_dir).expanduser()
    written: list[str] = []
    conf_dir = dest / "telegraf.d"
    for name, template in builtin_templates().items():
        target = _template_dest(name, dest, conf_dir)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(template, encoding="utf-8")
        written.append(str(target))
    return written


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
            # Bei eigenen Templates gehört der CSV-Header (und ob es überhaupt
            # ein CSV-Ziel gibt) dem Nutzer - dann nicht automatisch schreiben.
            if not config.get("templates_dir"):
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
