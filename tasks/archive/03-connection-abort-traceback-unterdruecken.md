# Traceback bei Verbindungsabbruch des Browsers unterdrücken

**Status:** abgeschlossen

**Ziel:** Abgebrochene Client-Verbindungen sollen keinen Traceback im Server-Log
mehr erzeugen.

**Betroffene Dateien:**

- `app.py` — beim Schreiben der Antwort werden Verbindungsabbrüche abgefangen.

**Akzeptanzkriterien:**

- `ConnectionAbortedError`, `ConnectionResetError` und `BrokenPipeError` beim
  Antwortschreiben werden abgefangen und nicht als Fehler behandelt.
- Das laufende Status-Polling des Frontends (Tab-Neuladen, Navigation) erzeugt
  keinen `ConnectionAbortedError`-Traceback aus dem socketserver-Worker mehr.

**Ergebnis:**

- Ein getrennter Client gilt nicht mehr als Anwendungsfehler; das Log bleibt
  ruhig (`log_message` ist ohnehin stummgeschaltet).

**Prüfstand:**

- ServiceTool starten, während des Status-Pollings den Tab neu laden; keine
  Tracebacks in der Konsole.
