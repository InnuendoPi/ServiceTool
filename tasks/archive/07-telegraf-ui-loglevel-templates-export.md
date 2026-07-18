# Telegraf-UI um Log-Level, eigene Templates und Export ergänzen

**Status:** abgeschlossen

**Ziel:** Die zuvor ergänzten Telegraf-Optionen in der Oberfläche bedienbar
machen.

**Betroffene Dateien:**

- `static/index.html` — neue Felder und Schaltflächen.
- `static/app.js` — Sammeln, Anwenden und Speichern der Felder.

**Akzeptanzkriterien:**

- Auswahl des Telegraf-Log-Levels (quiet/info/debug).
- Feld für ein eigenes Templates-Verzeichnis samt Auswahldialog; ist es gesetzt,
  verwendet Telegraf die dortige Konfiguration.
- Schaltfläche zum Exportieren der eingebauten Templates in ein wählbares
  Verzeichnis.
- Die Felder werden wie die übrigen Telegraf-Einstellungen gesammelt, angewendet
  und gespeichert.

**Ergebnis:**

- Log-Level, eigene Templates und Export sind ohne Handarbeit an der
  Konfiguration nutzbar.

**Prüfstand:**

- Im Telegraf-Reiter Log-Level wählen, Templates-Verzeichnis setzen und Export
  ausführen; Werte werden gespeichert und beim erneuten Laden angezeigt.
