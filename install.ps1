# install.ps1 — dsh-learning-space one-shot installer (Windows)
#
# One command (from any directory):
#   powershell -ExecutionPolicy Bypass -Command "Invoke-WebRequest 'https://github.com/<OWNER>/dsh-learning-space/raw/main/install.ps1' -OutFile install.ps1; .\install.ps1"
#
# It does four things:
#   1. get the source (zip download first — faster and more reliable than
#      git; git clone as fallback; or a local path via -Source)
#   2. install the 学习模式 preset into the official user-preset root
#   3. build the two plugin packages (pnpm install + bundle, self-contained)
#   4. register them through the official mechanism: dsh plugin add ×2
#      (auto-appends to dsh.profile.bundles) + allowBuilds entries
# Everything is idempotent — safe to re-run for upgrades.
#
# Options:
#   -Source   repo URL (default below), or a local path to an existing clone
#   -Version  'latest' (newest GitHub Release), a tag like 'v0.1.0',
#             or a branch like 'main' (default: latest)
#   -DshHome  DSH home (default: %USERPROFILE%\.dsh)
#   -Profile  dsh profile (default: web)
# Then restart dsh web (plugin-set changes take effect on restart).

param(
    [string]$Source = 'https://github.com/<OWNER>/dsh-learning-space',
    [string]$Version = 'latest',
    [string]$DshHome = $env:DSH_HOME,
    [string]$Profile = 'web'
)

$ErrorActionPreference = 'Stop'

# PowerShell 5.1 defaults to the ANSI code page; UTF-8 keeps the Chinese
# status lines intact no matter which console the script runs in.
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

if (-not $DshHome) { $DshHome = Join-Path $env:USERPROFILE '.dsh' }
if (-not (Test-Path $DshHome)) { throw "DSH home not found: $DshHome (override with -DshHome)" }

# Persistent source location: %TEMP% can be wiped on reboot, which would
# break the next upgrade. Everything lives under $DshHome\plugins.
$pluginsDir = Join-Path $DshHome 'plugins'
$cloneDir   = Join-Path $pluginsDir 'dsh-learning-space'
$profileDir = Join-Path $DshHome "profiles\$Profile"

function Step($message)  { Write-Host "[$script:step/$script:stepTotal] $message" -ForegroundColor Cyan }
function NextStep { $script:step++ }
function Info($message) { Write-Host "  $message" -ForegroundColor Gray }
function Warn($message) { Write-Host "  $message" -ForegroundColor Yellow }

$script:stepTotal = 4
$script:step = 1

# ---------- preflight ----------

foreach ($tool in @('git', 'pnpm')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "$tool not found on PATH — install it first (Node.js ships pnpm via 'npm i -g pnpm')"
    }
}

# dsh CLI: PATH first, then the shared profile tree (covers setups where dsh
# was installed through the web app or npx rather than globally).
$dshCommand = Get-Command dsh -ErrorAction SilentlyContinue
$dshBin = $null
if (-not $dshCommand) {
    $candidate = Join-Path $DshHome "profiles\node_modules\@deepseek-ai\dsh\lib\bin.js"
    if (Test-Path $candidate) { $dshBin = $candidate }
}
if (-not $dshCommand -and -not $dshBin) {
    throw 'dsh CLI not found — run "npm i -g @deepseek-ai/dsh" once, then re-run'
}

function Invoke-DshPlugin([string[]]$PluginArgs) {
    if ($dshBin) { & node $dshBin @PluginArgs } else { & dsh @PluginArgs }
    if ($LASTEXITCODE -ne 0) { throw "dsh plugin failed: $($PluginArgs -join ' ')" }
}

# ---------- 1. source ----------

# When run from inside the repository (dev/upgrade flow) without an explicit
# -Source, prefer the checkout we are standing in instead of the default URL.
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$inRepo = (Test-Path (Join-Path $scriptDir '.git')) -or (Test-Path (Join-Path $scriptDir 'packages\dsh-learning\package.json'))
if ($Source -eq 'https://github.com/<OWNER>/dsh-learning-space' -and $inRepo) {
    $Source = $scriptDir
}

Step 'getting source'
NextStep
$isRemote = $Source -match '^(https?://|git@|ssh://|github:)'
if ($isRemote) {
    if ($Source -match '<OWNER>') {
        throw 'install.ps1 里的默认仓库地址还是占位符：把脚本中的 <OWNER> 换成你的 GitHub 用户名，或用 -Source 指定真实地址后重试'
    }
    $repoUrl = $Source.TrimEnd('/').TrimEnd('.git')

    # Resolve the ref: 'latest' -> the newest release tag via the GitHub API;
    # a version-looking string (v1.2.3) is a tag; anything else is a branch.
    $ref = $Version
    $isTag = $ref -match '^v\d+\.\d+'
    if ($ref -eq 'latest' -and $repoUrl -match '^https?://github\.com/([^/]+/[^/]+)') {
        $slug = $Matches[1]
        try {
            $latest = Invoke-RestMethod -Uri "https://api.github.com/repos/$slug/releases/latest" -Headers @{ 'User-Agent' = 'dsh-learning-space-installer' } -TimeoutSec 15
            if ($latest.tag_name) {
                $ref = $latest.tag_name
                $isTag = $true
                Info "最新版本: $ref"
            }
        } catch {
            Warn '查询最新版本失败，回退到 main 分支'
            $ref = 'main'
            $isTag = $false
        }
    }

    # Zip first: plain HTTP is faster and more reliable than the git protocol
    # (the latter often stalls on flaky connections). git is only a fallback.
    $refKind  = if ($isTag) { 'tags' } else { 'heads' }
    $zipUrl   = "$repoUrl/archive/refs/$refKind/$ref.zip"
    $zipFile  = Join-Path $pluginsDir 'dsh-learning-space.zip'
    $extractDir = Join-Path $pluginsDir 'dsh-learning-space-extract'
    New-Item -ItemType Directory -Force -Path $pluginsDir | Out-Null

    $gotSource = $false
    try {
        Info "downloading $zipUrl"
        Invoke-WebRequest $zipUrl -OutFile $zipFile -UseBasicParsing
        if (Test-Path $extractDir) { Remove-Item $extractDir -Recurse -Force }
        Expand-Archive $zipFile -DestinationPath $extractDir -Force
        $inner = Get-ChildItem $extractDir -Directory | Select-Object -First 1
        if (-not $inner) { throw "zip contains no package directory: $zipUrl" }
        if (Test-Path $cloneDir) { Remove-Item $cloneDir -Recurse -Force }
        Move-Item $inner.FullName $cloneDir
        Remove-Item $zipFile -Force
        $gotSource = $true
    } catch {
        Warn 'zip 下载失败，改用 git clone…'
    }

    if (-not $gotSource) {
        if (Test-Path $cloneDir) { Remove-Item $cloneDir -Recurse -Force }
        git clone --depth 1 --branch $ref $repoUrl $cloneDir | Out-Host
        if ($LASTEXITCODE -ne 0) { throw "git clone failed for $repoUrl ($ref)" }
    }
    $src = $cloneDir
} else {
    $src = (Resolve-Path $Source).Path
}
if (-not (Test-Path (Join-Path $src 'packages\dsh-learning\package.json')) -or -not (Test-Path (Join-Path $src 'preset\preset.yml'))) {
    throw "这不是 dsh-learning-space 仓库的根目录: $src"
}

# ---------- 2. preset ----------

Step 'installing the 学习模式 preset'
NextStep
$presetDest = Join-Path $DshHome '.agent-presets\learning'
New-Item -ItemType Directory -Force -Path $presetDest | Out-Null
Copy-Item (Join-Path $src 'preset\*') $presetDest -Recurse -Force
Info "preset -> $presetDest"

# ---------- 3. build ----------

Step 'building the two plugin packages'
NextStep
foreach ($pkg in @('dsh-learning', 'dsh-client-ui-learning')) {
    $dir = Join-Path $src "packages\$pkg"
    if (-not (Test-Path (Join-Path $dir 'package.json'))) { throw "package not found: $dir" }
    Push-Location $dir
    try {
        pnpm install --silent
        if ($LASTEXITCODE -ne 0) { throw "pnpm install failed for $pkg" }
        pnpm --silent bundle
        if ($LASTEXITCODE -ne 0) { throw "pnpm bundle failed for $pkg" }
    } finally {
        Pop-Location
    }
    Info "$pkg built"
}

# ---------- 4. register ----------

Step 'registering with dsh plugin'
NextStep
if (-not (Test-Path $profileDir)) {
    throw "dsh profile not found: $profileDir (start dsh with --profile $Profile once, then re-run)"
}
foreach ($pkg in @('dsh-learning', 'dsh-client-ui-learning')) {
    $dir = (Resolve-Path (Join-Path $src "packages\$pkg")).Path
    $out = Invoke-DshPlugin @('plugin', '--profile', $Profile, 'add', $dir) 2>&1
    if ($out -match 'ERR_PNPM_UNEXPECTED_STORE') {
        throw "pnpm on PATH (v$(& pnpm --version)) uses a different store than this profile was installed with. Fix by matching pnpm versions (e.g. 'npm i -g pnpm@11'), then re-run"
    }
    Info "$pkg registered"
}

# allowBuilds entries for the no-clone `dsh plugin add github:...` path;
# harmless when this script was the install path.
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
        Info 'allowBuilds ensured'
    }
}

# Legacy cleanup: junctions + patch rows left by the pre-refactor installer.
$nmRoot = Join-Path $DshHome 'profiles\node_modules'
foreach ($pkg in @('dsh-learning', 'dsh-client-ui-learning')) {
    $legacy = Join-Path $nmRoot $pkg
    if (Test-Path $legacy) {
        Remove-Item $legacy -Force -Recurse
        Info "removed legacy junction $legacy"
    }
}
$patch = Join-Path $profileDir 'cordis.patch.yml'
if (Test-Path $patch) {
    $lines = [System.Collections.Generic.List[string]](Get-Content $patch)
    $changed = $false
    $i = 0
    while ($i -lt $lines.Count) {
        if ($lines[$i] -match '^-\s*insert:\s*$') {
            $j = $i + 1
            while ($j -lt $lines.Count -and $lines[$j] -match '^\s') { $j++ }
            $block = ($lines[$i..($j - 1)] -join [Environment]::NewLine)
            if ($block -match 'dsh-learning' -and $block -match 'dsh-client-ui-learning') {
                $lines.RemoveRange($i, $j - $i)
                $changed = $true
                Info 'removed legacy rows from the profile cordis.patch.yml'
                continue
            }
        }
        $i++
    }
    if ($changed) { Set-Content $patch $lines -Encoding UTF8 }
}

# Optional: a clone left by the previous installer version at the old default
# location is now superseded by $cloneDir — point it out, don't delete.
$oldClone = Join-Path $env:USERPROFILE 'dsh-learning-space'
if (Test-Path (Join-Path $oldClone '.git')) {
    Warn "发现旧版克隆目录 $oldClone（已被 $cloneDir 取代），确认无用后可手动删除"
}

Write-Host ''
Write-Host '安装完成。重启 dsh web 后新开会话，即可在模式选择器里选择「学习模式」。' -ForegroundColor Green
