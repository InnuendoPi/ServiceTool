# Telegraf-Programmdatei: Symbol-Buttons und gefundenen Pfad anzeigen

**Status:** abgeschlossen

**Ziel:** Die Auswahl-Buttons kompakter gestalten und den tatsächlich genutzten
Telegraf-Pfad anzeigen.

**Betroffene Dateien:**

- `static/index.html` — Auswahl-Buttons als Symbol hinter die Felder, Anzeige des
  aufgelösten Pfads.
- `static/app.js` — Icons/Tooltips, `refreshTelegrafBinaryPath()`, i18n.
- `static/styles.css` — `.field-note`.
- `telegraf.py` — `describe_telegraf_binary()`, Helfer `telegraf_which_name()`.
- `app.py` — Endpunkt `/api/telegraf/resolve-binary`.

**Akzeptanzkriterien:**

- Die Buttons für Programmdatei und Templates-Verzeichnis sitzen als Symbol-Button
  (mit Hover-Text) direkt hinter dem jeweiligen Eingabefeld.
- Unter dem Programmdatei-Feld erscheint der tatsächlich genutzte Telegraf-Pfad
  (konfiguriert / im PATH / mitgeliefert / gecacht) bzw. der Hinweis auf den
  automatischen Download beim Start.
- `describe_telegraf_binary()` löst den Pfad rein lesend auf, ohne einen Download
  anzustoßen; bereitgestellt über `POST /api/telegraf/resolve-binary`.

**Ergebnis:**

- Kompaktere Bedienung; der genutzte Telegraf-Pfad ist transparent.

**Prüfstand:**

- `describe_telegraf_binary` gegen konfigurierten/leeren/fehlenden Pfad geprüft;
  Anzeige aktualisiert sich bei Feldänderung, Auswahl, Download und Sprachwechsel.
