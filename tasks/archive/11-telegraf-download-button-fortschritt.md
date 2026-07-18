# Telegraf-Download-Button mit Fortschritt ergänzen

**Status:** abgeschlossen

**Ziel:** Die Telegraf-Binary soll auf Wunsch per Button geladen werden können,
statt nur implizit beim ersten Start, mit sichtbarem Fortschritt.

**Betroffene Dateien:**

- `telegraf.py` — `download_telegraf(on_status, on_progress)` mit
  Fortschritts-Callbacks.
- `app.py` — Job `telegraf_download_job` plus Endpunkt `/api/telegraf/download`.
- `static/index.html`, `static/app.js` — Button, Job-Polling, Fortschrittsanzeige.

**Akzeptanzkriterien:**

- Button „Telegraf herunterladen…" startet den Download als Hintergrund-Job.
- Das Frontend pollt den Job und zeigt Phase, Prozent und übertragene Größe in
  der Statuszeile.
- `download_telegraf` streamt in Blöcken, prüft die SHA256-Prüfsumme und entpackt;
  `ensure_telegraf_available()` delegiert an dieselbe Funktion ohne Callbacks
  (unveränderter Auto-Download beim Start).

**Ergebnis:**

- Nutzer können Telegraf gezielt vorab bereitstellen und den Fortschritt sehen.

**Prüfstand:**

- Button auslösen; Fortschrittsanzeige läuft, danach meldet der Reiter
  „Telegraf ist bereit".
