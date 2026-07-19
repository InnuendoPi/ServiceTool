# Telegraf-Reiter: einklappbare Panels, Warnhinweise und Steuer-Panel

**Status:** abgeschlossen

**Ziel:** Den Telegraf-Reiter übersichtlicher gestalten und den Nutzer auf
fehlende Konfiguration hinweisen.

**Betroffene Dateien:**

- `static/index.html` — Panels als `<details>`-Karten, Warn-Badges in den
  Handles, eigenes Steuer-Panel über dem Ausgabefenster, dedizierte
  Download-Statuszeile.
- `static/app.js` — Warn-Badge-Logik, clientseitiger Meldungspuffer fürs
  Ausgabefenster, Download behält eigenen Spinner/Fortschritt.
- `static/styles.css` — Stile für einklappbare Karten (`.collapsible-*`) und
  Warn-Pille (`.summary-warning`).

**Umsetzung:**

- Die Panels „Telegraf konfigurieren“ und „Ziele konfigurieren“ sind als
  einklappbare `<details>`-Karten umgesetzt und starten beide zugeklappt.
- Die Checkbox „Zugangsdaten in der ServiceTool-Konfiguration speichern“ liegt
  jetzt im Panel „Ziele konfigurieren“.
- Die Buttons „Brautomat testen“, „Start“, „Stop“ und „Konfiguration
  speichern“ stehen in einem eigenen Panel über dem Ausgabefenster, zusammen
  mit einer Anzeige des Telegraf-Betriebszustands (`telegrafRunState`).
- Die Handles der einklappbaren Panels zeigen Warnhinweise: „Telegraf nicht
  gefunden“ (`telegrafConfigWarning`), solange keine Programmdatei verfügbar
  ist, und „Keine Ziele konfiguriert“ (`telegrafTargetsWarning`), solange kein
  Ausgabeziel aktiviert ist.
- Die bisherigen Statuszeilen-Meldungen des Steuer-Panels
  (`telegrafInlineStatus`) werden jetzt clientseitig ins Ausgabefenster
  (`telegrafLog`) geschrieben; im Steuer-Panel verbleibt nur der Zustands-Badge.
- Ausnahme: Der Telegraf-Download behält Spinner und Fortschrittsanzeige im
  Panel „Telegraf konfigurieren“ (`telegrafDownloadSpinner` /
  `telegrafDownloadStatus`), nicht im Ausgabefenster.

**Prüfstand:**

- ServiceTool gestartet, Seite lädt mit den neuen Elementen; `/api/telegraf/status`
  und `/api/telegraf/resolve-binary` antworten erwartungsgemäß.
- `node --check static/app.js` fehlerfrei.
