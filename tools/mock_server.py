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
import socket
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

def log(message: str) -> None:
    """Schreibt eine Logzeile sofort (flush=True). Ohne das bleibt die Ausgabe
    bei umgeleiteter stdout (Datei/Pipe) block-gepuffert und erscheint stark
    verzögert oder - bei hartem Abbruch - gar nicht."""
    print(message, flush=True)


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

        def _client(self) -> str:
            addr = self.client_address[0] if self.client_address else "?"
            return addr

        def do_GET(self) -> None:  # noqa: N802
            if self.path != "/telemetry":
                # Bewusst jede Fehlanfrage loggen: So ist sofort sichtbar, ob und
                # mit welchem Pfad ein Request überhaupt hier ankommt (z.B. bei
                # einem Tippfehler im Pfad oder einem Trailing Slash).
                log(f"{self._client()} GET {self.path!r} -> 404 (erwartet wird /telemetry)")
                self.send_error(404, "not found - erwartet wird GET /telemetry")
                return
            data = sim.next()
            body = json.dumps(data).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            log(
                f"{self._client()} GET /telemetry -> 200 mode={data['mode']} "
                f"step={data['step']} stepName={data['stepName']!r} t={data['t']}"
            )

        def do_POST(self) -> None:  # noqa: N802
            # Nur zur Diagnose: Falscher HTTP-Methodenaufruf soll nicht stumm bleiben.
            log(f"{self._client()} POST {self.path!r} -> 405 (nur GET /telemetry wird unterstützt)")
            self.send_error(405, "nur GET /telemetry wird unterstützt")

    return TelemetryHandler


class MockServer(ThreadingHTTPServer):
    """HTTP-Server für den Mock mit zwei bewussten Abweichungen vom Default:

    1. ``allow_reuse_address = False``: Ist der Port bereits belegt, soll der
       Start hier hart abbrechen statt still nebenher zu binden. Unter Windows
       erlaubt das sonst gesetzte ``SO_REUSEADDR``, dass zwei Prozesse denselben
       Port belegen - Requests landen dann unbemerkt beim anderen Prozess.
    2. IPv6-Dualstack, wenn auf allen Schnittstellen gelauscht wird (leerer
       Host): So erreichen sowohl ``127.0.0.1`` als auch ``::1`` - und damit
       ``localhost``, das unter Windows bevorzugt zu ``::1`` auflöst - den
       Server. Ein reiner IPv4-Bind ließe ``http://localhost:8080`` ins Leere
       laufen.
    """

    allow_reuse_address = False
    daemon_threads = True

    def server_bind(self) -> None:
        if self.address_family == socket.AF_INET6:
            # Dualstack: auch IPv4-Clients (127.0.0.1) auf demselben Socket
            # annehmen. Nicht überall verfügbar - dann bleibt es bei IPv6.
            try:
                self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
            except (AttributeError, OSError):
                pass
        super().server_bind()


def make_server(host: str, port: int, handler: type[BaseHTTPRequestHandler]) -> MockServer:
    """Erzeugt den Server; bindet bei leerem Host per IPv6-Dualstack (siehe
    MockServer), sonst exakt am angegebenen Host.

    Ein Bind-Fehler (typisch: Port bereits belegt) wird bewusst NICHT
    abgefangen, sondern nach oben gereicht - sonst würde ein belegter Port
    stumm auf eine andere Bindung ausweichen und der Server liefe scheinbar,
    ohne die Requests zu bekommen. Wer explizit IPv4 will, gibt einen Host an
    (z.B. --addr 127.0.0.1:8080)."""
    if host == "" and socket.has_ipv6:
        MockServer.address_family = socket.AF_INET6
        return MockServer(("::", port), handler)
    MockServer.address_family = socket.AF_INET
    return MockServer((host, port), handler)


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
    try:
        server = make_server(host, port, make_handler(sim))
    except OSError as err:
        # Häufigster Fall: der Port ist bereits belegt (evtl. ein zuvor
        # gestarteter Mock-Server oder ein fremder Prozess). Klare Ansage statt
        # eines rohen Tracebacks - und Hinweis auf den Ausweg.
        print(
            f"FEHLER: Konnte nicht auf Port {port} lauschen: {err}\n"
            f"Vermutlich belegt bereits ein anderer Prozess diesen Port. "
            f"Beende ihn oder wähle mit --addr einen anderen Port, z.B. "
            f"--addr :9090.",
            file=sys.stderr,
        )
        raise SystemExit(1) from err

    shown = host or "localhost"
    log(f"Mock-Brautomat-Server läuft auf http://{shown}:{port}/telemetry")
    log(f"Im ServiceTool als Brautomat-URL z.B. http://{shown}:{port} eintragen.")
    log("Wartet auf Anfragen (jede Anfrage wird unten protokolliert) ...")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nBeende Mock-Server.", file=sys.stderr, flush=True)
        server.shutdown()


if __name__ == "__main__":
    main()
