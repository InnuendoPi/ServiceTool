"""Eigenständiger, minimaler Ersatz für ein echtes Brautomat-Gerät während der
Entwicklung. Beantwortet GET /telemetry mit demselben JSON-Format wie das echte
Gerät und verändert die Werte bei jedem Aufruf ein Stück weiter, damit man
Telegraf bzw. das ServiceTool ohne echte Hardware testen kann.

Die Simulationslogik (wann welcher Modus/Schritt aktiv ist, wie sich
Temperaturen entwickeln) ist bewusst simpel gehalten und nicht als realistisches
Brauprofil gedacht - es geht nur darum, dass sich Werte sichtbar verändern.

Aufruf (reine stdlib, keine Abhängigkeiten):

    python tools/mock_server.py
    python tools/mock_server.py --addr :9090
    python tools/mock_server.py --addr 127.0.0.1:8080

Danach im ServiceTool als Brautomat-URL z.B. http://localhost:8080 eintragen.
"""
from __future__ import annotations

import argparse
import json
import math
import random
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# Rastschritte im Maisch-Modus: (Anzeigename, Zieltemperatur).
MASH_STEPS = [
    ("Einmaischen 50°C", 50.0),
    ("Rast 62°C", 62.0),
    ("Rast 72°C", 72.0),
    ("Abmaischen 78°C", 78.0),
]

MODES = ["idle", "mash", "fermenter", "manual", "autotune"]


def approach(current: float, target: float, rate: float) -> float:
    """Nähert current in kleinen Schritten an target an (einfacher exponentieller
    Regler) und legt etwas Rauschen drauf, damit die Werte nicht 'clean'
    aussehen."""
    nxt = current + (target - current) * rate + (random.random() - 0.5) * 0.3
    return math.floor(nxt * 10000 + 0.5) / 10000


def power_for(current: float, target: float) -> int:
    """Simuliert eine simple Bang-Bang-Regelung: volle Leistung solange current
    spürbar unter target liegt, sonst aus. Ohne Zielwert (target <= 0) ist der
    Aktor aus."""
    if target <= 0:
        return 0
    if current < target - 0.2:
        return 100
    return 0


class Simulator:
    """Hält den simulierten Gerätezustand zwischen Requests."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.tick = 0
        self.mode_idx = 0
        # Aktuelle Temperaturen, entwickeln sich langsam Richtung Zielwert.
        self.m = 20.0
        self.s = 20.0
        self.h = 20.0
        self.f = 20.0

    def next(self) -> dict:
        """Berechnet den nächsten simulierten Messpunkt. Der Modus wechselt alle
        20 Ticks reihum durch MODES; innerhalb von 'mash' wird alle 5 Ticks der
        nächste Rastschritt aktiv."""
        with self._lock:
            self.tick += 1
            if self.tick % 20 == 1:
                self.mode_idx = (self.mode_idx + 1) % len(MODES)
            mode = MODES[self.mode_idx]

            step = -1
            step_name = ""
            mt = st = ht = ft = 0.0

            if mode == "mash":
                idx = int((self.tick // 5) % len(MASH_STEPS))
                step = idx
                step_name, mt = MASH_STEPS[idx]
            elif mode == "fermenter":
                ft = 20.0

            self.m = approach(self.m, mt, 0.08)
            self.s = approach(self.s, st, 0.05)
            self.h = approach(self.h, ht, 0.05)
            self.f = approach(self.f, ft, 0.02)

            return {
                "t": int(time.time()),
                "mode": mode,
                "step": step,
                "stepName": step_name,
                "m": self.m,
                "mt": mt,
                "mp": power_for(self.m, mt),
                "s": self.s,
                "st": st,
                "sp": power_for(self.s, st),
                "h": self.h,
                "ht": ht,
                "hp": power_for(self.h, ht),
                "f": self.f,
                "ft": ft,
            }


def make_handler(sim: Simulator) -> type[BaseHTTPRequestHandler]:
    class TelemetryHandler(BaseHTTPRequestHandler):
        def log_message(self, *args) -> None:  # noqa: A003 - eigene Logs unten
            return

        def do_GET(self) -> None:  # noqa: N802
            if self.path != "/telemetry":
                self.send_error(404, "not found")
                return
            data = sim.next()
            body = json.dumps(data).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            print(
                f"GET /telemetry -> mode={data['mode']} step={data['step']} "
                f"stepName={data['stepName']!r} t={data['t']}"
            )

    return TelemetryHandler


def parse_addr(addr: str) -> tuple[str, int]:
    host, _, port = addr.rpartition(":")
    if not port:
        raise SystemExit(f"Ungültige Adresse {addr!r} - erwartet z.B. :8080 oder 127.0.0.1:8080")
    # Leerer Host (":8080") = alle Schnittstellen.
    return host, int(port)


def main() -> None:
    parser = argparse.ArgumentParser(description="Minimaler /telemetry-Mock für die Brautomat-Entwicklung.")
    parser.add_argument(
        "--addr",
        default=":8080",
        help="Adresse, auf der der Mock-Server lauscht (z.B. :8080 oder 127.0.0.1:8080).",
    )
    args = parser.parse_args()
    host, port = parse_addr(args.addr)

    sim = Simulator()
    server = ThreadingHTTPServer((host, port), make_handler(sim))
    shown = host or "localhost"
    print(f"Mock-Brautomat-Server läuft auf http://{shown}:{port}/telemetry")
    print(f"Im ServiceTool als Brautomat-URL z.B. http://{shown}:{port} eintragen.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nBeende Mock-Server.", file=sys.stderr)
        server.shutdown()


if __name__ == "__main__":
    main()
