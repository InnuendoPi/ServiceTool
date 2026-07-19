# Portable Grafana-Beispiel-Dashboards zum Verteilen

**Status:** abgeschlossen

**Ziel:** Verteilbare Kopien der Grafana-Beispiel-Dashboards bereitstellen, die
in fremde Grafana-Instanzen importiert werden können, auch wenn dort die
Datasources anders heißen (gleiche Datenstruktur vorausgesetzt).

**Betroffene Dateien:**

- `examples/grafana/influxdb-brautomat.json`, `postgres-brautomat.json`,
  `mysql-brautomat.json` — portable Varianten mit `__inputs` + `${DS_...}`.
- `examples/grafana/README.md` — Importanleitung.
- `build_servicetool_windows_release.ps1` — kopiert `examples/` ins Paket.
- `.github/workflows/servicetool-build.yml` — Linux- und macOS-Job packen
  `examples/` mit ins Archiv.
- `README.md` — Repository-Layout und Grafana-Abschnitt ergänzt.

**Umsetzung:**

- Datasource wird nicht mehr per fester `uid` gebunden, sondern über einen
  `__inputs`-Datasource-Platzhalter (`${DS_INFLUXDB}` / `${DS_POSTGRESQL}` /
  `${DS_MYSQL}`); Grafana fragt die Datasource beim Import ab.
- Die Annotation-Datasource `-- Grafana --` und die Dashboard-eigene `uid`
  bleiben unverändert.
- Die portablen Varianten liegen zusätzlich in allen drei Release-Archiven unter
  `examples/grafana/`.

**Prüfstand:**

- Alle drei portablen JSONs sind valides JSON; sämtliche Backend-Datasource-
  Referenzen zeigen auf den `${DS_...}`-Platzhalter.
- Windows-Packaging simuliert: Archiv enthält `examples/grafana/*`.

**Offene Punkte / Pflege:**

- Die portablen Varianten müssen bei Änderungen an den Provisioning-Dashboards
  (`docker/grafana/provisioning/dashboards/files/`) mitgepflegt werden.
