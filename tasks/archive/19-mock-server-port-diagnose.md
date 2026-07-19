# Mock-Server: belegten Port erkennen, Dualstack binden, alle Anfragen loggen

**Status:** abgeschlossen

**Ziel:** Der Entwicklungs-Mock (`tools/mock_server.py`) soll bei
`http://localhost:8080/telemetry` zuverlässig antworten und bei Problemen
aussagekräftig loggen, statt scheinbar zu laufen und „404 page not found" zu
liefern.

**Betroffene Dateien:**

- `tools/mock_server.py` — Server-Klasse, Bind-Logik, Request-Logging.

**Ausgangsproblem:**

- Ein fremder Prozess (`polymarket-demo.exe`, Go) belegte Port 8080 dual-stack
  (inkl. IPv6 `::1`). Der Mock-Server band wegen `HTTPServer.allow_reuse_address
  = 1` (SO_REUSEADDR) unter Windows still nebenher nur auf IPv4 (`0.0.0.0`) mit,
  ohne Fehler. `localhost` löst unter Windows bevorzugt zu `::1` auf, sodass die
  Anfragen beim fremden Prozess landeten → dessen „404 page not found". Der
  Mock-Server sah die Anfragen nie und loggte nichts.

**Akzeptanzkriterien:**

- Belegter Port bricht den Start hart ab (`allow_reuse_address = False`) mit
  klarer Meldung und Hinweis auf `--addr`, statt still mitzubinden.
- Bei „alle Schnittstellen" (leerer Host) wird per IPv6-Dualstack gebunden, damit
  `127.0.0.1` und `::1` (und damit `localhost`) den Server erreichen.
- Jede Anfrage wird protokolliert — Erfolg (200), falscher Pfad (404) und
  falsche Methode (405) — jeweils mit Client-Adresse.
- Logs erscheinen sofort (`flush=True`), auch bei umgeleiteter Ausgabe.

**Ergebnis:**

- IPv4- und IPv6-`localhost` liefern 200; falscher Pfad/Methode 404/405, alles
  geloggt; ein zweiter Start auf belegtem Port bricht mit klarer Meldung ab.

**Prüfstand:**

- Server auf freiem Port gestartet; `curl` gegen `127.0.0.1` und `localhost`
  (200), gegen falschen Pfad (404) und per POST (405) — alle Fälle in der
  Konsole protokolliert.
- Zweiter Start auf belegtem Port bricht mit WinError 10048 und
  Handlungshinweis ab (Exit-Code 1).

**Offene Risiken:**

- Auf Systemen mit `socket.has_ipv6 == True`, bei denen ein `::`-Bind aus
  anderem Grund als „Port belegt" scheitert, startet der Server nicht auf IPv4
  zurückfallend, sondern meldet den Fehler — dann hilft ein expliziter Host
  (`--addr 127.0.0.1:8080`). Bewusst so gewählt, um belegte Ports nicht zu
  maskieren.
