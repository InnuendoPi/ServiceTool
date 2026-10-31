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
    $docsPython = if ($env:SERVICE_TOOL_BUILD_PYTHON) { $env:SERVICE_TOOL_BUILD_PYTHON }
        elseif (Test-Path ".venv/Scripts/python.exe") { ".venv/Scripts/python.exe" }
        else { "python" }
    & $docsPython tools/package_docs.py $packageDir
    if ($LASTEXITCODE -ne 0) { throw "Documentation packaging failed" }
    Copy-Item (Join-Path $scriptDir "docker-compose.yml") (Join-Path $packageDir "docker-compose.yml")
    Copy-Item -Recurse (Join-Path $scriptDir "docker") (Join-Path $packageDir "docker")
    Copy-Item -Recurse (Join-Path $scriptDir "examples") (Join-Path $packageDir "examples")
    New-Item -ItemType Directory -Force -Path (Join-Path $packageDir "tools") | Out-Null
    Copy-Item (Join-Path $scriptDir "tools\mock_server.py") (Join-Path $packageDir "tools\mock_server.py")

    $esptoolVersion = "5.6.0"
    function Test-EsptoolVersion([string]$Path) {
        if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
        try {
            $output = & $Path version 2>&1
            $exitCode = $LASTEXITCODE
            $versionPattern = '(?m)^\s*(?:esptool\s+v?)?' + [regex]::Escape($esptoolVersion) + '\s*$'
            return ($exitCode -eq 0 -and (($output -join "`n") -match $versionPattern))
        } catch {
            return $false
        }
    }
    $localEsptool = Join-Path $scriptDir "esptool\esptool.exe"
    if (Test-EsptoolVersion $localEsptool) {
        Copy-Item $localEsptool (Join-Path $esptoolPackageDir "esptool.exe")
    } else {
        $esptoolZip = Join-Path $artifactDir "esptool.zip"
        $esptoolUrl = "https://github.com/espressif/esptool/releases/download/v$esptoolVersion/esptool-v$esptoolVersion-windows-amd64.zip"
        Invoke-WebRequest -Uri $esptoolUrl -OutFile $esptoolZip
        Expand-Archive -LiteralPath $esptoolZip -DestinationPath $artifactDir -Force
        Copy-Item (Join-Path $artifactDir "esptool-windows-amd64\esptool.exe") (Join-Path $esptoolPackageDir "esptool.exe")
    }

    if (-not (Test-EsptoolVersion (Join-Path $esptoolPackageDir "esptool.exe"))) {
        throw "Packaged esptool must report version $esptoolVersion"
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
