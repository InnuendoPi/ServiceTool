"""Serial entry into the existing ServiceApp; no firmware installation."""
import struct
import json
import time
import zlib
from pathlib import Path
import migration

# Provisional engineering limits, not device-qualified timings. Keep response
# and application-start budgets independent until firmware acceptance tests.
RESPONSE_TIMEOUT = 5.0
START_TIMEOUT = 60.0


def parse_reply(line: bytes, kind: str) -> dict | None:
    try:
        text = line.decode("utf-8").strip()
        if kind == "main":
            if not text.startswith("BST:"):
                return None
            value = json.loads(text[4:])
            data = value.get("data") if isinstance(value, dict) else None
            if (value.get("ok") is True and value.get("cmd") == "info" and isinstance(data, dict)
                    and isinstance(data.get("firmware"), str) and data["firmware"].startswith("Brautomat32 V ")
                    and isinstance(data.get("version"), str) and data["version"].strip()):
                return value
            return None
        value = json.loads(text)
        if (not isinstance(value, dict) or value.get("protocol") != "brautomat-maintenance"
                or type(value.get("api")) is not int or value["api"] != 1):
            return None
        if value.get("type") == "error" and isinstance(value.get("reason"), str):
            return value
        if value.get("type") != kind:
            return None
        if kind == "status":
            required = {"mode", "running", "boot", "state", "update_active", "app_dirty",
                        "fs_dirty", "system_pending", "tools_pending", "can_boot_main", "reason"}
            if not required <= value.keys():
                return None
            if value.get("mode") != "service" or value.get("running") not in ("app1", None):
                return None
            if type(value.get("can_boot_main")) is not bool:
                return None
            if any(value[key] is not None and type(value[key]) is not bool for key in
                   ("update_active", "app_dirty", "fs_dirty", "system_pending", "tools_pending")):
                return None
        elif kind == "boot":
            if value.get("target") != "app0" or type(value.get("accepted")) is not bool:
                return None
            if not value["accepted"] and not isinstance(value.get("reason"), str):
                return None
        return value
    except (ValueError, UnicodeError, AttributeError):
        return None


def query(handle, command: str, kind: str, timeout: float = RESPONSE_TIMEOUT) -> dict | None:
    # Never accept old monitor buffers or replies predating this request.
    handle.reset_input_buffer()
    handle.write((command + "\n").encode("ascii"))
    handle.flush()
    deadline = time.monotonic() + timeout
    pending = bytearray()
    dropping = False
    while time.monotonic() < deadline:
        chunk = handle.read(1)
        if not chunk:
            continue
        if chunk == b"\n":
            if not dropping:
                value = parse_reply(bytes(pending), kind)
                if value is not None:
                    return value
            pending.clear()
            dropping = False
        elif len(pending) < 8192 and not dropping:
            pending.extend(chunk)
        else:
            dropping = True
    return None


def detect(handle) -> dict:
    service = query(handle, "BRAUTOMAT STATUS", "status")
    if service and service.get("type") == "status":
        return {"active": True if service.get("running") == "app1" else None,
                "service": service, "reason": service.get("reason")}
    main = query(handle, 'BST:{"cmd":"info"}', "main")
    if main:
        return {"active": False, "main": main["data"]}
    return {"active": None, "reason": service.get("reason") if service else "state_unknown"}


def wait_for_mode(handle, service: bool, timeout: float = START_TIMEOUT) -> dict:
    deadline = time.monotonic() + timeout
    command, kind = ("BRAUTOMAT STATUS", "status") if service else ('BST:{"cmd":"info"}', "main")
    while time.monotonic() < deadline:
        reply = query(handle, command, kind, min(RESPONSE_TIMEOUT, max(0, deadline - time.monotonic())))
        if reply and reply.get("type") != "error":
            if not service:
                return {"active": False, "main": reply["data"]}
            if reply.get("running") == "app1":
                return {"active": True, "service": reply, "reason": reply.get("reason")}
        time.sleep(min(0.25, max(0, deadline - time.monotonic())))
    return {"active": None, "reason": "service_start_unconfirmed" if service else "main_start_unconfirmed"}


def leave_service(handle, status) -> dict:
    mode = detect(handle)
    if mode.get("active") is not True:
        return mode
    response = query(handle, "BRAUTOMAT BOOT MAIN", "boot")
    if response is None:
        # No repeat of the boot request: it may already have committed.
        status("maintenanceDetecting")
        detected = detect(handle)
        if detected.get("active") is not False:
            detected.setdefault("reason", "boot_reply_missing")
        return detected
    if response.get("accepted") is not True:
        return {"active": True, "reason": response["reason"]}
    status("maintenanceStopping")
    return wait_for_mode(handle, False)


def check_no_pending_update(nvs: bytes) -> None:
    migration.check_persisted_idle(nvs, require_idle=False)
    entries = []
    for at in range(0, len(nvs), 4096):
        page = nvs[at:at + 4096]
        if page == b"\xff" * 4096:
            continue
        sequence = struct.unpack_from("<I", page, 4)[0]
        index = 0
        while index < 126:
            if (page[32 + index // 4] >> (2 * (index % 4))) & 3 != 2:
                index += 1
                continue
            offset = 64 + index * 32
            entry = page[offset:offset + 32]
            ns, kind, span, _ = entry[:4]
            key = entry[8:24].split(b"\0", 1)[0].decode("ascii")
            value = entry[24:]
            if kind == 0x21:
                length = struct.unpack_from("<H", value)[0]
                value = page[offset + 32:offset + 32 + length]
                if length > (span - 1) * 32 or zlib.crc32(value, 0xFFFFFFFF) != struct.unpack_from("<I", entry, 28)[0]:
                    raise ValueError("Invalid NVS string")
            entries.append((sequence, index, ns, kind, key, value))
            index += span
    entries.sort(key=lambda item: item[:2])
    namespaces = {v[0] for _, _, ns, kind, key, v in entries
                  if ns == 0 and kind == 1 and key == "braut-service"}
    values = {key: (kind, value) for _, _, ns, kind, key, value in entries if ns in namespaces}
    for key in ("app-dirty", "fs-dirty"):
        if key in values:
            # Only the first byte is defined for an NVS u8 entry.
            kind, value = values[key]
            if kind != 1 or value[0] != 0:
                raise RuntimeError("Incomplete ServiceApp update; use update recovery")
    if "record" in values:
        kind, value = values["record"]
        state = value.rstrip(b"\0").split(b"\n", 1)[0]
        if kind != 0x21 or state not in (b"idle", b"ready", b"restored", b"booting"):
            raise RuntimeError("Pending ServiceApp update; maintenance entry refused")


def select_service(device, directory: Path, status) -> None:
    status("maintenanceChecking")
    device.identity()
    metadata = device.read(0x8000, 0x8000, directory / "boot-metadata.bin")
    layout = metadata[:0x1000]
    migration.check_layout(layout, migration.NEW_LAYOUT)
    nvs = metadata[0x1000:0x6000]
    check_no_pending_update(nvs)
    status("maintenanceCheckingImage")
    image = device.read(0x220000, 0x120000, directory / "serviceapp.bin")
    if len(image) < 24 or image[0] != 0xE9 or not 1 <= image[1] <= 16:
        raise ValueError("Invalid ServiceApp image")
    cursor = 24
    for _ in range(image[1]):
        if cursor + 8 > len(image):
            raise ValueError("Truncated ServiceApp image")
        cursor += 8 + struct.unpack_from("<I", image, cursor + 4)[0]
    end = (cursor // 16) * 16 + 16 + 32
    migration.check_image(image[:end], "BrautomatSvcApp")
    original = metadata[0x6000:0x8000]
    migration.durable_write(directory / "otadata-backup.bin", original)
    # ESP-IDF OTA sequence 2 selects ota_1. Preserve both original sectors on disk.
    sequence = struct.pack("<I", 2)
    record = sequence + b"\xff" * 24 + struct.pack("<I", zlib.crc32(sequence, 0xFFFFFFFF))
    selected = record.ljust(0x2000, b"\xff")
    target = directory / "otadata-service.bin"
    migration.durable_write(target, selected)
    status("maintenanceSelecting")
    device.write([(0xE000, target)])
    if device.read(0xE000, 0x2000, directory / "otadata-readback.bin") != selected:
        raise RuntimeError("Boot selection verification failed; device remains in bootloader")
