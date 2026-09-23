"""Verified, recoverable migration of the known ESP32 4 MiB layout.

No network access or application restart is implicit in a flash operation.
The caller owns the serial lock and explicitly authorizes the final boot.
"""
from __future__ import annotations

from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import struct
import subprocess
import uuid
import zlib


SERVICEAPP_MIN_VERSION = (1, 67, 0)
FLASH_SIZE = 0x400000
OLD_LAYOUT = (
    ("nvs", 1, 2, 0x9000, 0x5000),
    ("otadata", 1, 0, 0xE000, 0x2000),
    ("app0", 0, 16, 0x10000, 0x1A0000),
    ("app1", 0, 17, 0x1B0000, 0x1A0000),
    ("spiffs", 1, 130, 0x350000, 0xB0000),
)
NEW_LAYOUT = (
    OLD_LAYOUT[0], OLD_LAYOUT[1],
    ("app0", 0, 16, 0x10000, 0x210000),
    ("app1", 0, 17, 0x220000, 0x120000),
    ("coredump", 1, 3, 0x340000, 0x10000), OLD_LAYOUT[-1],
)
IMAGES = {
    "firmware.bin": (0x10000, 0x210000),
    "serviceapp.bin": (0x220000, 0x120000),
    "bootloader.bin": (0x1000, 0x7000),
    "partitions.bin": (0x8000, 0x1000),
    "boot_app0.bin": (0xE000, 0x2000),
}
PRESERVED = {"nvs": (0x9000, 0x5000), "littlefs": (0x350000, 0xB0000)}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def durable_write(path: Path, data: bytes) -> None:
    temporary = path.with_name(path.name + ".tmp")
    with temporary.open("wb") as handle:
        handle.write(data)
        handle.flush()
        os.fsync(handle.fileno())
    temporary.replace(path)


def version_tuple(value: str) -> tuple[int, int, int]:
    match = re.fullmatch(r"(\d+)\.(\d+)(?:\.(\d+))?(?:[ -].*)?", value)
    if not match:
        raise ValueError("Missing or invalid embedded firmware version")
    return tuple(int(part or 0) for part in match.groups())


def contains_version(data: bytes, value: str) -> bool:
    major, minor, patch = version_tuple(value)
    variants = {value, f"{major}.{minor}.{patch}"}
    if patch == 0:
        variants.add(f"{major}.{minor}")
    return any(b"\0" + variant.encode("ascii") + b"\0" in data for variant in variants)


def check_layout(data: bytes, expected: tuple) -> None:
    if len(data) not in (0xC00, 0x1000):
        raise ValueError("Partition table must contain exactly 0xC00 or 0x1000 bytes")
    entries = []
    ended = False
    for position in range(0, len(data), 32):
        chunk = data[position:position + 32]
        if chunk == b"\xff" * 32:
            if any(byte != 255 for byte in data[position:]):
                raise ValueError("Unexpected data after partition table")
            ended = True
            break
        if chunk[:2] == b"\xeb\xeb":
            if chunk[2:16] != b"\xff" * 14 or chunk[16:] != hashlib.md5(data[:position]).digest():
                raise ValueError("Partition table MD5 mismatch")
            if any(byte != 255 for byte in data[position + 32:]):
                raise ValueError("Unexpected data after partition checksum")
            ended = True
            break
        magic, kind, subtype, offset, size, label, flags = struct.unpack("<HBBII16sI", chunk)
        if magic != 0x50AA or flags != 0:
            raise ValueError("Invalid or encrypted partition table")
        entries.append((label.split(b"\0", 1)[0].decode("ascii"), kind, subtype, offset, size))
    if not ended or tuple(entries) != expected:
        raise ValueError("Unknown partition layout; NVS/LittleFS preservation cannot be guaranteed")


def check_image(data: bytes, role: str | None = None) -> str:
    if len(data) < 24 or data[0] != 0xE9 or not 1 <= data[1] <= 16:
        raise ValueError("Invalid ESP image header")
    if struct.unpack_from("<H", data, 12)[0] != 0:
        raise ValueError("Only ESP32 images are supported")
    if data[3] >> 4 != 2:
        raise ValueError("Image must declare 4 MiB flash")
    cursor, checksum = 24, 0xEF
    for _ in range(data[1]):
        if cursor + 8 > len(data):
            raise ValueError("Truncated ESP image segment")
        size = struct.unpack_from("<I", data, cursor + 4)[0]
        cursor += 8
        if cursor + size > len(data):
            raise ValueError("Truncated ESP image data")
        for byte in data[cursor:cursor + size]:
            checksum ^= byte
        cursor += size
    checksum_at = (cursor // 16) * 16 + 15
    if checksum_at >= len(data) or data[checksum_at] != checksum:
        raise ValueError("ESP image checksum mismatch")
    end = checksum_at + 1
    if data[23] != 1 or len(data) != end + 32 or hashlib.sha256(data[:end]).digest() != data[end:]:
        raise ValueError("ESP image SHA256 missing, invalid, or unexpected trailing data")
    if role is None:
        return ""
    if len(data) < 312 or struct.unpack_from("<I", data, 32)[0] != 0xABCD5432:
        raise ValueError("Missing application descriptor")
    actual_role, abi, size = struct.unpack_from("<16sII", data, 288)
    if actual_role != role.encode().ljust(16, b"\0") or abi != 1 or size != 24:
        raise ValueError("Wrong application role or incompatible ServiceApp ABI")
    return data[48:80].split(b"\0", 1)[0].decode("ascii")


def validate_package(package: Path, version: str) -> dict:
    if version_tuple(version) < SERVICEAPP_MIN_VERSION:
        raise ValueError("Migration target must be 1.67.0 or newer with a compatible ServiceApp layout")
    payloads = {}
    for name, (_, limit) in IMAGES.items():
        path = package / name
        if not path.is_file() or path.is_symlink():
            raise ValueError(f"Required migration image missing: {name}")
        payload = path.read_bytes()
        if not payload or len(payload) > limit:
            raise ValueError(f"Migration image exceeds its reserved region: {name}")
        payloads[name] = payload
    check_layout(payloads["partitions.bin"], NEW_LAYOUT)
    check_image(payloads["bootloader.bin"])
    check_image(payloads["firmware.bin"], "BrautomatMain")
    check_image(payloads["serviceapp.bin"], "BrautomatSvcApp")
    # The SDK app descriptor can contain a Git build ID, not the product version.
    # Require the declared product version to exist as a complete image string.
    if not contains_version(payloads["firmware.bin"], version):
        raise ValueError("Declared product version is not present in the main firmware image")
    # Accept erased metadata or the standard ESP32 boot_app0 initializer only.
    first = struct.pack("<I", 1) + b"\xff" * 24 + struct.pack("<I", zlib.crc32(struct.pack("<I", 1), 0xFFFFFFFF))
    standard = first + b"\xff" * (4096 - 32) + b"\0" * 4 + b"\xff" * (4096 - 4)
    if payloads["boot_app0.bin"] not in (b"\xff" * 0x2000, standard):
        raise ValueError("Boot selection must be the known blank 8 KiB OTA0 initializer")
    return {"version": version, "images": {
        name: {"offset": IMAGES[name][0], "size": len(value), "sha256": digest(value)}
        for name, value in payloads.items()
    }}


def source_slot(data: bytes) -> int:
    entries = [data[0xE000:0xE020], data[0xF000:0xF020]]
    valid = []
    for index, entry in enumerate(entries):
        sequence = struct.unpack_from("<I", entry)[0]
        state = struct.unpack_from("<I", entry, 24)[0]
        crc = struct.unpack_from("<I", entry, 28)[0]
        if (0 < sequence < 0xFFFFFFFF and state in (0, 1, 2, 0xFFFFFFFF)
                and zlib.crc32(entry[:4], 0xFFFFFFFF) == crc):
            valid.append((sequence, index))
    if not valid:
        if all(entry == b"\xff" * 32 for entry in entries):
            return 0
        raise ValueError("Source OTA boot selection is invalid or unknown")
    return (max(valid)[0] - 1) % 2


def check_persisted_idle(data: bytes, *, require_idle: bool = True) -> None:
    """Read committed NVS scalar entries without changing the partition.

    Reject unreadable pages rather than treating unknown state as idle.
    Missing settings use the firmware defaults (SYSTEM.cpp, 1.65.5 readFlash):
    step/second=-1, play and actuator flags=0.
    """
    records = []
    for page_at in range(0, len(data), 4096):
        page = data[page_at:page_at + 4096]
        if page == b"\xff" * 4096:
            continue
        state, sequence = struct.unpack_from("<II", page)
        if state not in (0xFFFFFFFE, 0xFFFFFFFC) or page[8] not in (0xFE, 0xFF):
            raise ValueError("NVS page state is unsupported; cannot prove idle resume state")
        if zlib.crc32(page[4:28], 0xFFFFFFFF) != struct.unpack_from("<I", page, 28)[0]:
            raise ValueError("NVS header checksum mismatch")
        index = 0
        while index < 126:
            entry_state = (page[32 + index // 4] >> (2 * (index % 4))) & 3
            entry = page[64 + index * 32:96 + index * 32]
            if entry_state != 2:
                index += 1
                continue
            ns, kind, span, _ = entry[:4]
            if not 1 <= span <= 126 - index:
                raise ValueError("Invalid NVS entry span")
            if zlib.crc32(entry[:4] + entry[8:], 0xFFFFFFFF) != struct.unpack_from("<I", entry, 4)[0]:
                raise ValueError("NVS entry checksum mismatch")
            key = entry[8:24].split(b"\0", 1)[0].decode("ascii")
            records.append((sequence, index, ns, kind, key, entry[24:]))
            index += span
    if not require_idle:
        return
    records.sort(key=lambda item: item[:2])
    namespaces = {record[5][0] for record in records if record[2] == 0 and record[3] == 1 and record[4] == "settings"}
    if len(namespaces) > 1:
        raise ValueError("Persisted settings namespace is ambiguous")
    values = {"step": -1, "second": -1}
    formats = {1: "<B", 2: "<H", 4: "<I", 8: "<Q", 0x11: "<b", 0x12: "<h", 0x14: "<i", 0x18: "<q"}
    for _, _, ns, kind, key, payload in records:
        if ns in namespaces and key in ("step", "second", "play", "idson", "sudon", "hlton", "fermon"):
            if kind not in formats:
                raise ValueError("Unknown persisted process value type")
            values[key] = struct.unpack_from(formats[kind], payload)[0]
    if values["step"] >= 0 or values["second"] >= 0 or any(values.get(key, 0) for key in ("play", "idson", "sudon", "hlton", "fermon")):
        raise ValueError("Persisted process or actuator state is active; migration refused")


class Esptool:
    def __init__(self, executable: Path, port: str, baud: int, log):
        self.executable, self.port, self.baud, self.log = executable, port, baud, log

    def command(self, *args: str, boot: bool = False) -> str:
        command = [str(self.executable), "--chip", "esp32", "--port", self.port,
                   "--baud", str(self.baud), "--before", "default-reset",
                   "--after", "hard-reset" if boot else "no-reset", *args]
        self.log("esptool: " + args[0])
        # A bounded subprocess cannot retain the serial port indefinitely.
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                text=True, errors="replace", timeout=600,
                                env={**os.environ, "NO_COLOR": "1"})
        self.log(result.stdout)
        if result.returncode:
            raise RuntimeError(f"esptool {args[0]} failed; device is not restarted")
        return result.stdout

    def identity(self) -> str:
        output = self.command("flash-id")
        if not re.search(r"(?:Detected flash size|Flash size):\s*4\s*MB\b", output, re.I):
            raise RuntimeError("Expected an ESP32 with exactly 4 MiB flash")
        matches = re.findall(r"\bMAC:\s*([0-9a-f]{2}(?::[0-9a-f]{2}){5})", output, re.I)
        if not matches:
            raise RuntimeError("Unable to identify device MAC for recovery")
        # Classic ESP32 does not implement GET_SECURITY_INFO. Read the same
        # eFuse registers used by esptool's ESP32ROM security checks (v5.3.1).
        crypt = self.read_register(0x3FF5A000)
        security = self.read_register(0x3FF5A018)
        if ((crypt >> 20) & 0x7F).bit_count() % 2 or security & 0x30:
            raise RuntimeError("Secure Boot or flash encryption is enabled; migration refused")
        self.log("ESP32 eFuses verified: Secure Boot and flash encryption disabled")
        return matches[-1].lower()

    def read_register(self, address: int) -> int:
        output = self.command("read-mem", hex(address))
        values = re.findall(rf"^\s*{address:#010x}\s*=\s*(0x[0-9a-f]{{8}})\s*$", output, re.I | re.M)
        if len(values) != 1:
            raise RuntimeError(f"Unable to verify ESP32 security register {address:#010x}")
        return int(values[0], 16)

    def read(self, offset: int, size: int, target: Path) -> bytes:
        self.command("read-flash", hex(offset), hex(size), str(target))
        data = target.read_bytes()
        if len(data) != size:
            raise RuntimeError("Incomplete flash read")
        return data

    def write(self, files: list[tuple[int, Path]]) -> None:
        args = ["write-flash", "--flash-mode", "keep", "--flash-freq", "keep", "--flash-size", "keep"]
        for offset, path in files:
            args.extend((hex(offset), str(path)))
        output = self.command(*args)
        # ESP32 write-flash verifies each image on the device. Require the
        # confirmations before relying on it instead of a full serial readback.
        if output.count("Hash of data verified.") != len(files):
            raise RuntimeError("Flash write verification was not confirmed for every image; device is not restarted")

    def boot(self) -> None:
        self.command("flash-id", boot=True)


class Session:
    def __init__(self, directory: Path, report: dict):
        self.directory, self.report = directory, report
        self.status = lambda step: None

    @property
    def work(self) -> Path:
        path = Path(self.report.get("work_dir", str(self.directory)))
        path.mkdir(parents=True, exist_ok=True)
        return path

    @classmethod
    def create(cls, root: Path, package: Path, metadata: dict, webfiles: dict[str, bytes], source_version: str | None = None, work_root: Path | None = None) -> "Session":
        root.mkdir(parents=True, exist_ok=True)
        if source_version is None:
            name = uuid.uuid4().hex
        else:
            version = "_".join(str(n) for n in version_tuple(source_version))
            name = f"backup_{version}_{datetime.now():%Y%m%d}"
        index = 0
        while True:
            directory = root / (name if index == 0 else f"{name}_{index}")
            try:
                directory.mkdir()
                break
            except FileExistsError:
                index += 1
        work = (work_root or root.parent / "migration-work") / uuid.uuid4().hex
        work.mkdir(parents=True)
        staged = work / "package"
        staged.mkdir()
        for name in IMAGES:
            source = package / name
            if not source.resolve().is_relative_to(package.resolve()):
                raise ValueError("Unsafe package path")
            target = staged / name
            target.parent.mkdir(parents=True, exist_ok=True)
            durable_write(target, source.read_bytes())
        for name, content in webfiles.items():
            target = staged / "webfiles" / name.lstrip("/")
            if not target.resolve().is_relative_to((staged / "webfiles").resolve()):
                raise ValueError("Unsafe webfile path")
            target.parent.mkdir(parents=True, exist_ok=True)
            durable_write(target, content)
        result = cls(directory, {"id": directory.name, "phase": "prepared",
                                 "webfiles": {name: digest(data) for name, data in webfiles.items()},
                                 "package": metadata, "work_dir": str(work.resolve()), "backup_verified": False,
                                 "write_started": False})
        result.save()
        return result

    @classmethod
    def load(cls, root: Path, session_id: str) -> "Session":
        if not re.fullmatch(r"(?:[0-9a-f]{32}|backup_\d+_\d+_\d+_\d{8}(?:_\d+)?)", session_id):
            raise ValueError("Invalid migration session")
        directory = (root / session_id).resolve()
        if directory.parent != root.resolve():
            raise ValueError("Invalid migration directory")
        return cls.load_directory(directory)

    @classmethod
    def load_directory(cls, directory: Path) -> "Session":
        directory = directory.resolve()
        report = json.loads((directory / "report.json").read_text(encoding="utf-8"))
        if not isinstance(report, dict) or not isinstance(report.get("id"), str) or not isinstance(report.get("phase"), str):
            raise ValueError("Invalid migration report")
        return cls(directory, report)

    def save(self, phase: str | None = None, **values) -> None:
        self.report.update(values)
        if phase:
            self.report["phase"] = phase
        durable_write(self.directory / "report.json", (json.dumps(self.report, indent=2) + "\n").encode())

    def backup(self) -> bytes:
        data = (self.directory / "flash-backup.bin").read_bytes()
        if (not self.report.get("backup_verified") or len(data) != FLASH_SIZE
                or digest(data) != self.report.get("backup_sha256")):
            raise RuntimeError("Recovery backup is missing, incomplete or modified")
        check_layout(data[0x8000:0x9000], OLD_LAYOUT)
        nvs_path = self.directory / "nvs.bin"
        if not nvs_path.exists() and "nvs_sha256" not in self.report:
            nvs_path = self.directory / "nvs-backup.bin"  # Existing backups.
        nvs = nvs_path.read_bytes()
        if nvs != data[0x9000:0xE000] or ("nvs_sha256" in self.report and digest(nvs) != self.report["nvs_sha256"]):
            raise RuntimeError("NVS backup is modified or differs from full flash backup")
        return data

    def capture(self, device) -> None:
        self.status("migrationStepDevice")
        self.save("reading-backup", mac=device.identity())
        if shutil.disk_usage(self.directory).free < FLASH_SIZE * 4:
            raise RuntimeError("Insufficient disk space for verified migration backup")
        self.status("migrationStepBackupFirst")
        first = device.read(0, FLASH_SIZE, self.work / "first-read.bin")
        self.status("migrationStepBackupCheck")
        if len(first) != FLASH_SIZE:
            raise RuntimeError("Incomplete flash backup; no writes allowed")
        check_layout(first[0x8000:0x9000], OLD_LAYOUT)
        durable_write(self.directory / "flash-backup.bin", first)
        nvs = first[0x9000:0xE000]
        durable_write(self.directory / "nvs.bin", nvs)
        self.save("backup-verified", backup_verified=True, backup_sha256=digest(first), nvs_sha256=digest(nvs),
                  boot_selection_sha256=digest(first[0xE000:0x10000]))
        self.backup()

    def install(self, device, progress, *, fresh_capture: bool = False) -> None:
        self.status("migrationStepBackupCheck")
        original = self.backup()
        check_persisted_idle(original[0x9000:0xE000])
        slot = source_slot(original)
        if self.report.get("source_version"):
            match = re.search(r"\d+\.\d+(?:\.\d+)?", self.report["source_version"])
            if not match:
                raise ValueError("Source firmware version is unavailable")
            offset = (0x10000, 0x1B0000)[slot]
            if not contains_version(original[offset:offset + 0x1A0000], match.group()):
                raise ValueError("Selected serial device's active image does not match the source version")
        self.save(source_slot=slot)
        if device.identity() != self.report["mac"]:
            raise RuntimeError("Connected device differs from the backup device")
        package = self.work / "package"
        if validate_package(package, self.report["package"]["version"]) != self.report["package"]:
            raise RuntimeError("Staged migration package changed")
        if not fresh_capture:
            self.status("migrationStepPreserved")
            # A resumed session may have an older snapshot of user data.
            for name, (offset, size) in PRESERVED.items():
                actual = device.read(offset, size, self.work / f"{name}-before.bin")
                if actual != original[offset:offset + size]:
                    raise RuntimeError(f"{name} differs from backup; use explicit recovery instead")
        self.save("writing", write_started=True)
        # Fully clear only application regions, including stale old App1/coredump.
        # Padding never reaches NVS or LittleFS, even with 4 KiB sector erasure.
        files = []
        for name, (offset, size) in IMAGES.items():
            payload = (package / name).read_bytes()
            target = self.work / (name + ".write")
            durable_write(target, payload.ljust(size, b"\xff"))
            files.append((offset, target))
        coredump = self.work / "coredump.write"
        durable_write(coredump, b"\xff" * 0x10000)
        files.append((0x340000, coredump))
        progress(35)
        self.status("migrationStepInstall")
        device.write(files)
        self.status("migrationStepPreservedAfter")
        self.save("verifying")
        for name, (offset, size) in PRESERVED.items():
            actual = device.read(offset, size, self.work / f"{name}-after.bin")
            if actual != original[offset:offset + size]:
                raise RuntimeError(f"Flash verification failed: {name} changed; no restart, retain backup for recovery")
        self.report.pop("installed_sha256", None)
        self.save("flash-verified", write_verification="esptool-md5", preserved_verified=True)
        progress(70)

    def restore(self, device, progress) -> None:
        self.status("migrationStepBackupCheck")
        original = self.backup()
        check_persisted_idle(original[0x9000:0xE000])
        if device.identity() != self.report["mac"]:
            raise RuntimeError("Recovery refused: this backup belongs to another device")
        self.save("restoring", write_started=True)
        progress(20)
        self.status("migrationStepRestore")
        device.write([(0, self.directory / "flash-backup.bin")])
        progress(70)
        self.status("migrationStepReadback")
        actual = device.read(0, FLASH_SIZE, self.work / "recovery-readback.bin")
        if actual != original:
            raise RuntimeError("Recovery verification failed; device is not restarted")
        self.save("recovery-verified")

    def verify_installed(self, device) -> None:
        """Recheck installed code before restarting a post-boot continuation."""
        package = self.work / "package"
        if validate_package(package, self.report["package"]["version"]) != self.report["package"]:
            raise RuntimeError("Saved migration package changed")
        self.status("migrationStepReadback")
        current = device.read(0, FLASH_SIZE, self.work / "resume-readback.bin")
        check_layout(current[0x8000:0x9000], NEW_LAYOUT)
        check_persisted_idle(current[0x9000:0xE000])
        if source_slot(current) != 0:
            raise RuntimeError("Unexpected target boot selection; inspect recovery state")
        for name, (offset, size) in IMAGES.items():
            if name == "boot_app0.bin":
                continue  # Firmware can mark OTA0 valid after the first boot.
            expected = (package / name).read_bytes().ljust(size, b"\xff")
            if current[offset:offset + size] != expected:
                raise RuntimeError("Installed code changed; refusing an unverified restart")
