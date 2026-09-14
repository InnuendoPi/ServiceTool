# Contributing to ServiceTool

## Release Process

1. Update the version in:
   - [app.py](./app.py)
   - [static/app.js](./static/app.js)
   - [static/index.html](./static/index.html)
   - [version.json](./version.json)

1. Build Windows locally:

```powershell
& .\build_servicetool_windows_release.ps1
```

The build creates:

- [dist/Brautomat32ServiceTool.exe](./dist/Brautomat32ServiceTool.exe)
- [Brautomat32ServiceTool-win.zip](./Brautomat32ServiceTool-win.zip)
- an updated [version.json](./version.json) with the Windows SHA256 value

1. Review and commit the changes deliberately.

1. Run the GitHub Actions workflow manually:
   - [Build workflow](.github/workflows/servicetool-build.yml)

   The workflow builds `Windows`, `Linux`, and `macOS` packages and uploads
   them as GitHub Actions artifacts. Each platform runs the unit tests before
   building; failed tests stop that platform's build.

1. Download and review the artifacts. To publish a release, run the workflow
   with `Publish release` enabled. The workflow creates and verifies the
   GitHub Release containing all three ZIP packages first. Only after the
   release is available does it update `version.json` and commit the manifest
   to `main`.

## Release Rules

- Local Windows builds prefer `.venv/Scripts/python.exe`; create this environment
  with Python 3.12, matching CI, and install `requirements.txt` plus `pyinstaller`.
  `SERVICE_TOOL_BUILD_PYTHON` can select another interpreter explicitly. The build
  rejects missing Tcl/Tk data before packaging and verifies it inside the EXE.

- When preparing a new version before its packages exist, clear the platform
  download URLs and SHA256 values in `version.json`. The release workflow fills
  them from verified assets. Never advertise a new version using old binaries.
- Unit tests include frontend contract tests when Node.js is available. For
  local verification run `node tests/frontend_regressions.js` as well as the
  Python suite; device acceptance remains separate.

- `build_servicetool.cmd` builds only `Windows`.
- `build_servicetool_windows_release.ps1` builds `Windows`, creates the ZIP,
  and updates the Windows SHA256 value.
- Reproducible builds for all three platforms are created by GitHub Actions.
- `Linux` and `macOS` are not built locally.
- Release ZIP files are not stored in git history.
- Releases may only be published from `main`.
- Every build and release job uses the exact commit that started the workflow.
- Publishing stops if `main` changes while the workflow is running.
- Published version tags and release assets are immutable. Increase the
  ServiceTool version instead of replacing an existing release.
- The release workflow sets the download URLs and SHA256 values in
  `version.json`.
- The update manifest is published only after the release tag and all three
  assets have been verified.
- The `release` GitHub Environment must require maintainer approval before the
  `publish-release` job can run.

## Repository Collaboration Settings

Repository settings are managed in GitHub, not in source control. Before
inviting a co-author, configure the following controls for `main`:

- require pull requests before merging
- require at least one approving review

Where GitHub makes the options available, also block force pushes and branch
deletion. These are additional safeguards; a pull request requirement with one
approval is the required baseline for this repository.

Do not enable a blanket "restrict updates" rule for `main` while the current
release workflow writes the release manifest back to `main`. That rule can break
the manual release workflow unless a safe bypass is configured for GitHub
Actions.

Create the GitHub Environment named `release` and configure a repository
maintainer as its required reviewer. This protects the release job even when a
co-author can run normal build workflows.

Invite co-authors with the `Write` role after their exact GitHub username is
known. Do not grant `Maintain` or `Admin` for normal source contributions.

## Local Test Runner Integration

The Test Runner is not part of this repository and remains in the private
Brautomat32 repository. Its tab is only displayed when the complete local
Brautomat32 development environment is available.

Before starting ServiceTool, set `BRAUTOMAT32_SOURCE_ROOT` to the root of the
private Brautomat32 checkout, for example:

```powershell
$env:BRAUTOMAT32_SOURCE_ROOT = "C:\Arduino\git\privBrautomat32"
python app.py
```

ServiceTool requires all of the following before it enables the Test Runner:

- `tasks/test-automation/README.md` and `tasks/test-automation/ACTIVE.md`
- `tools/test-runner/package.json` and `tools/test-runner/src/index.js`
- at least one valid `*-config.json` suite in the Test Runner directory
- an available Node.js runtime

Without these requirements, the tab remains hidden. `?hide_test=1` always
hides it, regardless of the development environment.

## Migration packages

ServiceApp migration uses existing firmware binaries and a mandatory verified
full flash backup. See [MIGRATION.md](MIGRATION.md) for firmware sources,
supported devices and recovery. Outstanding hardware acceptance work is tracked
in [tasks/ACTIVE.md](tasks/ACTIVE.md). Unit tests alone do not qualify a release.
