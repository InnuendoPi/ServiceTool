"""Shared file explorer for the device filesystem and the local inventory."""
import base64
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
from datetime import datetime
from urllib.error import HTTPError

LOG_FILES = {"autotune_log.txt", "webUpdateLog.txt"}
CONFIG_FILES = {"config.txt", "log_cfg.json"}
TEXT_TYPES = {".txt", ".json", ".log", ".csv", ".md", ".ini", ".cfg", ".html", ".htm", ".css", ".js", ".xml"}
PREVIEW_LIMIT = 4 * 1024 * 1024


def clean_path(value):
    value = str(value or "/")
    if "\\" in value or any(ord(c) < 32 for c in value):
        raise ValueError("Invalid path")
    parts = value.strip("/").split("/") if value.strip("/") else []
    for part in parts:
        if part in ("", ".", "..") or any(c in part for c in ':*?"<>|') or part.endswith((".", " ")):
            raise ValueError("Invalid path")
        if part.split(".")[0].upper() in {"CON", "PRN", "AUX", "NUL", *[f"COM{i}" for i in range(1, 10)], *[f"LPT{i}" for i in range(1, 10)]}:
            raise ValueError("Invalid filename")
        if part == ".inventory-info.json":
            raise ValueError("Inventory metadata is managed by ServiceTool")
    return "/" + "/".join(parts)


def renamed_path(path, name):
    if not name or "/" in name or "\\" in name:
        raise ValueError("Enter a filename, not a path")
    return clean_path(str(PurePosixPath(path).parent / name))


class FileExplorer:
    def __init__(self, root, *, listing, read, write, delete, put, rename, local_rename=None, local_delete=None):
        self.root = Path(root).resolve()
        self.local_rename, self.local_delete = local_rename, local_delete
        self.listing, self.device_read, self.device_write = listing, read, write
        self.device_delete, self.device_put, self.device_rename = delete, put, rename

    def local(self, path):
        target = (self.root / clean_path(path).lstrip("/")).resolve()
        if not target.is_relative_to(self.root):
            raise ValueError("Path leaves the inventory directory")
        return target

    def side(self, side):
        if side not in ("device", "local"):
            raise ValueError("Unknown storage location")

    def entries(self, side, path):
        self.side(side)
        path = clean_path(path)
        result = []
        if side == "local":
            directory = self.local(path)
            if not directory.exists():
                raise FileNotFoundError("Directory does not exist: " + path)
            for file in directory.iterdir():
                try:
                    child = clean_path(str(PurePosixPath(path) / file.name))
                    self.local(child)
                except ValueError:
                    continue
                info = file.stat()
                result.append({"name": file.name, "path": child, "type": "dir" if file.is_dir() else "file",
                               "size": info.st_size if file.is_file() else 0,
                               "mtime": datetime.fromtimestamp(info.st_mtime).isoformat(timespec="seconds")})
        else:
            data = self.listing(path)
            if not isinstance(data, list):
                raise ValueError("Invalid device file list")
            for item in data:
                if not isinstance(item, dict) or item.get("type") not in ("file", "dir"):
                    continue
                raw = str(item.get("name", ""))
                try:
                    child = clean_path(raw if raw.startswith("/") else str(PurePosixPath(path) / raw))
                except ValueError:
                    continue
                if str(PurePosixPath(child).parent) != path or child == "/":
                    continue
                result.append({"name": PurePosixPath(child).name, "path": child, "type": item["type"],
                               "size": int(item.get("size") or 0), "mtime": item.get("mtime") or ""})
        return sorted(result, key=lambda f: (f["type"] != "dir", f["name"].casefold()))

    def list(self, side, path, view="all"):
        if view not in ("all", "logs", "config"):
            raise ValueError("Unknown view")
        rows = self.entries(side, path)
        if view != "all":
            names = LOG_FILES if view == "logs" else CONFIG_FILES
            rows = [row for row in rows if row["type"] == "file" and (
                row["name"] in names or (view == "config" and side == "local"
                                         and PurePosixPath(row["name"]).suffix.lower() in {".txt", ".json"}))]
        return {"files": rows, "path": clean_path(path), "root": str(self.root) if side == "local" else "/"}

    def read(self, side, path):
        self.side(side)
        path = clean_path(path)
        if path == "/":
            raise ValueError("Select a file")
        return self.local(path).read_bytes() if side == "local" else self.device_read(path)

    def preview(self, side, path):
        data = self.read(side, path)
        result = {"size": len(data), "sha256": hashlib.sha256(data).hexdigest(), "editable": False, "text": None}
        if len(data) > PREVIEW_LIMIT:
            result["reason"] = "large"
            return result
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            result["reason"] = "binary"
            return result
        if "\x00" in text:
            result["reason"] = "binary"
            return result
        result.update(text=text, editable=PurePosixPath(path).suffix.lower() in TEXT_TYPES)
        return result

    def exists(self, side, path):
        parent = str(PurePosixPath(path).parent)
        return any(row["path"] == path for row in self.entries(side, parent))

    def write(self, side, path, data, overwrite=False):
        self.side(side)
        path = clean_path(path)
        if path == "/":
            raise ValueError("Select a file")
        if not overwrite and self.exists(side, path):
            raise FileExistsError("Destination already exists: " + path)
        if side == "local":
            target = self.local(path)
            if not target.parent.is_dir():
                raise FileNotFoundError("Destination directory does not exist")
            # Exclusive creation prevents silently replacing a newly created file.
            with target.open("wb" if overwrite else "xb") as stream:
                stream.write(data)
        else:
            self.device_write(path, data)

    def action(self, data):
        side, path, action = data["side"], clean_path(data.get("path")), data["action"]
        self.side(side)
        if action == "save":
            current = self.read(side, path)
            if hashlib.sha256(current).hexdigest() != data.get("sha256"):
                raise ValueError("File changed since preview. Reload before editing.")
            if not self.preview(side, path)["editable"]:
                raise ValueError("This file cannot be edited as text")
            text = data["text"]
            if PurePosixPath(path).suffix.lower() == ".json" or PurePosixPath(path).name == "config.txt":
                json.loads(text.lstrip("\ufeff"))
            if b"\r\n" in current and b"\n" not in current.replace(b"\r\n", b""):
                text = text.replace("\r\n", "\n").replace("\n", "\r\n")
            self.write(side, path, text.encode("utf-8"), overwrite=True)
        elif action in ("upload", "new-file"):
            content = base64.b64decode(data.get("content", ""), validate=True) if action == "upload" else (b"{}\n" if path.endswith(".json") else b"")
            self.write(side, path, content, bool(data.get("overwrite")))
        elif action == "mkdir":
            if path == "/" or self.exists(side, path):
                raise FileExistsError("Destination already exists")
            if side == "local":
                self.local(path).mkdir()
            else:
                self.device_put({"path": path + "/"})
        elif action == "delete":
            if path == "/":
                raise ValueError("Cannot delete the storage root")
            if side == "local":
                target = self.local(path)
                if target.is_dir() and any(target.iterdir()):
                    raise ValueError("Only empty folders can be deleted")
                if not self.local_delete or not self.local_delete(path):
                    target.rmdir() if target.is_dir() else target.unlink()
            else:
                entry = next((row for row in self.entries(side, str(PurePosixPath(path).parent)) if row["path"] == path), None)
                if entry and entry["type"] == "dir" and self.entries(side, path):
                    raise ValueError("Only empty folders can be deleted")
                self.device_delete(path)
        elif action == "rename":
            if path == "/":
                raise ValueError("Cannot rename the storage root")
            target = renamed_path(path, data["name"])
            if self.exists(side, target):
                raise FileExistsError("Destination already exists")
            if side == "local":
                if not self.local_rename or not self.local_rename(path, data["name"]):
                    self.local(path).rename(self.local(target))
            else:
                self.device_rename(path, target, bool(data.get("maintenance")))
        elif action == "transfer":
            target_side = "local" if side == "device" else "device"
            self.write(target_side, clean_path(data["target"]), self.read(side, path), bool(data.get("overwrite")))
        else:
            raise ValueError("Unknown file action")
        return {"action": action, "path": path, "done": True}
