# Telegraf-Statusbadge durch deaktivierte Start/Stop-Buttons ersetzen

**Status:** abgeschlossen

**Ziel:** Den Laufzustand von Telegraf nur noch über die Start/Stop-Buttons
kommunizieren statt über ein separates Badge.

**Betroffene Dateien:**

- `static/index.html` — Badge-Element entfernt.
- `static/app.js` — Badge-Logik entfernt, Buttons weiter über `disabled`
  gesteuert.
- `static/styles.css` — `.run-badge`-Stile entfernt, globaler
  `button:disabled`-Stil ergänzt.

**Akzeptanzkriterien:**

- Bei laufendem Telegraf ist der Start-Button gesperrt, sonst der Stop-Button.
- Ein globaler `button:disabled`-Stil (opacity, not-allowed, kein Hover) macht
  den deaktivierten Zustand sichtbar und vereinheitlicht ihn für alle Buttons.

**Ergebnis:**

- Der Zustand ist ohne Badge klar erkennbar; deaktivierte Buttons sind
  app-weit einheitlich gekennzeichnet.

**Prüfstand:**

- Telegraf starten/stoppen; jeweils passender Button ist erkennbar deaktiviert.

**Offene Risiken:**

- Ersetzt die frühere Badge-Aufgabe „Laufzustand von Telegraf im Reiter deutlich
  anzeigen".
