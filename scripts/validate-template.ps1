param(
    [ValidateSet('ko', 'en')]
    [string]$Lang = 'ko'
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$frameworkRoot = Join-Path $repoRoot "frameworks\$Lang"

if (-not (Test-Path $frameworkRoot)) {
    throw "Missing framework root: $frameworkRoot"
}

$requiredFiles = @(
    'AGENTS.md',
    'CLAUDE.md',
    'GEMINI.md',
    '.github/copilot-instructions.md',
    '.cowork/cowork.md',
    '.cowork/README.md',
    '.cowork/upgrade_manifest.md',
    '.cowork/01_cowork_protocol/session_protocol.md',
    '.cowork/02_project_definition/intent_registry.md',
    '.cowork/04_implementation/milestone_registry.md',
    '.cowork/06_evolution/project_state.md',
    '.cowork/07_delivery/export_spec.md'
)

$missing = @()
foreach ($relativePath in $requiredFiles) {
    $fullPath = Join-Path $frameworkRoot $relativePath
    if (-not (Test-Path $fullPath)) {
        $missing += $relativePath
    }
}

if ($missing.Count -gt 0) {
    Write-Host "[$Lang] framework validation FAILED:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - Missing: $_" -ForegroundColor Yellow }
    exit 1
}

Write-Host "[$Lang] framework validation passed."
