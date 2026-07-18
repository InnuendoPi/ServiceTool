# Serielle PowerShell-Ausgabe robust dekodieren

**Status:** abgeschlossen

**Ziel:** Analog zur Portsuche dürfen auch die übrigen PowerShell-gestützten
Serial-Operationen nicht mehr an einem nicht darstellbaren Byte abstürzen.

**Betroffene Dateien:**

- `app.py` — vier Serial-Aufrufe (Live-Monitor, Firmware-Banner,
  Serial-Kommando, Beobachter).

**Akzeptanzkriterien:**

- Die vier Aufrufe lasen die Geräteausgabe bisher mit `text=True` (Locale, auf
  deutschem Windows cp1252) und stürzten bei einem nicht in cp1252 darstellbaren
  Byte (z. B. 0x81) mit `UnicodeDecodeError` ab.
- Sie dekodieren die Ausgabe jetzt als UTF-8 mit `errors="replace"`.

**Ergebnis:**

- Ein ungewöhnliches Byte bricht die Lesung nicht mehr ab — etwa beim Auslesen
  des Firmware-Banners direkt nach dem Start.

**Prüfstand:**

- Serial-Monitor auf deutschem Windows ohne `pyserial` starten; Ausgabe mit
  Sonderzeichen läuft ohne Traceback weiter.
