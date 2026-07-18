# Aktivierte Telegraf-Ziele in den Sub-Reitern kennzeichnen

**Status:** abgeschlossen

**Ziel:** Auf einen Blick erkennbar machen, welche Telegraf-Ziele aktiviert sind,
ohne jeden Sub-Reiter zu öffnen.

**Betroffene Dateien:**

- `static/app.js` — Indikator-Logik.
- `static/styles.css` — grüner Punkt.

**Akzeptanzkriterien:**

- Die Sub-Reiter der Ziele (CSV, InfluxDB, PostgreSQL, MySQL, MQTT) zeigen einen
  grünen Punkt, wenn das jeweilige Ziel aktiviert ist.
- Der Indikator wird beim Laden der Konfiguration gesetzt und beim Umschalten der
  „aktivieren"-Checkbox sofort aktualisiert.

**Ergebnis:**

- Aktive Ziele sind ohne Öffnen der Reiter sichtbar.

**Prüfstand:**

- Ziel-Checkbox umschalten; der grüne Punkt am Sub-Reiter erscheint/verschwindet
  sofort.
