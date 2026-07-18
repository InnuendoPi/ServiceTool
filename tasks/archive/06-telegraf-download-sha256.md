# Telegraf-Download per SHA256-Prüfsumme absichern

**Status:** abgeschlossen

**Ziel:** Das automatisch heruntergeladene Telegraf-Archiv vor dem Entpacken
gegen eine hinterlegte SHA256-Prüfsumme prüfen.

**Betroffene Dateien:**

- `telegraf.py` — Prüfsummen-Konstanten, Plattformerkennung, Verifikation.

**Akzeptanzkriterien:**

- Für jede unterstützte Plattform ist die offizielle Archiv-Prüfsumme hinterlegt
  (`TELEGRAF_CHECKSUMS`).
- Fail closed: Ohne hinterlegte Prüfsumme für die laufende Plattform wird gar
  nicht geladen; bei abweichender Prüfsumme wird die Datei verworfen und nicht
  entpackt.
- Die Plattformerkennung liegt in `telegraf_platform_key()` und dient gemeinsam
  als Basis für Archivname und Prüfsummen-Abgleich.

**Ergebnis:**

- Downloads werden nur nach erfolgreicher Integritätsprüfung entpackt.

**Prüfstand:**

- Download auslösen; bei manipuliertem Archiv bricht die Verifikation ab.

**Offene Risiken:**

- `TELEGRAF_CHECKSUMS` muss gemeinsam mit `TELEGRAF_VERSION` gepflegt werden —
  eine Versionsanhebung ohne Prüfsummen-Update bricht jeden Download.
