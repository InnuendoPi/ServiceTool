# Auswahldialog für die Telegraf-Programmdatei ergänzen

**Status:** abgeschlossen

**Ziel:** Den Pfad zur Telegraf-Programmdatei per Datei-Dialog wählbar machen,
statt ihn von Hand einzugeben.

**Betroffene Dateien:**

- `app.py` — `pick_file`-Helfer (`askopenfilename`) und Endpunkt
  `/api/telegraf/binary/pick`.
- `static/index.html`, `static/app.js` — Button und Anbindung.

**Akzeptanzkriterien:**

- Button „Programmdatei wählen…" öffnet einen Datei-Dialog und trägt den
  gewählten Pfad in das Feld für die Telegraf-Programmdatei ein.

**Ergebnis:**

- Die Programmdatei ist wie das bereits vorhandene Templates-Verzeichnis per
  Dialog wählbar.

**Prüfstand:**

- Button auslösen, Datei wählen; der Pfad steht im Feld.
