# Laufzustand von Telegraf im Reiter deutlich anzeigen

**Status:** abgeschlossen (später ersetzt)

**Ziel:** Neben den Start/Stop-Buttons soll eindeutig sichtbar sein, ob der
Telegraf-Prozess läuft.

**Betroffene Dateien:**

- `static/index.html` — Badge-Element.
- `static/app.js` — Zustand bei jedem Status-Poll aktualisieren.
- `static/styles.css` — Badge-Stile.

**Akzeptanzkriterien:**

- Ein Badge zeigt „läuft" (grün) bzw. „gestoppt" (grau).
- Der Zustand wird bei jedem Status-Poll aktualisiert.
- Der Start-Button ist bei laufendem, der Stop-Button bei gestopptem Prozess
  deaktiviert.

**Ergebnis:**

- Laufzustand ist auf einen Blick erkennbar.

**Prüfstand:**

- Telegraf starten/stoppen; Badge und Button-Zustände wechseln entsprechend.

**Offene Risiken:**

- Das Badge wurde in einer späteren Aufgabe zugunsten rein deaktivierter
  Start/Stop-Buttons wieder entfernt.
