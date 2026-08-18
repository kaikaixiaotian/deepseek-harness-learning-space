# install.ps1 — one-shot installer for dsh-learning-space (Windows PowerShell)
#
# Usage (from a clone of this repository):
#   powershell -ExecutionPolicy Bypass -File install.ps1
#
# Or let it clone for you:
#   powershell -ExecutionPolicy Bypass -File install.ps1 -RepoUrl https://github.com/<OWNER>/dsh-learning-space
#
# What it does (all steps idempotent):
#   1) preflight: git / pnpm / dsh CLI on PATH
#   2) locate the repo: the script's own checkout when run from a clone,
#      otherwise clone -RepoUrl (default location $USERPROFILE\dsh-learning-space)
#   3) preset  -> $DSH_HOME\.agent-presets\learning   (official user-preset root)
#   4) build the two npm subpackages (pnpm install + pnpm bundle, self-contained)
#   5) register them through the OFFICIAL mechanism:
#        dsh plugin --profile web add <abs path>   (auto-appends to dsh.profile.bundles)
#   6) allowBuilds entries in the profile's pnpm-workspace.yaml (prepares the
#      no-clone `dsh plugin add github:...` upgrade path; harmless otherwise)
#   7) clean up leftovers of the legacy junction-based installer, if any
# Then restart dsh web (plugin-set changes take effect on restart).

param(
  [string]$Profile = 'web',
  [string]$RepoUrl = '',
  [string]$CloneDir = ''
)

$ErrorActionPreference = 'Stop'

function Fail($message) {
  Write-Host "[install] ERROR: $message" -ForegroundColor Red
  exit 1
}

function Step($message) { Write-Host "[install] $message" -ForegroundColor Green }
function Skip($message) { Write-Host "[install] $message" -ForegroundColor Yellow }

# 1) preflight ---------------------------------------------------------------

foreach ($tool in @('git', 'pnpm', 'dsh')) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
    Fail "$tool is required on PATH (install it, then re-run)"
  }
}

$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$profileDir = Join-Path $dshHome "profiles\$Profile"

# 2) locate the repository ---------------------------------------------------

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not (Test-Path (Join-Path $root '.git'))) {
  if ($RepoUrl -eq '') {
    Fail "run this script from inside a git clone, or pass -RepoUrl https://github.com/<OWNER>/dsh-learning-space"
  }
  if ($CloneDir -eq '') { $CloneDir = Join-Path $env:USERPROFILE 'dsh-learning-space' }
  if (Test-Path (Join-Path $CloneDir '.git')) {
    Step "updating existing clone at $CloneDir"
    git -C $CloneDir pull --ff-only
    if ($LASTEXITCODE -ne 0) { Fail 'git pull failed (commit or stash local changes, then re-run)' }
  } else {
    Step "cloning $RepoUrl -> $CloneDir"
    git clone $RepoUrl $CloneDir
    if ($LASTEXITCODE -ne 0) { Fail 'git clone failed' }
  }
  $root = $CloneDir
} elseif ((git -C $root rev-parse --is-inside-work-tree 2>$null) -eq 'true') {
  Step "using this checkout: $root"
}

# 3) preset -> official user-preset root --------------------------------------

$presetDest = Join-Path $dshHome '.agent-presets\learning'
New-Item -ItemType Directory -Force -Path $presetDest | Out-Null
Copy-Item (Join-Path $root 'preset\*') $presetDest -Recurse -Force
Step "preset installed -> $presetDest"

# 4) build the two npm subpackages --------------------------------------------

foreach ($pkg in @('dsh-learning', 'dsh-client-ui-learning')) {
  $dir = Join-Path $root "packages\$pkg"
  if (-not (Test-Path (Join-Path $dir 'package.json'))) { Fail "package not found: $dir" }
  Push-Location $dir
  try {
    pnpm install --silent
    if ($LASTEXITCODE -ne 0) { Fail "pnpm install failed for $pkg" }
    pnpm --silent bundle
    if ($LASTEXITCODE -ne 0) { Fail "pnpm bundle failed for $pkg" }
  } finally {
    Pop-Location
  }
  Step "$pkg built (lib/ + types)"
}

# 5) register both packages via the official plugin mechanism ------------------

if (-not (Test-Path $profileDir)) { Fail "dsh profile not found: $profileDir (start dsh with --profile $Profile once, then re-run)" }

foreach ($pkg in @('dsh-learning', 'dsh-client-ui-learning')) {
  $dir = (Resolve-Path (Join-Path $root "packages\$pkg")).Path
  dsh plugin --profile $Profile add $dir 2>&1 | Tee-Object -Variable addOut | Out-Null
  if ($LASTEXITCODE -ne 0) {
    if ($addOut -match 'ERR_PNPM_UNEXPECTED_STORE') {
      Fail "pnpm on PATH (v$(pnpm --version)) uses a different store than this profile was installed with. Fix by: (a) matching pnpm versions, e.g. 'npm i -g pnpm@11', or (b) running 'pnpm config set store-dir <matching-store> --global', then re-run"
    }
    Fail "dsh plugin add failed for $pkg"
  }
  Step "$pkg registered in profile '$Profile' (dsh.profile.bundles)"
}

# 6) allowBuilds for the github: upgrade path ----------------------------------

$workspaceYaml = Join-Path $profileDir 'pnpm-workspace.yaml'
if (Test-Path $workspaceYaml) {
  $text = [System.IO.File]::ReadAllText($workspaceYaml)
  $changed = $false
  if ($text -notmatch '(?m)^\s*allowBuilds:') {
    $text = $text.TrimEnd() + [Environment]::NewLine + 'allowBuilds:' + [Environment]::NewLine +
      '  dsh-learning: true' + [Environment]::NewLine +
      '  dsh-client-ui-learning: true' + [Environment]::NewLine
    $changed = $true
  } else {
    foreach ($pkg in @('dsh-learning', 'dsh-client-ui-learning')) {
      if ($text -notmatch ('(?m)^\s*' + [regex]::Escape($pkg) + ':\s*true')) {
        $text = $text -replace '(?m)^(\s*allowBuilds:\s*)$', ('$1' + [Environment]::NewLine + '  ' + $pkg + ': true')
        $changed = $true
      }
    }
  }
  if ($changed) {
    [System.IO.File]::WriteAllText($workspaceYaml, $text)
    Step 'allowBuilds entries ensured in pnpm-workspace.yaml'
  } else {
    Skip 'allowBuilds already configured'
  }
} else {
  Skip 'no pnpm-workspace.yaml in profile (skipped allowBuilds)'
}

# 7) legacy cleanup (junction-based installer of the previous version) ---------

$nmRoot = Join-Path $dshHome 'profiles\node_modules'
foreach ($pkg in @('dsh-learning', 'dsh-client-ui-learning')) {
  $legacy = Join-Path $nmRoot $pkg
  if (Test-Path $legacy) {
    Remove-Item $legacy -Force -Recurse
    Step "removed legacy junction $legacy"
  }
}

$patch = Join-Path $profileDir 'cordis.patch.yml'
if (Test-Path $patch) {
  $lines = [System.Collections.Generic.List[string]](Get-Content $patch)
  $changed = $false
  $i = 0
  while ($i -lt $lines.Count) {
    if ($lines[$i] -match '^-\s*insert:\s*$') {
      # collect the indented body of this top-level insert entry
      $j = $i + 1
      while ($j -lt $lines.Count -and $lines[$j] -match '^\s') { $j++ }
      $block = ($lines[$i..($j - 1)] -join [Environment]::NewLine)
      if ($block -match 'dsh-learning' -and $block -match 'dsh-client-ui-learning') {
        $lines.RemoveRange($i, $j - $i)
        $changed = $true
        Step 'removed legacy learning rows from the profile cordis.patch.yml'
        continue
      }
    }
    $i++
  }
  if ($changed) { Set-Content $patch $lines -Encoding UTF8 }
}

Write-Host ''
Write-Host '[install] done. RESTART dsh web for the plugin set to load.' -ForegroundColor Green
Write-Host "[install] then start a new session and pick the 学习模式 preset."
