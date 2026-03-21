param(
    [switch]$Check
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$replacementChar = [string][char]0xFFFD

function Get-RepoRelativePath {
    param(
        [string]$BasePath,
        [string]$FullPath
    )

    $normalizedBase = $BasePath.TrimEnd('\', '/')
    if ($FullPath.StartsWith($normalizedBase, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $FullPath.Substring($normalizedBase.Length).TrimStart('\', '/')
    }

    return $FullPath
}

$patterns = @(
    @{
        Name = 'replacement-char'
        Description = 'Unicode replacement character found'
        IsMatch = {
            param([string]$Line)
            $Line.Contains($replacementChar)
        }
    },
    @{
        Name = 'section-sign-mojibake'
        Description = 'Possible mojibake where a section marker became corrupted Hangul text'
        IsMatch = {
            param([string]$Line)
            $Line -match '[\uC9E0]\d'
        }
    },
    @{
        Name = 'question-mark-before-hangul'
        Description = 'Possible mojibake where punctuation was replaced before Korean text'
        IsMatch = {
            param([string]$Line)
            $Line -match '\?[\uAC00-\uD7A3]'
        }
    },
    @{
        Name = 'double-question-separator'
        Description = 'Possible mojibake where an arrow or dash separator became double question marks'
        IsMatch = {
            param([string]$Line)
            $Line -match '\s\?\?\s'
        }
    }
)

$files = Get-ChildItem -Path $repoRoot -Recurse -File -Filter *.md |
    Where-Object { $_.FullName -notmatch '\\dist\\' }

$findings = New-Object System.Collections.Generic.List[object]

foreach ($file in $files) {
    $lines = Get-Content -Path $file.FullName -Encoding UTF8
    for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = $lines[$i]
        foreach ($pattern in $patterns) {
            if (& $pattern.IsMatch $line) {
                $relativePath = Get-RepoRelativePath -BasePath $repoRoot -FullPath $file.FullName
                $findings.Add([pscustomobject]@{
                    File        = $relativePath
                    Line        = $i + 1
                    Rule        = $pattern.Name
                    Description = $pattern.Description
                    Text        = $line.Trim()
                }) | Out-Null
            }
        }
    }
}

if ($findings.Count -eq 0) {
    Write-Host 'Markdown audit: no mojibake patterns detected.'
    exit 0
}

foreach ($finding in $findings) {
    Write-Host ("{0}:{1} [{2}] {3}" -f $finding.File, $finding.Line, $finding.Rule, $finding.Description)
    Write-Host ("  {0}" -f $finding.Text)
}

Write-Host ("Markdown audit: detected {0} possible mojibake finding(s)." -f $findings.Count)

if ($Check) {
    exit 1
}
