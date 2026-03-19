param(
    [string]$Repo = "MikeWedderburn-Clarke/CommunityManagement-Sample-Spec-Kit"
)

$env:Path += ";$env:LOCALAPPDATA\gh-cli\bin"

Write-Host "Fetching all spec:004-permissions issues..."
$issues004 = gh issue list -R $Repo --state all --label "spec:004-permissions" --limit 200 --json number,title 2>&1 | ConvertFrom-Json
Write-Host "Found $($issues004.Count) issues"

# Group by task ID
$taskIds = @{}
foreach ($i in $issues004) {
    if ($i.title -match '\[004\]\s*(T\d+)') {
        $tid = $Matches[1]
        if (-not $taskIds[$tid]) { $taskIds[$tid] = @() }
        $taskIds[$tid] += $i
    }
}

# Find duplicates and close the older (lower-numbered) one
$toClose = @()
foreach ($entry in $taskIds.GetEnumerator()) {
    if ($entry.Value.Count -gt 1) {
        $sorted = $entry.Value | Sort-Object number
        # Keep the highest-numbered issue (latest/correct), close all others
        for ($j = 0; $j -lt $sorted.Count - 1; $j++) {
            $toClose += $sorted[$j]
        }
    }
}

Write-Host "Found $($toClose.Count) duplicate issues to close"

$closed = 0
$failed = 0
foreach ($iss in ($toClose | Sort-Object number)) {
    $result = gh issue close $iss.number -R $Repo -c "Duplicate — closing in favor of the correctly-formatted issue." 2>&1
    if ($LASTEXITCODE -eq 0) {
        $closed++
        Write-Host "[$closed/$($toClose.Count)] Closed #$($iss.number)"
    } else {
        $failed++
        Write-Host "[$($closed + $failed)/$($toClose.Count)] FAILED #$($iss.number): $result"
    }
}

Write-Host ""
Write-Host "=== Done ==="
Write-Host "Closed: $closed | Failed: $failed"
