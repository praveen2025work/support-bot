#Requires -Version 5.1
#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Build and (re)install the Chatbot UI (Next.js) and Engine (Node) as NSSM
  Windows services. IIS reverse-proxies HTTPS -> the UI on :3001 (see the
  repo's web.config). This script does NOT configure IIS itself.

.DESCRIPTION
  Automates the manual steps in docs/DEPLOYMENT.md -> "IIS With No Managed Code":
    1. npm ci + build for apps/engine and apps/web
    2. Assemble the Next.js standalone runtime (copy .next/static + public, which
       `next build` does NOT include -- without them the UI loads broken assets)
    3. Create the persistent config/data/training/log folders
    4. Install-or-update the ChatbotEngine and ChatbotUI NSSM services, then start

  Structural env (ports, dirs, ENGINE_URL) is set here. Engine secrets
  (API_BASE_URL, API_TOKEN, ENGINE_API_KEY, USER_INFO_URL, UI_ORIGIN, ...) are
  read from an env file (-EnvFile, default .env.prod) as KEY=VALUE lines and
  applied to the engine service -- so no secrets live in this script.

.EXAMPLE
  # From an elevated PowerShell at the repo root:
  .\scripts\windows\deploy.ps1 -WijmoKey "xxxx" -EnvFile .env.prod

.EXAMPLE
  # Re-deploy after a code change without rebuilding deps from scratch is the
  # same command; use -SkipBuild to restart services against an existing build:
  .\scripts\windows\deploy.ps1 -SkipBuild

.NOTES
  Requires: Node 20 + npm, nssm (https://nssm.cc) on PATH, run as Administrator.
#>
[CmdletBinding()]
param(
  [string]$RepoRoot   = (Resolve-Path "$PSScriptRoot\..\..").Path,
  [string]$NodeExe    = "C:\Program Files\nodejs\node.exe",
  [string]$DataRoot   = "C:\chatbot",
  [int]   $UiPort     = 3001,
  [int]   $EnginePort = 4001,
  [string]$EngineUrl  = "http://localhost:4001",
  [string]$EnvFile    = ".env.prod",
  [string]$WijmoKey   = $env:NEXT_PUBLIC_WIJMO_LICENSE_KEY,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
function Write-Step($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Invoke-Checked($file, $argList, $cwd) {
  Push-Location $cwd
  try {
    & $file @argList
    if ($LASTEXITCODE -ne 0) { throw "$file $($argList -join ' ') failed (exit $LASTEXITCODE)" }
  } finally { Pop-Location }
}

# ---- preflight ------------------------------------------------------------
if (-not (Get-Command nssm -ErrorAction SilentlyContinue)) {
  throw "nssm not found on PATH. Install from https://nssm.cc and add it to PATH."
}
if (-not (Test-Path $NodeExe)) { throw "Node not found at '$NodeExe' (override with -NodeExe)." }

$engineDir  = Join-Path $RepoRoot "apps\engine"
$webDir     = Join-Path $RepoRoot "apps\web"
$standalone = Join-Path $webDir ".next\standalone"

# ---- 1. build -------------------------------------------------------------
if (-not $SkipBuild) {
  Write-Step "Building engine (npm ci + build)"
  Invoke-Checked "npm" @("ci")    $engineDir
  Invoke-Checked "npm" @("run", "build") $engineDir

  Write-Step "Building UI (npm ci + build)"
  Invoke-Checked "npm" @("ci") $webDir
  if ($WijmoKey) { $env:NEXT_PUBLIC_WIJMO_LICENSE_KEY = $WijmoKey }
  else { Write-Warning "NEXT_PUBLIC_WIJMO_LICENSE_KEY not set -- UI will show the Wijmo eval watermark." }
  Invoke-Checked "npm" @("run", "build") $webDir
}

# ---- 2. assemble standalone (static + public are NOT in `next build` output)
Write-Step "Assembling Next.js standalone runtime"
$srcStatic = Join-Path $webDir ".next\static"
$dstStatic = Join-Path $standalone ".next\static"
$srcPublic = Join-Path $webDir "public"
$dstPublic = Join-Path $standalone "public"
if (-not (Test-Path (Join-Path $standalone "server.js"))) {
  throw "Standalone build missing at '$standalone'. Build first (omit -SkipBuild)."
}
New-Item -ItemType Directory -Force -Path (Split-Path $dstStatic) | Out-Null
Copy-Item -Recurse -Force $srcStatic $dstStatic
if (Test-Path $srcPublic) { Copy-Item -Recurse -Force $srcPublic $dstPublic }

# ---- 3. persistent folders ------------------------------------------------
Write-Step "Ensuring data/log folders under $DataRoot"
foreach ($d in @("config", "data", "training", "logs")) {
  New-Item -ItemType Directory -Force -Path (Join-Path $DataRoot $d) | Out-Null
}

# ---- env file -------------------------------------------------------------
function Read-EnvFile($path) {
  $h = [ordered]@{}
  if (Test-Path $path) {
    foreach ($line in Get-Content $path) {
      $t = $line.Trim()
      if ($t -eq "" -or $t.StartsWith("#")) { continue }
      $i = $t.IndexOf("=")
      if ($i -lt 1) { continue }
      $k = $t.Substring(0, $i).Trim()
      $v = $t.Substring($i + 1).Trim().Trim('"').Trim("'")
      $h[$k] = $v
    }
  }
  return $h
}
$envPath = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $RepoRoot $EnvFile }
$fileEnv = Read-EnvFile $envPath
if ($fileEnv.Count -gt 0) { Write-Host "Loaded $($fileEnv.Count) vars from $envPath" }
else { Write-Warning "No env file at '$envPath' -- engine secrets (API_BASE_URL, ENGINE_API_KEY, ...) not set." }

# ---- service install/update helper ----------------------------------------
function Install-NssmService([string]$name, [string]$appDir, [string]$appArgs, [System.Collections.IDictionary]$envMap, [string]$log) {
  if (Get-Service -Name $name -ErrorAction SilentlyContinue) {
    Write-Host "Updating service $name"
    & nssm set $name Application $NodeExe    | Out-Null
    & nssm set $name AppParameters $appArgs  | Out-Null
  } else {
    Write-Host "Installing service $name"
    & nssm install $name $NodeExe $appArgs   | Out-Null
  }
  & nssm set $name AppDirectory $appDir | Out-Null
  $pairs = @($envMap.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" })
  & nssm set $name AppEnvironmentExtra @pairs | Out-Null
  & nssm set $name AppStdout (Join-Path $DataRoot "logs\$log.out.log") | Out-Null
  & nssm set $name AppStderr (Join-Path $DataRoot "logs\$log.err.log") | Out-Null
  & nssm set $name AppExit Default Restart | Out-Null
  & nssm restart $name 2>$null
  if ($LASTEXITCODE -ne 0) { & nssm start $name | Out-Null }
}

# ---- 4. engine service ----------------------------------------------------
Write-Step "Installing/updating ChatbotEngine (:$EnginePort)"
$engineEnv = [ordered]@{
  NODE_ENV     = "production"
  ENGINE_PORT  = "$EnginePort"
  CONFIG_DIR   = (Join-Path $DataRoot "config")
  DATA_DIR     = (Join-Path $DataRoot "data")
  TRAINING_DIR = (Join-Path $DataRoot "training")
}
foreach ($k in $fileEnv.Keys) { $engineEnv[$k] = $fileEnv[$k] }   # .env.prod extends/overrides
Install-NssmService "ChatbotEngine" $engineDir "dist\server.js" $engineEnv "engine"

# ---- 5. UI service --------------------------------------------------------
Write-Step "Installing/updating ChatbotUI (:$UiPort)"
$uiEnv = [ordered]@{
  NODE_ENV   = "production"
  PORT       = "$UiPort"
  HOSTNAME   = "127.0.0.1"
  ENGINE_URL = $EngineUrl
}
Install-NssmService "ChatbotUI" $standalone "server.js" $uiEnv "ui"

# ---- done -----------------------------------------------------------------
Write-Step "Done. Verify:"
Write-Host "  curl http://localhost:$EnginePort/api/health"
Write-Host "  curl http://localhost:$EnginePort/api/health/ready"
Write-Host "  curl http://localhost:$UiPort/api/health"
Write-Host "  then browse the IIS HTTPS URL"
Write-Host "`nLogs: $DataRoot\logs   Services: nssm status ChatbotEngine | ChatbotUI" -ForegroundColor DarkGray
