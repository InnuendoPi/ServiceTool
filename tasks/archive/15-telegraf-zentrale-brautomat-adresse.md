# Telegraf nutzt die zentrale Brautomat-Adresse statt eigener Eingabe

**Status:** abgeschlossen

**Ziel:** Die doppelte Pflege der Brautomat-Adresse im Telegraf-Reiter beseitigen.

**Betroffene Dateien:**

- `static/index.html` — separates URL-Feld entfernt, Hinweis ergänzt.
- `static/app.js` — Verwendung des globalen `deviceUrl`-Felds.

**Akzeptanzkriterien:**

- Das separate Brautomat-URL-Feld im Telegraf-Reiter entfällt.
- Telegraf verwendet die oben im Kopfbereich eingestellte Brautomat-Adresse —
  sowohl beim Start als auch bei „Brautomat testen".
- Ein Hinweis im Reiter macht das deutlich.

**Ergebnis:**

- Die Adresse wird nur noch an einer Stelle gepflegt.

**Prüfstand:**

- Adresse im Kopfbereich ändern; Telegraf-Start und „Brautomat testen" nutzen den
  neuen Wert.
