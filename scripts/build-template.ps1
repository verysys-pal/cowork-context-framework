param(
    [ValidateSet('ko', 'en')]
    [string]$Lang = 'ko'
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$frameworkRoot = Join-Path (Join-Path $repoRoot 'frameworks') $Lang
$distRoot = Join-Path $repoRoot 'dist'
$archiveName = switch ($Lang) {
    'ko' { 'cowork-context-framework-kr.zip' }
    'en' { 'cowork-context-framework-en.zip' }
}
$outputPath = Join-Path $distRoot $archiveName

if (-not (Test-Path $frameworkRoot)) {
    throw "Framework root not found: $frameworkRoot"
}

New-Item -ItemType Directory -Path $distRoot -Force | Out-Null
if (Test-Path $outputPath) {
    Remove-Item $outputPath -Force
}

Push-Location $frameworkRoot
try {
    Compress-Archive -Path '.cowork', '.github', 'AGENTS.md', 'CLAUDE.md', 'GEMINI.md' -DestinationPath $outputPath -Force
}
finally {
    Pop-Location
}

Write-Host "Built $outputPath"
