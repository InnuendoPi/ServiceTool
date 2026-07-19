# README: Nutzungshinweise für die docker-compose-Dienste

**Status:** abgeschlossen

**Ziel:** Im README erklären, wie die per `docker compose` bereitgestellten
Testdienste genutzt werden, inklusive Links zu InfluxDB und Grafana sowie einer
Empfehlung zum Testen des MQTT-Servers.

**Betroffene Dateien:**

- `README.md` — Abschnitt „Testing without hardware“ um die Unterüberschrift
  „Using the docker compose services“ erweitert.

**Umsetzung:**

- Übersichtstabelle mit Adressen/Ports und Zugangsdaten (Grafana, InfluxDB,
  Mosquitto, PostgreSQL, MariaDB).
- Grafana-Link (<http://localhost:3000>) mit Verweis auf den Dashboard-Ordner
  „Brautomat“ und die drei Beispiel-Dashboards *Brautomat (InfluxDB)*,
  *Brautomat (PostgreSQL)*, *Brautomat (MySQL)*.
- InfluxDB-Link (<http://localhost:8086>) mit Hinweis auf Data Explorer,
  Org/Bucket `brautomat` und Measurement `brautomat_telemetry`.
- Empfehlung, den MQTT-Server (Mosquitto, `localhost:1883`, ohne Zugangsdaten)
  mit dem MQTT Explorer (<https://mqtt-explorer.com/>) zu testen; Topic-Default
  `brautomat/telemetry`.

**Prüfstand:**

- Topic-Default (`static/app.js`) und Measurement-Name (`telegraf.py`) gegen die
  Doku abgeglichen.
