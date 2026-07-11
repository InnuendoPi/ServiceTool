Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir

try {
    & ".\build_servicetool.cmd"
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    $artifactDir = Join-Path $scriptDir "artifact"
    $packageDir = Join-Path $artifactDir "package"
    $esptoolPackageDir = Join-Path $packageDir "esptool"
    $zipPath = Join-Path $scriptDir "Brautomat32ServiceTool-win.zip"
    $exePath = Join-Path $scriptDir "dist\Brautomat32ServiceTool.exe"
    $readmePath = Join-Path $scriptDir "README.md"
    $versionPath = Join-Path $scriptDir "version.json"

    if (-not (Test-Path $exePath)) {
        throw "Missing built executable: $exePath"
    }
    if (-not (Test-Path $readmePath)) {
        throw "Missing README: $readmePath"
    }
    if (-not (Test-Path $versionPath)) {
        throw "Missing version manifest: $versionPath"
    }

    Remove-Item -Recurse -Force $artifactDir -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path $esptoolPackageDir | Out-Null

    Copy-Item $exePath (Join-Path $packageDir "Brautomat32ServiceTool.exe")
    Copy-Item $readmePath (Join-Path $packageDir "README.md")

    $localEsptool = Join-Path $scriptDir "esptool\esptool.exe"
    if (Test-Path $localEsptool) {
        Copy-Item $localEsptool (Join-Path $esptoolPackageDir "esptool.exe")
    } else {
        $esptoolZip = Join-Path $artifactDir "esptool.zip"
        $esptoolUrl = "https://github.com/espressif/esptool/releases/download/v5.3.1/esptool-v5.3.1-windows-amd64.zip"
        Invoke-WebRequest -Uri $esptoolUrl -OutFile $esptoolZip
        Expand-Archive -LiteralPath $esptoolZip -DestinationPath $artifactDir -Force
        Copy-Item (Join-Path $artifactDir "esptool-windows-amd64\esptool.exe") (Join-Path $esptoolPackageDir "esptool.exe")
    }

    Remove-Item -Force $zipPath -ErrorAction SilentlyContinue
    Compress-Archive -Path (Join-Path $packageDir "*") -DestinationPath $zipPath -Force

    $sha = (Get-FileHash $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $manifest = Get-Content -Raw $versionPath | ConvertFrom-Json
    $manifest.released_at = Get-Date -Format "yyyy-MM-dd"
    $manifest.windows.sha256 = $sha
    $manifestJson = ($manifest | ConvertTo-Json -Depth 20) + [Environment]::NewLine
    [System.IO.File]::WriteAllText($versionPath, $manifestJson, [System.Text.UTF8Encoding]::new($false))

    Write-Host "Windows release package created:"
    Write-Host "  $zipPath"
    Write-Host "  SHA256: $sha"
} finally {
    Pop-Location
}
