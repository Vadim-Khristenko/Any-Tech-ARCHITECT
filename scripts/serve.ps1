# ─────────────────────────────────────────────────────────────────────────────
# AmneziaWG Architect — Local Server Launcher (Windows PowerShell)
#
# Serves the built site from dist/. Tries, in order:
#   1. bun    → bunx serve
#   2. npx    → npx serve
#   3. python → python -m http.server
#   4. nothing found → offers to install bun
#
#   .\serve.ps1            # port 8080
#   .\serve.ps1 -Port 3000
#
# The build emits a real index.html for every route in both locales, so deep
# links work on a plain static server — no SPA rewrite needed.
# ─────────────────────────────────────────────────────────────────────────────
param(
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[OK]   $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; exit 1 }

# ── Locate dist ─────────────────────────────────────────────────────────────
#
# This script ships in three places — the repo's scripts/, the release
# archive's scripts/, and copied into dist/ itself — so dist is found by
# looking rather than by assuming a fixed depth.
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$DistDir = $null
foreach ($candidate in @(
    (Join-Path $ScriptDir "dist"),
    (Join-Path (Split-Path -Parent $ScriptDir) "dist"),
    $ScriptDir,
    (Join-Path (Get-Location) "dist"),
    (Get-Location).Path
)) {
    if (Test-Path (Join-Path $candidate "index.html")) {
        $DistDir = (Resolve-Path $candidate).Path
        break
    }
}

if (-not $DistDir) {
    Write-Fail "dist/ not found. Build it first:  bun run build"
}

$ServeRoot = Split-Path -Parent $DistDir
$ServeName = Split-Path -Leaf $DistDir

$distSize = "{0:N1} MB" -f (
    (Get-ChildItem $DistDir -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
)
Write-Ok "Serving $DistDir ($distSize)"

Write-Host ""
Write-Host "  ->  http://localhost:$Port" -ForegroundColor Green -NoNewline
Write-Host "        (Русский)" -ForegroundColor DarkGray
Write-Host "  ->  http://localhost:$Port/en" -ForegroundColor Green -NoNewline
Write-Host "     (English)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  No browser? Generate a config from the shell:" -ForegroundColor DarkGray
Write-Host "    bash awg-gen.sh -v 3.0 --help" -ForegroundColor DarkGray
Write-Host ""

Set-Location $ServeRoot

# ── 1. bun ──────────────────────────────────────────────────────────────────
if (Get-Command bun -ErrorAction SilentlyContinue) {
    Write-Ok "bun $(& bun --version 2>$null)"
    & bun x serve $ServeName -l $Port
    exit $LASTEXITCODE
}

# ── 2. npx ──────────────────────────────────────────────────────────────────
if (Get-Command npx -ErrorAction SilentlyContinue) {
    $nodeVer = try { & node --version 2>$null } catch { "node" }
    Write-Ok "npx ($nodeVer)"
    & npx --yes serve $ServeName -l $Port
    exit $LASTEXITCODE
}

# ── 3. python ───────────────────────────────────────────────────────────────
$pythonCmd = $null
foreach ($candidate in @("python3", "python")) {
    $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
    if (-not $cmd) { continue }
    # The Windows Store stub named `python` exits without doing anything, so
    # confirm it is a real Python 3 before committing to it.
    $ver = try { & $candidate --version 2>&1 } catch { "" }
    if ($ver -match "Python 3") { $pythonCmd = $candidate; break }
}

if ($pythonCmd) {
    Write-Ok "$pythonCmd ($(& $pythonCmd --version 2>&1))"
    # http.server has no rewrite rules, so an address that matches no file
    # 404s instead of rendering the styled not-found page. Every real route
    # resolves normally.
    Write-Warn "http.server serves files only — a mistyped URL gives a bare 404"
    & $pythonCmd -m http.server $Port -d $ServeName
    exit $LASTEXITCODE
}

# ── 4. Offer to install bun ─────────────────────────────────────────────────
Write-Warn "No bun, npx or python found."
Write-Host ""
$reply = Read-Host "Install bun now? It downloads from https://bun.sh/install  [y/N]"
if ($reply -notmatch '^[yY]') {
    Write-Fail "Cancelled. Install bun, Node.js or Python and run this again."
}

Invoke-RestMethod https://bun.sh/install.ps1 | Invoke-Expression

$env:PATH = "$env:USERPROFILE\.bun\bin;$env:PATH"

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Fail "bun install failed. See https://bun.sh"
}

Write-Ok "bun installed ($(& bun --version))"
& bun x serve $ServeName -l $Port
exit $LASTEXITCODE
