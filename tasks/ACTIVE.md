# Aktive ServiceTool-Aufgaben

## Repository-Ausgliederung

**Status:** abgeschlossen

**Ziel:** Das ServiceTool als eigenständiges Repository für gemeinsame
Entwicklung bereitstellen.

**Ergebnis:**

- Produktquellen, Buildskripte und statische UI-Dateien sind übernommen.
- Release-Binärdateien und lokale Laufzeitdaten sind ausgeschlossen.
- GitHub Actions baut manuell für Windows, Linux und macOS und lädt nur
  Workflow-Artefakte hoch.
- Der Test-Runner bleibt im privaten Firmware-Repository.

**Releasekanal:**

- `version.json` und die Anwendung verwenden das Repository `ServiceTool`.
- Endnutzerpakete werden als GitHub Release Assets veröffentlicht.

## Migration bestehender Installationen

**Status:** externe Folgeaufgabe

**Ziel:** Bereits installierte ServiceTool-Versionen auf den neuen
Releasekanal umleiten.

**Erforderliche externe Aktion:**

- Im bisherigen Brautomat32-Repository einmalig ein höheres ServiceTool-
  Update-Manifest veröffentlichen, das auf einen Release im Repository
  `ServiceTool` verweist.

**Begründung:**

- Bereits veröffentlichte Anwendungen kennen noch die frühere Manifest-URL.
- Ein README-Verweis reicht für deren automatische Update-Prüfung nicht aus.
