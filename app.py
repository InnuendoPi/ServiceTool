from __future__ import annotations

import base64
import hashlib
import http.client
import json
import mimetypes
import os
import pathlib
import platform
import re
import shutil
import socket
import ssl
import subprocess
import struct
import sys
import tarfile
import tempfile
import threading
import time
import traceback
import tkinter as tk
import uuid
import webbrowser
from collections import deque
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib import error, parse, request
from zipfile import ZipFile
from tkinter import filedialog

from telegraf import (
    TELEGRAF_VERSION,
    TelegrafSession,
    cached_telegraf_path,
    default_telegraf_config,
    describe_telegraf_binary,
    download_telegraf,
    export_telegraf_templates,
    normalize_telegraf_config,
    test_telegraf_device,
)

try:
    from zeroconf import IPVersion, ServiceInfo, Zeroconf
except Exception:  # noqa: BLE001
    Zeroconf = None
    ServiceInfo = None
    IPVersion = None

try:
    import serial
    from serial.tools import list_ports
except Exception:  # noqa: BLE001
    serial = None
    list_ports = None

try:
    import certifi
except Exception:  # noqa: BLE001
    certifi = None


# ---------------------------------------------------------------------------
# Paths, runtime constants & bootstrap
# Separates bundled application files (BUNDLE_ROOT/APP_ROOT) from writable
# runtime data (DATA_ROOT), which lives in a different location per platform
# once the app is packaged (see detect_data_root()).
# ---------------------------------------------------------------------------
BUNDLE_ROOT = pathlib.Path(getattr(sys, "_MEIPASS", pathlib.Path(__file__).resolve().parent))
APP_ROOT = pathlib.Path(sys.executable).resolve().parent if getattr(sys, "frozen", False) else pathlib.Path(__file__).resolve().parent


def detect_data_root() -> pathlib.Path:
    if not getattr(sys, "frozen", False):
        return APP_ROOT
    system = platform.system().lower()
    if system == "windows":
        return APP_ROOT
    home = pathlib.Path.home()
    if system == "darwin":
        return home / "Library" / "Application Support" / "Brautomat32ServiceTool"
    return home / ".local" / "share" / "Brautomat32ServiceTool"


DATA_ROOT = detect_data_root()
STATIC_DIR = BUNDLE_ROOT / "static"
FAVICON_FILE = STATIC_DIR / "favicon.ico"
BACKUP_DIR = DATA_ROOT / "backups"
LOG_DIR = DATA_ROOT / "logs"
CACHE_DIR = DATA_ROOT / "cache" / "packages"
TOOLS_CACHE_DIR = DATA_ROOT / "cache" / "tools"
DEFAULT_INVENTORY_DIR = DATA_ROOT / "inventar"
UPDATE_DIR = DATA_ROOT / "updates"
LOCAL_ESPTOOL_DIR = APP_ROOT / "esptool"
CONFIG_FILE = DATA_ROOT / "config.json"
HOST = "127.0.0.1"
SERVICE_HOSTNAME = "serviceBrautomat32.local"
DEFAULT_PORT = 8765
PORT = DEFAULT_PORT
SERIAL_POLL_DELAY = 0.15
SERVICE_TOOL_VERSION = "1.7.3"
ESPTOOL_VERSION = "5.3.1"
SERVICE_TOOL_UPDATE_MANIFEST_URL = "https://raw.githubusercontent.com/InnuendoPi/ServiceTool/main/version.json"
SERVICE_TOOL_WINDOWS_EXECUTABLE = "Brautomat32ServiceTool.exe"
MIGRATION_MIN_VERSION = (1, 62, 0)
MIGRATION_TARGET_VERSION = (1, 70, 0)
ESPTOOL_REPO_BASE = f"https://github.com/espressif/esptool/releases/download/v{ESPTOOL_VERSION}"

REMOTE_PACKAGES: dict[str, dict[str, str]] = {
    "release": {
        "label": "Latest Release",
        "branch": "main",
        "base_url": "https://raw.githubusercontent.com/InnuendoPi/Brautomat32/main/build/ESP32-IDF5",
    },
    "development": {
        "label": "Latest Development",
        "branch": "development",
        "base_url": "https://raw.githubusercontent.com/InnuendoPi/Brautomat32/development/build/ESP32-IDF5dev",
    },
    "special": {
        "label": "Special Version",
        "branch": "main",
        "base_url": "https://raw.githubusercontent.com/InnuendoPi/Brautomat32/main/build/ESP32-IDF5",
    },
}
REQUIRED_PACKAGE_FILES = ["bootloader.bin", "partitions.bin", "boot_app0.bin", "firmware.bin"]
REQUIRED_FIRMWARE_FILE = "firmware.bin"
BASE_FLASH_FILES = ["bootloader.bin", "partitions.bin", "boot_app0.bin"]
OPTIONAL_PACKAGE_FILES = ["Littlefs.bin"]
ALL_PACKAGE_FILES = REQUIRED_PACKAGE_FILES + OPTIONAL_PACKAGE_FILES
WEBUPDATE_TOOL_FILES = [
    "brautomat.min.css.gz",
    "brautomat.min.js.gz",
    "brautomat.ttf.gz",
    "bootstrap.min.css.gz",
    "bootstrap.min.js.gz",
    "favicon.ico",
    "language/deutsch.json",
]
INVENTORY_SPECS: dict[str, dict[str, Any]] = {
    "mashplans": {
        "device_dir": "/Rezepte",
        "local_dir": "Rezepte",
        "label": "Maischepläne",
        "local_globs": ["*.json"],
        "extensions": [".json"],
    },
    "fermenterplans": {
        "device_dir": "/Fermenter",
        "local_dir": "Fermenter",
        "label": "Fermenter Pläne",
        "local_globs": ["*.json"],
        "extensions": [".json"],
    },
    "profiles": {
        "device_dir": "/Profile",
        "local_dir": "Profile",
        "label": "Profile",
        "local_globs": ["*.json"],
        "extensions": [".json"],
    },
    "config": {
        "device_dir": "/",
        "local_dir": "config",
        "label": "Konfiguration",
        "local_globs": ["*.txt", "*.json"],
        "extensions": [".txt", ".json"],
        "device_files": ["config.txt", "log_cfg.json"],
    },
}
BRAUTOMAT32_SOURCE_ROOT = os.environ.get("BRAUTOMAT32_SOURCE_ROOT", "").strip()
TEST_TASKS_DIR_CANDIDATES = [APP_ROOT / "tasks", APP_ROOT.parent / "tasks", DATA_ROOT / "tasks"]
TEST_TOOLS_DIR_CANDIDATES = [APP_ROOT / "tools", APP_ROOT.parent / "tools", DATA_ROOT / "tools"]
if BRAUTOMAT32_SOURCE_ROOT:
    brautomat32_root = pathlib.Path(BRAUTOMAT32_SOURCE_ROOT).expanduser()
    TEST_TASKS_DIR_CANDIDATES.append(brautomat32_root / "tasks")
    TEST_TOOLS_DIR_CANDIDATES.append(brautomat32_root / "tools")


def ensure_runtime_dirs() -> None:
    inventory_root = inventory_root_dir()
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    TOOLS_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    UPDATE_DIR.mkdir(parents=True, exist_ok=True)
    inventory_root.mkdir(parents=True, exist_ok=True)
    legacy_dirs = {
        "mashplans": inventory_root / "mashplans",
        "fermenterplans": inventory_root / "fermenterplans",
        "profiles": inventory_root / "profiles",
    }
    for spec in INVENTORY_SPECS.values():
        (inventory_root / spec["local_dir"]).mkdir(parents=True, exist_ok=True)
    copy_bundled_inventory_defaults(inventory_root)
    for key, legacy in legacy_dirs.items():
        target = inventory_local_dir(key)
        if not legacy.exists() or legacy == target:
            continue
        for item in legacy.iterdir():
            destination = target / item.name
            if not destination.exists():
                shutil.move(str(item), str(destination))
        try:
            legacy.rmdir()
        except OSError:
            pass


def copy_bundled_inventory_defaults(inventory_root: pathlib.Path | None = None) -> None:
    source_root = BUNDLE_ROOT / "inventar"
    if not source_root.is_dir():
        return
    target_root = inventory_root or inventory_root_dir()

    try:
        if source_root.resolve() == target_root.resolve():
            return
    except OSError:
        return

    for source in source_root.rglob("*"):
        relative = source.relative_to(source_root)
        target = target_root / relative
        if source.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue
        if source.is_file() and not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)


def first_existing_dir(candidates: list[pathlib.Path], relative: str) -> pathlib.Path | None:
    for candidate in candidates:
        target = candidate / relative
        if target.is_dir():
            return target
    return None


# ---------------------------------------------------------------------------
# Test Runner integration helpers
# Support for the optional, private Node.js Test Runner (lives in a separate
# Brautomat32 firmware checkout). Only formats/detects results; the runner
# itself is launched by TestRunnerSession further below.
# ---------------------------------------------------------------------------
def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "runner"


def pretty_label(value: str) -> str:
    cleaned = value.replace("_", "-").replace(".json", "").strip().strip("-")
    special = {
        "complete-suite": "Complete",
        "diagnostic": "APID / Diagnostic",
        "mash-core-short": "Real kettle test",
        "browser-smoke-suite": "Browser smoke",
        "firmware-update-observe": "Firmware update observe",
        "full-regression": "Full regression",
        "local-regression": "Local regression",
        "support-core": "Support core",
        "release-core": "Release core",
        "fermenter-core": "Fermenter core",
        "fermenter-longrun": "Fermenter longrun",
        "host-stability-current": "Host stability",
        "extended-process": "Extended process",
    }
    if cleaned in special:
        return special[cleaned]
    return " ".join(part.capitalize() for part in cleaned.split("-") if part)


def describe_test_runner_suite(suite_id: str, item_count: int, groups: list[str]) -> dict[str, str]:
    known: dict[str, dict[str, str]] = {
        "complete-suite": {
            "title": "Complete Suite",
            "description": "Vollständiger Prepublish-Lauf mit Release-Schritten, Browser-UI, Importen, Prozesslogik, Sensorpfaden und Fermenter-Abläufen auf dem echten Testgerät."
        },
        "release-core": {
            "title": "Release Core",
            "description": "Prüft Build, Package, Flash, Restore und zentrale Importpfade."
        },
        "support-core": {
            "title": "Support Core",
            "description": "Kompakter Kernlauf für Baseline, Browser-Grundpfade, Importe und zentrale Gerätefunktionen."
        },
        "diagnostic": {
            "title": "Diagnostic",
            "description": "Gezielte Diagnose-Suite für API, Debug-Snapshots, Controller-Deck und Safety-Checks."
        },
        "browser-smoke-suite": {
            "title": "Browser Smoke",
            "description": "Prüft das echte WebIf im Browser: Reload, Modals, SSE, View-Switch und Request-Budgets."
        },
        "runner-plain-core": {
            "title": "Runner Plain Core",
            "description": "Kleiner, gerätezentrierter Testlauf für einen schnellen Sanity-Check ohne vollständige Release-Kette."
        },
        "full-regression": {
            "title": "Full Regression",
            "description": "Breiter interner Sammellauf über mehrere Teil-Suiten."
        },
        "local-regression": {
            "title": "Local Regression",
            "description": "Lokaler Sammellauf für Entwicklertests vor einem größeren offiziellen Run."
        },
        "fermenter-core": {
            "title": "Fermenter Core",
            "description": "Prüft Fermenter-Regelung, Step-Übergänge, Rampen und Resume-Verhalten."
        },
        "host-stability-current": {
            "title": "Host Stability",
            "description": "Langer Stabilitätslauf für Host- und Runner-Infrastruktur."
        },
    }
    normalized = str(suite_id or "").strip()
    if normalized in known:
        return known[normalized]
    groups_label = ", ".join(groups[:4]) if groups else "allgemeine Testbereiche"
    return {
        "title": pretty_label(normalized or "suite"),
        "description": f"Suite mit {item_count} Testschritten. Deckt vor allem folgende Bereiche ab: {groups_label}."
    }


def format_test_runner_counts(counts: dict[str, Any]) -> str:
    ordered = ["total", "pass", "warn", "fail", "skip"]
    parts: list[str] = []
    for key in ordered:
        value = counts.get(key)
        if isinstance(value, int):
            parts.append(f"{key.upper()}={value}")
    return ", ".join(parts) if parts else "-"


def build_test_runner_results_markdown(payload: dict[str, Any]) -> str:
    lines = ["## Results"]
    status = str(payload.get("status") or "").strip().upper() or "-"
    counts = payload.get("counts") if isinstance(payload.get("counts"), dict) else {}
    summary = str(payload.get("summary") or "").strip()
    lines.append(f"Status: {status}")
    if counts:
        lines.append(f"Counts: {format_test_runner_counts(counts)}")
    if summary:
        lines.append(f"Summary: {summary}")
    items = payload.get("items")
    if isinstance(items, list):
        lines.append("")
        lines.append("| # | Test | Result |")
        lines.append("| - | ---- | ------ |")
        for index, item in enumerate(items, start=1):
            title = str(item.get("title") or item.get("id") or "-").strip() or "-"
            result = str(item.get("status") or "-").strip().upper() or "-"
            safe_title = title.replace("|", "\\|")
            safe_result = result.replace("|", "\\|")
            lines.append(f"| {index} | {safe_title} | {safe_result} |")
    return "\n".join(lines)


def detect_test_runner_environment() -> dict[str, Any]:
    tasks_dir = first_existing_dir(TEST_TASKS_DIR_CANDIDATES, "test-automation")
    tools_dir = first_existing_dir(TEST_TOOLS_DIR_CANDIDATES, "test-runner")
    reasons: list[str] = []

    if tasks_dir is None:
        reasons.append("tasks/test-automation not found")
    if tools_dir is None:
        reasons.append("tools/test-runner not found")

    suites: list[dict[str, Any]] = []
    package_meta: dict[str, Any] | None = None
    node_version = ""

    if tasks_dir is not None:
        for required in ("README.md", "ACTIVE.md"):
            if not (tasks_dir / required).is_file():
                reasons.append(f"missing {required} in tasks/test-automation")

    if tools_dir is not None:
        package_path = tools_dir / "package.json"
        index_path = tools_dir / "src" / "index.js"
        if not package_path.is_file():
            reasons.append("missing tools/test-runner/package.json")
        if not index_path.is_file():
            reasons.append("missing tools/test-runner/src/index.js")
        try:
            if package_path.is_file():
                package_meta = json.loads(package_path.read_text(encoding="utf-8"))
        except Exception as exc:  # noqa: BLE001
            reasons.append(f"invalid package.json: {exc}")
        for cfg_path in sorted(tools_dir.glob("*-config.json")):
            try:
                payload = json.loads(cfg_path.read_text(encoding="utf-8"))
            except Exception:
                continue
            items = payload.get("items")
            if not isinstance(items, list) or not items:
                continue
            suite_id = cfg_path.stem.replace("-config", "")
            public_name = str(payload.get("publicSuiteName") or "").strip()
            groups = sorted({str(item.get("publicGroup") or "").strip() for item in items if str(item.get("publicGroup") or "").strip()})
            suite_info = describe_test_runner_suite(suite_id, len(items), groups)
            suites.append(
                {
                    "id": suite_id,
                    "label": pretty_label(public_name or suite_id),
                    "config_path": str(cfg_path.resolve()),
                    "filename": cfg_path.name,
                    "suite_name": public_name or suite_id,
                    "item_count": len(items),
                    "groups": groups,
                    "info_title": suite_info["title"],
                    "info_description": suite_info["description"],
                }
            )
        if not suites:
            reasons.append("no valid *-config.json suites found in tools/test-runner")
        try:
            node_output = subprocess.check_output(
                ["node", "--version"],
                cwd=str(tools_dir),
                text=True,
                timeout=5,
            )
            node_version = node_output.strip()
        except Exception as exc:  # noqa: BLE001
            reasons.append(f"node runtime not available: {exc}")

    return {
        "enabled": not reasons,
        "reasons": reasons,
        "tasks_dir": str(tasks_dir.resolve()) if tasks_dir else "",
        "tools_dir": str(tools_dir.resolve()) if tools_dir else "",
        "package": package_meta or {},
        "node_version": node_version,
        "suites": suites,
    }


def fetch_public_test_results() -> dict[str, Any]:
    url = "https://raw.githubusercontent.com/InnuendoPi/Brautomat32/main/TEST-RESULTS.md"
    req = request.Request(url, headers={"User-Agent": "Brautomat32-ServiceTool"})
    with request.urlopen(req, timeout=10) as resp:
        content = resp.read().decode("utf-8", errors="replace")
    return {"url": url, "content": content}


# ---------------------------------------------------------------------------
# App configuration (config.json)
# ---------------------------------------------------------------------------
def default_config() -> dict[str, Any]:
    return {
        "service_tool_version": SERVICE_TOOL_VERSION,
        "language": "en",
        "debug_output": False,
        "device_url": "http://brautomat.local",
        "package_source": "release",
        "package_ref": "",
        "package_dir": REMOTE_PACKAGES["release"]["base_url"],
        "open_package_dir": str(APP_ROOT),
        "inventory_root": str(DEFAULT_INVENTORY_DIR),
        "baud_rate": 921600,
        "serial_baud_rate": 115200,
        "serial_port": "",
        "telegraf": default_telegraf_config(),
    }


def load_app_config() -> dict[str, Any]:
    config = default_config()
    if not CONFIG_FILE.exists():
        save_app_config(config)
        return config
    try:
        raw = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        if isinstance(raw, dict):
            config.update({k: v for k, v in raw.items() if k in config})
            legacy_package_dir = str(raw.get("package_dir", "")).strip()
            if not config.get("open_package_dir") and legacy_package_dir and not legacy_package_dir.startswith(("http://", "https://")):
                config["open_package_dir"] = legacy_package_dir
    except Exception:
        save_app_config(config)
        return config
    if config.get("service_tool_version") != SERVICE_TOOL_VERSION:
        config["service_tool_version"] = SERVICE_TOOL_VERSION
        save_app_config(config)
    return config


def save_app_config(config: dict[str, Any]) -> dict[str, Any]:
    merged = default_config()
    merged.update({k: v for k, v in config.items() if k in merged})
    merged["inventory_root"] = normalize_inventory_root(merged.get("inventory_root", ""))
    telegraf = default_telegraf_config()
    if isinstance(merged.get("telegraf"), dict):
        telegraf.update({k: v for k, v in merged["telegraf"].items() if k in telegraf})
    for target in ("csv", "influxdb", "postgres", "mysql", "mqtt"):
        if isinstance(telegraf.get(target), dict):
            defaults = default_telegraf_config()[target]
            defaults.update(telegraf[target])
            telegraf[target] = defaults
    if not telegraf.get("save_passwords"):
        for target, field_name in (("influxdb", "token"), ("postgres", "password"), ("mysql", "password"), ("mqtt", "password")):
            telegraf[target][field_name] = ""
    merged["telegraf"] = telegraf
    CONFIG_FILE.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
    return merged


def normalize_inventory_root(path_value: Any) -> str:
    raw = str(path_value or "").strip()
    if not raw:
        return str(DEFAULT_INVENTORY_DIR)
    return str(pathlib.Path(raw).expanduser())


def inventory_root_dir(config: dict[str, Any] | None = None) -> pathlib.Path:
    if config is None:
        try:
            config = load_app_config()
        except Exception:
            config = default_config()
    return pathlib.Path(normalize_inventory_root(config.get("inventory_root", "")))


def now_iso() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


# ---------------------------------------------------------------------------
# Version comparison, URL, and logging/network helpers
# ---------------------------------------------------------------------------
def sanitize_version_for_filename(version: str) -> str:
    raw = str(version or "").strip()
    if not raw:
        return "unknown"
    match = re.search(r"(\d+)\.(\d+)\.(\d+)", raw)
    version_part = "-".join(match.groups()) if match else "unknown"
    lowered = raw.lower()
    suffix = ""
    if "develop" in lowered or "dev" in lowered:
        suffix = "-develop"
    elif "release" in lowered:
        suffix = "-release"
    return f"{version_part}{suffix}"


def parse_version_tuple(version: str) -> tuple[int, int, int] | None:
    match = re.search(r"(\d+)\.(\d+)(?:\.(\d+))?", str(version or "").strip())
    if not match:
        return None
    return (int(match.group(1)), int(match.group(2)), int(match.group(3) or "0"))


def compare_versions(left: str, right: str) -> int:
    left_tuple = parse_version_tuple(left) or (0, 0, 0)
    right_tuple = parse_version_tuple(right) or (0, 0, 0)
    return (left_tuple > right_tuple) - (left_tuple < right_tuple)


def require_version_tuple(version: str, context: str) -> tuple[int, int, int]:
    parsed = parse_version_tuple(version)
    if not parsed:
        raise RuntimeError(f"{context}: unable to parse firmware version '{version}'")
    return parsed


def version_label(version_tuple: tuple[int, int, int]) -> str:
    major, minor, patch = version_tuple
    return f"{major}.{minor}.{patch}"


def version_line_label(version_tuple: tuple[int, int, int]) -> str:
    major, minor, _patch = version_tuple
    return f"{major}.{minor}.x"


def preferred_url(port: int) -> str:
    return f"http://{SERVICE_HOSTNAME}:{port}"


def fallback_url(port: int) -> str:
    return f"http://127.0.0.1:{port}"


def log_runtime_error(message: str) -> None:
    try:
        ensure_runtime_dirs()
        with (LOG_DIR / "service-tool-runtime.log").open("a", encoding="utf-8") as handle:
            handle.write(f"[{now_iso()}] {message}\n")
    except Exception:
        pass


def ssl_context() -> ssl.SSLContext | None:
    if certifi is None:
        return None
    try:
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return None


def hostname_resolves_to_loopback(name: str) -> bool:
    try:
        resolved = socket.gethostbyname(name)
        return resolved == "127.0.0.1"
    except Exception:
        return False


def hostname_resolves(name: str) -> bool:
    try:
        socket.gethostbyname(name)
        return True
    except Exception:
        return False


def detect_local_advertise_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            ip = sock.getsockname()[0]
            if ip and not ip.startswith("127."):
                return ip
    except Exception:
        pass
    return "127.0.0.1"


# ---------------------------------------------------------------------------
# mDNS discovery
# ---------------------------------------------------------------------------
class MdnsAdvertiser:
    """Advertises this ServiceTool instance as `serviceBrautomat32.local` via zeroconf."""

    def __init__(self, hostname: str, port: int) -> None:
        self.hostname = hostname.rstrip(".")
        self.port = port
        self.ip = detect_local_advertise_ip()
        self.zeroconf: Zeroconf | None = None
        self.info: ServiceInfo | None = None
        self.active = False

    def start(self) -> bool:
        if Zeroconf is None or ServiceInfo is None:
            return False
        try:
            service_type = "_http._tcp.local."
            service_name = f"Brautomat32 ServiceTool.{service_type}"
            server_name = f"{self.hostname}."
            self.info = ServiceInfo(
                type_=service_type,
                name=service_name,
                server=server_name,
                port=self.port,
                addresses=[socket.inet_aton(self.ip)],
                properties={"path": "/", "tool": "Brautomat32ServiceTool"},
            )
            self.zeroconf = Zeroconf(ip_version=IPVersion.V4Only)
            self.zeroconf.register_service(self.info)
            self.active = True
            return True
        except Exception:
            self.stop()
            return False

    def stop(self) -> None:
        if self.zeroconf and self.info:
            try:
                self.zeroconf.unregister_service(self.info)
            except Exception:
                pass
        if self.zeroconf:
            try:
                self.zeroconf.close()
            except Exception:
                pass
        self.zeroconf = None
        self.info = None
        self.active = False


# ---------------------------------------------------------------------------
# Device HTTP client
# Plain urllib.request wrappers used to talk to the Brautomat32 device's own
# HTTP API (config, filesystem, WiFi, telemetry, reboot, ...). No `requests`
# dependency; try_base_urls() adds the ESP32 AP-mode IP as a fallback target.
# ---------------------------------------------------------------------------
def normalize_base_url(base_url: str) -> str:
    value = (base_url or "").strip()
    if not value:
        raise ValueError("Device URL missing")
    if not value.startswith(("http://", "https://")):
        value = f"http://{value}"
    return value.rstrip("/")


def candidate_base_urls(base_url: str) -> list[str]:
    primary = normalize_base_url(base_url)
    candidates = [primary]
    ap_fallback = "http://192.168.4.1"
    if primary != ap_fallback:
        candidates.append(ap_fallback)
    return candidates


def try_base_urls(base_url: str, action):
    last_error: Exception | None = None
    for candidate in candidate_base_urls(base_url):
        try:
            return candidate, action(candidate)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
    assert last_error is not None
    raise last_error


def json_request(url: str, timeout: float = 12.0) -> Any:
    req = request.Request(url, method="GET")
    with request.urlopen(req, timeout=timeout, context=ssl_context()) as response:
        data = response.read()
    return json.loads(data.decode("utf-8", errors="replace"))


def post_empty(url: str, timeout: float = 20.0) -> str:
    req = request.Request(url, data=b"", method="POST")
    with request.urlopen(req, timeout=timeout, context=ssl_context()) as response:
        return response.read().decode("utf-8", errors="replace")


def post_disruptive_empty(url: str, timeout: float = 45.0) -> str:
    try:
        return post_empty(url, timeout=timeout)
    except (
        error.URLError,
        TimeoutError,
        socket.timeout,
        ConnectionResetError,
        BrokenPipeError,
        http.client.RemoteDisconnected,
    ) as exc:
        return f"accepted without final HTTP response: {exc}"


def post_json(url: str, payload: dict[str, Any], timeout: float = 20.0) -> str:
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with request.urlopen(req, timeout=timeout, context=ssl_context()) as response:
        return response.read().decode("utf-8", errors="replace")


def post_form(url: str, payload: dict[str, Any], timeout: float = 20.0) -> str:
    body = parse.urlencode(payload).encode("utf-8")
    req = request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with request.urlopen(req, timeout=timeout, context=ssl_context()) as response:
        return response.read().decode("utf-8", errors="replace")


def put_form(url: str, payload: dict[str, Any], timeout: float = 20.0) -> str:
    body = parse.urlencode(payload).encode("utf-8")
    req = request.Request(
        url,
        data=body,
        method="PUT",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with request.urlopen(req, timeout=timeout, context=ssl_context()) as response:
        return response.read().decode("utf-8", errors="replace")


def download_bytes(url: str, timeout: float = 20.0) -> bytes:
    req = request.Request(url, method="GET")
    with request.urlopen(req, timeout=timeout, context=ssl_context()) as response:
        return response.read()


def build_multipart_payload(
    field_name: str,
    filename: str,
    content: bytes,
    content_type: str = "application/octet-stream",
) -> tuple[bytes, str]:
    boundary = f"----BrautomatServiceTool{uuid.uuid4().hex}"
    header = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode("utf-8")
    footer = f"\r\n--{boundary}--\r\n".encode("utf-8")
    return header + content + footer, boundary


def post_multipart(
    url: str,
    field_name: str,
    filename: str,
    content: bytes,
    timeout: float = 120.0,
    content_type: str = "application/octet-stream",
) -> str:
    payload, boundary = build_multipart_payload(field_name, filename, content, content_type)
    req = request.Request(
        url,
        data=payload,
        method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with request.urlopen(req, timeout=timeout, context=ssl_context()) as response:
        return response.read().decode("utf-8", errors="replace")


def post_file_to_fs(base_url: str, target_path: str, content: bytes, timeout: float = 120.0) -> str:
    mime = mimetypes.guess_type(target_path)[0] or "application/octet-stream"
    return post_multipart(
        f"{normalize_base_url(base_url)}/edit",
        "data",
        target_path,
        content,
        timeout=timeout,
        content_type=mime,
    )


def delete_fs_path(base_url: str, target_path: str, timeout: float = 30.0) -> str:
    body = parse.urlencode({"path": target_path}).encode("utf-8")
    req = request.Request(
        f"{normalize_base_url(base_url)}/edit",
        data=body,
        method="DELETE",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with request.urlopen(req, timeout=timeout, context=ssl_context()) as response:
        return response.read().decode("utf-8", errors="replace")


def download_fs_file(base_url: str, target_path: str, timeout: float = 60.0) -> bytes:
    url = f"{normalize_base_url(base_url)}/download?file={parse.quote(target_path, safe='/')}"
    return download_bytes(url, timeout=timeout)


# ---------------------------------------------------------------------------
# Serial port access
# Primary path uses pyserial; run_powershell_json() backs the fallback path
# used when pyserial is unavailable (drives System.IO.Ports.SerialPort via a
# PowerShell subprocess instead).
# ---------------------------------------------------------------------------
def run_powershell_json(command: str) -> Any:
    # Capture raw bytes and decode ourselves. text=True would decode with the
    # locale default (cp1252 on a German Windows), where bytes like 0x81 are
    # undefined -> the subprocess reader thread dies with UnicodeDecodeError as
    # soon as a device name contains a non-ASCII character (e.g. "ü" in a
    # Win32_PnPEntity name). Windows PowerShell 5.1 writes redirected output in
    # the OEM code page (cp850, where 0x81 == "ü"), while PowerShell 7 writes
    # UTF-8. Try UTF-8, then the OEM code page, and only then fall back to a
    # lossy decode so a single odd byte never aborts device enumeration.
    completed = subprocess.run(
        ["powershell", "-NoProfile", "-Command", command],
        capture_output=True,
        cwd=str(DATA_ROOT),
        timeout=15,
    )
    if completed.returncode != 0:
        raise RuntimeError(_decode_powershell(completed.stderr).strip() or _decode_powershell(completed.stdout).strip() or "PowerShell failed")
    text = _decode_powershell(completed.stdout).strip()
    return json.loads(text) if text else []


def _decode_powershell(raw: bytes) -> str:
    for encoding in ("utf-8", "oem"):
        try:
            return raw.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            continue
    return raw.decode("utf-8", errors="replace")


def has_pyserial() -> bool:
    return serial is not None and list_ports is not None


def normalize_serial_port_name(port: str) -> str:
    value = str(port or "").strip()
    if platform.system().lower() == "darwin" and value.startswith("/dev/tty."):
        candidate = "/dev/cu." + value[len("/dev/tty.") :]
        if pathlib.Path(candidate).exists():
            return candidate
    return value


def open_serial_port(port: str, baud: int, timeout: float = 0.5, write_timeout: float = 2.0) -> Any:
    if serial is None:
        raise RuntimeError("pyserial not available")
    handle = serial.Serial()
    handle.port = normalize_serial_port_name(port)
    handle.baudrate = int(baud)
    handle.timeout = timeout
    handle.write_timeout = write_timeout
    handle.bytesize = serial.EIGHTBITS
    handle.parity = serial.PARITY_NONE
    handle.stopbits = serial.STOPBITS_ONE
    handle.xonxoff = False
    handle.rtscts = False
    handle.dsrdtr = False
    handle.dtr = False
    handle.rts = False
    handle.open()
    return handle


def reset_serial_device(handle: Any, delay_ms: int = 180) -> None:
    try:
        handle.dtr = False
        handle.rts = False
        time.sleep(0.2)
        handle.reset_input_buffer()
    except Exception:
        return
    try:
        handle.dtr = True
        handle.rts = True
        time.sleep(delay_ms / 1000.0)
        handle.dtr = False
        handle.rts = False
        time.sleep(0.22)
    except Exception:
        pass


def read_serial_line(handle: Any) -> str:
    try:
        raw = handle.readline()
    except Exception:
        return ""
    if not raw:
        return ""
    if isinstance(raw, bytes):
        return raw.decode("utf-8", errors="replace").strip()
    return str(raw).strip()


def fallback_serial_ports() -> list[dict[str, str]]:
    system = platform.system().lower()
    patterns: list[str] = []
    if system == "darwin":
        patterns = ["/dev/cu.*", "/dev/tty.*"]
    elif system == "linux":
        patterns = ["/dev/ttyUSB*", "/dev/ttyACM*", "/dev/serial/by-id/*"]
    else:
        return []

    ports: list[dict[str, str]] = []
    seen: set[str] = set()
    for pattern in patterns:
        for candidate in sorted(pathlib.Path("/").glob(pattern.lstrip("/")), key=lambda item: str(item).lower()):
            port_name = normalize_serial_port_name(str(candidate))
            if not port_name or port_name in seen:
                continue
            seen.add(port_name)
            ports.append(
                {
                    "port": port_name,
                    "name": candidate.name,
                    "deviceId": port_name,
                }
            )
    return ports


def list_serial_ports() -> list[dict[str, str]]:
    if has_pyserial():
        ports: list[dict[str, str]] = []
        seen: set[str] = set()
        for info in sorted(list_ports.comports(), key=lambda item: (item.device or "").lower()):
            port_name = normalize_serial_port_name(info.device)
            if not port_name or port_name in seen:
                continue
            seen.add(port_name)
            details = [str(info.description or "").strip(), str(info.manufacturer or "").strip()]
            label = " | ".join(part for part in details if part and part.lower() != "n/a") or port_name
            hardware = str(info.hwid or "").strip()
            ports.append(
                {
                    "port": port_name,
                    "name": label,
                    "deviceId": hardware or port_name,
                }
            )
        if ports:
            return ports
        return fallback_serial_ports()

    if platform.system().lower() != "windows":
        return fallback_serial_ports()

    command = r"""
$ports = Get-CimInstance Win32_PnPEntity |
  Where-Object { $_.Name -match '\(COM\d+\)' } |
  ForEach-Object {
    $match = [regex]::Match($_.Name, '\((COM\d+)\)')
    [pscustomobject]@{
      port = $match.Groups[1].Value
      name = $_.Name
      deviceId = $_.DeviceID
    }
  } |
  Sort-Object port
$ports | ConvertTo-Json -Compress
"""
    result = run_powershell_json(command)
    if isinstance(result, dict):
        return [result]
    return result or []


def host_wifi_scan() -> dict[str, Any]:
    completed = subprocess.run(
        ["netsh", "wlan", "show", "networks", "mode=bssid"],
        capture_output=True,
        text=True,
        cwd=str(DATA_ROOT),
        timeout=15,
        encoding="utf-8",
        errors="replace",
    )
    raw_text = "\n".join(part for part in [completed.stdout, completed.stderr] if part).strip()

    networks: list[str] = []
    for line in raw_text.splitlines():
        match = re.match(r"^\s*SSID\s+\d+\s*:\s*(.*)$", line.strip(), re.IGNORECASE)
        if not match:
            continue
        ssid = match.group(1).strip()
        if ssid and ssid not in networks:
            networks.append(ssid)

    return {
        "status": "done" if networks else "empty",
        "transport": "host",
        "source": "windows-host-scan",
        "message": "" if networks else "no-networks-found",
        "networks": networks,
    }


# ---------------------------------------------------------------------------
# Firmware package catalog, esptool/Telegraf tool provisioning, self-update
# Covers: remote firmware package discovery/download (release/development/
# special), on-demand download+caching of the esptool and Telegraf binaries,
# and the ServiceTool's own self-update flow (checks version.json on GitHub,
# downloads+verifies the release ZIP, and on Windows can self-replace the
# running executable).
# ---------------------------------------------------------------------------
def package_exists(path: pathlib.Path) -> bool:
    return path.exists() and (path / REQUIRED_FIRMWARE_FILE).exists()


def remote_package_dir(key: str) -> pathlib.Path:
    return CACHE_DIR / key


def github_raw_package_base(ref: str) -> str:
    clean_ref = str(ref or "").strip()
    if not clean_ref:
        raise ValueError("Package ref missing")
    build_dir = "ESP32-IDF5dev" if clean_ref == "development" else "ESP32-IDF5"
    return f"https://raw.githubusercontent.com/InnuendoPi/Brautomat32/{clean_ref}/build/{build_dir}"


def github_raw_tools_base(ref: str) -> str:
    clean_ref = str(ref or "").strip()
    if not clean_ref:
        raise ValueError("Package ref missing")
    return f"https://raw.githubusercontent.com/InnuendoPi/Brautomat32/{clean_ref}/data/"


def github_raw_language_base(ref: str) -> str:
    clean_ref = str(ref or "").strip()
    if not clean_ref:
        raise ValueError("Package ref missing")
    return f"https://raw.githubusercontent.com/InnuendoPi/Brautomat32/{clean_ref}/"


def github_language_catalog_url(ref: str) -> str:
    clean_ref = str(ref or "").strip()
    if not clean_ref:
        raise ValueError("Package ref missing")
    return f"https://api.github.com/repos/InnuendoPi/Brautomat32/contents/language?ref={clean_ref}"


def github_version_json_url(ref: str) -> str:
    clean_ref = str(ref or "").strip()
    if not clean_ref:
        raise ValueError("Package ref missing")
    return f"https://raw.githubusercontent.com/InnuendoPi/Brautomat32/{clean_ref}/version.json"


def remote_file_url(key: str, name: str) -> str:
    package = REMOTE_PACKAGES.get(key)
    if not package:
        raise ValueError(f"Unknown package source: {key}")
    if key == "special":
        raise ValueError("Special Version requires explicit ref")
    return f"{package['base_url']}/{name}"


def remote_tools_base_url(key: str) -> str:
    package = REMOTE_PACKAGES.get(key)
    if not package:
        raise ValueError(f"Unknown package source: {key}")
    if key == "special":
        raise ValueError("Special Version requires explicit ref")
    return f"https://raw.githubusercontent.com/InnuendoPi/Brautomat32/{package['branch']}/data/"


def remote_language_base_url(key: str) -> str:
    package = REMOTE_PACKAGES.get(key)
    if not package:
        raise ValueError(f"Unknown package source: {key}")
    if key == "special":
        raise ValueError("Special Version requires explicit ref")
    return f"https://raw.githubusercontent.com/InnuendoPi/Brautomat32/{package['branch']}/"


def remote_language_catalog_url(key: str) -> str:
    package = REMOTE_PACKAGES.get(key)
    if not package:
        raise ValueError(f"Unknown package source: {key}")
    if key == "special":
        raise ValueError("Special Version requires explicit ref")
    return f"https://api.github.com/repos/InnuendoPi/Brautomat32/contents/language?ref={package['branch']}"


def esptool_platform_asset() -> tuple[str, str, str]:
    system = platform.system().lower()
    machine = platform.machine().lower()

    if system == "windows":
        if machine in {"amd64", "x86_64"}:
            return (f"esptool-v{ESPTOOL_VERSION}-windows-amd64.zip", "esptool-windows-amd64", "esptool.exe")
        raise RuntimeError(f"Unsupported Windows architecture for esptool: {machine}")

    if system == "darwin":
        if machine in {"arm64", "aarch64"}:
            return (f"esptool-v{ESPTOOL_VERSION}-macos-arm64.tar.gz", "esptool-macos-arm64", "esptool")
        if machine in {"x86_64", "amd64"}:
            return (f"esptool-v{ESPTOOL_VERSION}-macos-amd64.tar.gz", "esptool-macos-amd64", "esptool")
        raise RuntimeError(f"Unsupported macOS architecture for esptool: {machine}")

    if system == "linux":
        if machine in {"x86_64", "amd64"}:
            return (f"esptool-v{ESPTOOL_VERSION}-linux-amd64.tar.gz", "esptool-linux-amd64", "esptool")
        if machine in {"armv7l", "armv7"}:
            return (f"esptool-v{ESPTOOL_VERSION}-linux-armv7.tar.gz", "esptool-linux-armv7", "esptool")
        if machine in {"aarch64", "arm64"}:
            return (f"esptool-v{ESPTOOL_VERSION}-linux-aarch64.tar.gz", "esptool-linux-aarch64", "esptool")
        raise RuntimeError(f"Unsupported Linux architecture for esptool: {machine}")

    raise RuntimeError(f"Unsupported platform for esptool: {platform.system()} {platform.machine()}")


def esptool_cached_dir() -> pathlib.Path:
    _, extracted_dir_name, _ = esptool_platform_asset()
    return TOOLS_CACHE_DIR / f"esptool-v{ESPTOOL_VERSION}" / extracted_dir_name


def esptool_executable_name() -> str:
    _, _, executable = esptool_platform_asset()
    return executable


def bundled_esptool_path() -> pathlib.Path | None:
    executable = "esptool.exe" if platform.system().lower() == "windows" else "esptool"
    candidate = LOCAL_ESPTOOL_DIR / executable
    if candidate.exists():
        return candidate
    return None


def cached_esptool_path() -> pathlib.Path:
    return esptool_cached_dir() / esptool_executable_name()


def mark_executable(path: pathlib.Path) -> None:
    if platform.system().lower() == "windows":
        return
    mode = path.stat().st_mode
    path.chmod(mode | 0o111)


def download_to_file(url: str, target: pathlib.Path, timeout: float = 120.0) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    req = request.Request(url, method="GET", headers={"User-Agent": "Brautomat32-ServiceTool"})
    with request.urlopen(req, timeout=timeout, context=ssl_context()) as response, target.open("wb") as handle:
        shutil.copyfileobj(response, handle)


def open_directory(path: pathlib.Path) -> None:
    target = path.resolve()
    system = platform.system().lower()
    if system == "windows":
        os.startfile(str(target))  # type: ignore[attr-defined]
        return
    if system == "darwin":
        subprocess.Popen(["open", str(target)])
        return
    subprocess.Popen(["xdg-open", str(target)])


def service_tool_platform_key() -> str:
    system = platform.system().lower()
    if system == "windows":
        return "windows"
    if system == "darwin":
        return "macos"
    if system == "linux":
        return "linux"
    raise RuntimeError(f"Unsupported ServiceTool update platform: {platform.system()}")


def service_tool_update_manifest() -> dict[str, Any]:
    data = json_request(SERVICE_TOOL_UPDATE_MANIFEST_URL, timeout=12.0)
    if not isinstance(data, dict):
        raise RuntimeError("ServiceTool update manifest is invalid")
    return data


def service_tool_manifest_platform_entry(manifest: dict[str, Any], platform_key: str) -> dict[str, Any]:
    entry = manifest.get(platform_key)
    if isinstance(entry, dict):
        return entry
    legacy_url_key = f"{platform_key}_url"
    url = manifest.get(legacy_url_key) or (manifest.get("url") if platform_key == "windows" else "")
    if not url:
        return {}
    return {
        "url": url,
        "sha256": manifest.get("sha256") if platform_key == "windows" else "",
        "filename": pathlib.PurePosixPath(parse.urlparse(str(url)).path).name,
    }


def service_tool_update_status() -> dict[str, Any]:
    manifest = service_tool_update_manifest()
    remote_version = str(manifest.get("version") or "").strip()
    platform_key = service_tool_platform_key()
    entry = service_tool_manifest_platform_entry(manifest, platform_key)
    url = str(entry.get("url") or "").strip()
    sha256 = str(entry.get("sha256") or "").strip().lower()
    filename = str(entry.get("filename") or "").strip() or pathlib.PurePosixPath(parse.urlparse(url).path).name
    available = bool(remote_version and url and compare_versions(remote_version, SERVICE_TOOL_VERSION) > 0)
    install_supported = (
        platform_key == "windows"
        and bool(getattr(sys, "frozen", False))
        and pathlib.Path(sys.executable).name.lower() == SERVICE_TOOL_WINDOWS_EXECUTABLE.lower()
    )
    return {
        "tool": manifest.get("tool") or "Brautomat32 ServiceTool",
        "current_version": SERVICE_TOOL_VERSION,
        "version": remote_version,
        "released_at": manifest.get("released_at") or "",
        "notes": manifest.get("notes") or "",
        "platform": platform_key,
        "available": available,
        "url": url,
        "sha256": sha256,
        "filename": filename,
        "manifest_url": SERVICE_TOOL_UPDATE_MANIFEST_URL,
        "install_supported": install_supported,
    }


def download_service_tool_update(open_target: bool = True) -> dict[str, Any]:
    status = service_tool_update_status()
    if not status.get("url"):
        raise RuntimeError("No ServiceTool update package URL for this platform")
    if not status.get("available"):
        raise RuntimeError("No newer ServiceTool version is available")
    version = sanitize_version_for_filename(str(status.get("version") or "unknown"))
    filename = str(status.get("filename") or f"Brautomat32ServiceTool-{status['platform']}.zip")
    target = UPDATE_DIR / version / filename
    download_to_file(str(status["url"]), target, timeout=600.0)
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    expected = str(status.get("sha256") or "").strip().lower()
    if expected and digest.lower() != expected:
        try:
            target.unlink()
        except OSError:
            pass
        raise RuntimeError(f"SHA256 mismatch: expected {expected}, got {digest}")
    if open_target:
        try:
            open_directory(target.parent)
        except Exception:
            pass
    return {
        **status,
        "downloaded": True,
        "path": str(target),
        "directory": str(target.parent),
        "sha256_actual": digest,
        "sha256_ok": not expected or digest.lower() == expected,
    }


def schedule_service_tool_shutdown(delay_seconds: float = 1.5) -> None:
    def shutdown() -> None:
        server = HTTP_SERVER
        if server is not None:
            server.shutdown()

    threading.Timer(delay_seconds, shutdown).start()


def install_service_tool_update() -> dict[str, Any]:
    status = service_tool_update_status()
    if not status.get("available"):
        raise RuntimeError("No newer ServiceTool version is available")
    if not status.get("install_supported"):
        raise RuntimeError("Automatic installation is only available for the packaged Windows application")
    update = download_service_tool_update(open_target=False)

    archive = pathlib.Path(str(update["path"])).resolve()
    install_dir = pathlib.Path(sys.executable).resolve().parent
    updater_path = archive.parent / f"install-update-{uuid.uuid4().hex}.ps1"
    expected_sha256 = str(update["sha256_actual"])
    script = """param(
    [int]$ProcessId,
    [string]$Archive,
    [string]$ExpectedSha256,
    [string]$InstallDir
)
$ErrorActionPreference = 'Stop'
$actualSha256 = (Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualSha256 -ne $ExpectedSha256.ToLowerInvariant()) {
    throw 'Downloaded ServiceTool update failed its SHA256 verification.'
}
while (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) {
    Start-Sleep -Milliseconds 250
}
$stagingDir = Join-Path (Split-Path -Parent $Archive) ('install-' + [guid]::NewGuid().ToString('N'))
$logPath = Join-Path (Split-Path -Parent $Archive) 'install-update.log'
try {
    Expand-Archive -LiteralPath $Archive -DestinationPath $stagingDir -Force
    $newExecutable = Join-Path $stagingDir 'Brautomat32ServiceTool.exe'
    if (-not (Test-Path -LiteralPath $newExecutable -PathType Leaf)) {
        throw 'The update package does not contain Brautomat32ServiceTool.exe.'
    }
    Get-ChildItem -LiteralPath $stagingDir -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $InstallDir -Recurse -Force
    }
    Start-Process -FilePath (Join-Path $InstallDir 'Brautomat32ServiceTool.exe') -WorkingDirectory $InstallDir
} catch {
    $_ | Out-File -LiteralPath $logPath -Encoding utf8
    exit 1
} finally {
    Remove-Item -LiteralPath $stagingDir -Recurse -Force -ErrorAction SilentlyContinue
}
"""
    updater_path.write_text(script, encoding="utf-8-sig")
    flags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0) | getattr(subprocess, "DETACHED_PROCESS", 0)
    subprocess.Popen(
        [
            "powershell.exe",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-WindowStyle",
            "Hidden",
            "-File",
            str(updater_path),
            "-ProcessId",
            str(os.getpid()),
            "-Archive",
            str(archive),
            "-ExpectedSha256",
            expected_sha256,
            "-InstallDir",
            str(install_dir),
        ],
        cwd=str(archive.parent),
        creationflags=flags,
    )
    schedule_service_tool_shutdown()
    return {
        **update,
        "install_started": True,
        "restart_required": True,
    }


def extract_esptool_archive(archive_path: pathlib.Path, target_dir: pathlib.Path) -> None:
    if target_dir.exists():
        shutil.rmtree(target_dir)
    target_dir.mkdir(parents=True, exist_ok=True)

    if archive_path.suffix == ".zip":
        with ZipFile(archive_path, "r") as zip_file:
            zip_file.extractall(target_dir)
    elif archive_path.name.endswith(".tar.gz"):
        with tarfile.open(archive_path, "r:gz") as tar_file:
            tar_file.extractall(target_dir)
    else:
        raise RuntimeError(f"Unsupported esptool archive: {archive_path.name}")


def ensure_esptool_available(job: Job | None = None) -> pathlib.Path:
    bundled = bundled_esptool_path()
    if bundled:
        if job:
            job.log(f"Using bundled esptool: {bundled}")
        return bundled

    cached = cached_esptool_path()
    if cached.exists():
        if job:
            job.log(f"Using cached esptool: {cached}")
        return cached

    asset_name, _, _ = esptool_platform_asset()
    base_dir = esptool_cached_dir()
    archive_path = TOOLS_CACHE_DIR / asset_name
    url = f"{ESPTOOL_REPO_BASE}/{asset_name}"
    if job:
        job.log(f"Download esptool v{ESPTOOL_VERSION}: {url}")
    download_to_file(url, archive_path, timeout=180.0)
    extract_esptool_archive(archive_path, base_dir.parent)
    cached = cached_esptool_path()
    if not cached.exists():
        raise RuntimeError(f"esptool executable missing after extract: {cached}")
    mark_executable(cached)
    if job:
        job.log(f"esptool ready: {cached}")
    return cached


def write_package_metadata(path: pathlib.Path, source_key: str) -> None:
    if source_key in REMOTE_PACKAGES:
        package = REMOTE_PACKAGES[source_key]
        metadata = {
            "source": source_key,
            "label": package["label"],
            "branch": package["branch"],
            "base_url": package["base_url"],
            "downloaded_at": now_iso(),
            "files": ALL_PACKAGE_FILES,
        }
    else:
        metadata = {
            "source": "special",
            "label": "Special Version",
            "ref": source_key,
            "base_url": github_raw_package_base(source_key),
            "downloaded_at": now_iso(),
            "files": ALL_PACKAGE_FILES,
        }
    (path / "package.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")


def package_catalog() -> dict[str, Any]:
    packages = []
    for key, package in REMOTE_PACKAGES.items():
        if key == "special":
            packages.append(
                {
                    "key": key,
                    "label": package["label"],
                    "path": "",
                    "cache_dir": str(remote_package_dir(key)),
                    "available": True,
                    "mode": "remote-special",
                    "details": None,
                }
            )
            continue
        path = remote_package_dir(key)
        packages.append(
            {
                "key": key,
                "label": package["label"],
                "path": package["base_url"],
                "cache_dir": str(path),
                "available": True,
                "mode": "remote",
                "details": package_details(path),
            }
        )
    return {"packages": packages, "special_versions": list_special_versions()}


def pick_directory(title: str = "Select Brautomat package directory", initial_dir: pathlib.Path | None = None) -> str | None:
    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    try:
        selected = filedialog.askdirectory(
            parent=root,
            title=title,
            mustexist=True,
            initialdir=str(initial_dir or DATA_ROOT),
        )
        return selected or None
    finally:
        root.destroy()


def pick_file(title: str, initial_dir: pathlib.Path | None = None) -> str | None:
    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    try:
        selected = filedialog.askopenfilename(
            parent=root,
            title=title,
            initialdir=str(initial_dir or DATA_ROOT),
        )
        return selected or None
    finally:
        root.destroy()


def package_details(path: pathlib.Path) -> dict[str, Any]:
    files = {
        "bootloader": str(path / "bootloader.bin"),
        "partitions": str(path / "partitions.bin"),
        "boot_app0": str(path / "boot_app0.bin"),
        "firmware": str(path / "firmware.bin"),
        "littlefs": str(path / "Littlefs.bin"),
    }
    return {
        "path": str(path),
        "exists": path.exists(),
        "files": {key: os.path.exists(value) for key, value in files.items()},
    }


def download_package_file(job: Job, source_key: str, package_dir: pathlib.Path, filename: str) -> pathlib.Path:
    package_dir.mkdir(parents=True, exist_ok=True)
    target = package_dir / filename
    url = remote_file_url(source_key, filename)
    job.log(f"Download: {url}")
    data = download_bytes(url, timeout=60.0)
    target.write_bytes(data)
    job.log(f"Saved: {target} ({len(data)} bytes)")
    return target


def list_special_versions() -> list[dict[str, str]]:
    versions: list[dict[str, str]] = []
    seen_versions: set[str] = set()

    def read_version_info(ref: str) -> tuple[str, str]:
        data = json_request(github_version_json_url(ref), timeout=20.0)
        if not isinstance(data, dict):
            return "", ""
        return str(data.get("version", "")).strip(), str(data.get("type", "")).strip()

    def build_base_url(ref: str, release_type: str) -> str:
        build_dir = "ESP32-IDF5dev" if "develop" in str(release_type).lower() else "ESP32-IDF5"
        clean_ref = str(ref or "").strip()
        return f"https://raw.githubusercontent.com/InnuendoPi/Brautomat32/{clean_ref}/build/{build_dir}"

    def is_supported(version: str) -> bool:
        parsed = parse_version_tuple(version)
        return bool(parsed and parsed >= (1, 60, 0))

    try:
        releases = json_request("https://api.github.com/repos/InnuendoPi/Brautomat32/releases", timeout=20.0)
        if isinstance(releases, list):
            for item in releases:
                if not isinstance(item, dict):
                    continue
                tag = str(item.get("tag_name", "")).strip()
                if not tag:
                    continue
                version, release_type = read_version_info(tag)
                if not version or not is_supported(version) or version in seen_versions:
                    continue
                seen_versions.add(version)
                versions.append(
                    {
                        "ref": tag,
                        "label": f"{version} ({release_type or 'Release'})",
                        "kind": "release",
                        "version": version,
                        "base_url": build_base_url(tag, release_type),
                    }
                )
    except Exception:
        pass

    try:
        commits = json_request("https://api.github.com/repos/InnuendoPi/Brautomat32/commits?sha=development&per_page=12", timeout=20.0)
        if isinstance(commits, list):
            for item in commits:
                if not isinstance(item, dict):
                    continue
                sha = str(item.get("sha", "")).strip()
                commit = item.get("commit", {}) if isinstance(item.get("commit"), dict) else {}
                message = str((commit.get("message", "") or "").splitlines()[0]).strip()
                date = str(((commit.get("committer") or {}) if isinstance(commit.get("committer"), dict) else {}).get("date", "")).strip()
                if not sha:
                    continue
                version, release_type = read_version_info(sha)
                if not version or not is_supported(version) or version in seen_versions:
                    continue
                short = sha[:7]
                date_label = date[:10] if date else ""
                label = f"{version} ({release_type or 'Commit'})"
                if date_label or message:
                    label = f"{label} - {date_label} {short} {message}".strip()
                seen_versions.add(version)
                versions.append(
                    {
                        "ref": sha,
                        "label": label,
                        "kind": "commit",
                        "version": version,
                        "base_url": build_base_url(sha, release_type),
                    }
                )
    except Exception:
        pass

    return versions


def prepare_remote_package(job: Job, source_key: str, include_littlefs: bool, package_ref: str = "", require_base_files: bool = True) -> pathlib.Path:
    if source_key not in REMOTE_PACKAGES:
        raise ValueError(f"Unknown package source: {source_key}")
    ref = package_ref.strip() if source_key == "special" else ""
    if source_key == "special" and not ref:
        raise ValueError("Special Version requires a version ref")
    cache_key = f"special-{re.sub(r'[^A-Za-z0-9._-]+', '_', ref)}" if source_key == "special" else source_key
    package_dir = remote_package_dir(cache_key)
    files = [REQUIRED_FIRMWARE_FILE]
    if require_base_files:
        files = BASE_FLASH_FILES + files
    if include_littlefs:
        files.append("Littlefs.bin")
    package_dir.mkdir(parents=True, exist_ok=True)
    for filename in files:
        try:
            if source_key == "special":
                url = f"{github_raw_package_base(ref)}/{filename}"
                target = package_dir / filename
                job.log(f"Download: {url}")
                data = download_bytes(url, timeout=60.0)
                target.write_bytes(data)
                job.log(f"Saved: {target} ({len(data)} bytes)")
            else:
                download_package_file(job, source_key, package_dir, filename)
        except error.HTTPError as exc:
            if exc.code == 404 and filename in BASE_FLASH_FILES and not require_base_files:
                job.log(f"Optional flash file missing on source, skip: {filename}")
                continue
            raise
    validate_package_partitions(package_dir, include_littlefs, require_partitions=require_base_files or include_littlefs)
    write_package_metadata(package_dir, ref or source_key)
    return package_dir


def resolve_package(job: Job, source_key: str, package_dir: str, include_littlefs: bool, package_ref: str = "", require_base_files: bool = True) -> pathlib.Path:
    if source_key in REMOTE_PACKAGES:
        return prepare_remote_package(job, source_key, include_littlefs, package_ref, require_base_files=require_base_files)
    return validate_package_dir(package_dir, include_littlefs, require_base_files=require_base_files)


def list_language_files(base_url: str) -> list[str]:
    base = normalize_base_url(base_url)
    try:
        data = json_request(f"{base}/list?dir=/language")
    except error.HTTPError as exc:
        if exc.code in {400, 404}:
            return []
        raise
    if not isinstance(data, list):
        return []
    files: list[str] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        if item.get("type") != "file":
            continue
        name = str(item.get("name", "")).strip()
        if not name.lower().endswith(".json"):
            continue
        if not name.startswith("language/"):
            name = f"language/{name.split('/')[-1]}"
        files.append(name)
    return files


def list_remote_languages(source_key: str, package_ref: str = "") -> list[dict[str, str]]:
    if source_key not in REMOTE_PACKAGES:
        raise ValueError("Language list supports only remote package sources")
    if source_key == "special":
        if not package_ref.strip():
            raise ValueError("Special Version requires a version ref")
        refs = [package_ref.strip()]
    else:
        refs = [REMOTE_PACKAGES[source_key]["branch"]]

    catalogs: list[list[Any]] = []
    for ref in refs:
        for url in (
            github_language_catalog_url(ref),
            f"https://api.github.com/repos/InnuendoPi/Brautomat32/contents/data/language?ref={ref}",
        ):
            try:
                data = json_request(url, timeout=20.0)
            except Exception:
                continue
            if isinstance(data, list):
                catalogs.append(data)

    files: dict[str, dict[str, str]] = {}
    for catalog in catalogs:
        for item in catalog:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name", "")).strip()
            path = str(item.get("path", "")).strip()
            if not name.lower().endswith(".json"):
                continue
            files.setdefault(
                name.lower(),
                {
                    "filename": name,
                    "language": name[:-5],
                    "path": path or f"language/{name}",
                },
            )

    if files:
        return sorted(files.values(), key=lambda x: x["language"].lower())

    fallback_candidates = (
        ("deutsch.json", "deutsch", "data/language/deutsch.json"),
        ("english.json", "english", "language/english.json"),
    )
    for ref in refs:
        base = github_raw_language_base(ref)
        for filename, language, path in fallback_candidates:
            try:
                download_bytes(f"{base}{path}", timeout=10.0)
            except Exception:
                continue
            files.setdefault(
                filename.lower(),
                {
                    "filename": filename,
                    "language": language,
                    "path": path,
                },
            )
    return sorted(files.values(), key=lambda x: x["language"].lower())


def update_webfiles_job(job: Job, base_url: str, source_key: str, package_ref: str = "") -> dict[str, Any]:
    if source_key not in REMOTE_PACKAGES:
        raise ValueError("Web files update supports only remote package sources")

    base = normalize_base_url(base_url)
    if source_key == "special":
        if not package_ref.strip():
            raise ValueError("Special Version requires a version ref")
        tools_base = github_raw_tools_base(package_ref.strip())
        language_base = github_raw_language_base(package_ref.strip())
    else:
        tools_base = remote_tools_base_url(source_key)
        language_base = remote_language_base_url(source_key)
    uploaded: list[str] = []
    try:
        device_languages = list_language_files(base)
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("Device not available. Check device URL/WiFi connection and try again.") from exc
    uploaded_set = set(WEBUPDATE_TOOL_FILES)
    extra_languages = [name for name in device_languages if name not in uploaded_set]
    total_steps = len(WEBUPDATE_TOOL_FILES) + len(extra_languages) + 1
    completed_steps = 0

    job.log(f"Web files source: {source_key}")
    job.log(f"Tools base: {tools_base}")
    job.log(f"Language base: {language_base}")

    for relative_path in WEBUPDATE_TOOL_FILES:
        job.set_current_file(relative_path)
        url = f"{tools_base}{relative_path}"
        job.log(f"Download: {url}")
        content = download_bytes(url, timeout=60.0)
        try:
            response = post_file_to_fs(base, f"/{relative_path}", content, timeout=120.0)
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(f"Device not available while uploading {relative_path}. Check device URL/WiFi connection and try again.") from exc
        uploaded.append(relative_path)
        completed_steps += 1
        if total_steps > 0:
            job.set_progress(round((completed_steps / total_steps) * 100))
        job.log(f"Uploaded: {relative_path} -> {response.strip() or 'ok'}")

    for relative_path in extra_languages:
        job.set_current_file(relative_path)
        url = f"{language_base}{relative_path}"
        job.log(f"Download: {url}")
        content = download_bytes(url, timeout=60.0)
        try:
            response = post_file_to_fs(base, f"/{relative_path}", content, timeout=120.0)
        except Exception as exc:  # noqa: BLE001
            raise RuntimeError(f"Device not available while uploading {relative_path}. Check device URL/WiFi connection and try again.") from exc
        uploaded.append(relative_path)
        completed_steps += 1
        if total_steps > 0:
            job.set_progress(round((completed_steps / total_steps) * 100))
        job.log(f"Uploaded: {relative_path} -> {response.strip() or 'ok'}")

    job.set_current_file("reboot")
    job.log("Reboot device after web files update")
    try:
        reboot_base, reboot_response = try_base_urls(base, lambda candidate: post_empty(f"{candidate}/reboot"))
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("Web files uploaded, but device reboot failed. Check device availability and try again.") from exc
    completed_steps += 1
    if total_steps > 0:
        job.set_progress(round((completed_steps / total_steps) * 100))
    job.log(f"Reboot requested via {reboot_base} -> {reboot_response.strip() or 'ok'}")

    job.set_progress(100)
    job.set_current_file(None)
    return {
        "source": source_key,
        "tools_base": tools_base,
        "language_base": language_base,
        "uploaded": uploaded,
        "rebooted": True,
        }


def install_language_job(job: Job, base_url: str, source_key: str, filename: str, package_ref: str = "") -> dict[str, Any]:
    if source_key not in REMOTE_PACKAGES:
        raise ValueError("Language install supports only remote package sources")

    clean_name = pathlib.Path(filename).name
    if not clean_name.lower().endswith(".json"):
        raise ValueError("Invalid language file")

    language_name = clean_name[:-5]
    base = normalize_base_url(base_url)
    if source_key == "special":
        if not package_ref.strip():
            raise ValueError("Special Version requires a version ref")
        source_url = f"{github_raw_language_base(package_ref.strip())}language/{clean_name}"
    else:
        source_url = f"{remote_language_base_url(source_key)}language/{clean_name}"

    job.set_current_file(clean_name)
    job.log(f"Download language: {source_url}")
    content = download_bytes(source_url, timeout=60.0)
    job.set_progress(25)

    try:
        response = post_file_to_fs(base, f"/language/{clean_name}", content, timeout=120.0)
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"Device not available while uploading {clean_name}. Check device URL/WiFi connection and try again.") from exc
    job.log(f"Uploaded language: {clean_name} -> {response.strip() or 'ok'}")
    job.set_progress(75)

    try:
        active_base, lang_response = try_base_urls(base, lambda candidate: post_json(f"{candidate}/setMiscLang", {"lang": language_name}))
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError("Language file uploaded, but activating the language failed. Check device availability and try again.") from exc

    job.log(f"Activated language: {language_name} via {active_base}")
    job.set_progress(100)
    job.set_current_file(None)
    return {
        "source": source_key,
        "language": language_name,
        "filename": clean_name,
        "base_url": active_base,
        "response": lang_response.strip() or "ok",
    }


# ---------------------------------------------------------------------------
# Background job tracking & long-lived device sessions
# Job/JobStore back the polling-based async-operation model used by the API
# (flash/backup/migration run in a thread; the frontend polls /api/jobs/<id>).
# SerialSession owns the live COM-port connection used by the Serial Monitor.
# ---------------------------------------------------------------------------
@dataclass
class Job:
    """A single tracked background operation: status, progress, and its log lines."""

    id: str
    type: str
    title: str
    status: str = "queued"
    created_at: str = field(default_factory=now_iso)
    started_at: str | None = None
    finished_at: str | None = None
    progress: int = 0
    current_file: str | None = None
    logs: list[str] = field(default_factory=list)
    result: dict[str, Any] | None = None
    error: str | None = None

    def log(self, message: str) -> None:
        self.logs.append(f"[{now_iso()}] {message}")

    def set_progress(self, value: int) -> None:
        self.progress = max(self.progress, max(0, min(100, int(value))))

    def set_current_file(self, value: str | None) -> None:
        self.current_file = value


class JobStore:
    """Thread-safe in-memory registry of Job objects, keyed by job id."""

    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()

    def create(self, job_type: str, title: str) -> Job:
        job = Job(id=uuid.uuid4().hex, type=job_type, title=title)
        with self._lock:
            self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            return self._jobs.get(job_id)

    def snapshot(self) -> list[dict[str, Any]]:
        with self._lock:
            return [job.__dict__.copy() for job in self._jobs.values()]


class SerialSession:
    """Owns one COM-port connection for the Serial Monitor.

    Reads lines via pyserial when available, otherwise falls back to a
    PowerShell subprocess driving System.IO.Ports.SerialPort; either way a
    background thread (_pump) appends timestamped lines to a shared deque.
    """

    def __init__(self, port: str, baud: int, shared_lines: deque[str]) -> None:
        self.port = normalize_serial_port_name(port)
        self.baud = baud
        self.lines = shared_lines
        self._proc: subprocess.Popen[str] | None = None
        self._serial: Any | None = None
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.running = False

    def start(self) -> None:
        if self.running:
            return
        self._stop.clear()
        if has_pyserial():
            self._serial = open_serial_port(self.port, self.baud, timeout=0.5, write_timeout=2.0)
        else:
            ps_script = (
                "$ErrorActionPreference='Stop';"
                f"$p=New-Object System.IO.Ports.SerialPort('{self.port}',{self.baud},'None',8,'one');"
                "$p.ReadTimeout=500;"
                "$p.DtrEnable=$false;"
                "$p.RtsEnable=$false;"
                "$p.NewLine=\"`n\";"
                "$p.Open();"
                "try { while ($true) { try { $line=$p.ReadLine(); if ($line -ne $null) { Write-Output $line.TrimEnd(\"`r\",\"`n\") } } catch [TimeoutException] { } } }"
                " finally { if ($p.IsOpen) { $p.Close() } }"
            )
            self._proc = subprocess.Popen(
                ["powershell", "-NoProfile", "-Command", ps_script],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                cwd=str(DATA_ROOT),
            )
        self._thread = threading.Thread(target=self._pump, daemon=True)
        self.running = True
        self._thread.start()

    def _pump(self) -> None:
        if self._serial is not None:
            while not self._stop.is_set():
                line = read_serial_line(self._serial)
                if line:
                    self.lines.append(f"[{now_iso()}] {line}")
                    continue
                time.sleep(SERIAL_POLL_DELAY)
        else:
            assert self._proc is not None
            while not self._stop.is_set():
                line = self._proc.stdout.readline() if self._proc.stdout else ""
                if line:
                    self.lines.append(f"[{now_iso()}] {line.rstrip()}")
                    continue
                if self._proc.poll() is not None:
                    break
                time.sleep(SERIAL_POLL_DELAY)
        self.running = False

    def stop(self) -> None:
        self._stop.set()
        if self._serial is not None:
            try:
                self._serial.close()
            except Exception:
                pass
            self._serial = None
        if self._proc and self._proc.poll() is None:
            self._proc.terminate()
            try:
                self._proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self._proc.kill()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)
        self.running = False

    def add_line(self, message: str) -> None:
        self.lines.append(f"[{now_iso()}] {message}")

    def snapshot(self) -> dict[str, Any]:
        return {
            "port": self.port,
            "baud": self.baud,
            "running": self.running,
            "lines": list(self.lines),
        }


# ---------------------------------------------------------------------------
# Global application state
# STATE (instantiated near the bottom of the file) is the single process-wide
# ServiceState; AppHandler reads/mutates it on every request instead of
# holding any per-connection state of its own.
# ---------------------------------------------------------------------------
class ServiceState:
    """Process-wide state: job store plus the active serial/Telegraf/test-runner sessions."""

    def __init__(self) -> None:
        self.jobs = JobStore()
        self.serial: SerialSession | None = None
        self.serial_lines: deque[str] = deque(maxlen=400)
        self.serial_port: str = ""
        self.serial_baud: int = 0
        self.test_runner = TestRunnerSession()
        self.telegraf = TelegrafSession()
        self.lock = threading.Lock()
        self.serial_access_lock = threading.Lock()

    def start_serial(self, port: str, baud: int, initial_lines: list[str] | None = None, announce_start: bool = True) -> dict[str, Any]:
        with self.lock:
            if initial_lines is not None:
                self.serial_lines = deque(initial_lines, maxlen=400)
            if self.serial:
                self.serial.stop()
            self.serial_port = port
            self.serial_baud = baud
            self.serial = SerialSession(port, baud, self.serial_lines)
            self.serial.start()
            if announce_start:
                self.serial.add_line("Start serial monitor")
            return self.serial.snapshot()

    def stop_serial(self) -> dict[str, Any]:
        with self.lock:
            if self.serial:
                self.serial.add_line("Stop serial monitor")
                self.serial.stop()
                snapshot = self.serial.snapshot()
                self.serial = None
                return snapshot
            return {"port": self.serial_port, "baud": self.serial_baud, "running": False, "lines": list(self.serial_lines)}

    def serial_snapshot(self) -> dict[str, Any]:
        with self.lock:
            if self.serial:
                return self.serial.snapshot()
            return {"port": self.serial_port, "baud": self.serial_baud, "running": False, "lines": list(self.serial_lines)}

    def clear_serial_log(self) -> dict[str, Any]:
        with self.lock:
            self.serial_lines.clear()
            if self.serial:
                return self.serial.snapshot()
            return {"port": self.serial_port, "baud": self.serial_baud, "running": False, "lines": []}

    def release_serial_port(self, port: str | None = None) -> None:
        with self.lock:
            if self.serial and (port is None or self.serial.port == port):
                self.serial.stop()
                self.serial = None

    def active_serial_config(self, port: str | None = None) -> dict[str, Any] | None:
        with self.lock:
            if not self.serial:
                return None
            if port is not None and self.serial.port != port:
                return None
            return self.serial.snapshot()

    def append_serial_line(self, message: str) -> None:
        with self.lock:
            entry = f"[{now_iso()}] {message}"
            if self.serial:
                self.serial.lines.append(entry)
            else:
                self.serial_lines.append(entry)


# ---------------------------------------------------------------------------
# Optional private Test Runner session
# Launches the Node.js test-runner subprocess from a private Brautomat32
# checkout (see detect_test_runner_environment() above); the tab stays
# hidden in the UI unless that environment is actually present.
# ---------------------------------------------------------------------------
class TestRunnerSession:
    """Runs the optional private Node.js Test Runner as a managed subprocess."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._proc: subprocess.Popen[str] | None = None
        self._thread: threading.Thread | None = None
        self._stop_requested = False
        self._logs: deque[str] = deque(maxlen=4000)
        self.status = "idle"
        self.started_at: str | None = None
        self.finished_at: str | None = None
        self.suite_id = ""
        self.suite_label = ""
        self.summary = ""
        self.error = ""
        self.counts: dict[str, int] = {}
        self.result_summary = ""
        self.report_path = ""
        self.log_path = ""
        self.out_dir = ""
        self.base_url = ""
        self.restore_backup_path = ""

    def _append(self, message: str) -> None:
        self._logs.append(f"[{now_iso()}] {message}")

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            return {
                "running": self.status in {"running", "stopping", "restoring"},
                "status": self.status,
                "started_at": self.started_at,
                "finished_at": self.finished_at,
                "suite_id": self.suite_id,
                "suite_label": self.suite_label,
                "summary": self.summary,
                "error": self.error,
                "counts": dict(self.counts),
                "result_summary": self.result_summary,
                "report_path": self.report_path,
                "log_path": self.log_path,
                "out_dir": self.out_dir,
                "lines": list(self._logs),
            }

    def start(self, suite: dict[str, Any], base_url: str, device_key: str) -> dict[str, Any]:
        catalog = detect_test_runner_environment()
        if not catalog["enabled"]:
            raise RuntimeError("; ".join(catalog["reasons"]) or "Test Runner is not available")

        tools_dir = pathlib.Path(catalog["tools_dir"])
        repo_root = tools_dir.parent.parent
        config_path = pathlib.Path(str(suite["config_path"]))
        if not config_path.is_file():
            raise RuntimeError(f"Suite config not found: {config_path}")

        suite_id = str(suite["id"])
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        out_dir = tools_dir / "reports" / "servicetool" / slugify(suite_id) / timestamp
        out_dir.mkdir(parents=True, exist_ok=True)
        command = [
            "node",
            str(pathlib.Path("tools") / "test-runner" / "src" / "index.js"),
            "batch-suite",
            "--baseUrl",
            base_url,
            "--deviceKey",
            device_key,
            "--config",
            str(config_path),
            "--out",
            str(out_dir),
        ] 

        with self._lock:
            if self._proc or self.status in {"running", "stopping", "restoring"}:
                raise RuntimeError("A test run is already active")
            self._logs.clear()
            self.status = "running"
            self.started_at = now_iso()
            self.finished_at = None
            self.suite_id = suite_id
            self.suite_label = str(suite.get("label") or suite_id)
            self.summary = ""
            self.error = ""
            self.counts = {}
            self.result_summary = ""
            self.report_path = str((out_dir / "report.json").resolve())
            self.log_path = str((out_dir / "service-tool-run.log").resolve())
            self.out_dir = str(out_dir.resolve())
            self.base_url = normalize_base_url(base_url)
            self.restore_backup_path = str((out_dir / "runtime" / "device-backup-start.json").resolve())
            self._stop_requested = False
            self._append(f"Starting test runner: {self.suite_label}")
            self._append(" ".join(command))
            self._proc = subprocess.Popen(
                command,
                cwd=str(repo_root),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
            )
            self._thread = threading.Thread(target=self._pump, daemon=True)
            self._thread.start()
            return self.snapshot()

    def stop(self) -> dict[str, Any]:
        with self._lock:
            if not self._proc or self.status != "running":
                return self.snapshot()
            self._stop_requested = True
            self.status = "stopping"
            self.summary = "Stopping test runner ..."
            self._append("Stopping test runner ...")
            self._proc.terminate()
            try:
                self._proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self._append("Runner did not stop cleanly. Killing process ...")
                self._proc.kill()
            return self.snapshot()

    def _pump(self) -> None:
        proc: subprocess.Popen[str] | None
        log_path = ""
        report_path = ""
        with self._lock:
            proc = self._proc
            log_path = self.log_path
            report_path = self.report_path
        if proc is None:
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

        exit_code = proc.wait()
        report_summary = load_test_runner_report(report_path)
        restore_result: dict[str, Any] = {}
        stop_requested = False
        restore_backup_path = ""
        restore_base_url = ""
        with self._lock:
            stop_requested = self._stop_requested
            restore_backup_path = self.restore_backup_path
            restore_base_url = self.base_url
            if stop_requested:
                self.status = "restoring"
                self.summary = "Restoring original device state ..."
                self.error = ""
                self._append(self.summary)
            elif exit_code == 0:
                self.status = "done"
                self.summary = report_summary.get("summary") or "Test runner completed."
            else:
                self.status = "failed"
                self.error = report_summary.get("error") or f"Test runner exited with code {exit_code}"
                self.summary = report_summary.get("summary") or self.error
            self.counts = report_summary.get("counts") or {}
            self.result_summary = report_summary.get("result_summary") or ""
        if stop_requested:
            backup_path = pathlib.Path(restore_backup_path) if restore_backup_path else pathlib.Path()
            if backup_path.is_file():
                try:
                    restore_result = restore_backup_and_wait(restore_base_url, backup_path.name, backup_path.read_bytes())
                except Exception as exc:  # noqa: BLE001
                    restore_result = {"uploadAccepted": False, "readyPassed": False, "error": str(exc)}
            else:
                restore_result = {
                    "uploadAccepted": False,
                    "readyPassed": False,
                    "error": f"Restore backup not found: {backup_path.name or '-'}",
                }
        with self._lock:
            if stop_requested:
                if restore_result.get("error"):
                    self._append(f"Restore failed: {restore_result['error']}")
                else:
                    self._append(
                        "Restore result: "
                        f"uploadAccepted={restore_result.get('uploadAccepted')}, "
                        f"rebootDetected={restore_result.get('rebootDetected')}, "
                        f"readyPassed={restore_result.get('readyPassed')}, "
                        f"timestampReset={restore_result.get('timestampReset')}"
                    )
                if restore_result.get("readyPassed"):
                    self.status = "stopped"
                    self.summary = "Test runner stopped. Original device state restored."
                    self.error = ""
                else:
                    self.status = "failed"
                    self.error = restore_result.get("error") or "Test runner stopped, but device restore failed."
                    self.summary = self.error
            self.finished_at = now_iso()
            self._append(self.summary or f"Process exited with code {exit_code}")
            pathlib.Path(log_path).write_text("\n".join(self._logs), encoding="utf-8")
            self._proc = None


def load_test_runner_report(report_path: str) -> dict[str, Any]:
    path = pathlib.Path(report_path)
    if not path.is_file():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        return {"error": f"invalid report.json: {exc}"}
    return {
        "summary": str(payload.get("summary") or "").strip(),
        "counts": payload.get("counts") if isinstance(payload.get("counts"), dict) else {},
        "status": str(payload.get("status") or "").strip(),
        "error": str(payload.get("error") or "").strip(),
        "result_summary": build_test_runner_results_markdown(payload),
    }


STATE = ServiceState()
HTTP_SERVER: ThreadingHTTPServer | None = None


# ---------------------------------------------------------------------------
# Job execution & flash progress
# run_job() is the generic thread launcher used by every long-running API
# action; exclusive_serial_access() pauses the Serial Monitor so flashing,
# backup, or migration can have the COM port to themselves.
# ---------------------------------------------------------------------------
@contextmanager
def exclusive_serial_access(timeout: float = 10.0):
    acquired = STATE.serial_access_lock.acquire(timeout=timeout)
    if not acquired:
        raise RuntimeError("Serial port is busy with another ServiceTool task.")
    try:
        yield
    finally:
        STATE.serial_access_lock.release()


def run_job(job: Job, target, *args, **kwargs) -> None:
    def worker() -> None:
        job.status = "running"
        job.started_at = now_iso()
        try:
            result = target(job, *args, **kwargs)
            job.result = result
            job.status = "done"
        except Exception as exc:  # noqa: BLE001
            job.error = str(exc)
            job.log(f"ERROR: {exc}")
            job.status = "failed"
        finally:
            job.finished_at = now_iso()
            log_path = LOG_DIR / f"{job.id}.log"
            log_path.write_text("\n".join(job.logs), encoding="utf-8")

    threading.Thread(target=worker, daemon=True).start()


def telegraf_download_job(job: Job) -> dict[str, Any]:
    """Lädt die Telegraf-Binary im Hintergrund herunter und meldet Fortschritt
    (Status-Zeilen und Prozent) an den Job, den das Frontend pollt."""
    def on_status(message: str) -> None:
        job.log(message)

    def on_progress(done: int, total: int) -> None:
        if total:
            job.set_progress(int(done * 100 / total))
        done_mb = done / (1024 * 1024)
        job.set_current_file(f"{done_mb:.1f} MB / {total / (1024 * 1024):.1f} MB" if total else f"{done_mb:.1f} MB")

    path = download_telegraf(on_status=on_status, on_progress=on_progress)
    job.set_progress(100)
    return {"path": str(path)}


def update_progress_from_line(job: Job, line: str) -> None:
    match = re.search(r"(\d{1,3})\s*%", line)
    if match:
        job.set_progress(int(match.group(1)))


def update_flash_progress(
    job: Job,
    line: str,
    files: list[tuple[str, int, int]],
    state: dict[str, Any],
) -> None:
    if not files:
        return

    current_index = state.get("index", 0)
    per_file_progress: list[float] = state.setdefault("per_file_progress", [0.0] * len(files))  # type: ignore[assignment]
    if len(per_file_progress) < len(files):
        per_file_progress.extend([0.0] * (len(files) - len(per_file_progress)))
    write_start = int(state.get("write_start", 0))
    write_end = int(state.get("write_end", 99))

    started_file = None
    writing_match = re.search(r"Writing\s+'([^']+)'\s+at\s+0x[0-9a-fA-F]+", line)
    if writing_match:
        started_file = pathlib.PurePath(writing_match.group(1)).name
        for idx, (filename, _, _) in enumerate(files):
            if filename == started_file:
                for completed_idx in range(idx):
                    per_file_progress[completed_idx] = 1.0
                current_index = idx
                break

    percent_match = re.search(r"(\d+(?:\.\d+)?)\s*%", line)
    if percent_match:
        per_file_progress[current_index] = max(per_file_progress[current_index], min(1.0, float(percent_match.group(1)) / 100.0))
    elif re.search(r"^Wrote\s+\d+\s+bytes", line):
        per_file_progress[current_index] = 1.0
    elif started_file is None:
        return

    total_bytes = sum(size for _, size, _ in files)
    if total_bytes <= 0:
        return

    state["index"] = current_index
    completed_bytes = 0.0
    for idx, (_, size, _) in enumerate(files):
        completed_bytes += per_file_progress[idx] * size
    flash_progress = max(0.0, min(1.0, completed_bytes / total_bytes))
    overall = round(write_start + (flash_progress * (write_end - write_start)))
    overall = max(state.get("overall", 0), overall)
    state["overall"] = overall

    current_name = files[current_index][0]
    job.set_current_file(current_name)
    job.set_progress(overall)


def create_backup_job(job: Job, base_url: str, include_api: bool) -> dict[str, Any]:
    base = normalize_base_url(base_url)
    job.set_progress(5)
    job.set_current_file("backup.json")
    job.log(f"Backup starten: {base}")
    response = post_empty(f"{base}/backup?api={1 if include_api else 0}")
    job.set_progress(40)
    job.log(f"Backup-Antwort: {response.strip() or 'ok'}")
    payload = download_bytes(f"{base}/download?file=/backup.json")
    job.set_progress(85)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    target = BACKUP_DIR / f"brautomat-backup-{stamp}.json"
    target.write_bytes(payload)
    job.set_progress(100)
    job.log(f"Backup gespeichert: {target}")
    return {"backup_file": str(target), "size": len(payload)}


# ---------------------------------------------------------------------------
# Device status & firmware detection
# combined_device_status() reconciles the serial and network probes into the
# single connection state shown in the UI badge: No device / Checking /
# Serial / Online.
# ---------------------------------------------------------------------------
def device_status(base_url: str) -> dict[str, Any]:
    base, vis = try_base_urls(base_url, lambda candidate: json_request(f"{candidate}/reqVis", timeout=2.5))
    firmware = extract_firmware_banner(vis.get("firm")) or str(vis.get("firm") or "").strip()
    if not firmware:
        try:
            slot = json_request(f"{base}/reqFirmwareSlot", timeout=2.5)
            if isinstance(slot, dict):
                firmware = extract_firmware_banner(slot.get("firmware")) or str(slot.get("firmware") or "").strip()
        except Exception:
            pass
    parsed = parse.urlparse(base)
    hostname = parsed.hostname or ""
    resolved_ip = None
    if hostname:
        try:
            resolved_ip = socket.gethostbyname(hostname)
        except OSError:
            resolved_ip = None
    testflow_enabled = False
    testflow_schema = 0
    build_type = ""
    try:
        _snapshot_base, snapshot = try_base_urls(base_url, lambda candidate: json_request(f"{candidate}/dev/snapshot", timeout=2.5))
        meta = snapshot.get("meta") if isinstance(snapshot, dict) else {}
        if isinstance(meta, dict):
            testflow_enabled = True
            testflow_schema = int(meta.get("testflowSchema") or 0)
            build_type = str(meta.get("buildType") or "").strip()
    except Exception:
        pass
    return {
        "state": "online",
        "transport": "http",
        "base_url": base,
        "hostname": hostname,
        "resolved_ip": resolved_ip,
        "firmware": firmware,
        "lang": vis.get("lang"),
        "dev": bool(vis.get("dev")),
        "dashboard_only": bool(vis.get("dtp")),
        "active_process": device_process_status(base),
        "testflow_enabled": testflow_enabled,
        "testflow_schema": testflow_schema,
        "build_type": build_type,
        "raw": vis,
    }


def device_process_status(base_url: str) -> dict[str, Any]:
    try:
        data = json_request(f"{base_url}/reqProcessStatus", timeout=2.5)
    except Exception:
        return {"state": "idle"}
    if not isinstance(data, dict):
        return {"state": "idle"}
    return data if data.get("state") == "active" else {"state": "idle"}


FIRMWARE_BANNER_RE = re.compile(r"(Brautomat32(?:\s+V)?\s+[^\r\n]*\d+\.\d+(?:\.\d+)?[^\r\n]*)", re.IGNORECASE)


def extract_firmware_banner(line: str) -> str:
    raw = str(line or "")
    clean = re.sub(r"\x1b\[[0-9;]*m", "", raw).replace("\r", "").strip().strip('"').strip("'")
    match = FIRMWARE_BANNER_RE.search(clean)
    return match.group(1).strip() if match else ""


def firmware_banner_from_lines(lines: list[str] | tuple[str, ...] | deque[str]) -> str:
    for line in reversed(list(lines)):
        banner = extract_firmware_banner(line)
        if banner:
            return banner
    return ""


def serial_firmware_version(port: str, baud: int = 115200, timeout: float = 12.0, allow_reset: bool = False) -> dict[str, Any]:
    if not port:
        raise RuntimeError("Serial port missing")
    port = normalize_serial_port_name(port)

    active = STATE.active_serial_config(port)
    if active:
        banner = firmware_banner_from_lines(active.get("lines", []))
        if banner:
            return {
                "firmware": banner,
                "transport": "serial",
                "source": "serial-monitor",
                "port": port,
                "baud": baud,
            }
        raise RuntimeError("Serial monitor active, but no firmware banner found")

    try:
        info = serial_json_command(port, baud, {"cmd": "info"}, timeout=max(2.5, timeout), allow_running_monitor=False)
        data = info.get("data") if isinstance(info, dict) else {}
        firmware = str((data or {}).get("firmware") or "").strip()
        if firmware:
            return {
                "firmware": firmware,
                "transport": "serial",
                "source": "serial-info",
                "port": port,
                "baud": baud,
                "ip": str((data or {}).get("ip") or "").strip(),
                "rssi": (data or {}).get("rssi"),
                "mdns": str((data or {}).get("mdns") or "").strip(),
                "lines": [],
            }
    except Exception:
        pass

    if not allow_reset:
        raise RuntimeError("Serial firmware version not available without reset")

    with exclusive_serial_access(timeout=max(10.0, timeout + 2.0)):
        if has_pyserial():
            lines: list[str] = []
            deadline = time.time() + timeout
            with open_serial_port(port, baud, timeout=0.5, write_timeout=2.0) as handle:
                time.sleep(0.2)
                try:
                    handle.reset_input_buffer()
                except Exception:
                    pass
                reset_serial_device(handle)
                while time.time() < deadline:
                    line = read_serial_line(handle)
                    if not line:
                        continue
                    lines.append(line)
                    if "Brautomat32" in line:
                        break
            banner = firmware_banner_from_lines(lines)
            if not banner:
                raise RuntimeError("Firmware version not found in serial boot log")
            return {
                "firmware": banner,
                "transport": "serial",
                "source": "bootlog",
                "port": port,
                "baud": baud,
                "lines": lines[-10:],
            }

        ps_script = f"""
$ErrorActionPreference='SilentlyContinue'
$p=$null
try {{
  $p=New-Object System.IO.Ports.SerialPort('{port}',{baud},'None',8,'one')
  $p.ReadTimeout=500
  $p.NewLine="`n"
  $p.DtrEnable=$false
  $p.RtsEnable=$false
  $p.Open()
  Start-Sleep -Milliseconds 200
  try {{ $p.DiscardInBuffer() }} catch {{ }}
  try {{
    $p.DtrEnable=$true
    $p.RtsEnable=$true
    Start-Sleep -Milliseconds 180
    $p.DtrEnable=$false
    $p.RtsEnable=$false
    Start-Sleep -Milliseconds 220
  }} catch {{ }}
  $deadline=(Get-Date).AddMilliseconds({int(timeout * 1000)})
  while ((Get-Date) -lt $deadline) {{
    try {{
      $line=$p.ReadLine()
      if (-not [string]::IsNullOrWhiteSpace($line)) {{
        Write-Output $line.Trim()
        if ($line -match 'Brautomat32') {{
          break
        }}
      }}
    }} catch [TimeoutException] {{ }}
  }}
}} finally {{
  if ($p -and $p.IsOpen) {{ $p.Close() }}
}}
"""
        completed = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps_script],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            cwd=str(DATA_ROOT),
            timeout=max(6, int(timeout) + 4),
        )
        if completed.returncode != 0:
            raise RuntimeError(completed.stderr.strip() or completed.stdout.strip() or "Serial version read failed")

        lines = [line.strip() for line in completed.stdout.splitlines() if line.strip()]
        banner = firmware_banner_from_lines(lines)
        if not banner:
            raise RuntimeError("Firmware version not found in serial boot log")
        return {
            "firmware": banner,
            "transport": "serial",
            "source": "bootlog",
            "port": port,
            "baud": baud,
            "lines": lines[-10:],
        }


def combined_device_status(
    base_url: str,
    serial_port: str = "",
    serial_baud: int = 115200,
    serial_timeout: float = 12.0,
    prefer_serial: bool = False,
) -> dict[str, Any]:
    http_error = ""
    serial_info: dict[str, Any] | None = None
    serial_error = ""

    def serial_ip_status(info: dict[str, Any] | None) -> dict[str, Any] | None:
        ip = str((info or {}).get("ip") or "").strip()
        if not ip or ip == "0.0.0.0":
            return None
        try:
            status = device_status(f"http://{ip}")
        except Exception:
            return None
        status["serial_port"] = serial_port
        status["serial_baud"] = serial_baud
        status["version_source"] = status.get("version_source") or "http-ip"
        status["serial_firmware"] = (info or {}).get("firmware", "")
        return status

    if prefer_serial and serial_port:
        try:
            serial_info = serial_firmware_version(serial_port, serial_baud, timeout=serial_timeout)
        except Exception as exc:  # noqa: BLE001
            serial_error = str(exc)

    try:
        status = device_status(base_url)
        if serial_port:
            status["serial_port"] = serial_port
            status["serial_baud"] = serial_baud
        if serial_info and not status.get("firmware"):
            status["firmware"] = serial_info.get("firmware", "")
            status["version_source"] = serial_info.get("source", "serial")
        return status
    except Exception as exc:  # noqa: BLE001
        http_error = str(exc)

    if serial_info:
        ip_status = serial_ip_status(serial_info)
        if ip_status:
            return ip_status
        return {
            "state": "serial",
            "transport": "serial",
            "base_url": "",
            "hostname": "",
            "resolved_ip": None,
            "firmware": serial_info.get("firmware", ""),
            "lang": "",
            "dev": False,
            "dashboard_only": False,
            "raw": {},
            "serial_port": serial_port,
            "serial_baud": serial_baud,
            "version_source": serial_info.get("source", "serial"),
            "http_error": http_error,
        }

    if serial_port:
        try:
            serial_info = serial_firmware_version(serial_port, serial_baud, timeout=serial_timeout)
            ip_status = serial_ip_status(serial_info)
            if ip_status:
                return ip_status
            return {
                "state": "serial",
                "transport": "serial",
                "base_url": "",
                "hostname": "",
                "resolved_ip": None,
                "firmware": serial_info.get("firmware", ""),
                "lang": "",
                "dev": False,
                "dashboard_only": False,
                "raw": {},
                "serial_port": serial_port,
                "serial_baud": serial_baud,
                "version_source": serial_info.get("source", "serial"),
                "http_error": http_error,
            }
        except Exception as exc:  # noqa: BLE001
            return {
                "state": "serial",
                "transport": "serial",
                "base_url": "",
                "hostname": "",
                "resolved_ip": None,
                "firmware": "",
                "lang": "",
                "dev": False,
                "dashboard_only": False,
                "raw": {},
                "serial_port": serial_port,
                "serial_baud": serial_baud,
                "version_source": "unavailable",
                "http_error": http_error,
                "serial_error": serial_error or str(exc),
            }

    return {
        "state": "offline",
        "transport": "offline",
        "base_url": "",
        "hostname": "",
        "resolved_ip": None,
        "firmware": "",
        "lang": "",
        "dev": False,
        "dashboard_only": False,
        "raw": {},
        "http_error": http_error,
        "serial_error": serial_error,
    }


def serial_json_command(
    port: str,
    baud: int,
    payload: dict[str, Any],
    timeout: float = 12.0,
    allow_running_monitor: bool = False,
) -> dict[str, Any]:
    port = normalize_serial_port_name(port)
    ensure_serial_command_port_available(port, allow_running_monitor=allow_running_monitor)
    with exclusive_serial_access(timeout=max(10.0, timeout + 2.0)):
        if has_pyserial():
            encoded = f"BST:{json.dumps(payload, separators=(',', ':'))}\n".encode("utf-8")
            with open_serial_port(port, baud, timeout=0.5, write_timeout=2.0) as handle:
                time.sleep(0.25)
                try:
                    handle.reset_input_buffer()
                    handle.reset_output_buffer()
                except Exception:
                    pass
                handle.write(encoded)
                handle.flush()
                deadline = time.time() + timeout
                while time.time() < deadline:
                    line = read_serial_line(handle)
                    if not line or not line.startswith("BST:"):
                        continue
                    return json.loads(line[4:].strip())
            raise RuntimeError("No serial response")

        encoded = base64.b64encode((f"BST:{json.dumps(payload, separators=(',', ':'))}\n").encode("utf-8")).decode("ascii")
        ps_script = f"""
$ErrorActionPreference='Stop'
$p=New-Object System.IO.Ports.SerialPort('{port}',{baud},'None',8,'one')
$p.ReadTimeout=500
$p.WriteTimeout=2000
$p.DtrEnable=$false
$p.RtsEnable=$false
$p.NewLine="`n"
$p.Open()
try {{
  Start-Sleep -Milliseconds 250
  $p.DiscardInBuffer()
  $p.DiscardOutBuffer()
  $payload=[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('{encoded}'))
  $p.Write($payload)
  $deadline=(Get-Date).AddMilliseconds({int(timeout * 1000)})
  while ((Get-Date) -lt $deadline) {{
    try {{
      $line=$p.ReadLine()
      if ($line -and $line.StartsWith('BST:')) {{
        Write-Output $line.Substring(4).Trim()
        break
      }}
    }} catch [TimeoutException] {{ }}
  }}
}} finally {{
  if ($p.IsOpen) {{ $p.Close() }}
}}
"""
        completed = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps_script],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            cwd=str(DATA_ROOT),
            timeout=max(5, int(timeout) + 5),
        )
        if completed.returncode != 0:
            raise RuntimeError(completed.stderr.strip() or completed.stdout.strip() or "Serial command failed")

        output = completed.stdout.strip()
        if not output:
            raise RuntimeError("No serial response")

        return json.loads(output)


def observe_wifi_reboot(port: str, baud: int, timeout: float = 35.0) -> dict[str, Any]:
    if not port:
        return {"result": "unknown", "reason": "serial-port-missing"}
    port = normalize_serial_port_name(port)
    try:
        ensure_serial_command_port_available(port)
    except RuntimeError as exc:
        return {"result": "unknown", "reason": "serial-busy", "error": str(exc)}

    with exclusive_serial_access(timeout=max(10.0, timeout + 2.0)):
        if has_pyserial():
            deadline = time.time() + timeout
            result = {"result": "unknown", "line": "", "reason": "timeout"}
            while time.time() < deadline:
                try:
                    with open_serial_port(port, baud, timeout=0.5, write_timeout=2.0) as handle:
                        while time.time() < deadline:
                            line = read_serial_line(handle)
                            if not line:
                                continue
                            if "IP address:" in line or "mDNS http://" in line:
                                return {"result": "success", "line": line, "reason": "device-online"}
                            if "starting WiFi Config Portal" in line or "open http://192.168.4.1" in line:
                                return {"result": "failed", "line": line, "reason": "config-portal"}
                except Exception:
                    pass
                time.sleep(0.4)
            return result

        ps_script = f"""
$ErrorActionPreference='SilentlyContinue'
$deadline=(Get-Date).AddMilliseconds({int(timeout * 1000)})
$result=@{{result='unknown'; line=''; reason='timeout'}}
while ((Get-Date) -lt $deadline) {{
  $p=$null
  try {{
    $p=New-Object System.IO.Ports.SerialPort('{port}',{baud},'None',8,'one')
    $p.ReadTimeout=500
    $p.NewLine="`n"
    $p.Open()
    while ((Get-Date) -lt $deadline -and $p.IsOpen) {{
      try {{
        $line=$p.ReadLine().Trim()
        if (-not [string]::IsNullOrWhiteSpace($line)) {{
          if ($line -match 'IP address:' -or $line -match 'mDNS http://') {{
            $result=@{{result='success'; line=$line; reason='device-online'}}
            ($result | ConvertTo-Json -Compress)
            return
          }}
          if ($line -match 'starting WiFi Config Portal' -or $line -match 'open http://192.168.4.1') {{
            $result=@{{result='failed'; line=$line; reason='config-portal'}}
            ($result | ConvertTo-Json -Compress)
            return
          }}
        }}
      }} catch [TimeoutException] {{ }}
      catch {{ break }}
    }}
  }} catch {{ }}
  finally {{
    if ($p -and $p.IsOpen) {{ $p.Close() }}
  }}
  Start-Sleep -Milliseconds 400
}}
($result | ConvertTo-Json -Compress)
"""
        completed = subprocess.run(
            ["powershell", "-NoProfile", "-Command", ps_script],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            cwd=str(DATA_ROOT),
            timeout=max(10, int(timeout) + 10),
        )
        if completed.returncode != 0:
            return {
                "result": "unknown",
                "reason": "observer-error",
                "stderr": completed.stderr.strip(),
                "stdout": completed.stdout.strip(),
            }
        output = completed.stdout.strip()
        if not output:
            return {"result": "unknown", "reason": "no-output"}
        try:
            data = json.loads(output)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            pass
        return {"result": "unknown", "reason": "invalid-output", "raw": output}


def firmware_slot(base_url: str) -> dict[str, Any]:
    _, data = try_base_urls(base_url, lambda candidate: json_request(f"{candidate}/reqFirmwareSlot"))
    return data if isinstance(data, dict) else {"raw": data}


# ---------------------------------------------------------------------------
# Firmware update & migration-readiness checks
# Compares the device's current firmware version against the remote repo
# version/migration thresholds (MIGRATION_MIN_VERSION / _TARGET_VERSION).
# ---------------------------------------------------------------------------
def current_firmware_version(base_url: str) -> tuple[str, tuple[int, int, int]]:
    slot = firmware_slot(base_url)
    version = str(slot.get("firmware", "")).strip()
    if not version:
        raise RuntimeError("Device firmware version unavailable")
    return version, require_version_tuple(version, "Device")


def remote_repo_version(ref: str) -> tuple[str, tuple[int, int, int]]:
    data = json_request(github_version_json_url(ref), timeout=20.0)
    if not isinstance(data, dict):
        raise RuntimeError(f"Remote version info for {ref} is invalid")
    version = str(data.get("version", "")).strip()
    if not version:
        raise RuntimeError(f"Remote version info for {ref} is missing version")
    return version, require_version_tuple(version, f"Remote {ref}")


def remote_repo_version_manifest(ref: str) -> dict[str, Any]:
    data = json_request(github_version_json_url(ref), timeout=20.0)
    if not isinstance(data, dict):
        raise RuntimeError(f"Remote version info for {ref} is invalid")
    version = str(data.get("version", "")).strip()
    if not version:
        raise RuntimeError(f"Remote version info for {ref} is missing version")
    data["version"] = version
    data["ref"] = ref
    return data


def firmware_update_status(base_url: str) -> dict[str, Any]:
    status = device_status(base_url)
    current_version = str(status.get("firmware") or "").strip()
    if not current_version:
        raise RuntimeError("Device firmware version unavailable")
    current_parsed = require_version_tuple(current_version, "Device")
    is_development = bool(status.get("dev")) or "develop" in current_version.lower()
    ref = "development" if is_development else "main"
    manifest = remote_repo_version_manifest(ref)
    remote_version = str(manifest.get("version") or "").strip()
    remote_parsed = require_version_tuple(remote_version, f"Remote {ref}")
    return {
        "current_version": current_version,
        "version": remote_version,
        "release_date": manifest.get("release_date") or manifest.get("released_at") or "",
        "type": manifest.get("type") or ("Development" if is_development else "Release"),
        "notes": manifest.get("notes") or "",
        "ref": ref,
        "available": remote_parsed > current_parsed,
        "device": {
            "base_url": status.get("base_url") or normalize_base_url(base_url),
            "state": status.get("state") or "online",
            "dev": bool(status.get("dev")),
            "active_process": status.get("active_process") or {"state": "idle"},
        },
    }


def firmware_webupdate_job(job: Job, base_url: str, include_api: bool) -> dict[str, Any]:
    job.log("Firmware WebUpdate: prüfe Gerät")
    status = firmware_update_status(base_url)
    process = status.get("device", {}).get("active_process") or {}
    if process.get("state") == "active":
        raise RuntimeError("Firmware WebUpdate blocked: active mash or fermenter process")
    if not status.get("available"):
        raise RuntimeError("No newer firmware version available")

    base = normalize_base_url(base_url)
    job.set_progress(5)
    job.set_current_file("backup.json")
    job.log(f"Backup starten: {base}")
    response = post_empty(f"{base}/backup?api={1 if include_api else 0}")
    job.set_progress(35)
    job.log(f"Backup-Antwort: {response.strip() or 'ok'}")
    payload = download_bytes(f"{base}/download?file=/backup.json")
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    target = BACKUP_DIR / f"brautomat-backup-{stamp}.json"
    target.write_bytes(payload)
    job.set_progress(55)
    job.log(f"Backup gespeichert: {target}")

    job.set_current_file("/startHTTPUpdate")
    job.log(f"Starte Firmware WebUpdate: {status['current_version']} -> {status['version']} ({status['ref']})")
    active_base, update_response = try_base_urls(base_url, lambda candidate: post_disruptive_empty(f"{candidate}/startHTTPUpdate", timeout=45.0))
    job.set_progress(100)
    job.log(f"WebUpdate akzeptiert über {active_base}: {update_response.strip() or 'ok'}")
    return {
        "backup_file": str(target),
        "backup_size": len(payload),
        "current_version": status["current_version"],
        "target_version": status["version"],
        "ref": status["ref"],
        "response": update_response.strip() or "ok",
    }


def wait_for_device_version(base_url: str, minimum: tuple[int, int, int], timeout: float = 240.0, interval: float = 5.0) -> dict[str, Any]:
    deadline = time.time() + timeout
    last_error: Exception | None = None
    while time.time() < deadline:
        try:
            slot = firmware_slot(base_url)
            version = str(slot.get("firmware", "")).strip()
            parsed = require_version_tuple(version, "Updated device")
            if parsed >= minimum:
                return {"version": version, "parsed": parsed, "slot": slot}
        except Exception as exc:  # noqa: BLE001
            last_error = exc
        time.sleep(interval)
    if last_error:
        raise RuntimeError(f"Device did not reach required version in time: {last_error}") from last_error
    raise RuntimeError("Device did not reach required version in time")


def start_http_preupdate_to_minimum_migration_version(job: Job, base_url: str) -> dict[str, Any]:
    remote_version, remote_parsed = remote_repo_version("main")
    required = MIGRATION_MIN_VERSION
    if remote_parsed != required:
        raise RuntimeError(
            f"Pre-update requires public main to be exactly {version_label(required)}. Current main is {remote_version}."
        )
    job.log(f"Pre-update required: device is below {version_line_label(required)}")
    job.log(f"Start HTTP update to {version_label(required)} via /startHTTPUpdate")
    try_base_urls(base_url, lambda candidate: post_empty(f"{candidate}/startHTTPUpdate", timeout=20.0))
    job.set_progress(15)
    update_result = wait_for_device_version(base_url, required, timeout=300.0, interval=5.0)
    job.log(f"Pre-update completed: {update_result['version']}")
    job.set_progress(35)
    return {"target_version": remote_version, "result": update_result}


def restore_backup(base_url: str, filename: str, content: bytes) -> dict[str, Any]:
    base = normalize_base_url(base_url)
    try:
        response = post_multipart(f"{base}/restore", "file", filename, content, timeout=25.0)
        return {"response": response.strip() or "ok", "accepted": True}
    except error.HTTPError:
        raise
    except (
        error.URLError,
        TimeoutError,
        socket.timeout,
        ConnectionResetError,
        BrokenPipeError,
        http.client.RemoteDisconnected,
    ) as exc:
        return {
            "response": str(exc) or "connection closed after restore upload",
            "accepted": True,
            "device_rebooted": True,
        }


def restore_job(job: Job, base_url: str, filename: str, content: bytes) -> dict[str, Any]:
    job.log(f"Start restore: {normalize_base_url(base_url)}")
    result = restore_backup(base_url, filename, content)
    job.log(f"Restore response: {result.get('response', 'ok')}")
    job.set_progress(100)
    return result


# ---------------------------------------------------------------------------
# Backup management
# Local JSON config backups: create/list/restore/rename/delete, plus the
# user-note metadata (backup_info.json) kept alongside them.
# ---------------------------------------------------------------------------
def backup_file_path(filename: str) -> pathlib.Path:
    clean = pathlib.PurePath(str(filename)).name.strip()
    if not clean or clean in {".", ".."}:
        raise ValueError("Invalid backup filename")
    path = BACKUP_DIR / clean
    if path.suffix.lower() != ".json":
        raise ValueError("Only JSON backup files are supported")
    return path


def extract_backup_version(path: pathlib.Path) -> str:
    try:
        raw = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""
    match = re.search(r'"VER"\s*:\s*"([^"]+)"', raw)
    if match:
        return match.group(1).strip()
    try:
        data = json.loads(raw)
    except Exception:
        return ""
    try:
        config_entries = data.get("config", [])
        if isinstance(config_entries, list):
            for entry in config_entries:
                cfg = entry.get("config") if isinstance(entry, dict) else None
                misc = cfg.get("misc") if isinstance(cfg, dict) else None
                if isinstance(misc, list):
                    for misc_entry in misc:
                        version = str((misc_entry or {}).get("VER", "")).strip()
                        if version:
                            return version
    except Exception:
        return ""
    return ""


def list_config_backups() -> list[dict[str, Any]]:
    files: list[dict[str, Any]] = []
    for item in sorted(BACKUP_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        if item.name == ".backup-info.json":
            continue
        if not item.is_file():
            continue
        stat = item.stat()
        files.append(
            {
                "name": item.name,
                "version": extract_backup_version(item),
                "mtime": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
                "size": stat.st_size,
            }
        )
    return files


def backup_info_path() -> pathlib.Path:
    return BACKUP_DIR / ".backup-info.json"


def load_backup_info() -> dict[str, str]:
    path = backup_info_path()
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    if not isinstance(payload, dict):
        return {}
    return {
        pathlib.PurePath(str(key)).name: value
        for key, value in payload.items()
        if pathlib.PurePath(str(key)).name and isinstance(value, str)
    }


def save_backup_info(values: dict[str, str]) -> None:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    clean_values = {
        pathlib.PurePath(str(key)).name: str(value)
        for key, value in values.items()
        if pathlib.PurePath(str(key)).name and str(value).strip()
    }
    backup_info_path().write_text(json.dumps(clean_values, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")


def backup_user_info(filename: str) -> str:
    return load_backup_info().get(backup_file_path(filename).name, "")


def update_backup_user_info(filename: str, note: str) -> dict[str, Any]:
    path = backup_file_path(filename)
    if not path.exists():
        raise FileNotFoundError(f"Backup not found: {path.name}")
    values = load_backup_info()
    note_text = str(note or "").strip()
    if note_text:
        values[path.name] = note_text
    else:
        values.pop(path.name, None)
    save_backup_info(values)
    return {"filename": path.name, "user_info": note_text}


def wrapped_backup_payload(item: Any, key: str) -> Any:
    if isinstance(item, dict):
        return item.get(key)
    return None


def backup_item_name(item: Any, section: str, index: int) -> str:
    key = "profile" if section == "profiles" else "recipe"
    payload = wrapped_backup_payload(item, key)
    if not isinstance(payload, dict):
        return f"{section}-{index}"
    if section == "profiles":
        profile = first_list_item(payload, "profile")
        return str(profile.get("pname") or payload.get("File") or f"profile-{index}")
    misc = first_list_item(payload, "misc")
    return str(
        misc.get("Sudname")
        or misc.get("Fername")
        or misc.get("File")
        or payload.get("File")
        or f"{section}-{index}"
    )


def backup_detail(filename: str) -> dict[str, Any]:
    path = backup_file_path(filename)
    if not path.exists():
        raise FileNotFoundError(f"Backup not found: {path.name}")
    payload = read_inventory_payload(path)
    stat = path.stat()
    detail: dict[str, Any] = {
        "filename": path.name,
        "size": stat.st_size,
        "mtime": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
        "source": "backup",
        "sections": [],
        "user_info": backup_user_info(path.name),
        "user_info_editable": True,
    }
    if not isinstance(payload, dict):
        detail["sections"].append({"title": "Backup", "rows": [{"Format": "Text", "Info": f"{len(str(payload))} characters"}]})
        return detail

    config_entries = payload.get("config") if isinstance(payload.get("config"), list) else []
    profiles = payload.get("profiles") if isinstance(payload.get("profiles"), list) else []
    recipes = payload.get("recipes") if isinstance(payload.get("recipes"), list) else []
    fermenter = payload.get("fermenter") if isinstance(payload.get("fermenter"), list) else []
    detail["sections"].append(
        {
            "title": "Backup",
            "rows": [
                {
                    "Version": extract_backup_version(path) or "-",
                    "Config": len(config_entries),
                    "Profiles": len(profiles),
                    "Mash plans": len(recipes),
                    "Fermenter plans": len(fermenter),
                }
            ],
        }
    )

    config_payload = None
    for item in config_entries:
        candidate = wrapped_backup_payload(item, "config")
        if isinstance(candidate, dict):
            config_payload = candidate
            break
    if config_payload:
        config_summary = summarize_inventory_payload("config", config_payload, pathlib.Path("config.txt"))
        detail["sections"].extend(config_summary.get("sections", []))

    for title, section, values in [
        ("Profiles", "profiles", profiles),
        ("Mash plans", "recipes", recipes),
        ("Fermenter plans", "fermenter", fermenter),
    ]:
        rows = [{"#": index, "Name": backup_item_name(item, section, index)} for index, item in enumerate(values, start=1)]
        detail["sections"].append({"title": title, "rows": rows})
    return detail


def delete_config_backup(filename: str) -> dict[str, Any]:
    path = backup_file_path(filename)
    if not path.exists():
        raise FileNotFoundError(f"Backup not found: {path.name}")
    path.unlink()
    values = load_backup_info()
    values.pop(path.name, None)
    save_backup_info(values)
    return {"deleted": path.name}


def rename_config_backup(old_name: str, new_name: str) -> dict[str, Any]:
    source = backup_file_path(old_name)
    target = backup_file_path(new_name if str(new_name).lower().endswith(".json") else f"{new_name}.json")
    if not source.exists():
        raise FileNotFoundError(f"Backup not found: {source.name}")
    if target.exists():
        raise FileExistsError(f"Backup already exists: {target.name}")
    source.rename(target)
    values = load_backup_info()
    if source.name in values:
        values[target.name] = values.pop(source.name)
        save_backup_info(values)
    return {"renamed": source.name, "target": target.name}


def restore_local_backup(base_url: str, filename: str) -> dict[str, Any]:
    path = backup_file_path(filename)
    if not path.exists():
        raise FileNotFoundError(f"Backup not found: {path.name}")
    return restore_backup(base_url, path.name, path.read_bytes())


def restore_backup_and_wait(base_url: str, filename: str, content: bytes, timeout: float = 75.0) -> dict[str, Any]:
    before_snapshot = None
    before_error = ""
    try:
        _, before_snapshot = try_base_urls(
            base_url,
            lambda candidate: json_request(f"{candidate}/dev/snapshot", timeout=3.0),
        )
    except Exception as exc:  # noqa: BLE001
        before_error = str(exc)

    upload = restore_backup(base_url, filename, content)
    deadline = time.time() + max(timeout, 5.0)
    last_snapshot = None
    last_error = ""
    stable_hits = 0
    saw_unavailable = False

    while time.time() < deadline:
        try:
            _, snapshot = try_base_urls(
                base_url,
                lambda candidate: json_request(f"{candidate}/dev/snapshot", timeout=3.5),
            )
            last_snapshot = snapshot
            if bool((snapshot or {}).get("meta", {}).get("debug")):
                stable_hits += 1
                if stable_hits >= 2:
                    break
            else:
                stable_hits = 0
        except Exception as exc:  # noqa: BLE001
            saw_unavailable = True
            stable_hits = 0
            last_error = str(exc)
        time.sleep(0.5)

    before_ts = before_snapshot.get("meta", {}).get("timestampMs") if isinstance(before_snapshot, dict) else None
    after_ts = last_snapshot.get("meta", {}).get("timestampMs") if isinstance(last_snapshot, dict) else None
    timestamp_reset = isinstance(before_ts, (int, float)) and isinstance(after_ts, (int, float)) and after_ts < before_ts
    ready_passed = stable_hits >= 2 and isinstance(last_snapshot, dict)
    reboot_detected = bool(upload.get("device_rebooted")) or saw_unavailable or timestamp_reset
    result = {
        "uploadAccepted": bool(upload.get("accepted")) or reboot_detected,
        "rebootDetected": reboot_detected,
        "readyPassed": ready_passed,
        "timestampReset": timestamp_reset,
        "response": str(upload.get("response") or "").strip(),
        "beforeError": before_error,
        "lastError": last_error,
    }
    if not ready_passed:
        result["error"] = last_error or "Device did not become ready after restore."
    return result


# ---------------------------------------------------------------------------
# WiFi provisioning & migration package/version helpers
# WiFi scan/save/reset over network or serial, plus the package validation
# used before/around a firmware migration (version checks, WiFi capture and
# restore across the migration flash).
# ---------------------------------------------------------------------------
def wifi_reset(base_url: str, serial_port: str = "", serial_baud: int = 115200) -> dict[str, Any]:
    if serial_port:
        data = serial_json_command(serial_port, serial_baud, {"cmd": "wifi_reset"})
        verification = observe_wifi_reboot(serial_port, serial_baud, timeout=25.0)
        payload = data.get("data", {}) if isinstance(data, dict) else {}
        if not isinstance(payload, dict):
            payload = {}
        payload["transport"] = "serial"
        payload["verification"] = verification
        return payload
    base, response = try_base_urls(base_url, lambda candidate: post_json(f"{candidate}/setMisc", {"reset": True}))
    return {"base_url": base, "response": response.strip() or "ok", "transport": "http"}


def schedule_serial_restart(port: str, baud: int, lines: list[str] | None = None, delay_seconds: float = 2.5) -> None:
    def worker() -> None:
        time.sleep(delay_seconds)
        for _ in range(40):
            if not STATE.serial_access_lock.locked():
                break
            time.sleep(0.25)
        try:
            STATE.start_serial(port, baud, lines, announce_start=True)
        except Exception:
            pass

    threading.Thread(target=worker, daemon=True).start()


def reboot_device(base_url: str, serial_port: str = "", serial_baud: int = 115200) -> dict[str, Any]:
    http_error: str | None = None
    if base_url:
        try:
            base, response = try_base_urls(base_url, lambda candidate: post_empty(f"{candidate}/reboot"))
            return {"base_url": base, "response": response.strip() or "ok", "transport": "http"}
        except Exception as exc:  # noqa: BLE001
            http_error = str(exc)
            if not serial_port:
                raise

    if not serial_port:
        raise RuntimeError(http_error or "Serial port missing for reboot fallback.")

    ensure_serial_command_port_available(serial_port, allow_running_monitor=True)
    active = STATE.active_serial_config(serial_port)
    restart_needed = bool(active and active.get("running"))
    restart_lines = list(active.get("lines", [])) if active else []
    if restart_needed:
        restart_lines.append(f"[{now_iso()}] API reboot unavailable, fallback to serial")
        restart_lines.append(f"[{now_iso()}] Reboot device")
        STATE.stop_serial()
    data = serial_json_command(serial_port, serial_baud, {"cmd": "reboot"})
    if restart_needed:
        schedule_serial_restart(serial_port, serial_baud, restart_lines)
    payload = data.get("data", {}) if isinstance(data, dict) else {}
    if not isinstance(payload, dict):
        payload = {}
    payload["transport"] = "serial"
    payload["restarting_monitor"] = restart_needed
    if http_error:
        payload["http_error"] = http_error
    return payload


def wifi_scan(base_url: str, refresh: bool = False, serial_port: str = "", serial_baud: int = 115200) -> dict[str, Any]:
    suffix = "?refresh=1" if refresh else ""
    if serial_port:
        data = serial_json_command(serial_port, serial_baud, {"cmd": "wifi_scan", "refresh": refresh})
        payload = data.get("data", {}) if isinstance(data, dict) else {}
        if isinstance(payload, dict):
            payload["transport"] = "serial"
            payload["serial_port"] = serial_port
            return payload
        return {"transport": "serial", "serial_port": serial_port, "raw": data}
    try:
        base, data = try_base_urls(base_url, lambda candidate: json_request(f"{candidate}/scanWifi{suffix}"))
    except error.HTTPError as exc:
        if exc.code == 404:
            raise RuntimeError("WiFi scan route /scanWifi is not available on the device firmware") from exc
        raise
    if isinstance(data, dict):
        data["base_url"] = base
        data["transport"] = "http"
        return data
    return {"base_url": base, "transport": "http", "raw": data}


def wifi_save(base_url: str, ssid: str, password: str, serial_port: str = "", serial_baud: int = 115200) -> dict[str, Any]:
    if not ssid.strip():
        raise ValueError("SSID missing")
    if serial_port:
        data = serial_json_command(serial_port, serial_baud, {"cmd": "wifi_set", "ssid": ssid, "pass": password, "reboot": True})
        payload = data.get("data", {}) if isinstance(data, dict) else {}
        if isinstance(payload, dict):
            payload["transport"] = "serial"
            payload["serial_port"] = serial_port
            if payload.get("saved"):
                payload["verification"] = observe_wifi_reboot(serial_port, serial_baud)
            return payload
        return {"transport": "serial", "serial_port": serial_port, "raw": data}
    try:
        base, response = try_base_urls(
            base_url,
            lambda candidate: post_json(f"{candidate}/setWifiCredentials", {"ssid": ssid, "pass": password, "reboot": True}),
        )
    except error.HTTPError as exc:
        if exc.code == 404:
            raise RuntimeError("WiFi save route /setWifiCredentials is not available on the device firmware") from exc
        raise
    try:
        parsed = json.loads(response)
        if isinstance(parsed, dict):
            parsed["base_url"] = base
            parsed["transport"] = "http"
        return parsed
    except json.JSONDecodeError:
        return {"base_url": base, "transport": "http", "response": response.strip() or "ok"}


def wifi_credentials(base_url: str, serial_port: str = "", serial_baud: int = 115200) -> dict[str, Any]:
    if serial_port:
        data = serial_json_command(serial_port, serial_baud, {"cmd": "wifi_get"})
        payload = data.get("data", {}) if isinstance(data, dict) else {}
        if isinstance(payload, dict):
            payload["transport"] = "serial"
            payload["serial_port"] = serial_port
            return payload
        return {"transport": "serial", "serial_port": serial_port, "raw": data}
    try:
        base, data = try_base_urls(base_url, lambda candidate: json_request(f"{candidate}/reqWifiCredentials"))
    except error.HTTPError as exc:
        if exc.code == 404:
            raise RuntimeError("WiFi credentials route /reqWifiCredentials is not available on the device firmware") from exc
        raise
    if isinstance(data, dict):
        data["base_url"] = base
        data["transport"] = "http"
        return data
    return {"base_url": base, "transport": "http", "raw": data}


def capture_migration_wifi(base_url: str, port: str, baud: int) -> dict[str, Any]:
    last_error = ""
    for mode in ("http", "serial"):
        try:
            if mode == "http":
                payload = wifi_credentials(base_url)
            else:
                if not port:
                    continue
                payload = wifi_credentials("", serial_port=port, serial_baud=baud)
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            continue
        if not isinstance(payload, dict):
            continue
        ssid = str(payload.get("ssid") or "").strip()
        password = str(payload.get("pass") or payload.get("password") or "").strip()
        if ssid:
            return {
                "ssid": ssid,
                "password": password,
                "transport": payload.get("transport") or mode,
            }
    return {"ssid": "", "password": "", "error": last_error}


def restore_migration_wifi(job: Job, port: str, baud: int, wifi: dict[str, Any]) -> dict[str, Any]:
    ssid = str(wifi.get("ssid") or "").strip()
    if not ssid:
        return {"restored": False, "reason": "missing-ssid"}
    password = str(wifi.get("password") or "").strip()
    last_error = ""
    for attempt in range(1, 7):
        time.sleep(2.5 if attempt > 1 else 3.5)
        active = STATE.active_serial_config(port)
        if active and active.get("running"):
            STATE.stop_serial()
        try:
            payload = wifi_save("", ssid, password, serial_port=port, serial_baud=baud)
            verification = payload.get("verification") if isinstance(payload, dict) else None
            if isinstance(verification, dict):
                result = str(verification.get("result") or "").strip().lower()
                reason = str(verification.get("reason") or "").strip().lower()
                if result == "failed" or reason == "config-portal":
                    raise RuntimeError("Device returned to config portal after WiFi restore")
            job.log(f"Migration: restored WiFi credentials for SSID '{ssid}'")
            return {
                "restored": True,
                "ssid": ssid,
                "attempt": attempt,
                "response": payload,
            }
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)
            job.log(f"Migration: WiFi restore attempt {attempt} failed: {last_error}")
    raise RuntimeError(f"Unable to restore WiFi credentials after migration: {last_error or 'unknown error'}")


def wait_for_migration_target_ready(job: Job, base_url: str, port: str, baud: int, timeout: float = 75.0) -> dict[str, Any]:
    deadline = time.time() + timeout
    last_status: dict[str, Any] = {}
    while time.time() < deadline:
        try:
            status = combined_device_status(base_url, port, baud)
        except Exception as exc:  # noqa: BLE001
            last_status = {"state": "unknown", "error": str(exc)}
            time.sleep(3.0)
            continue
        last_status = status if isinstance(status, dict) else {"state": "unknown"}
        firmware = str(last_status.get("firmware") or "").strip()
        parsed = parse_version_tuple(firmware) if firmware else None
        if parsed and parsed[:2] == MIGRATION_TARGET_VERSION[:2]:
            job.log(
                f"Migration: target firmware reachable after flash via {last_status.get('transport', 'unknown')} "
                f"({firmware})"
            )
            return last_status
        state = str(last_status.get("state") or "").strip() or "unknown"
        transport = str(last_status.get("transport") or "").strip() or state
        job.log(f"Migration: waiting for target boot ({transport})")
        time.sleep(3.0)
    raise RuntimeError(
        f"Target firmware {version_line_label(MIGRATION_TARGET_VERSION)} did not become ready after flash"
    )


def wait_for_device_http_ready(job: Job, base_url: str, timeout: float = 90.0) -> dict[str, Any]:
    deadline = time.time() + timeout
    last_error: Exception | None = None
    while time.time() < deadline:
        try:
            status = device_status(base_url)
            firmware = str(status.get("firmware") or "").strip()
            parsed = parse_version_tuple(firmware) if firmware else None
            if parsed and parsed[:2] == MIGRATION_TARGET_VERSION[:2]:
                job.log(f"Migration: target firmware reachable via HTTP ({firmware})")
                return status
        except Exception as exc:  # noqa: BLE001
            last_error = exc
        time.sleep(3.0)
    if last_error:
        raise RuntimeError(f"Target firmware did not come online via HTTP in time: {last_error}") from last_error
    raise RuntimeError("Target firmware did not come online via HTTP in time")


def validate_package_dir(package_dir: str, include_littlefs: bool = False, require_base_files: bool = True) -> pathlib.Path:
    if not package_dir:
        raise ValueError("Package directory missing")
    path = pathlib.Path(package_dir).expanduser()
    if not path.is_absolute():
        path = (APP_ROOT / path).resolve()
    if not path.exists():
        raise FileNotFoundError(f"Package directory not found: {path}")
    required = [REQUIRED_FIRMWARE_FILE]
    if require_base_files:
        required = BASE_FLASH_FILES + required
    if include_littlefs:
        required.append("Littlefs.bin")
    missing = [name for name in required if not (path / name).exists()]
    if missing:
        raise FileNotFoundError(f"Package incomplete, missing: {', '.join(missing)}")
    validate_package_partitions(path, include_littlefs, require_partitions=require_base_files or include_littlefs)
    return path


def local_package_version(package_dir: str) -> tuple[str, tuple[int, int, int]]:
    path = pathlib.Path(package_dir).expanduser()
    if not path.is_absolute():
        path = (APP_ROOT / path).resolve()
    candidates = [path / "version.json", path.parent / "version.json"]
    for candidate in candidates:
        if not candidate.exists() or not candidate.is_file():
            continue
        try:
            data = json.loads(candidate.read_text(encoding="utf-8"))
        except Exception:
            continue
        if isinstance(data, dict):
            version = str(data.get("version", "")).strip()
            if version:
                return version, require_version_tuple(version, f"Local package {candidate}")
    env_hint = path.name.replace("-", "_")
    for parent in [path, *path.parents]:
        idedata = parent / ".pio" / "build" / env_hint / "idedata.json"
        if not idedata.exists() or not idedata.is_file():
            continue
        try:
            data = json.loads(idedata.read_text(encoding="utf-8"))
        except Exception:
            continue
        defines = data.get("defines", []) if isinstance(data, dict) else []
        if not isinstance(defines, list):
            continue
        for define in defines:
            match = re.match(r'BRAUTOMAT_FIRMWARE_VERSION="([^"]+)"', str(define or "").strip())
            if match:
                version = match.group(1).strip()
                if version:
                    return version, require_version_tuple(version, f"Local package {idedata}")
    raise RuntimeError("Local package version.json not found or invalid")


def migration_target_version(package_source: str, package_ref: str, package_dir: str) -> tuple[str, tuple[int, int, int]]:
    if package_source == "open":
        return local_package_version(package_dir)
    if package_source == "special":
        ref = package_ref.strip()
        if not ref:
            raise RuntimeError("Special Version requires a selected ref for migration")
        return remote_repo_version(ref)
    if package_source == "release":
        return remote_repo_version("main")
    if package_source == "development":
        return remote_repo_version("development")
    raise RuntimeError(f"Unsupported migration package source: {package_source}")


def validate_migration_package_source(package_source: str, package_ref: str, package_dir: str) -> tuple[str, tuple[int, int, int]]:
    release_version, release_parsed = remote_repo_version("main")
    if release_parsed[:2] == MIGRATION_TARGET_VERSION[:2]:
        if package_source != "release":
            raise RuntimeError(
                f"Migration expects package source 'release' because Brautomat32 main already provides {release_version}."
            )
        return release_version, release_parsed

    if package_source != "open":
        raise RuntimeError(
            f"Migration target {version_line_label(MIGRATION_TARGET_VERSION)} is not yet available in Brautomat32 release "
            f"(current release: {release_version}). Use 'Open directory' with the local {version_line_label(MIGRATION_TARGET_VERSION)} package during development."
        )

    return migration_target_version(package_source, package_ref, package_dir)


# ---------------------------------------------------------------------------
# Inventory management (mash plans, fermenter plans, profiles, config)
# CRUD + sync between local inventory files (DEFAULT_INVENTORY_DIR) and the
# corresponding device paths, driven by the per-kind INVENTORY_SPECS entries.
# ---------------------------------------------------------------------------
def inventory_spec(kind: str) -> dict[str, str]:
    spec = INVENTORY_SPECS.get(kind)
    if not spec:
        raise ValueError(f"Unknown inventory kind: {kind}")
    return spec


def inventory_local_dir(kind: str) -> pathlib.Path:
    spec = inventory_spec(kind)
    path = inventory_root_dir() / spec["local_dir"]
    path.mkdir(parents=True, exist_ok=True)
    return path


def normalize_inventory_filename(filename: str) -> str:
    clean = pathlib.PurePosixPath(str(filename).replace("\\", "/")).name.strip()
    if not clean or clean in {".", ".."} or "/" in clean:
        raise ValueError("Invalid filename")
    return clean


def normalize_inventory_relpath(relpath: str) -> str:
    raw = str(relpath or "").replace("\\", "/").strip()
    if not raw or raw in {".", "/"}:
        return ""
    pure = pathlib.PurePosixPath(raw)
    parts = [part for part in pure.parts if part not in {"", "."}]
    if pure.is_absolute() or any(part == ".." for part in parts):
        raise ValueError("Invalid path")
    return "/".join(parts)


def resolve_local_inventory_path(kind: str, relpath: str = "") -> pathlib.Path:
    base = inventory_local_dir(kind).resolve()
    normalized = normalize_inventory_relpath(relpath)
    target = (base / normalized).resolve()
    try:
        target.relative_to(base)
    except ValueError as exc:
        raise ValueError("Invalid path") from exc
    return target


def local_inventory_path(kind: str, filename: str) -> pathlib.Path:
    return inventory_local_dir(kind) / normalize_inventory_filename(filename)


def device_inventory_path(kind: str, filename: str) -> str:
    spec = inventory_spec(kind)
    return f"{spec['device_dir'].rstrip('/')}/{normalize_inventory_filename(filename)}"


def parse_partition_table(partitions_bin: pathlib.Path) -> list[dict[str, Any]]:
    data = partitions_bin.read_bytes()
    entries: list[dict[str, Any]] = []
    entry_size = 32
    for offset in range(0, len(data), entry_size):
        chunk = data[offset:offset + entry_size]
        if len(chunk) < entry_size:
            break
        magic, ptype, subtype, part_offset, size, label_raw, flags = struct.unpack("<HBBII16sI", chunk)
        if magic == 0xFFFF or chunk == b"\xFF" * entry_size:
            break
        if magic != 0x50AA:
            continue
        label = label_raw.split(b"\x00", 1)[0].decode("ascii", errors="ignore").strip()
        entries.append(
            {
                "type": ptype,
                "subtype": subtype,
                "offset": part_offset,
                "size": size,
                "label": label,
                "flags": flags,
            }
        )
    return entries


def find_partition(entries: list[dict[str, Any]], ptype: int, offset: int | None = None, labels: set[str] | None = None) -> dict[str, Any] | None:
    for entry in entries:
        if entry["type"] != ptype:
            continue
        if offset is not None and entry["offset"] != offset:
            continue
        if labels is not None and entry["label"] not in labels:
            continue
        return entry
    return None


def validate_package_partitions(path: pathlib.Path, include_littlefs: bool = False, require_partitions: bool = True) -> None:
    partitions_bin = path / "partitions.bin"
    if not partitions_bin.exists():
        if require_partitions:
            raise RuntimeError("partitions.bin missing")
        return
    partitions = parse_partition_table(partitions_bin)
    if not partitions:
        raise RuntimeError("Unable to parse partitions.bin")

    firmware = path / "firmware.bin"
    app_partition = find_partition(partitions, 0x00, offset=0x10000)
    if not app_partition:
        raise RuntimeError("No app partition at offset 0x10000 found in partitions.bin")
    firmware_size = firmware.stat().st_size
    if firmware_size > int(app_partition["size"]):
        raise RuntimeError(
            f"firmware.bin ({firmware_size} bytes) does not fit into app partition "
            f"{app_partition['label'] or 'app'} ({int(app_partition['size'])} bytes)"
        )

    if include_littlefs:
        littlefs = path / "Littlefs.bin"
        fs_partition = find_partition(partitions, 0x01, labels={"spiffs", "littlefs"})
        if not fs_partition:
            raise RuntimeError("No filesystem partition found in partitions.bin")
        littlefs_size = littlefs.stat().st_size
        if littlefs_size > int(fs_partition["size"]):
            raise RuntimeError(
                f"Littlefs.bin ({littlefs_size} bytes) does not fit into filesystem partition "
                f"{fs_partition['label'] or 'spiffs'} ({int(fs_partition['size'])} bytes)"
            )


def filesystem_partition_info(path: pathlib.Path) -> dict[str, Any]:
    partitions_bin = path / "partitions.bin"
    if not partitions_bin.exists():
        raise RuntimeError("partitions.bin missing")
    partitions = parse_partition_table(partitions_bin)
    if not partitions:
        raise RuntimeError("Unable to parse partitions.bin")
    fs_partition = find_partition(partitions, 0x01, labels={"spiffs", "littlefs"})
    if not fs_partition:
        raise RuntimeError("No filesystem partition found in partitions.bin")
    return fs_partition


def local_inventory_file_allowed(kind: str, path: pathlib.Path) -> bool:
    spec = inventory_spec(kind)
    lower_name = path.name.lower()
    allowed_names = {str(name).lower() for name in spec.get("device_files", [])}
    allowed_exts = {str(ext).lower() for ext in spec.get("extensions", [".json"])}
    if allowed_names:
        return lower_name in allowed_names
    return path.suffix.lower() in allowed_exts


def local_inventory_entry(kind: str, base: pathlib.Path, item: pathlib.Path) -> dict[str, Any]:
    stat = item.stat()
    relative = item.relative_to(base).as_posix()
    entry_type = "dir" if item.is_dir() else "file"
    return {
        "name": item.name,
        "rel_path": relative,
        "path": str(item),
        "type": entry_type,
        "size": 0 if entry_type == "dir" else stat.st_size,
        "mtime": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S"),
    }


def read_inventory_payload(path: pathlib.Path) -> Any:
    text = path.read_text(encoding="utf-8", errors="replace")
    try:
        return json.loads(text)
    except Exception:
        return text


def first_list_item(payload: Any, key: str) -> dict[str, Any]:
    value = payload.get(key) if isinstance(payload, dict) else None
    if isinstance(value, list) and value and isinstance(value[0], dict):
        return value[0]
    return {}


def summarize_steps(items: Any) -> list[dict[str, Any]]:
    if not isinstance(items, list):
        return []
    rows = []
    for index, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            continue
        rows.append(
            {
                "#": index,
                "Name": item.get("Rast") or item.get("Name") or item.get("name") or "-",
                "Temp": item.get("Temperatur", item.get("temp", "-")),
                "Dauer": item.get("Dauer", item.get("duration", "-")),
                "autonext": item.get("autonext", "-"),
            }
        )
    return rows


def summarize_inventory_payload(kind: str, payload: Any, path: pathlib.Path) -> dict[str, Any]:
    stat = path.stat() if path.exists() else None
    summary: dict[str, Any] = {
        "filename": path.name,
        "size": stat.st_size if stat else 0,
        "mtime": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S") if stat else "-",
        "sections": [],
    }
    if not isinstance(payload, dict):
        summary["sections"].append({"title": "Text", "rows": [{"Info": f"{len(str(payload))} characters"}]})
        return summary

    if kind == "mashplans":
        misc = first_list_item(payload, "misc")
        summary["sections"].append(
            {
                "title": "Recipe",
                "rows": [
                    {
                        "Name": misc.get("Sudname", path.stem),
                        "Boil": misc.get("Kochdauer", "-"),
                        "Nachiso": misc.get("Nachiso", "-"),
                        "Steps": len(payload.get("mash") or []),
                    }
                ],
            }
        )
        summary["sections"].append({"title": "Mash steps", "rows": summarize_steps(payload.get("mash"))})
        return summary

    if kind == "fermenterplans":
        steps = payload.get("ferm") or payload.get("fermenter") or payload.get("steps")
        misc = first_list_item(payload, "misc")
        summary["sections"].append(
            {
                "title": "Fermenter plan",
                "rows": [{"Name": misc.get("Sudname", path.stem), "Steps": len(steps or [])}],
            }
        )
        summary["sections"].append({"title": "Fermenter steps", "rows": summarize_steps(steps)})
        return summary

    if kind == "profiles":
        profiles = payload.get("profile") if isinstance(payload.get("profile"), list) else []
        rows = []
        for item in profiles:
            if not isinstance(item, dict):
                continue
            rows.append(
                {
                    "Name": item.get("pname") or item.get("name") or "-",
                    "Kettle": item.get("name", "-"),
                    "Type": item.get("enabled", "-"),
                    "Kl": item.get("kl", "-"),
                    "Kr": item.get("kr", "-"),
                    "PID": f"{item.get('kp', '-')}/{item.get('ki', '-')}/{item.get('kd', '-')}",
                    "Max": item.get("maxo", "-"),
                    "Delta": item.get("delta", "-"),
                }
            )
        summary["sections"].append({"title": "Profiles", "rows": rows})
        return summary

    if kind == "config":
        for title, key in [("Actors", "actors"), ("Sensors", "sensors"), ("Kettles", "kettles")]:
            values = payload.get(key) if isinstance(payload.get(key), list) else []
            rows = []
            for item in values:
                if not isinstance(item, dict):
                    continue
                if key == "actors":
                    rows.append({"Name": item.get("NAME", "-"), "Pin": item.get("PIN", "-"), "PWM": item.get("PWM", "-"), "PWMSW": item.get("PWMSW", "-")})
                elif key == "sensors":
                    rows.append({"Name": item.get("NAME", "-"), "Type": item.get("TYPE", "-"), "Pin": item.get("PIN", "-"), "Offset1": item.get("OFFSET1", "-"), "Offset2": item.get("OFFSET2", "-")})
                else:
                    rows.append({"Name": item.get("name", "-"), "Type": item.get("enabled", "-"), "Sensor": item.get("senid", "-"), "Kl": item.get("kl", "-"), "Kr": item.get("kr", "-"), "Delta": item.get("delta", "-")})
            summary["sections"].append({"title": title, "rows": rows})
        misc = first_list_item(payload, "misc")
        summary["sections"].append({"title": "System", "rows": [{"Version": misc.get("VER", "-"), "mDNS": misc.get("mdns_name", "-"), "Language": misc.get("lang", "-")} ]})
        return summary

    summary["sections"].append({"title": "JSON", "rows": [{"Keys": ", ".join(payload.keys())}]})
    return summary


def flatten_json(value: Any, prefix: str = "") -> dict[str, Any]:
    result: dict[str, Any] = {}
    if isinstance(value, dict):
        for key, child in value.items():
            result.update(flatten_json(child, f"{prefix}.{key}" if prefix else str(key)))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            result.update(flatten_json(child, f"{prefix}[{index}]"))
    else:
        result[prefix] = value
    return result


def diff_payloads(base: Any, current: Any, limit: int = 80) -> list[dict[str, Any]]:
    left = flatten_json(base)
    right = flatten_json(current)
    keys = sorted(set(left) | set(right))
    rows = []
    for key in keys:
        left_value = left.get(key, "<missing>")
        right_value = right.get(key, "<missing>")
        if left_value == right_value:
            continue
        rows.append({"Field": key, "Base": left_value, "Version": right_value})
        if len(rows) >= limit:
            rows.append({"Field": "...", "Base": "diff truncated", "Version": f"limit {limit}"})
            break
    return rows


def local_inventory_detail(kind: str, filename: str) -> dict[str, Any]:
    path = local_inventory_item_path(kind, filename)
    if not path.exists():
        raise FileNotFoundError(f"Local file not found: {path}")
    if not path.is_file():
        raise IsADirectoryError(f"Local file expected: {path}")
    payload = read_inventory_payload(path)
    detail = summarize_inventory_payload(kind, payload, path)
    detail["source"] = "local"
    detail["user_info"] = inventory_user_info(kind, normalize_inventory_relpath(filename))
    detail["user_info_editable"] = True
    match = re.match(r"^(.+)_([0-9]+)(\.[^.]+)$", path.name)
    if match:
        baseline = path.parent / f"{match.group(1)}{match.group(3)}"
        if baseline.exists() and baseline.is_file():
            base_payload = read_inventory_payload(baseline)
            detail["baseline"] = baseline.name
            detail["diff"] = diff_payloads(base_payload, payload)
    return detail


def device_inventory_detail(base_url: str, kind: str, filename: str) -> dict[str, Any]:
    clean_name = normalize_inventory_filename(filename)
    content = download_fs_file(base_url, device_inventory_path(kind, clean_name))
    try:
        payload = json.loads(content.decode("utf-8", errors="replace"))
    except Exception:
        payload = content.decode("utf-8", errors="replace")
    temp_path = pathlib.Path(clean_name)
    summary = summarize_inventory_payload(kind, payload, temp_path)
    summary["filename"] = clean_name
    summary["size"] = len(content)
    summary["mtime"] = "-"
    summary["source"] = "device"
    summary["user_info"] = ""
    summary["user_info_editable"] = False
    return summary


def list_local_inventory(kind: str, relpath: str = "") -> list[dict[str, Any]]:
    base = inventory_local_dir(kind)
    current = resolve_local_inventory_path(kind, relpath)
    if not current.exists():
        raise FileNotFoundError(f"Local directory not found: {current}")
    if not current.is_dir():
        raise NotADirectoryError(f"Local directory expected: {current}")
    spec = inventory_spec(kind)
    entries: list[dict[str, Any]] = []
    for item in current.iterdir():
        if item.name == ".inventory-info.json":
            continue
        if item.is_dir():
            entries.append(local_inventory_entry(kind, base, item))
            continue
        if item.is_file() and local_inventory_file_allowed(kind, item):
            entries.append(local_inventory_entry(kind, base, item))
    return entries


def list_device_inventory(base_url: str, kind: str) -> list[dict[str, Any]]:
    spec = inventory_spec(kind)
    data = json_request(f"{normalize_base_url(base_url)}/list?dir={parse.quote(spec['device_dir'], safe='/')}", timeout=20.0)
    if not isinstance(data, list):
        return []
    files: list[dict[str, Any]] = []
    allowed_names = {str(name).lower() for name in spec.get("device_files", [])}
    allowed_exts = {str(ext).lower() for ext in spec.get("extensions", [".json"])}
    for item in data:
        if not isinstance(item, dict) or item.get("type") != "file":
            continue
        name = pathlib.PurePosixPath(str(item.get("name", ""))).name
        lower_name = name.lower()
        suffix = pathlib.PurePosixPath(name).suffix.lower()
        if allowed_names:
            if lower_name not in allowed_names:
                continue
        elif suffix not in allowed_exts:
            continue
        raw_mtime = item.get("mtime")
        mtime = "-"
        try:
            timestamp = int(raw_mtime or 0)
            if timestamp > 0:
                mtime = datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            mtime = "-"
        files.append(
            {
                "name": name,
                "path": f"{spec['device_dir'].rstrip('/')}/{name}",
                "size": int(item.get("size") or 0),
                "mtime": mtime,
            }
        )
    return sorted(files, key=lambda entry: entry["name"].lower())


def inventory_snapshot(base_url: str, kind: str, include_device: bool = True, local_dir: str = "") -> dict[str, Any]:
    spec = inventory_spec(kind)
    root = inventory_root_dir()
    device_files: list[dict[str, Any]] = []
    device_error = ""
    if include_device:
        try:
            device_files = list_device_inventory(base_url, kind)
        except Exception as exc:  # noqa: BLE001
            device_error = str(exc)
    return {
        "kind": kind,
        "label": spec["label"],
        "device": device_files,
        "device_error": device_error,
        "local": list_local_inventory(kind, local_dir),
        "inventory_root": str(root),
        "local_dir": str(inventory_local_dir(kind)),
        "local_current_dir": normalize_inventory_relpath(local_dir),
        }


def next_version_path(target: pathlib.Path) -> pathlib.Path:
    stem = target.stem
    suffix = target.suffix
    parent = target.parent
    index = 1
    while True:
        candidate = parent / f"{stem}_{index}{suffix}"
        if not candidate.exists():
            return candidate
        index += 1


def copy_device_to_local(base_url: str, kind: str, filename: str, local_dir: str = "", conflict: str = "overwrite") -> dict[str, Any]:
    clean_name = normalize_inventory_filename(filename)
    content = download_fs_file(base_url, device_inventory_path(kind, clean_name))
    target_dir = resolve_local_inventory_path(kind, local_dir)
    if not target_dir.exists():
        raise FileNotFoundError(f"Local directory not found: {target_dir}")
    if not target_dir.is_dir():
        raise NotADirectoryError(f"Local directory expected: {target_dir}")
    target = target_dir / clean_name
    mode = "overwrite"
    if target.exists():
        if conflict == "version":
            target = next_version_path(target)
            mode = "version"
        elif conflict == "abort":
            raise FileExistsError(f"Local file already exists: {target.name}")
    target.write_bytes(content)
    return {"copied": clean_name, "target": str(target), "target_name": target.name, "mode": mode, "bytes": len(content)}


def local_inventory_item_path(kind: str, relpath: str) -> pathlib.Path:
    normalized = normalize_inventory_relpath(relpath)
    if not normalized:
        raise ValueError("Invalid path")
    return resolve_local_inventory_path(kind, normalized)


def inventory_info_path(kind: str) -> pathlib.Path:
    return inventory_local_dir(kind) / ".inventory-info.json"


def load_inventory_info(kind: str) -> dict[str, str]:
    path = inventory_info_path(kind)
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    if not isinstance(payload, dict):
        return {}
    result: dict[str, str] = {}
    for key, value in payload.items():
        if isinstance(value, str):
            result[normalize_inventory_relpath(key)] = value
    return result


def save_inventory_info(kind: str, values: dict[str, str]) -> None:
    path = inventory_info_path(kind)
    path.parent.mkdir(parents=True, exist_ok=True)
    clean_values = {
        normalize_inventory_relpath(key): str(value)
        for key, value in values.items()
        if normalize_inventory_relpath(key) and str(value).strip()
    }
    path.write_text(json.dumps(clean_values, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")


def inventory_user_info(kind: str, filename: str) -> str:
    key = normalize_inventory_relpath(filename)
    return load_inventory_info(kind).get(key, "")


def update_inventory_user_info(kind: str, filename: str, note: str) -> dict[str, Any]:
    key = normalize_inventory_relpath(filename)
    path = local_inventory_item_path(kind, key)
    if not path.exists():
        raise FileNotFoundError(f"Local file not found: {path}")
    if not path.is_file():
        raise IsADirectoryError(f"Local file expected: {path}")
    values = load_inventory_info(kind)
    note_text = str(note or "").strip()
    if note_text:
        values[key] = note_text
    else:
        values.pop(key, None)
    save_inventory_info(kind, values)
    return {"filename": key, "user_info": note_text}


def inventory_rel_from_path(kind: str, path: pathlib.Path) -> str:
    try:
        return path.relative_to(inventory_local_dir(kind)).as_posix()
    except ValueError:
        return normalize_inventory_relpath(path.name)


def copy_local_to_device(base_url: str, kind: str, filename: str) -> dict[str, Any]:
    source = local_inventory_item_path(kind, filename)
    if not source.exists():
        raise FileNotFoundError(f"Local file not found: {source}")
    if not source.is_file():
        raise IsADirectoryError(f"Local file expected: {source}")
    content = source.read_bytes()
    clean_name = normalize_inventory_filename(source.name)
    version_match = re.match(r"^(.+)_([0-9]+)(\.[^.]+)$", clean_name)
    if version_match and (source.parent / f"{version_match.group(1)}{version_match.group(3)}").exists():
        clean_name = f"{version_match.group(1)}{version_match.group(3)}"
    target = device_inventory_path(kind, clean_name)
    post_file_to_fs(base_url, target, content, timeout=120.0)
    return {"copied": clean_name, "target": target, "bytes": len(content)}


def delete_local_inventory(kind: str, filename: str) -> dict[str, Any]:
    target = local_inventory_item_path(kind, filename)
    if not target.exists():
        raise FileNotFoundError(f"Local path not found: {target}")
    values = load_inventory_info(kind)
    rel_path = inventory_rel_from_path(kind, target)
    if target.is_dir():
        shutil.rmtree(target)
        prefix = f"{rel_path.rstrip('/')}/"
        values = {key: value for key, value in values.items() if key != rel_path and not key.startswith(prefix)}
        save_inventory_info(kind, values)
        return {"deleted": target.name, "type": "dir"}
    target.unlink()
    values.pop(rel_path, None)
    save_inventory_info(kind, values)
    return {"deleted": target.name, "type": "file"}


def delete_device_inventory(base_url: str, kind: str, filename: str) -> dict[str, Any]:
    clean_name = normalize_inventory_filename(filename)
    target = device_inventory_path(kind, clean_name)
    delete_fs_path(base_url, target)
    return {"deleted": clean_name, "target": target}


def rename_local_inventory(kind: str, old_name: str, new_name: str) -> dict[str, Any]:
    source = local_inventory_item_path(kind, old_name)
    target = source.parent / normalize_inventory_filename(new_name)
    if not source.exists():
        raise FileNotFoundError(f"Local path not found: {source}")
    if target.exists():
        raise FileExistsError(f"Local target already exists: {target.name}")
    source_rel = inventory_rel_from_path(kind, source)
    source_was_dir = source.is_dir()
    source.rename(target)
    target_rel = inventory_rel_from_path(kind, target)
    values = load_inventory_info(kind)
    if source_was_dir:
        prefix = f"{source_rel.rstrip('/')}/"
        moved: dict[str, str] = {}
        for key, value in values.items():
            if key == source_rel:
                moved[target_rel] = value
            elif key.startswith(prefix):
                moved[f"{target_rel.rstrip('/')}/{key[len(prefix):]}"] = value
            else:
                moved[key] = value
        values = moved
    elif source_rel in values:
        values[target_rel] = values.pop(source_rel)
    save_inventory_info(kind, values)
    return {"renamed": source.name, "target": target.name}


def create_local_inventory_dir(kind: str, parent_dir: str, name: str) -> dict[str, Any]:
    base_dir = resolve_local_inventory_path(kind, parent_dir)
    if not base_dir.exists():
        raise FileNotFoundError(f"Local directory not found: {base_dir}")
    if not base_dir.is_dir():
        raise NotADirectoryError(f"Local directory expected: {base_dir}")
    target = base_dir / normalize_inventory_filename(name)
    if target.exists():
        raise FileExistsError(f"Local target already exists: {target.name}")
    target.mkdir()
    return {"created": target.name, "type": "dir"}


def create_local_inventory_file(kind: str, parent_dir: str, name: str) -> dict[str, Any]:
    base_dir = resolve_local_inventory_path(kind, parent_dir)
    if not base_dir.exists():
        raise FileNotFoundError(f"Local directory not found: {base_dir}")
    if not base_dir.is_dir():
        raise NotADirectoryError(f"Local directory expected: {base_dir}")
    target = base_dir / normalize_inventory_filename(name)
    if target.exists():
        raise FileExistsError(f"Local target already exists: {target.name}")
    target.write_text("", encoding="utf-8")
    return {"created": target.name, "type": "file"}


def rename_device_inventory(base_url: str, kind: str, old_name: str, new_name: str) -> dict[str, Any]:
    old_clean = normalize_inventory_filename(old_name)
    new_clean = normalize_inventory_filename(new_name)
    source = device_inventory_path(kind, old_clean)
    target = device_inventory_path(kind, new_clean)
    base = normalize_base_url(base_url)
    if kind == "profiles":
        old_profile = pathlib.PurePosixPath(old_clean).stem
        new_profile = pathlib.PurePosixPath(new_clean).stem
        post_empty(f"{base}/renameProfile?old={parse.quote(old_profile)}&ren={parse.quote(new_profile)}", timeout=30.0)
        return {"renamed": old_clean, "target": new_clean, "mode": "api"}

    misc = json_request(f"{base}/reqMisc", timeout=10.0)
    active_plan_type = str(misc.get("planType") or "").strip().lower()
    active_name = str(misc.get("sudname") or "").strip()
    active_filename = f"{active_name}.json" if active_name else ""
    is_active_recipe = (
        old_clean == active_filename and (
            (kind == "mashplans" and active_plan_type == "mash")
            or (kind == "fermenterplans" and active_plan_type == "ferm")
        )
    )

    if is_active_recipe:
        new_recipe_name = pathlib.PurePosixPath(new_clean).stem
        post_empty(f"{base}/setSudRen?ren={parse.quote(new_recipe_name)}", timeout=30.0)
        return {"renamed": old_clean, "target": new_clean, "mode": "api"}

    put_form(f"{base}/edit", {"src": source, "path": target}, timeout=30.0)
    return {"renamed": old_clean, "target": new_clean, "mode": "fs"}


# ---------------------------------------------------------------------------
# Flash / firmware-backup / migration jobs
# The actual Job targets run in background threads: flash_job() shells out to
# esptool, backup_firmware_job() reads back the flashed firmware, and
# migration_job() drives the full pre-1.70 migration sequence (WiFi capture,
# flash, wait-for-ready, WiFi restore).
# ---------------------------------------------------------------------------
def ensure_esptool_port_available(port: str) -> None:
    port = normalize_serial_port_name(port)
    if not port:
        raise RuntimeError("Serial port missing.")


def ensure_serial_command_port_available(port: str, allow_running_monitor: bool = False) -> None:
    port = normalize_serial_port_name(port)
    if not port:
        raise RuntimeError("Serial port missing.")
    active = STATE.active_serial_config(port)
    if active and active.get("running") and not allow_running_monitor:
        raise RuntimeError("Serial log is active on the selected COM port. Stop Log before accessing the device over serial.")


def prepare_esptool_serial_handover(port: str, fallback_baud: int, reason: str) -> dict[str, Any]:
    port = normalize_serial_port_name(port)
    ensure_esptool_port_available(port)
    active = STATE.active_serial_config(port)
    if active and active.get("running"):
        monitor_baud = int(active.get("baud") or fallback_baud)
        STATE.stop_serial()
        STATE.append_serial_line(f"{reason}: handover serial port to esptool")
        return {"restart": True, "port": port, "baud": monitor_baud}
    return {"restart": False, "port": port, "baud": fallback_baud}


def flash_job(
    job: Job,
    port: str,
    baud: int,
    package_source: str,
    package_dir: str,
    package_ref: str,
    erase_flash: bool,
    include_littlefs: bool,
    restart_monitor_after: bool = True,
) -> dict[str, Any]:
    handover = prepare_esptool_serial_handover(port, baud, "Firmware flash")
    require_base_files = bool(erase_flash)
    package = resolve_package(job, package_source, package_dir, include_littlefs, package_ref, require_base_files=require_base_files)
    esptool_path = ensure_esptool_available(job)
    job.set_progress(1)
    flash_files: list[tuple[str, int, int]] = []
    for filename, offset in [
        ("bootloader.bin", 0x1000),
        ("partitions.bin", 0x8000),
        ("boot_app0.bin", 0xE000),
        ("firmware.bin", 0x10000),
    ]:
        target = package / filename
        if target.exists():
            flash_files.append((filename, target.stat().st_size, offset))
        elif filename in BASE_FLASH_FILES:
            if require_base_files:
                raise FileNotFoundError(f"{filename} missing in package: {package}")
            job.log(f"Optional flash file missing, skip: {filename}")
    if not any(name == "firmware.bin" for name, _, _ in flash_files):
        raise FileNotFoundError(f"firmware.bin missing in package: {package}")
    try:
        serial_guard = exclusive_serial_access(timeout=30.0)
        serial_guard.__enter__()
        if erase_flash:
            erase_args = [
                str(esptool_path),
                "--chip",
                "esp32",
                "--port",
                port,
                "--baud",
                str(baud),
                "--before",
                "default-reset",
                "--after",
                "hard-reset",
                "erase-flash",
            ]
            job.log("Erase flash before write")
            STATE.append_serial_line("Erase flash before write")
            erase_process = subprocess.Popen(
                erase_args,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                cwd=str(DATA_ROOT),
            )
            assert erase_process.stdout is not None
            for line in erase_process.stdout:
                clean = line.rstrip()
                job.log(clean)
                STATE.append_serial_line(clean)
            erase_rc = erase_process.wait()
            if erase_rc != 0:
                raise RuntimeError(f"esptool erase-flash failed with exit code {erase_rc}")
            job.set_progress(8)

        args = [
            str(esptool_path),
            "--chip",
            "esp32",
            "--port",
            port,
            "--baud",
            str(baud),
            "--before",
            "default-reset",
            "--after",
            "hard-reset",
            "write-flash",
            "-z",
        ]
        for filename, _, offset in flash_files:
            args.extend([hex(offset), str(package / filename)])
        if include_littlefs:
            littlefs = package / "Littlefs.bin"
            if not littlefs.exists():
                raise FileNotFoundError(f"Littlefs.bin missing in package: {package}")
            fs_partition = filesystem_partition_info(package)
            fs_offset = int(fs_partition["offset"])
            flash_files.append(("Littlefs.bin", littlefs.stat().st_size, fs_offset))
            args.extend([hex(fs_offset), str(littlefs)])
        job.log(f"Flash package: {package}")
        job.log(f"Package source: {package_source}")
        job.log(f"Port: {port} Baud: {baud}")
        STATE.append_serial_line(f"Flash package: {package}")
        if flash_files:
            job.set_current_file(flash_files[0][0])
        progress_state = {"index": 0, "overall": job.progress, "write_start": job.progress, "write_end": 99}
        process = subprocess.Popen(
            args,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            cwd=str(DATA_ROOT),
        )
        assert process.stdout is not None
        for line in process.stdout:
            clean = line.rstrip()
            update_flash_progress(job, clean, flash_files, progress_state)
            job.log(clean)
            STATE.append_serial_line(clean)
        rc = process.wait()
        if rc != 0:
            raise RuntimeError(f"esptool failed with exit code {rc}")
        job.set_progress(100)
        job.set_current_file(None)
        STATE.append_serial_line("Firmware flash completed")
        return {
            "package_dir": str(package),
            "package_source": package_source,
            "package_ref": package_ref,
            "erase_flash": erase_flash,
            "include_littlefs": include_littlefs,
        }
    finally:
        try:
            serial_guard.__exit__(None, None, None)
        except Exception:
            pass
        if handover.get("restart") and restart_monitor_after:
            STATE.append_serial_line("Restart serial monitor")
            schedule_serial_restart(str(handover["port"]), int(handover["baud"]), delay_seconds=2.5)


def backup_firmware_job(job: Job, base_url: str, port: str, baud: int) -> dict[str, Any]:
    handover = prepare_esptool_serial_handover(port, baud, "Firmware backup")
    esptool_path = ensure_esptool_available(job)
    job.set_progress(1)
    job.set_current_file("firmware.bin")
    slot = firmware_slot(base_url)
    label = str(slot.get("label", "app")).strip() or "app"
    address = slot.get("address")
    size = slot.get("size")
    version = str(slot.get("firmware", "unknown")).strip()
    version_token = sanitize_version_for_filename(version)
    if address is None or size is None:
        raise RuntimeError("running partition info incomplete")

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    target = BACKUP_DIR / f"brautomat-fw-{label}-{version_token}-{stamp}.bin"
    job.log(f"Firmware backup from slot {label} address={hex(int(address))} size={hex(int(size))}")
    try:
        serial_guard = exclusive_serial_access(timeout=30.0)
        serial_guard.__enter__()
        STATE.append_serial_line(f"Firmware backup from slot {label}")
        baud_candidates: list[int] = [115200]

        last_error = "esptool read-flash failed"
        for attempt_baud in baud_candidates:
            if target.exists():
                try:
                    target.unlink()
                except OSError:
                    pass
            args = [
                str(esptool_path),
                "--chip",
                "esp32",
                "--port",
                port,
                "--baud",
                str(attempt_baud),
                "read-flash",
                hex(int(address)),
                hex(int(size)),
                str(target),
            ]
            if attempt_baud != int(baud):
                job.log(f"Retry firmware backup with baud {attempt_baud}")
                STATE.append_serial_line(f"Retry firmware backup with baud {attempt_baud}")
            process = subprocess.Popen(
                args,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                cwd=str(DATA_ROOT),
            )
            assert process.stdout is not None
            attempt_logs: list[str] = []
            for line in process.stdout:
                clean = line.rstrip()
                attempt_logs.append(clean)
                update_progress_from_line(job, clean)
                job.log(clean)
                STATE.append_serial_line(clean)
            rc = process.wait()
            if rc == 0:
                break
            last_error = f"esptool read-flash failed with exit code {rc}"
            transient = any("Packet content transfer stopped" in entry for entry in attempt_logs)
            if not transient or attempt_baud == baud_candidates[-1]:
                raise RuntimeError(last_error)
        else:
            raise RuntimeError(last_error)
        job.set_progress(100)
        STATE.append_serial_line("Firmware backup completed")
        return {"backup_file": str(target), "slot": slot}
    finally:
        try:
            serial_guard.__exit__(None, None, None)
        except Exception:
            pass
        if handover.get("restart"):
            STATE.append_serial_line("Restart serial monitor")
            schedule_serial_restart(str(handover["port"]), int(handover["baud"]), delay_seconds=2.0)


def migration_job(
    job: Job,
    base_url: str,
    include_api: bool,
    port: str,
    baud: int,
    package_source: str,
    package_dir: str,
    package_ref: str,
    include_littlefs: bool,
    create_backup: bool,
) -> dict[str, Any]:
    ensure_esptool_port_available(port)
    result: dict[str, Any] = {}
    wifi_snapshot: dict[str, Any] = {}
    if package_source == "open":
        validated_dir = validate_package_dir(package_dir, include_littlefs=include_littlefs, require_base_files=True)
        package_dir = str(validated_dir)
        job.log(f"Migration package source: open ({package_dir})")
    elif package_source == "special":
        job.log(f"Migration package source: special ({package_ref.strip()})")
    else:
        job.log(f"Migration package source: {package_source}")
    current_version, current_parsed = current_firmware_version(base_url)
    job.log(f"Migration source version: {current_version}")
    target_version, target_parsed = validate_migration_package_source(package_source, package_ref, package_dir)
    job.log(f"Migration target version: {target_version}")

    if target_parsed[:2] != MIGRATION_TARGET_VERSION[:2]:
        raise RuntimeError(
            f"Migration target must be in line {version_line_label(MIGRATION_TARGET_VERSION)}. Selected target is {target_version}."
        )

    if current_parsed < (1, 60, 0):
        raise RuntimeError("Migration requires at least Brautomat32 1.60.x")

    if current_parsed < MIGRATION_MIN_VERSION:
        result["preupdate"] = start_http_preupdate_to_minimum_migration_version(job, base_url)
        current_version, current_parsed = current_firmware_version(base_url)
        job.log(f"Migration continues with version: {current_version}")

    if current_parsed < MIGRATION_MIN_VERSION:
        raise RuntimeError(f"Migration requires Brautomat32 {version_line_label(MIGRATION_MIN_VERSION)} after pre-update")

    if create_backup:
        job.log("Create required configuration backup")
        result["backup"] = create_backup_job(job, base_url, include_api)
        backup_file = str(result.get("backup", {}).get("backup_file") or "").strip()
        if backup_file:
            job.log(f"Migration: configuration backup created ({backup_file})")

    job.log("Migration: read WiFi credentials before erase flash")
    wifi_snapshot = capture_migration_wifi(base_url, port, baud)
    if wifi_snapshot.get("ssid"):
        job.log(f"Migration: captured WiFi SSID '{wifi_snapshot['ssid']}'")
        result["wifi_backup"] = {"ssid": wifi_snapshot["ssid"], "transport": wifi_snapshot.get("transport", "")}
    else:
        job.log("Migration: no WiFi credentials available for transfer")

    job.log("Migration: erase flash")
    job.log("Migration: write new partition layout, target firmware and LittleFS")
    result["flash"] = flash_job(job, port, baud, package_source, package_dir, package_ref, True, include_littlefs, restart_monitor_after=False)
    job.log("Migration: rescan device state after flash")
    result["post_flash_state"] = wait_for_migration_target_ready(job, base_url, port, 115200)
    if wifi_snapshot.get("ssid"):
        job.log("Migration: restore WiFi credentials on target firmware")
        result["wifi_restore"] = restore_migration_wifi(job, port, 115200, wifi_snapshot)
    backup_file = str(result.get("backup", {}).get("backup_file") or "").strip()
    if backup_file:
        job.log("Migration: wait for HTTP reconnect before automatic restore")
        result["post_wifi_http_state"] = wait_for_device_http_ready(job, base_url)
        job.log(f"Migration: restore configuration backup automatically ({backup_file})")
        backup_name = pathlib.Path(backup_file).name
        result["restore"] = restore_local_backup(base_url, backup_name)
        job.log("Migration: configuration restore completed")
    active = STATE.active_serial_config(port)
    if active and not active.get("running"):
        schedule_serial_restart(port, baud, delay_seconds=2.0)
    return result


# ---------------------------------------------------------------------------
# HTTP request handler / API routing
# One handler instance per request (ThreadingHTTPServer spawns a thread per
# connection). Serves the static frontend and dispatches /api/* routes via
# manual if-chains in _route_api_get() (GET) and do_POST(); all real work is
# delegated to the module-level functions defined above.
# ---------------------------------------------------------------------------
class AppHandler(BaseHTTPRequestHandler):
    server_version = "BrautomatServiceTool/0.1"

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return

    def _send_json(self, payload: Any, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError):
            # The browser polls these JSON endpoints constantly and routinely
            # drops a connection mid-response (tab reload, navigation). That is
            # not an application error, so swallow it instead of letting it
            # bubble up as a noisy traceback from the socketserver thread.
            pass

    def _send_file(self, path: pathlib.Path) -> None:
        if not path.exists() or not path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        content = path.read_bytes()
        mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", mime)
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8"))

    def _route_api_get(self, path: str) -> None:
        if path == "/api/info":
            config = load_app_config()
            self._send_json(
                {
                    "tool": "Brautomat32 ServiceTool",
                    "version": SERVICE_TOOL_VERSION,
                    "python": sys.version,
                    "runtime_root": str(DATA_ROOT),
                    "app_root": str(APP_ROOT),
                    "data_root": str(DATA_ROOT),
                    "bundle_root": str(BUNDLE_ROOT),
                    "esptool": str(bundled_esptool_path() or cached_esptool_path()),
                    "esptool_version": ESPTOOL_VERSION,
                    "telegraf": STATE.telegraf.snapshot(),
                    "telegraf_cached": str(cached_telegraf_path()),
                    "telegraf_version": TELEGRAF_VERSION,
                    "default_package_source": config["package_source"],
                    "default_package": config["package_dir"],
                    "preferred_url": preferred_url(PORT),
                    "fallback_url": fallback_url(PORT),
                    "mdns_hostname": SERVICE_HOSTNAME,
                    "mdns_resolved": hostname_resolves(SERVICE_HOSTNAME),
                    "config": config,
                    "jobs": STATE.jobs.snapshot(),
                    "serial": STATE.serial_snapshot(),
                }
            )
            return
        if path == "/api/config":
            self._send_json(load_app_config())
            return
        if path == "/api/inventory/root":
            config = load_app_config()
            root = inventory_root_dir(config)
            self._send_json({"inventory_root": str(root), "default_inventory_root": str(DEFAULT_INVENTORY_DIR)})
            return
        if path == "/api/ports":
            try:
                self._send_json({"ports": list_serial_ports()})
            except Exception as exc:  # noqa: BLE001
                self._send_json({"error": str(exc)}, status=500)
            return
        if path == "/api/jobs":
            self._send_json({"jobs": STATE.jobs.snapshot()})
            return
        if path.startswith("/api/jobs/"):
            job_id = path.rsplit("/", 1)[-1]
            job = STATE.jobs.get(job_id)
            if not job:
                self._send_json({"error": "job not found"}, status=404)
                return
            self._send_json(job.__dict__)
            return
        if path == "/api/serial":
            self._send_json(STATE.serial_snapshot())
            return
        if path == "/api/telegraf/status":
            self._send_json(STATE.telegraf.snapshot())
            return
        if path == "/api/languages/repo":
            query = parse.parse_qs(parse.urlparse(self.path).query)
            source = (query.get("source") or ["release"])[0]
            package_ref = (query.get("ref") or [""])[0]
            self._send_json({"languages": list_remote_languages(source, package_ref)})
            return
        if path == "/api/inventory/list":
            query = parse.parse_qs(parse.urlparse(self.path).query)
            kind = (query.get("kind") or ["mashplans"])[0]
            base_url = (query.get("base_url") or [""])[0]
            include_device = (query.get("device") or ["1"])[0] not in {"0", "false", "False"}
            local_dir = (query.get("local_dir") or [""])[0]
            self._send_json(inventory_snapshot(base_url, kind, include_device=include_device, local_dir=local_dir))
            return
        if path == "/api/inventory/local/detail":
            query = parse.parse_qs(parse.urlparse(self.path).query)
            kind = (query.get("kind") or ["mashplans"])[0]
            filename = (query.get("filename") or [""])[0]
            self._send_json(local_inventory_detail(kind, filename))
            return
        if path == "/api/inventory/device/detail":
            query = parse.parse_qs(parse.urlparse(self.path).query)
            kind = (query.get("kind") or ["mashplans"])[0]
            filename = (query.get("filename") or [""])[0]
            base_url = (query.get("base_url") or [""])[0]
            self._send_json(device_inventory_detail(base_url, kind, filename))
            return
        if path == "/api/backups":
            self._send_json({"files": list_config_backups()})
            return
        if path == "/api/backups/detail":
            query = parse.parse_qs(parse.urlparse(self.path).query)
            filename = (query.get("filename") or [""])[0]
            self._send_json(backup_detail(filename))
            return
        if path == "/api/test-runner/catalog":
            self._send_json(detect_test_runner_environment())
            return
        if path == "/api/test-runner/status":
            self._send_json(STATE.test_runner.snapshot())
            return
        if path == "/api/test-runner/public-results":
            try:
                self._send_json(fetch_public_test_results())
            except Exception as exc:  # noqa: BLE001
                self._send_json({"error": str(exc)}, status=500)
            return
        if path == "/api/servicetool/update/check":
            try:
                self._send_json(service_tool_update_status())
            except Exception as exc:  # noqa: BLE001
                self._send_json({"error": str(exc)}, status=502)
            return
        self._send_json({"error": "not found"}, status=404)

    def do_GET(self) -> None:  # noqa: N802
        path = parse.urlparse(self.path).path
        if path.startswith("/api/"):
            self._route_api_get(path)
            return
        if path == "/favicon.ico":
            self._send_file(FAVICON_FILE)
            return
        if path == "/":
            self._send_file(STATIC_DIR / "index.html")
            return
        rel = path.lstrip("/")
        self._send_file(STATIC_DIR / rel)

    def do_POST(self) -> None:  # noqa: N802
        path = parse.urlparse(self.path).path
        try:
            if path == "/api/device/status":
                data = self._read_json()
                self._send_json(
                    combined_device_status(
                        data["base_url"],
                        data.get("serial_port", ""),
                        int(data.get("serial_baud", 115200)),
                        float(data.get("serial_timeout", 12.0)),
                        bool(data.get("prefer_serial", False)),
                    )
                )
                return
            if path == "/api/device/process":
                data = self._read_json()
                self._send_json(device_process_status(str(data.get("base_url") or "")))
                return
            if path == "/api/firmware/update/check":
                data = self._read_json()
                self._send_json(firmware_update_status(str(data.get("base_url") or "")))
                return
            if path == "/api/firmware/update/start":
                data = self._read_json()
                job = STATE.jobs.create("firmware-webupdate", "Firmware WebUpdate")
                run_job(job, firmware_webupdate_job, str(data.get("base_url") or ""), bool(data.get("include_api", True)))
                self._send_json({"job_id": job.id})
                return
            if path == "/api/firmware/slot":
                data = self._read_json()
                self._send_json(firmware_slot(data["base_url"]))
                return
            if path == "/api/packages":
                self._send_json(package_catalog())
                return
            if path == "/api/config":
                data = self._read_json()
                config = save_app_config(data)
                ensure_runtime_dirs()
                self._send_json(config)
                return
            if path == "/api/telegraf/test-device":
                data = self._read_json()
                self._send_json(test_telegraf_device(str(data.get("device_url") or "")))
                return
            if path == "/api/telegraf/resolve-binary":
                data = self._read_json()
                self._send_json(describe_telegraf_binary({"binary": str(data.get("binary") or "")}))
                return
            if path == "/api/telegraf/start":
                data = self._read_json()
                config = normalize_telegraf_config(data.get("config"))
                app_config = load_app_config()
                app_config["telegraf"] = config
                save_app_config(app_config)
                self._send_json(STATE.telegraf.start(config))
                return
            if path == "/api/telegraf/stop":
                self._send_json(STATE.telegraf.stop())
                return
            if path == "/api/telegraf/clear":
                self._send_json(STATE.telegraf.clear())
                return
            if path == "/api/telegraf/binary/pick":
                selected = pick_file("Telegraf-Programmdatei wählen")
                self._send_json({"selected": selected})
                return
            if path == "/api/telegraf/templates/pick":
                selected = pick_directory("Verzeichnis mit eigenen Telegraf-Templates wählen")
                self._send_json({"selected": selected})
                return
            if path == "/api/telegraf/export-templates":
                selected = pick_directory("Zielverzeichnis für die Telegraf-Templates wählen")
                written = export_telegraf_templates(selected) if selected else []
                self._send_json({"selected": selected, "written": written})
                return
            if path == "/api/telegraf/download":
                job = STATE.jobs.create("telegraf-download", "Telegraf herunterladen")
                run_job(job, telegraf_download_job)
                self._send_json({"job_id": job.id})
                return
            if path == "/api/package/pick":
                selected = pick_directory()
                self._send_json({"selected": selected, "details": package_details(pathlib.Path(selected)) if selected else None})
                return
            if path == "/api/inventory/root/pick":
                selected = pick_directory("Select local inventory root", inventory_root_dir())
                self._send_json({"selected": selected})
                return
            if path == "/api/backup":
                data = self._read_json()
                job = STATE.jobs.create("backup", "Backup erstellen")
                run_job(job, create_backup_job, data["base_url"], bool(data.get("include_api")))
                self._send_json({"job_id": job.id})
                return
            if path == "/api/test-runner/start":
                data = self._read_json()
                catalog = detect_test_runner_environment()
                suite = next((item for item in catalog["suites"] if item["id"] == data.get("suite_id")), None)
                if not suite:
                    self._send_json({"error": "suite not found"}, status=404)
                    return
                snapshot = STATE.test_runner.start(
                    suite,
                    str(data.get("base_url") or "http://brautomat.local").strip(),
                    str(data.get("device_key") or "brautomat-servicetool").strip() or "brautomat-servicetool",
                )
                self._send_json(snapshot)
                return
            if path == "/api/test-runner/stop":
                self._send_json(STATE.test_runner.stop())
                return
            if path == "/api/restore":
                data = self._read_json()
                content = base64.b64decode(data["content_b64"])
                job = STATE.jobs.create("restore", "Restore ausführen")
                run_job(job, restore_job, data["base_url"], data["filename"], content)
                self._send_json({"job_id": job.id})
                return
            if path == "/api/backups/restore":
                data = self._read_json()
                path_obj = backup_file_path(data["filename"])
                job = STATE.jobs.create("restore", "Restore ausführen")
                run_job(job, restore_job, data["base_url"], path_obj.name, path_obj.read_bytes())
                self._send_json({"job_id": job.id})
                return
            if path == "/api/wifi/reset":
                data = self._read_json()
                self._send_json(wifi_reset(data["base_url"], data.get("serial_port", ""), int(data.get("serial_baud", 115200))))
                return
            if path == "/api/device/reboot":
                data = self._read_json()
                self._send_json(reboot_device(data["base_url"], data.get("serial_port", ""), int(data.get("serial_baud", 115200))))
                return
            if path == "/api/wifi/scan":
                data = self._read_json()
                self._send_json(wifi_scan(data["base_url"], bool(data.get("refresh")), data.get("serial_port", ""), int(data.get("serial_baud", 115200))))
                return
            if path == "/api/wifi/host-scan":
                self._send_json(host_wifi_scan())
                return
            if path == "/api/wifi/credentials":
                data = self._read_json()
                self._send_json(wifi_credentials(data["base_url"], data.get("serial_port", ""), int(data.get("serial_baud", 115200))))
                return
            if path == "/api/wifi/save":
                data = self._read_json()
                self._send_json(wifi_save(data["base_url"], data.get("ssid", ""), data.get("password", ""), data.get("serial_port", ""), int(data.get("serial_baud", 115200))))
                return
            if path == "/api/flash":
                data = self._read_json()
                ensure_esptool_port_available(data["port"])
                job = STATE.jobs.create("flash", "Firmware flashen")
                run_job(
                    job,
                    flash_job,
                    data["port"],
                    int(data.get("baud", 921600)),
                    data.get("package_source", "release"),
                    data["package_dir"],
                    data.get("package_ref", ""),
                    bool(data.get("erase_flash", True)),
                    bool(data.get("include_littlefs", True)),
                )
                self._send_json({"job_id": job.id})
                return
            if path == "/api/firmware/backup":
                data = self._read_json()
                ensure_esptool_port_available(data["port"])
                job = STATE.jobs.create("firmware-backup", "Firmware sichern")
                run_job(
                    job,
                    backup_firmware_job,
                    data["base_url"],
                    data["port"],
                    int(data.get("baud", 921600)),
                )
                self._send_json({"job_id": job.id})
                return
            if path == "/api/webfiles/update":
                data = self._read_json()
                job = STATE.jobs.create("webfiles-update", "Webdateien aktualisieren")
                run_job(
                    job,
                    update_webfiles_job,
                    data["base_url"],
                    data.get("package_source", "release"),
                    data.get("package_ref", ""),
                )
                self._send_json({"job_id": job.id})
                return
            if path == "/api/language/install":
                data = self._read_json()
                job = STATE.jobs.create("language-install", "Sprache installieren")
                run_job(
                    job,
                    install_language_job,
                    data["base_url"],
                    data.get("package_source", "release"),
                    data["filename"],
                    data.get("package_ref", ""),
                )
                self._send_json({"job_id": job.id})
                return
            if path == "/api/inventory/device-to-local":
                data = self._read_json()
                self._send_json(copy_device_to_local(data["base_url"], data["kind"], data["filename"], data.get("local_dir", ""), data.get("conflict", "overwrite")))
                return
            if path == "/api/inventory/local-to-device":
                data = self._read_json()
                self._send_json(copy_local_to_device(data["base_url"], data["kind"], data["filename"]))
                return
            if path == "/api/inventory/device/delete":
                data = self._read_json()
                self._send_json(delete_device_inventory(data["base_url"], data["kind"], data["filename"]))
                return
            if path == "/api/inventory/local/delete":
                data = self._read_json()
                self._send_json(delete_local_inventory(data["kind"], data["filename"]))
                return
            if path == "/api/inventory/device/rename":
                data = self._read_json()
                self._send_json(rename_device_inventory(data["base_url"], data["kind"], data["filename"], data["new_name"]))
                return
            if path == "/api/inventory/local/rename":
                data = self._read_json()
                self._send_json(rename_local_inventory(data["kind"], data["filename"], data["new_name"]))
                return
            if path == "/api/inventory/local/create-dir":
                data = self._read_json()
                self._send_json(create_local_inventory_dir(data["kind"], data.get("local_dir", ""), data["name"]))
                return
            if path == "/api/inventory/local/create-file":
                data = self._read_json()
                self._send_json(create_local_inventory_file(data["kind"], data.get("local_dir", ""), data["name"]))
                return
            if path == "/api/inventory/local/user-info":
                data = self._read_json()
                self._send_json(update_inventory_user_info(data["kind"], data["filename"], data.get("user_info", "")))
                return
            if path == "/api/backups/delete":
                data = self._read_json()
                self._send_json(delete_config_backup(data["filename"]))
                return
            if path == "/api/backups/rename":
                data = self._read_json()
                self._send_json(rename_config_backup(data["filename"], data["new_name"]))
                return
            if path == "/api/backups/user-info":
                data = self._read_json()
                self._send_json(update_backup_user_info(data["filename"], data.get("user_info", "")))
                return
            if path == "/api/migration":
                data = self._read_json()
                job = STATE.jobs.create("migration", "Migration ausführen")
                run_job(
                    job,
                    migration_job,
                    data["base_url"],
                    bool(data.get("include_api")),
                    data["port"],
                    int(data.get("baud", 921600)),
                    data.get("package_source", "release"),
                    data["package_dir"],
                    data.get("package_ref", ""),
                    bool(data.get("include_littlefs", True)),
                    bool(data.get("create_backup", True)),
                )
                self._send_json({"job_id": job.id})
                return
            if path == "/api/serial/start":
                data = self._read_json()
                snapshot = STATE.start_serial(data["port"], int(data.get("baud", 115200)))
                self._send_json(snapshot)
                return
            if path == "/api/serial/stop":
                self._send_json(STATE.stop_serial())
                return
            if path == "/api/serial/clear":
                self._send_json(STATE.clear_serial_log())
                return
            if path == "/api/servicetool/update/download":
                status = service_tool_update_status()
                self._send_json(install_service_tool_update() if status.get("install_supported") else download_service_tool_update())
                return
            self._send_json({"error": "not found"}, status=404)
        except error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            self._send_json({"error": f"{exc.code} {exc.reason}", "body": body}, status=502)
        except Exception as exc:  # noqa: BLE001
            self._send_json({"error": str(exc)}, status=500)


# ---------------------------------------------------------------------------
# Startup
# main() wires everything together: pick a free port, start the threaded
# HTTP server, advertise via mDNS, and open the default browser.
# ---------------------------------------------------------------------------
def choose_listen_port(host: str, preferred_port: int) -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        probe_host = "127.0.0.1" if host == "0.0.0.0" else host
        if sock.connect_ex((probe_host, preferred_port)) != 0:
            return preferred_port

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind((host, 0))
        return int(sock.getsockname()[1])


def wait_until_local_server_ready(port: int, timeout: float = 10.0) -> bool:
    deadline = time.time() + timeout
    target = f"{fallback_url(port)}/api/info"
    while time.time() < deadline:
        try:
            req = request.Request(target, method="GET")
            with request.urlopen(req, timeout=1.5, context=ssl_context()) as response:
                if response.status == 200:
                    return True
        except Exception:
            time.sleep(0.2)
    return False


def start_browser(port: int) -> None:
    def opener() -> None:
        if not wait_until_local_server_ready(port, timeout=10.0):
            log_runtime_error(f"Local UI did not become ready on {fallback_url(port)} before browser open")
        webbrowser.open(fallback_url(port))

    threading.Thread(target=opener, daemon=True).start()


def main() -> None:
    global HTTP_SERVER, PORT
    ensure_runtime_dirs()
    PORT = choose_listen_port(HOST, DEFAULT_PORT)
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    HTTP_SERVER = server
    advertiser = MdnsAdvertiser(SERVICE_HOSTNAME, PORT)
    mdns_active = advertiser.start()
    print(f"Brautomat32 ServiceTool running on {fallback_url(PORT)}")
    print(f"Preferred URL: {preferred_url(PORT)} ({'mDNS active' if mdns_active else 'mDNS unavailable'})")
    start_browser(PORT)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        advertiser.stop()
        if STATE.serial:
            STATE.serial.stop()
        server.server_close()
        HTTP_SERVER = None


if __name__ == "__main__":
    try:
        main()
    except Exception:  # noqa: BLE001
        log_runtime_error(traceback.format_exc())
        raise
