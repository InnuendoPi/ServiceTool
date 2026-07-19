# Brautomat example Grafana dashboards (portable)

These are portable copies of the Brautomat example dashboards. Unlike the
dashboards used by the bundled `docker compose` test setup, they do **not**
hardcode a specific datasource. Instead each dashboard declares a datasource
input, so you can import it into any Grafana and point it at your own
datasource — regardless of how that datasource is named.

The dashboards expect the same data structure the ServiceTool's Telegraf
integration produces: a `brautomat_telemetry` measurement / table with the
telemetry fields (`mash_temperature`, `boil_kettle_temperature`,
`hlt_temperature`, the matching `*_target_temperature` / `*_power_percent`
fields, plus `mode` and `stepName`).

| File | Backend | Select on import |
| --- | --- | --- |
| `influxdb-brautomat.json` | InfluxDB v2 (Flux) | your InfluxDB datasource |
| `postgres-brautomat.json` | PostgreSQL | your PostgreSQL datasource |
| `mysql-brautomat.json` | MariaDB / MySQL | your MySQL datasource |

## Import

1. In Grafana open **Dashboards → New → Import**.
2. Upload one of the JSON files (or paste its contents).
3. When prompted, select your own datasource of the matching type.
4. Click **Import**.

The InfluxDB dashboard uses Flux queries; make sure your InfluxDB datasource is
configured for Flux, and that its default bucket contains the
`brautomat_telemetry` measurement.

The PostgreSQL and MySQL dashboards additionally show mode/step changes as
annotations; these require the telemetry to be stored in a `brautomat_telemetry`
table with a `timestamp` column.
