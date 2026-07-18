# Telegraf-Konfiguration um sprechende Felder und Ziel-Details erweitern

**Status:** abgeschlossen

**Ziel:** Die generierte Telegraf-Konfiguration bereitet die Messwerte
vollständig auf, statt die rohen Gerätefelder nur durchzureichen.

**Betroffene Dateien:**

- `telegraf.py` — Config-Generierung erweitert.

**Akzeptanzkriterien:**

- `processors.rename` benennt die kurzen JSON-Felder (m, mt, mp, s, …) global
  in sprechende Namen um (mash_temperature, mash_target_temperature, …).
- Input setzt `name_override = "brautomat_telemetry"` und `omit_hostname = true`.
- CSV erhält feste Spaltenreihenfolge (`csv_columns`) und einen einmalig
  geschriebenen Header (`ensure_csv_header`); Header und Spaltenliste stammen aus
  einer gemeinsamen Quelle und können nicht auseinanderdriften.
- MQTT flacht die Ausgabe per JSONata (`json_transformation`) zu flachem JSON aus
  fields, tags und timestamp aus.
- Postgres und MySQL/MariaDB erhalten Typmapping (`[outputs.sql.convert]`) und
  legen neue Felder automatisch als Spalten an (`table_update_template`); MySQL
  zusätzlich `ANSI_QUOTES` via `init_sql` und ein `table_exists_template`.
- Neues Feld `log_level` (quiet/info/debug) steuert die Telegraf-Ausgabe.
- Telegraf läuft im stabilen Datenverzeichnis, damit relative CSV-Dateien
  persistieren statt mit dem Tempordner gelöscht zu werden.

**Ergebnis:**

- Alle Ziele erhalten lesbare Spalten/Felder; CSV-Datei bleibt über Neustarts
  erhalten; absolute `.conf`-Pfade bleiben unberührt.

**Prüfstand:**

- Mit dem Geräte-Mock je Ziel prüfen: CSV-Header und Spalten stimmen, SQL-Tabellen
  bekommen sprechende Spalten, MQTT liefert flaches JSON.

**Offene Risiken:**

- `CSV_TELEGRAF_COLUMNS` bleibt einzige Quelle für Spalten und Header — Änderungen
  nur dort vornehmen.
