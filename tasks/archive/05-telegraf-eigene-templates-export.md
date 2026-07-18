# Eigene Telegraf-Templates und Template-Export ermöglichen

**Status:** abgeschlossen

**Ziel:** Die Telegraf-Konfiguration aus Template-Bausteinen mit
`{{platzhalter}}` erzeugen und dem Nutzer eigene Templates sowie deren Export
ermöglichen.

**Betroffene Dateien:**

- `telegraf.py` — Template-basierte Generierung, Rendering, Export.
- `app.py` — neue Endpunkte.

**Akzeptanzkriterien:**

- Eine gemeinsame Template-Quelle bedient Standardgenerierung und Export; die
  erzeugte Standardkonfiguration bleibt byte-für-byte unverändert.
- Feld `templates_dir`: Bei gesetztem Verzeichnis werden dessen `telegraf.conf`
  und `telegraf.d/*.conf` mit Platzhalter-Ersetzung verwendet; Formular-Ziele und
  automatischer CSV-Header entfallen dann.
- Platzhalterwerte werden automatisch TOML-escaped; unbekannte Platzhalter sind
  ein klarer Fehler.
- Export schreibt die eingebauten Templates mit Platzhaltern (ohne
  Klartext-Zugangsdaten) in ein wählbares Verzeichnis; das Ergebnis ist direkt
  wieder als `templates_dir` verwendbar.
- Neue Endpunkte `/api/telegraf/templates/pick` und
  `/api/telegraf/export-templates`.

**Ergebnis:**

- Nutzer können die gesamte Telegraf-Konfiguration selbst kontrollieren.

**Prüfstand:**

- Templates exportieren, als `templates_dir` wieder einsetzen, Telegraf startet
  mit identischer Konfiguration.

**Offene Risiken:**

- Zugangsdaten dürfen nur zur Laufzeit in die geschützte Temp-Konfiguration
  gelangen, nie in exportierte Templates.
