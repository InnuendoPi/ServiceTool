# Arbeitsanweisung: ServiceTool Build

## Gültiger Ablauf

1. Version anpassen in:
   - [app.py](./app.py)
   - [static/app.js](./static/app.js)
   - [static/index.html](./static/index.html)
   - [version.json](./version.json)

1. Windows lokal bauen:

```powershell
& .\build_servicetool_windows_release.ps1
```

Ergebnis:

- [dist/Brautomat32ServiceTool.exe](./dist/Brautomat32ServiceTool.exe)
- [Brautomat32ServiceTool-win.zip](./Brautomat32ServiceTool-win.zip)
- aktualisierte [version.json](./version.json) mit Windows-SHA256

1. Änderungen prüfen und bewusst committen.

1. GitHub Action manuell starten:
   - [Build-Workflow](.github/workflows/servicetool-build.yml)

   Der Workflow baut `Windows`, `Linux` und `macOS`. Die ZIP-Dateien werden
   als GitHub-Actions-Artefakte bereitgestellt.

1. Artefakte herunterladen, prüfen und anschließend über den vorgesehenen
   Releasekanal veröffentlichen. Für eine Veröffentlichung wird der Workflow
   mit `Release veröffentlichen` aktiviert. Er aktualisiert dann `version.json`,
   committet das Manifest nach `main` und erzeugt das GitHub Release mit den
   drei ZIP-Dateien.

## Festlegungen

- `build_servicetool.cmd` baut nur `Windows`.
- `build_servicetool_windows_release.ps1` baut `Windows`, erstellt das ZIP und
  aktualisiert den Windows-SHA256.
- Reproduzierbare Builds für alle drei Plattformen kommen aus GitHub Actions.
- `Linux` und `macOS` werden nicht lokal gebaut.
- Release-ZIP-Dateien werden nicht in der Git-Historie gespeichert.
- Die Veröffentlichung darf nur von `main` erfolgen.
- Der Release-Workflow setzt Download-URLs und SHA256-Werte in `version.json`.

## Aufrufparameter

- Standard: kein Parameter
- Test Runner ausblenden: `?hide_test=1`
- Test Runner ausblenden und Debug aktivieren: `?hide_test=1&debug=1`
