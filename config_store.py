"""Central settings storage. The public password avoids plaintext, not local access."""
import base64
import copy
from functools import lru_cache
import hashlib
import json
import os
from pathlib import Path
import threading

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


DEFAULT_PASSWORD = b"Brautomat32"
LOCK = threading.RLock()
IMPORT_DEFAULTS = {"boil_temp": 100, "mash_out_temp": 78,
                   "first_wort_temp": 75, "whirlpool_temp": 80}
SECRET_PATHS = (
    ("recipe_sources", "brewfather_key"),
    ("telegraf", "influxdb", "token"),
    ("telegraf", "postgres", "password"),
    ("telegraf", "mysql", "password"),
    ("telegraf", "mqtt", "password"),
)
AAD = b"Brautomat32ServiceTool/config/secrets/v1"


def recipe_defaults():
    return {"brewfather_user": "", "brewfather_key": "", "kbh_path": "",
            "import_options": dict(IMPORT_DEFAULTS)}


@lru_cache(maxsize=16)
def _key(salt):
    # Version 1 uses PBKDF2-HMAC-SHA256, 100000 iterations, AES-256-GCM.
    return hashlib.pbkdf2_hmac("sha256", DEFAULT_PASSWORD, salt, 100000, 32)


def _parent(config, path):
    for part in path[:-1]:
        config = config.setdefault(part, {})
    return config


def _read(path):
    if not path.exists():
        return {}
    config = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(config, dict):
        raise ValueError("config.json: expected an object")
    envelope = config.pop("secrets", None)
    if envelope is not None:
        try:
            if envelope["version"] != 1:
                raise ValueError("Unsupported secrets version")
            salt, nonce, ciphertext = (base64.b64decode(envelope[k], validate=True)
                                       for k in ("salt", "nonce", "ciphertext"))
            if len(salt) != 16 or len(nonce) != 12:
                raise ValueError("Invalid salt or nonce")
            secrets = json.loads(AESGCM(_key(salt)).decrypt(nonce, ciphertext, AAD))
            if not isinstance(secrets, dict):
                raise ValueError("Invalid secrets")
            for parts in SECRET_PATHS:
                name = ".".join(parts)
                if name in secrets:
                    _parent(config, parts)[parts[-1]] = secrets[name]
        except Exception as exc:
            raise ValueError("config.json: encrypted settings cannot be read; file retained") from exc
    return config


def write_config(path, config):
    """Encrypt saved recipe and Telegraf credentials; keep caller values intact."""
    path = Path(path)
    with LOCK:
        stored = copy.deepcopy(config)
        stored.pop("secrets", None)
        secrets = {}
        for parts in SECRET_PATHS:
            parent = stored
            for part in parts[:-1]:
                parent = parent.get(part, {})
            if parts[-1] in parent:
                secrets[".".join(parts)] = parent.pop(parts[-1])
        if secrets:
            salt, nonce = os.urandom(16), os.urandom(12)
            ciphertext = AESGCM(_key(salt)).encrypt(
                nonce, json.dumps(secrets, ensure_ascii=False).encode("utf-8"), AAD)
            stored["secrets"] = {"version": 1, **{
                name: base64.b64encode(value).decode("ascii")
                for name, value in (("salt", salt), ("nonce", nonce), ("ciphertext", ciphertext))}}
        content = json.dumps(stored, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".tmp")
        try:
            temporary.write_text(content, encoding="utf-8")
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)


def load_config(path, legacy_path=None):
    """Merge optional legacy settings; remove the source only after reading back."""
    path = Path(path)
    legacy_path = Path(legacy_path) if legacy_path is not None else path.parent / "designer" / "settings.json"
    with LOCK:
        config = _read(path)
        before = copy.deepcopy(config)
        legacy = {}
        if legacy_path.exists():
            legacy = json.loads(legacy_path.read_text(encoding="utf-8-sig"))
            if not isinstance(legacy, dict):
                raise ValueError("designer/settings.json: expected an object; file retained")
        sources = config.setdefault("recipe_sources", {})
        defaults = recipe_defaults()
        importing = legacy_path.exists() and not sources.get("_legacy_settings_imported")
        for name, default in defaults.items():
            if name != "import_options":
                # Empty defaults must not suppress values from the source file.
                if importing and not sources.get(name) and legacy.get(name):
                    sources[name] = legacy[name]
                sources.setdefault(name, default)
        options = sources.setdefault("import_options", {})
        legacy_options = legacy.get("import_options") or {}
        for name, default in IMPORT_DEFAULTS.items():
            if importing and name in legacy_options and options.get(name, default) == default:
                options[name] = legacy_options[name]
            options.setdefault(name, default)
        if importing:
            # A failed unlink must not cause a later retry to restore a cleared key.
            sources["_legacy_settings_imported"] = True
        # Plaintext credentials from older config versions are encrypted on first read.
        raw = json.loads(path.read_text(encoding="utf-8-sig")) if path.exists() else {}
        plaintext = False
        for parts in SECRET_PATHS:
            parent = raw
            for part in parts[:-1]:
                parent = parent.get(part, {})
            plaintext |= parts[-1] in parent
        if config != before or plaintext or legacy_path.exists() or not path.exists():
            write_config(path, config)
            if _read(path) != config:
                raise ValueError("config.json: verification failed; legacy settings retained")
        if legacy_path.exists():
            legacy_path.unlink()
        return config
