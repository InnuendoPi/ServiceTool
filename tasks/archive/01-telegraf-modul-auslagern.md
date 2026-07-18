# Telegraf-Funktionalität nach telegraf.py auslagern

**Status:** abgeschlossen

**Ziel:** Die gesamte Telegraf-Logik aus der überladenen `app.py` in ein
eigenes Modul `telegraf.py` verschieben (erste Scheibe aus
`doc/Refactor-Plan-Telegraf-Split.md`), ohne das Verhalten zu ändern.

**Betroffene Dateien:**

- `telegraf.py` — neues Modul mit `TelegrafSession`, Config-Generierung,
  Binary-Download und den Konstanten `TELEGRAF_VERSION`/`TELEGRAF_REPO_BASE`.
- `app.py` — Telegraf-Code entfernt, öffentliche API per `from telegraf import …`
  am Dateianfang eingebunden.
- `doc/Refactor-Plan-Telegraf-Split.md` — Schritt als umgesetzt markiert.

**Akzeptanzkriterien:**

- Reines Verschieben, keine Logikänderung.
- Generisch genutzte Helfer bleiben in `app.py` (`CACHE_DIR`, `TOOLS_CACHE_DIR`,
  `APP_ROOT`, `normalize_base_url`, `now_iso`, `mark_executable`,
  `download_to_file`, `extract_esptool_archive`).
- Diese Helfer werden aus `telegraf.py` als funktionslokale Importe geholt, um
  Zirkularität und Importreihenfolge-Probleme zu vermeiden.

**Ergebnis:**

- `app.py` um rund 270 Zeilen entlastet, `telegraf.py` mit rund 316 Zeilen neu.
- Import bleibt reihenfolgeunabhängig; ServiceTool startet unverändert.

**Prüfstand:**

- `python -m py_compile app.py telegraf.py`.
- ServiceTool starten, Telegraf-Reiter öffnen, Start/Stop unverändert.

**Offene Risiken:**

- Weitere geplante Scheiben des Refactor-Plans stehen noch aus.
