#!/usr/bin/env pwsh
# Creates GitHub issues from task files and outputs issue numbers for project board
param(
    [string]$Repo = "MikeWedderburn-Clarke/CommunityManagement-Sample-Spec-Kit",
    [string]$SpecsDir = (Join-Path $PSScriptRoot ".." "specs")
)

$ErrorActionPreference = "Stop"

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
    $content = Get-Content $tasksFile -Raw
    $lines = Get-Content $tasksFile
    
    $currentPhase = ""
    $currentPhaseNum = ""
    $currentStory = ""
    
    foreach ($line in $lines) {
        # Detect phase headers
        if ($line -match '^## Phase (\d+):?\s*(.+)$') {
            $currentPhaseNum = $Matches[1]
            $currentPhase = $Matches[2].Trim()
            # Reset story for new phase
            $currentStory = ""
            continue
        }
        
        # Detect user story sub-headers  
        if ($line -match 'User Story (\d+)|US-(\d+):|US(\d+)') {
            $storyNum = if ($Matches[1]) { $Matches[1] } elseif ($Matches[2]) { $Matches[2] } else { $Matches[3] }
            $currentStory = "US-$storyNum"
        }
        
        # Parse task lines: - [ ] T001 [P] [US1] Description
        if ($line -match '^\s*-\s*\[\s*\]\s*(T\d+)\s*(.+)$') {
            $taskId = $Matches[1]
            $rest = $Matches[2].Trim()
            
            $isParallel = $false
            $story = $currentStory
            
            # Extract [P] flag
            if ($rest -match '^\[P\]\s*') {
                $isParallel = $true
                $rest = $rest -replace '^\[P\]\s*', ''
            }
            
            # Extract [US1] or [Story] markers
            if ($rest -match '^\[US-?(\d+)\]\s*') {
                $story = "US-$($Matches[1])"
                $rest = $rest -replace '^\[US-?\d+\]\s*', ''
            }
            
            $description = $rest.Trim()
            
            # Determine labels
            $labels = @($spec.Label)
            
            # Phase label
            if ($currentPhase -match 'Setup') { $labels += "phase:setup" }
            elseif ($currentPhase -match 'Foundational|Foundation') { $labels += "phase:foundational" }
            elseif ($currentPhase -match 'Polish|Cross-Cutting') { $labels += "phase:polish" }
            
            # Priority label - derive from story or spec
            if ($description -match '\(P0\)' -or $currentPhase -match 'P0|MVP') { $labels += "priority:P0" }
            elseif ($description -match '\(P1\)') { $labels += "priority:P1" }
            elseif ($description -match '\(P2\)') { $labels += "priority:P2" }
            elseif ($spec.Priority -eq "P0") { $labels += "priority:P0" }
            else { $labels += "priority:$($spec.Priority)" }
            
            if ($isParallel) { $labels += "parallelizable" }
            
            # Build issue title
            $issueTitle = "[$($spec.Dir.Split('-')[0])] $taskId — $description"
            # Truncate title to 256 chars max
            if ($issueTitle.Length -gt 256) {
                $issueTitle = $issueTitle.Substring(0, 253) + "..."
            }
            
            # Build issue body
            $body = @"
## Task $taskId — $($spec.Title)

**Spec**: ``$($spec.Dir)``
**Phase**: $currentPhaseNum — $currentPhase
$(if ($story) { "**Story**: $story" } else { "" })
$(if ($isParallel) { "**Parallelizable**: Yes — can be worked on alongside other ``[P]`` tasks in this phase" } else { "" })

### Description

$description

### Acceptance Criteria

- [ ] Implementation matches the task description
- [ ] Tests pass (if applicable)
- [ ] No constitution principle violations

### References

- [tasks.md](specs/$($spec.Dir)/tasks.md)
- [plan.md](specs/$($spec.Dir)/plan.md)
- [spec.md](specs/$($spec.Dir)/spec.md)
"@
            
            $labelArgs = ($labels | ForEach-Object { "--label `"$_`"" }) -join " "
            
            $allIssues += @{
                Title = $issueTitle
                Body = $body
                Labels = $labels
                Spec = $spec.Dir
                TaskId = $taskId
                Phase = $currentPhaseNum
                Story = $story
            }
        }
    }
}

Write-Host "`n=== Creating $($allIssues.Count) issues ===" -ForegroundColor Green

$issueNumbers = @()
$count = 0

foreach ($issue in $allIssues) {
    $count++
    $pct = [math]::Round(($count / $allIssues.Count) * 100)
    Write-Host "[$count/$($allIssues.Count)] ($pct%) $($issue.TaskId) — " -NoNewline
    
    # Write body to temp file to avoid escaping issues
    $bodyFile = [System.IO.Path]::GetTempFileName()
    $issue.Body | Set-Content -Path $bodyFile -Encoding UTF8
    
    $labelStr = ($issue.Labels | ForEach-Object { "--label `"$_`"" }) -join " "
    $cmd = "gh issue create -R `"$Repo`" --title `"$($issue.Title -replace '"','\"')`" --body-file `"$bodyFile`" $labelStr"
    
    try {
        $result = Invoke-Expression $cmd 2>&1
        $issueUrl = ($result | Select-String -Pattern 'https://github.com/.+/issues/\d+').Matches[0].Value
        $issueNum = ($issueUrl -split '/')[-1]
        Write-Host "✓ #$issueNum" -ForegroundColor Green
        $issueNumbers += @{ Number = $issueNum; Spec = $issue.Spec; TaskId = $issue.TaskId; Phase = $issue.Phase }
    }
    catch {
        Write-Host "✗ FAILED: $_" -ForegroundColor Red
    }
    finally {
        Remove-Item $bodyFile -ErrorAction SilentlyContinue
    }
    
    # Small delay to avoid rate limiting
    if ($count % 10 -eq 0) { Start-Sleep -Milliseconds 500 }
}

# Save issue mapping for project board
$mappingFile = Join-Path $SpecsDir ".." "issue-mapping.json"
$issueNumbers | ConvertTo-Json -Depth 3 | Set-Content $mappingFile -Encoding UTF8
Write-Host "`n✓ Created $($issueNumbers.Count) issues. Mapping saved to $mappingFile" -ForegroundColor Green
Write-Host "Issue number range: #$(($issueNumbers | Select-Object -First 1).Number) — #$(($issueNumbers | Select-Object -Last 1).Number)"
