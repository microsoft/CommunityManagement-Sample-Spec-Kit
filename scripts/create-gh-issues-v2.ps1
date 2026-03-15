#!/usr/bin/env pwsh
# Creates GitHub issues from task files - FIXED version using direct gh calls (no Invoke-Expression)
param(
    [string]$Repo = "MikeWedderburn-Clarke/CommunityManagement-Sample-Spec-Kit",
    [string]$SpecsDir = "specs",
    [switch]$RetryOnly
)

$ErrorActionPreference = "Stop"

# If retrying, load existing issue titles to skip
$existingTitles = @{}
if ($RetryOnly) {
    Write-Host "Loading existing issues to skip duplicates..." -ForegroundColor Yellow
    $page = 1
    do {
        $batch = gh issue list -R $Repo --state all --limit 100 --json title,number --jq '.[] | "\(.number)|\(.title)"' 2>&1
        if ($batch) {
            foreach ($line in ($batch -split "`n")) {
                if ($line -match '^(\d+)\|(.+)$') {
                    $existingTitles[$Matches[2].Trim()] = $Matches[1]
                }
            }
        }
        $page++
    } while ($batch -and ($batch -split "`n").Count -eq 100)
    Write-Host "Found $($existingTitles.Count) existing issues" -ForegroundColor Yellow
}

# Spec metadata
$specs = @(
    @{ Dir = "004-permissions-creator-accounts"; Label = "spec:004-permissions"; Title = "Permissions & Creator Accounts"; Priority = "P0" }
    @{ Dir = "001-event-discovery-rsvp";         Label = "spec:001-events";      Title = "Event Discovery & RSVP";        Priority = "P0" }
    @{ Dir = "002-community-social";             Label = "spec:002-social";       Title = "Community & Social";            Priority = "P1" }
    @{ Dir = "003-recurring-multiday";           Label = "spec:003-recurring";    Title = "Recurring & Multi-Day";         Priority = "P1" }
    @{ Dir = "005-teacher-profiles-reviews";     Label = "spec:005-teachers";     Title = "Teacher Profiles & Reviews";    Priority = "P1" }
)

$allIssues = @()

foreach ($spec in $specs) {
    $tasksFile = Join-Path $SpecsDir $spec.Dir "tasks.md"
    if (-not (Test-Path $tasksFile)) {
        Write-Warning "Tasks file not found: $tasksFile"
        continue
    }
    
    Write-Host "`n=== Processing $($spec.Title) ===" -ForegroundColor Cyan
    $lines = Get-Content $tasksFile
    
    $currentPhase = ""
    $currentPhaseNum = ""
    $currentStory = ""
    
    foreach ($line in $lines) {
        # Detect phase headers
        if ($line -match '^## Phase (\d+):?\s*(.+)$') {
            $currentPhaseNum = $Matches[1]
            $currentPhase = $Matches[2].Trim()
            $currentStory = ""
            continue
        }
        
        # Detect user story sub-headers  
        if ($line -match 'User Story (\d+)|US-(\d+):|US(\d+)') {
            $storyNum = if ($Matches[1]) { $Matches[1] } elseif ($Matches[2]) { $Matches[2] } else { $Matches[3] }
            $currentStory = "US-$storyNum"
        }
        
        # Parse task lines
        if ($line -match '^\s*-\s*\[\s*\]\s*(T\d+)\s*(.+)$') {
            $taskId = $Matches[1]
            $rest = $Matches[2].Trim()
            
            $isParallel = $false
            $story = $currentStory
            
            if ($rest -match '^\[P\]\s*') {
                $isParallel = $true
                $rest = $rest -replace '^\[P\]\s*', ''
            }
            
            if ($rest -match '^\[US-?(\d+)\]\s*') {
                $story = "US-$($Matches[1])"
                $rest = $rest -replace '^\[US-?\d+\]\s*', ''
            }
            
            # Clean description - remove backticks which cause PS issues
            $description = $rest.Trim()
            $cleanDesc = $description -replace '`', "'"
            
            # Determine labels
            $labels = @($spec.Label)
            
            if ($currentPhase -match 'Setup') { $labels += "phase:setup" }
            elseif ($currentPhase -match 'Foundational|Foundation') { $labels += "phase:foundational" }
            elseif ($currentPhase -match 'Polish|Cross-Cutting') { $labels += "phase:polish" }
            
            if ($description -match '\(P0\)' -or $currentPhase -match 'P0|MVP') { $labels += "priority:P0" }
            elseif ($description -match '\(P1\)') { $labels += "priority:P1" }
            elseif ($description -match '\(P2\)') { $labels += "priority:P2" }
            elseif ($spec.Priority -eq "P0") { $labels += "priority:P0" }
            else { $labels += "priority:$($spec.Priority)" }
            
            if ($isParallel) { $labels += "parallelizable" }
            
            # Build issue title (clean)
            $specNum = $spec.Dir.Split('-')[0]
            $shortDesc = $cleanDesc
            if ($shortDesc.Length -gt 200) { $shortDesc = $shortDesc.Substring(0, 197) + "..." }
            $issueTitle = "[$specNum] $taskId - $shortDesc"
            
            $allIssues += @{
                Title = $issueTitle
                Description = $description
                CleanDesc = $cleanDesc
                Labels = $labels
                Spec = $spec.Dir
                SpecTitle = $spec.Title
                TaskId = $taskId
                Phase = $currentPhaseNum
                PhaseName = $currentPhase
                Story = $story
                IsParallel = $isParallel
            }
        }
    }
}

Write-Host "`n=== Found $($allIssues.Count) tasks ===" -ForegroundColor Green

$issueNumbers = @()
$created = 0
$skipped = 0
$failed = 0

foreach ($issue in $allIssues) {
    $count = $created + $skipped + $failed + 1
    $pct = [math]::Round(($count / $allIssues.Count) * 100)
    
    # Skip if already exists (retry mode)
    if ($RetryOnly -and $existingTitles.ContainsKey($issue.Title)) {
        $skipped++
        continue
    }
    
    Write-Host "[$count/$($allIssues.Count)] ($pct%) $($issue.TaskId) - " -NoNewline
    
    # Write body to temp file (avoids all escaping issues)
    $bodyFile = [System.IO.Path]::GetTempFileName()
    
    $storyLine = ""
    if ($issue.Story) { $storyLine = "**Story**: $($issue.Story)" }
    $parallelLine = ""
    if ($issue.IsParallel) { $parallelLine = "**Parallelizable**: Yes" }
    
    $bodyContent = @"
## Task $($issue.TaskId) - $($issue.SpecTitle)

**Spec**: $($issue.Spec)
**Phase**: $($issue.Phase) - $($issue.PhaseName)
$storyLine
$parallelLine

### Description

$($issue.Description)

### Acceptance Criteria

- [ ] Implementation matches the task description
- [ ] Tests pass (if applicable)
- [ ] No constitution principle violations

### References

- tasks.md: specs/$($issue.Spec)/tasks.md
- plan.md: specs/$($issue.Spec)/plan.md
"@
    
    [System.IO.File]::WriteAllText($bodyFile, $bodyContent, [System.Text.Encoding]::UTF8)
    
    # Write title to temp file too (avoids all escaping)
    $titleFile = [System.IO.Path]::GetTempFileName()
    [System.IO.File]::WriteAllText($titleFile, $issue.Title, [System.Text.Encoding]::UTF8)
    
    # Build args array directly - no string interpolation
    $ghArgs = @("issue", "create", "-R", $Repo, "--title", $issue.Title, "--body-file", $bodyFile)
    foreach ($lbl in $issue.Labels) {
        $ghArgs += "--label"
        $ghArgs += $lbl
    }
    
    try {
        $result = & gh @ghArgs 2>&1
        $resultStr = $result | Out-String
        if ($resultStr -match 'issues/(\d+)') {
            $issueNum = $Matches[1]
            Write-Host "ok #$issueNum" -ForegroundColor Green
            $issueNumbers += @{ Number = [int]$issueNum; Spec = $issue.Spec; TaskId = $issue.TaskId; Phase = $issue.Phase }
            $created++
        } else {
            Write-Host "WARN: $resultStr" -ForegroundColor Yellow
            $failed++
        }
    }
    catch {
        Write-Host "FAIL: $_" -ForegroundColor Red
        $failed++
    }
    finally {
        Remove-Item $bodyFile -ErrorAction SilentlyContinue
        Remove-Item $titleFile -ErrorAction SilentlyContinue
    }
    
    # Rate limit protection
    if ($created % 15 -eq 0) { Start-Sleep -Seconds 1 }
}

# Save mapping
$mappingFile = Join-Path $SpecsDir ".." "issue-mapping.json"
$issueNumbers | ConvertTo-Json -Depth 3 | Set-Content $mappingFile -Encoding UTF8

Write-Host "`n=== Results ===" -ForegroundColor Cyan
Write-Host "Created: $created" -ForegroundColor Green
Write-Host "Skipped (already exists): $skipped" -ForegroundColor Yellow
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Mapping saved to $mappingFile"
