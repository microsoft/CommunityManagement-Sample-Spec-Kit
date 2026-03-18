#!/usr/bin/env pwsh
# Creates GitHub issues from specs/008-cross-platform-ui/tasks.md
# Usage: .\scripts\create-008-issues.ps1
#   Add -RetryOnly to skip already-created issues
#   Add -DryRun to preview without creating
param(
    [string]$Repo = "microsoft/CommunityManagement-Sample-Spec-Kit",
    [switch]$RetryOnly,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$specDir = "008-cross-platform-ui"
$specLabel = "spec:008-ui-system"
$specTitle = "Cross-Platform Hot-Reloadable UI System"
$repoRoot = Split-Path $PSScriptRoot -Parent
$tasksFile = Join-Path $repoRoot "specs" | Join-Path -ChildPath $specDir | Join-Path -ChildPath "tasks.md"

if (-not (Test-Path $tasksFile)) {
    Write-Error "Tasks file not found: $tasksFile"
    exit 1
}

# Ensure label exists
if (-not $DryRun) {
    Write-Host "Ensuring label '$specLabel' exists..." -ForegroundColor Yellow
    $labelExists = gh label list -R $Repo --search "$specLabel" --json name --jq '.[].name' 2>&1
    if ($labelExists -notcontains $specLabel) {
        try {
            gh api "repos/$Repo/labels" -f name="$specLabel" -f description="Spec 008: $specTitle" -f color="3B82F6" 2>$null
            Write-Host "  Created label '$specLabel'" -ForegroundColor Green
        } catch {
            Write-Warning "Could not create label '$specLabel' - may need admin permissions. Issues will be created without it."
            $specLabel = $null
        }
    } else {
        Write-Host "  Label exists" -ForegroundColor Green
    }
}

# Load existing issues for dedup
$existingTitles = @{}
if ($RetryOnly -or (-not $DryRun)) {
    Write-Host "Loading existing issues..." -ForegroundColor Yellow
    $page = 1
    do {
        $batchJson = gh issue list -R $Repo --state all --limit 100 --json title,number 2>$null
        if (-not $batchJson) { break }
        $batch = $batchJson | ConvertFrom-Json
        if ($batch -and $batch.Count -gt 0) {
            foreach ($item in $batch) {
                $existingTitles[$item.title.Trim()] = [int]$item.number
            }
        }
        $page++
    } while ($batch -and $batch.Count -eq 100)
    $foundMsg = "  Found {0} existing issues" -f $existingTitles.Count
    Write-Host $foundMsg -ForegroundColor Yellow
}

# Parse tasks
Write-Host "`nParsing tasks from $tasksFile..." -ForegroundColor Cyan
$lines = Get-Content $tasksFile
$allTasks = @()
$currentPhase = ""
$currentPhaseNum = ""

foreach ($line in $lines) {
    # Detect phase headers: ## Phase N: ...
    if ($line -match '^## Phase (\d+):?\s*(.+)$') {
        $currentPhaseNum = $Matches[1]
        $currentPhase = $Matches[2].Trim()
        continue
    }

    # Parse task lines: - [ ] T### ...
    if ($line -match '^\s*-\s*\[\s*\]\s*(T\d+)\s*(.+)$') {
        $taskId = $Matches[1]
        $rest = $Matches[2].Trim()

        $isParallel = $false
        $story = ""

        # Check for [P] marker
        if ($rest -match '^\[P\]\s*') {
            $isParallel = $true
            $rest = $rest -replace '^\[P\]\s*', ''
        }

        # Check for [USn] or [USn+USm] marker
        if ($rest -match '^\[US[\d\+]+\]\s*') {
            $story = ($rest -replace '^\[(US[\d\+]+)\].*', '$1')
            $rest = $rest -replace '^\[US[\d\+]+\]\s*', ''
        }

        $description = $rest.Trim()
        $cleanDesc = $description -replace '`', "'"

        # Build labels
        $labels = @()
        if ($specLabel) { $labels += $specLabel }

        # Phase labels
        if ($currentPhase -match 'Setup') { $labels += "phase:setup" }
        elseif ($currentPhase -match 'Foundational') { $labels += "phase:foundational" }
        elseif ($currentPhase -match 'Polish') { $labels += "phase:polish" }

        # Priority: P0 stories (US1-US5) vs P1 stories (US6-US9)
        $p0Stories = @("US1", "US2", "US3", "US4", "US5", "US3+US4")
        $p1Stories = @("US6", "US7", "US8", "US9")
        if ($story -and ($p0Stories -contains $story)) { $labels += "priority:P0" }
        elseif ($story -and ($p1Stories -contains $story)) { $labels += "priority:P1" }
        elseif ($currentPhaseNum -le 2) { $labels += "priority:P0" }
        elseif ($currentPhaseNum -ge 11) { $labels += "priority:P1" }

        if ($isParallel) { $labels += "parallelizable" }

        # Title
        $shortDesc = $cleanDesc
        if ($shortDesc.Length -gt 200) { $shortDesc = $shortDesc.Substring(0, 197) + "..." }
        $issueTitle = "[008] $taskId - $shortDesc"

        $allTasks += @{
            Title       = $issueTitle
            Description = $description
            Labels      = $labels
            TaskId      = $taskId
            Phase       = $currentPhaseNum
            PhaseName   = $currentPhase
            Story       = $story
            IsParallel  = $isParallel
        }
    }
}

Write-Host "Found $($allTasks.Count) tasks" -ForegroundColor Green

if ($DryRun) {
    Write-Host "=== DRY RUN - Preview ===" -ForegroundColor Magenta
    foreach ($task in $allTasks) {
        $lblStr = ($task.Labels -join ", ")
        $msg = "  {0} - Phase {1} - {2}" -f $task.TaskId, $task.Phase, $lblStr
        Write-Host $msg
        Write-Host ("    " + $task.Title) -ForegroundColor Gray
    }
    $totalMsg = "`nTotal: {0} issues would be created" -f $allTasks.Count
    Write-Host $totalMsg -ForegroundColor Magenta
    exit 0
}

# Create issues
$issueMap = @{}
$created = 0
$skipped = 0
$failed = 0

foreach ($task in $allTasks) {
    $count = $created + $skipped + $failed + 1
    $pct = [math]::Round(($count / $allTasks.Count) * 100)

    # Skip if exists
    if ($existingTitles.ContainsKey($task.Title)) {
        $issueMap[$task.TaskId] = $existingTitles[$task.Title]
        $skipped++
        if ($RetryOnly) { continue }
        $skipMsg = "[{0}/{1}] ({2}%) {3} - skipped (exists #{4})" -f $count, $allTasks.Count, $pct, $task.TaskId, $existingTitles[$task.Title]
        Write-Host $skipMsg -ForegroundColor DarkGray
        continue
    }

    $progressMsg = "[{0}/{1}] ({2}%) {3} - " -f $count, $allTasks.Count, $pct, $task.TaskId
    Write-Host $progressMsg -NoNewline

    # Body
    $storyLine = if ($task.Story) { "**Story**: $($task.Story)" } else { "" }
    $parallelLine = if ($task.IsParallel) { "**Parallelizable**: Yes" } else { "" }

    $bodyContent = @"
## Task $($task.TaskId) - $specTitle

**Spec**: $specDir
**Phase**: $($task.Phase) - $($task.PhaseName)
$storyLine
$parallelLine

### Description

$($task.Description)

### Acceptance Criteria

- [ ] Implementation matches the task description
- [ ] Tests pass (if applicable)
- [ ] No constitution principle violations

### References

- [tasks.md](specs/$specDir/tasks.md)
- [plan.md](specs/$specDir/plan.md)
- [spec.md](specs/$specDir/spec.md)
"@

    $bodyFile = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($bodyFile, $bodyContent, [System.Text.Encoding]::UTF8)

    $ghArgs = @("issue", "create", "-R", $Repo, "--title", $task.Title, "--body-file", $bodyFile)
    foreach ($lbl in $task.Labels) {
        $ghArgs += "--label"
        $ghArgs += $lbl
    }

    try {
        $result = & gh @ghArgs 2>&1
        $resultStr = $result | Out-String
        if ($resultStr -match 'issues/(\d+)') {
            $issueNum = [int]$Matches[1]
            Write-Host "ok #$issueNum" -ForegroundColor Green
            $issueMap[$task.TaskId] = $issueNum
            $created++
        } else {
            Write-Host "unexpected: $resultStr" -ForegroundColor Red
            $failed++
        }
    } catch {
        Write-Host "FAILED: $_" -ForegroundColor Red
        $failed++
    } finally {
        Remove-Item $bodyFile -ErrorAction SilentlyContinue
    }

    # Rate limit: brief pause every 10 issues
    if ($created % 10 -eq 0 -and $created -gt 0) {
        Start-Sleep -Milliseconds 500
    }
}

Write-Host "`n=== Results ===" -ForegroundColor Cyan
Write-Host "  Created: $created" -ForegroundColor Green
Write-Host "  Skipped: $skipped" -ForegroundColor Yellow
Write-Host "  Failed:  $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Gray" })
Write-Host "  Total:   $($allTasks.Count)" -ForegroundColor White

# Save issue mapping
$mappingFile = "issue-mapping-008.json"
$issueMap | ConvertTo-Json -Depth 3 | Set-Content $mappingFile -Encoding UTF8
Write-Host "`nIssue mapping saved to $mappingFile" -ForegroundColor Green
