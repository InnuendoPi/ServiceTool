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
   them as GitHub Actions artifacts.

1. Download and review the artifacts. To publish a release, run the workflow
   with `Publish release` enabled. It updates `version.json`, commits the
   manifest to `main`, and creates a GitHub Release containing all three ZIP
   packages.

## Release Rules

- `build_servicetool.cmd` builds only `Windows`.
- `build_servicetool_windows_release.ps1` builds `Windows`, creates the ZIP,
  and updates the Windows SHA256 value.
- Reproducible builds for all three platforms are created by GitHub Actions.
- `Linux` and `macOS` are not built locally.
- Release ZIP files are not stored in git history.
- Releases may only be published from `main`.
- The release workflow sets the download URLs and SHA256 values in
  `version.json`.
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
