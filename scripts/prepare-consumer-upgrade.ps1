param(
    [string]$ProjectRoot = (Get-Location).Path,

    [ValidateSet('ko', 'en')]
    [string]$Lang = 'ko',

    [ValidatePattern('^\d+\.\d+\.\d+$')]
    [string]$TargetVersion,

    [string]$RepoOwner = 'lim8603',
    [string]$RepoName = 'cowork-context-framework',

    [switch]$AsJson,
    [switch]$SkipDownload
)

$ErrorActionPreference = 'Stop'

function Get-ArchiveName {
    switch ($Lang) {
        'ko' { return 'cowork-context-framework-kr.zip' }
        'en' { return 'cowork-context-framework-en.zip' }
    }
}

function Get-ManifestTableField {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ManifestText,
        [Parameter(Mandatory = $true)]
        [string]$FieldName
    )

    $match = [regex]::Match(
        $ManifestText,
        '^\|\s*' + [regex]::Escape($FieldName) + '\s*\|\s*(.+?)\s*\|\s*$',
        [System.Text.RegularExpressions.RegexOptions]::Multiline
    )

    if (-not $match.Success) {
        return $null
    }

    return $match.Groups[1].Value.Trim()
}

function Get-ManifestText {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    if ($text.Length -gt 0 -and [int][char]$text[0] -eq 0xFEFF) {
        $text = $text.Substring(1)
    }

    return $text
}

function Invoke-GitHubJson {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Uri
    )

    $headers = @{
        'Accept' = 'application/vnd.github+json'
        'User-Agent' = 'cowork-context-framework-upgrade-preparer'
    }

    return Invoke-RestMethod -Headers $headers -Uri $Uri
}

function Get-StableReleases {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Owner,
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $uri = "https://api.github.com/repos/$Owner/$Name/releases?per_page=100"
    $releases = @(Invoke-GitHubJson -Uri $uri | ForEach-Object { $_ })

    $stable = foreach ($release in $releases) {
        if ($release.draft -or $release.prerelease) {
            continue
        }

        if ($release.tag_name -notmatch '^v(\d+\.\d+\.\d+)$') {
            continue
        }

        [pscustomobject]@{
            Version     = $Matches[1]
            Tag         = $release.tag_name
            HtmlUrl     = $release.html_url
            PublishedAt = $release.published_at
            Assets      = @($release.assets)
        }
    }

    if (-not $stable) {
        throw "No stable semantic-version releases found in $Owner/$Name."
    }

    return @($stable | Sort-Object { [version]$_.Version })
}

function Resolve-ArchivePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$UpgradeRoot,
        [Parameter(Mandatory = $true)]
        [string]$Version,
        [Parameter(Mandatory = $true)]
        [string]$ArchiveName
    )

    $candidates = @(
        (Join-Path $UpgradeRoot "archives\v$Version\$ArchiveName"),
        (Join-Path $UpgradeRoot "v$Version\$ArchiveName")
    )

    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    return $candidates[0]
}

function Ensure-Archive {
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Release,
        [Parameter(Mandatory = $true)]
        [string]$ArchiveName,
        [Parameter(Mandatory = $true)]
        [string]$ArchivePath,
        [switch]$NoDownload
    )

    if (Test-Path $ArchivePath) {
        return
    }

    if ($NoDownload) {
        throw "Archive not found and downloads are disabled: $ArchivePath"
    }

    $asset = @($Release.Assets | Where-Object { $_.name -eq $ArchiveName } | Select-Object -First 1)
    if (-not $asset) {
        throw "Release v$($Release.Version) does not contain asset $ArchiveName"
    }

    $archiveDir = Split-Path -Parent $ArchivePath
    if (-not (Test-Path $archiveDir)) {
        New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
    }

    $headers = @{
        'Accept' = 'application/octet-stream'
        'User-Agent' = 'cowork-context-framework-upgrade-preparer'
    }

    Invoke-WebRequest -Headers $headers -Uri $asset.browser_download_url -OutFile $ArchivePath
}

function Expand-ArchiveFresh {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ArchivePath,
        [Parameter(Mandatory = $true)]
        [string]$DestinationPath
    )

    if (Test-Path $DestinationPath) {
        Remove-Item -Path $DestinationPath -Recurse -Force
    }

    New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
    Expand-Archive -Path $ArchivePath -DestinationPath $DestinationPath -Force
}

function New-UpgradePlanMarkdown {
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Plan
    )

    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('# Framework Upgrade Plan (Generated)')
    $lines.Add('')
    $lines.Add('> Generated from release manifests. Apply each step in order and use the extracted manifest as the source of truth.')
    $lines.Add('')
    $lines.Add('| Item | Value |')
    $lines.Add('|------|-------|')
    $lines.Add("| Installed Version | $($Plan.InstalledVersion) |")
    $lines.Add("| Target Version | $($Plan.TargetVersion) |")
    $lines.Add("| Mode | $($Plan.Mode) |")
    $lines.Add("| Language | $($Plan.Language) |")
    $lines.Add("| Generated At | $($Plan.GeneratedAt) |")
    $lines.Add("| Upgrade Workspace | $($Plan.UpgradeRoot) |")
    $lines.Add('')

    if ($Plan.Steps.Count -eq 0) {
        $lines.Add('## Result')
        $lines.Add('')
        $lines.Add('- The project is already on the target version. No download or extraction was needed.')
        return ($lines -join "`r`n")
    }

    $lines.Add('## Sequential Upgrade Chain')
    $lines.Add('')
    $lines.Add('| Step | Version | From | Archive | Extracted Manifest |')
    $lines.Add('|------|---------|------|---------|--------------------|')
    foreach ($step in $Plan.Steps) {
        $lines.Add("| $($step.Step) | $($step.Version) | $($step.FromVersion) | ``$($step.ArchivePath)`` | ``$($step.ManifestPath)`` |")
    }
    $lines.Add('')
    $lines.Add('## Next Actions')
    $lines.Add('')
    foreach ($step in $Plan.Steps) {
        $lines.Add("$($step.Step). Review ``$($step.ManifestPath)`` and apply its ADD / REPLACE / MERGE / SKIP table to the project `.cowork/` files.")
    }
    $lines.Add("$($Plan.Steps.Count + 1). After each step, update the project's `.cowork/upgrade_manifest.md` to the applied version before moving to the next manifest.")
    $lines.Add('')
    $lines.Add('## Notes')
    $lines.Add('')
    $lines.Add('- The per-step official `upgrade_manifest.md` is the authority for file actions.')
    $lines.Add('- Keep the downloaded archives until the upgrade is fully verified.')

    return ($lines -join "`r`n")
}

$resolvedProjectRoot = [System.IO.Path]::GetFullPath($ProjectRoot)
$projectManifestPath = Join-Path $resolvedProjectRoot '.cowork\upgrade_manifest.md'
$upgradeRoot = Join-Path $resolvedProjectRoot '.cowork\.upgrade'

if (-not (Test-Path $projectManifestPath)) {
    throw "Project manifest not found: $projectManifestPath"
}

if (-not (Test-Path $upgradeRoot)) {
    New-Item -ItemType Directory -Path $upgradeRoot -Force | Out-Null
}

$projectManifestText = Get-ManifestText -Path $projectManifestPath
$installedVersion = Get-ManifestTableField -ManifestText $projectManifestText -FieldName 'Version'
if (-not $installedVersion) {
    throw "Could not find Version in $projectManifestPath"
}
if ($installedVersion -notmatch '^\d+\.\d+\.\d+$') {
    throw "Installed Version is not a semantic version: $installedVersion"
}

$releases = Get-StableReleases -Owner $RepoOwner -Name $RepoName
$latestRelease = $releases[-1]

if (-not $TargetVersion) {
    $TargetVersion = $latestRelease.Version
}

$targetRelease = @($releases | Where-Object { $_.Version -eq $TargetVersion } | Select-Object -First 1)
if (-not $targetRelease) {
    throw "Target version v$TargetVersion is not available as a stable GitHub release."
}

if ([version]$TargetVersion -lt [version]$installedVersion) {
    throw "Target version must be greater than or equal to the installed version. ($installedVersion -> $TargetVersion)"
}

$chainReleases = @(
    $releases |
        Where-Object {
            $releaseVersion = [version]$_.Version
            $releaseVersion -gt [version]$installedVersion -and $releaseVersion -le [version]$TargetVersion
        }
)

$archiveName = Get-ArchiveName
$steps = New-Object System.Collections.Generic.List[object]
$previousVersion = $installedVersion

foreach ($release in $chainReleases) {
    $archivePath = Resolve-ArchivePath -UpgradeRoot $upgradeRoot -Version $release.Version -ArchiveName $archiveName
    Ensure-Archive -Release $release -ArchiveName $archiveName -ArchivePath $archivePath -NoDownload:$SkipDownload

    $extractPath = Join-Path $upgradeRoot "v$($release.Version)"
    Expand-ArchiveFresh -ArchivePath $archivePath -DestinationPath $extractPath

    $extractedManifestPath = Join-Path $extractPath '.cowork\upgrade_manifest.md'
    if (-not (Test-Path $extractedManifestPath)) {
        throw "Extracted release v$($release.Version) does not contain .cowork/upgrade_manifest.md"
    }

    $manifestText = Get-ManifestText -Path $extractedManifestPath
    $manifestVersion = Get-ManifestTableField -ManifestText $manifestText -FieldName 'Version'
    $fromVersion = Get-ManifestTableField -ManifestText $manifestText -FieldName 'From'

    if ($manifestVersion -ne $release.Version) {
        throw "Release v$($release.Version) manifest Version mismatch: $manifestVersion"
    }
    if (-not $fromVersion) {
        throw "Release v$($release.Version) manifest is missing the From field."
    }
    if ($fromVersion -ne $previousVersion) {
        throw "Upgrade chain is broken at v$($release.Version): expected From=$previousVersion, got $fromVersion"
    }

    $steps.Add([pscustomobject]@{
        Step         = $steps.Count + 1
        Version      = $release.Version
        FromVersion  = $fromVersion
        ArchivePath  = $archivePath
        ExtractPath  = $extractPath
        ManifestPath = $extractedManifestPath
        ReleaseUrl   = $release.HtmlUrl
        PublishedAt  = $release.PublishedAt
    }) | Out-Null

    $previousVersion = $release.Version
}

$mode = if ($steps.Count -eq 0) {
    'up-to-date'
}
elseif ($steps.Count -eq 1) {
    'adjacent'
}
else {
    'skip-version'
}

$plan = [pscustomobject]@{
    ProjectRoot      = $resolvedProjectRoot
    UpgradeRoot      = $upgradeRoot
    Language         = $Lang
    InstalledVersion = $installedVersion
    TargetVersion    = $TargetVersion
    Mode             = $mode
    GeneratedAt      = (Get-Date).ToString('yyyy-MM-dd HH:mm:ss zzz')
    Steps            = $steps.ToArray()
}

$planFile = Join-Path $upgradeRoot "upgrade_plan_v$installedVersion`_to_v$TargetVersion.md"
$planText = New-UpgradePlanMarkdown -Plan $plan
[System.IO.File]::WriteAllText($planFile, $planText + "`r`n", (New-Object System.Text.UTF8Encoding($false)))

if ($AsJson) {
    $plan | Add-Member -NotePropertyName PlanFile -NotePropertyValue $planFile
    $plan | ConvertTo-Json -Depth 6
}
else {
    Write-Host "Prepared consumer upgrade plan: $planFile"
    Write-Host "Mode: $mode"
    if ($steps.Count -eq 0) {
        Write-Host "Installed version already matches the target version."
    }
    else {
        foreach ($step in $steps) {
            Write-Host ("Step {0}: v{1} (From {2})" -f $step.Step, $step.Version, $step.FromVersion)
        }
    }
}
