# UnicodeDecodeError im PowerShell-Serial-Fallback beheben

**Status:** abgeschlossen

**Ziel:** Die serielle Portsuche über den PowerShell-Fallback darf nicht mehr
an nicht-ASCII-Zeichen in Gerätenamen abstürzen.

**Betroffene Dateien:**

- `app.py` — `run_powershell_json()` liest die Ausgabe jetzt als Rohbytes und
  dekodiert robust.

**Akzeptanzkriterien:**

- Fehlt `pyserial` und übernimmt der PowerShell-Fallback die Port-Aufzählung,
  bringt ein Gerätename mit Nicht-ASCII-Zeichen (z. B. „ü" → OEM-Byte 0x81) den
  Lese-Thread nicht mehr mit `UnicodeDecodeError` zum Absturz.
- Dekodierreihenfolge: UTF-8 (PowerShell 7) → OEM-Codepage (Windows PowerShell
  5.1, umgeleitet = cp850) → verlustbehaftete Notfalldekodierung.

**Ergebnis:**

- Ein einzelnes krummes Byte bricht die Geräteerkennung nicht mehr ab.

**Prüfstand:**

- Ohne `pyserial` auf deutschem Windows die Portsuche ausführen; ein Port mit
  Umlaut im Namen wird ohne Traceback aufgelistet.

**Offene Risiken:**

- Analoge Stellen in den übrigen Serial-Operationen sind hier noch nicht
  erfasst (siehe Folgeaufgabe „Serielle PowerShell-Ausgabe robust dekodieren").
