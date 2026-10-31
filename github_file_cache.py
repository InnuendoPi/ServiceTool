"""Persistent cache for public raw GitHub files; device responses never enter it."""
import hashlib
import http.client
import json
import re
import threading
import time
import uuid
from urllib import error, parse

LOCKS = tuple(threading.Lock() for _ in range(32))
BRANCH_TTL = 15 * 60


def download(url, directory, fetch):
    location = parse.urlsplit(url)
    parts = location.path.strip("/").split("/")
    if (location.scheme != "https" or location.netloc != "raw.githubusercontent.com"
            or len(parts) < 4 or location.query or location.fragment):
        return fetch({})[0]
    pinned = bool(re.fullmatch(r"[0-9a-fA-F]{40}", parts[2]))
    key = hashlib.sha256(url.encode()).hexdigest()
    with LOCKS[int(key[:2], 16) % len(LOCKS)]:
        payload_path = directory / (key + ".bin")
        metadata_path = directory / (key + ".json")
        cached = None
        metadata = {}
        try:
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            payload = payload_path.read_bytes()
            if (metadata["url"] == url and metadata["size"] == len(payload)
                    and metadata["sha256"] == hashlib.sha256(payload).hexdigest()):
                cached = payload
        except (OSError, ValueError, KeyError, TypeError):
            pass
        now = time.time()
        if cached is not None:
            checked = metadata.get("checked_at", 0)
            if pinned or (isinstance(checked, (int, float)) and 0 <= now - checked < BRANCH_TTL):
                return cached
        headers = {}
        if cached is not None:
            for field, header in (("etag", "If-None-Match"), ("last_modified", "If-Modified-Since")):
                if metadata.get(field):
                    headers[header] = metadata[field]
        try:
            payload, response_headers = fetch(headers)
            length = response_headers.get("Content-Length")
            if length is not None and int(length) != len(payload):
                raise http.client.IncompleteRead(payload)
            metadata = {"url": url, "size": len(payload),
                        "sha256": hashlib.sha256(payload).hexdigest(),
                        "etag": response_headers.get("ETag", ""),
                        "last_modified": response_headers.get("Last-Modified", "")}
        except error.HTTPError as exc:
            if exc.code != 304 or cached is None or not headers:
                raise
            exc.close()
            payload = cached
        metadata["checked_at"] = now
        temporary = []
        try:
            directory.mkdir(parents=True, exist_ok=True)
            for destination, content in ((payload_path, payload), (metadata_path, json.dumps(metadata).encode())):
                temp = destination.with_name(destination.name + "." + uuid.uuid4().hex + ".tmp")
                temporary.append(temp)
                temp.write_bytes(content)
                temp.replace(destination)
        except OSError:
            # A full/unwritable cache must not prevent a successful download.
            pass
        finally:
            for temp in temporary:
                try:
                    temp.unlink(missing_ok=True)
                except OSError:
                    pass
        return payload
