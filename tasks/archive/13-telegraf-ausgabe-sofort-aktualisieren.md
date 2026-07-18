# Telegraf-Ausgabe sofort und laufend aktualisieren

**Status:** abgeschlossen

**Ziel:** Die Telegraf-Ausgabe im Reiter soll ohne spürbare Verzögerung
erscheinen.

**Betroffene Dateien:**

- `static/app.js` — Status-Polling und Sofortabfragen.

**Akzeptanzkriterien:**

- Die Ausgabe wird per Sekunden-Polling laufend aktualisiert, solange Telegraf
  läuft.
- Der Status wird zusätzlich sofort abgefragt: beim Öffnen des Telegraf-Reiters
  sowie kurz nach Start und Stop.

**Ergebnis:**

- Insbesondere die Startausgabe von Telegraf erscheint unmittelbar statt erst
  beim nächsten Poll-Intervall.

**Prüfstand:**

- Telegraf starten; die ersten Ausgabezeilen erscheinen sofort im Reiter.
