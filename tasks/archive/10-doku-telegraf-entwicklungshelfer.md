# Dokumentation zu Telegraf-Funktionen und Entwicklungshelfern

**Status:** abgeschlossen

**Ziel:** Die neuen Telegraf-Funktionen und Entwicklungshelfer dokumentieren.

**Betroffene Dateien:**

- `CLAUDE.md` — ausgelagertes `telegraf.py`, vollständig aufbereitete
  Konfiguration, eigene Templates samt Export, geprüfter Download, neue
  Konventionen.
- `CHANGELOG.md` — Abschnitt „Unreleased".
- `README.md` — Repository-Layout um `telegraf.py`, `tools/` und `docker/`
  ergänzt.

**Akzeptanzkriterien:**

- `CLAUDE.md` beschreibt Feld-Umbenennung, `name_override`, CSV-Header,
  MQTT-Flattening und SQL-Typen sowie die Konventionen `CSV_TELEGRAF_COLUMNS`
  (einzige Quelle für Spalten und Header) und `TELEGRAF_CHECKSUMS` gemeinsam mit
  `TELEGRAF_VERSION` pflegen.
- `CHANGELOG.md` listet die neuen Telegraf-Funktionen, eigene Templates,
  geprüften Download, persistente CSV, Mock-Server/docker-compose und den
  Serial-Encoding-Fix.

**Ergebnis:**

- Architektur und Konventionen sind für Mitentwickler nachvollziehbar
  dokumentiert.

**Prüfstand:**

- Sichtprüfung: Beschreibungen decken sich mit dem umgesetzten Verhalten.
