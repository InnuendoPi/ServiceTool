# Entwicklungshelfer: Geräte-Mock und Test-Backends ergänzen

**Status:** abgeschlossen

**Ziel:** Die Telegraf-Integration ohne echten Brautomat und ohne externe
Datenbanken testbar machen.

**Betroffene Dateien:**

- `tools/mock_server.py` — eigenständiger `/telemetry`-Server (reine stdlib).
- `docker-compose.yml` plus Grafana-Provisioning (Dashboards, Datasources).
- `README.md` — Abschnitt „Testing without hardware".

**Akzeptanzkriterien:**

- `mock_server.py` liefert dasselbe JSON wie ein echtes Gerät und entwickelt die
  Werte langsam weiter (Modus- und Rastschritt-Wechsel); als Brautomat-URL
  eintragbar, Adresse über `--addr` einstellbar.
- `docker compose up` startet lokale PostgreSQL, MariaDB, InfluxDB v2 und
  Mosquitto sowie Grafana mit vorkonfigurierten Datenquellen und
  Beispiel-Dashboards.
- Zugangsdaten entsprechen den Vorbelegungen im Telegraf-Formular (jeweils
  „brautomat"); reine Testkonfiguration, nicht für den Produktivbetrieb.

**Ergebnis:**

- Vollständiger Telegraf-Datenfluss ist lokal ohne Hardware prüfbar.

**Prüfstand:**

- Mock-Server starten, Backends per docker-compose hochfahren, Telegraf gegen die
  Testziele laufen lassen, Dashboards in Grafana zeigen Werte.

**Offene Risiken:**

- Test-Zugangsdaten niemals im Produktivbetrieb verwenden.
