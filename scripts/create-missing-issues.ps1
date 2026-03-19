#!/usr/bin/env pwsh
# Find missing issues and create them
param(
    [string]$Repo = "MikeWedderburn-Clarke/CommunityManagement-Sample-Spec-Kit",
    [string]$SpecsDir = "specs"
)

$ErrorActionPreference = "Stop"

# Get existing issue titles
Write-Host "Fetching existing issues..." -ForegroundColor Yellow
$existingJson = gh issue list -R $Repo --state all --limit 500 --json title 2>&1
$existingTitles = ($existingJson | ConvertFrom-Json) | ForEach-Object { $_.title }
Write-Host "Found $($existingTitles.Count) existing issues"

# Extract task IDs that already have issues
$existingTaskKeys = @{}
foreach ($t in $existingTitles) {
    if ($t -match '\[(\d+)\]\s*(T\d+)') {
        $existingTaskKeys["$($Matches[1])-$($Matches[2])"] = $true
    }
}

# Spec metadata
$specs = @(
    @{ Dir = "004-permissions-creator-accounts"; Label = "spec:004-permissions"; Title = "Permissions & Creator Accounts"; Priority = "P0"; Prefix = "004" }
    @{ Dir = "001-event-discovery-rsvp";         Label = "spec:001-events";      Title = "Event Discovery & RSVP";        Priority = "P0"; Prefix = "001" }
    @{ Dir = "002-community-social";             Label = "spec:002-social";       Title = "Community & Social";            Priority = "P1"; Prefix = "002" }
    @{ Dir = "003-recurring-multiday";           Label = "spec:003-recurring";    Title = "Recurring & Multi-Day";         Priority = "P1"; Prefix = "003" }
    @{ Dir = "005-teacher-profiles-reviews";     Label = "spec:005-teachers";     Title = "Teacher Profiles & Reviews";    Priority = "P1"; Prefix = "005" }
)

$missing = @()

foreach ($spec in $specs) {
    $tasksFile = Join-Path $SpecsDir $spec.Dir "tasks.md"
    if (-not (Test-Path $tasksFile)) { continue }
    
    $lines = Get-Content $tasksFile
    $currentPhase = ""
    $currentPhaseNum = ""
    $currentStory = ""
    
    foreach ($line in $lines) {
        if ($line -match '^## Phase (\d+):?\s*(.+)$') {
            $currentPhaseNum = $Matches[1]
            $currentPhase = $Matches[2].Trim()
            $currentStory = ""
            continue
        }
        if ($line -match 'User Story (\d+)|US-(\d+):|US(\d+)') {
            $sn = if ($Matches[1]) { $Matches[1] } elseif ($Matches[2]) { $Matches[2] } else { $Matches[3] }
            $currentStory = "US-$sn"
        }
        if ($line -match '^\s*-\s*\[\s*\]\s*(T\d+)\s*(.+)$') {
            $taskId = $Matches[1]
            $rest = $Matches[2].Trim()
            $key = "$($spec.Prefix)-$taskId"
            
            if ($existingTaskKeys.ContainsKey($key)) { continue }
            
            $isParallel = $false
            $story = $currentStory
            if ($rest -match '^\[P\]\s*') { $isParallel = $true; $rest = $rest -replace '^\[P\]\s*', '' }
            if ($rest -match '^\[US-?(\d+)\]\s*') { $story = "US-$($Matches[1])"; $rest = $rest -replace '^\[US-?\d+\]\s*', '' }
            
            $desc = $rest.Trim()
            $cleanDesc = $desc -replace '`', "'"
            
            $labels = @($spec.Label)
            if ($currentPhase -match 'Setup') { $labels += "phase:setup" }
            elseif ($currentPhase -match 'Foundational|Foundation') { $labels += "phase:foundational" }
            elseif ($currentPhase -match 'Polish|Cross-Cutting') { $labels += "phase:polish" }
            
            if ($desc -match '\(P0\)' -or $currentPhase -match 'P0|MVP') { $labels += "priority:P0" }
            elseif ($desc -match '\(P1\)') { $labels += "priority:P1" }
            elseif ($desc -match '\(P2\)') { $labels += "priority:P2" }
            elseif ($spec.Priority -eq "P0") { $labels += "priority:P0" }
            else { $labels += "priority:$($spec.Priority)" }
            
            if ($isParallel) { $labels += "parallelizable" }
            
            $shortDesc = $cleanDesc
            if ($shortDesc.Length -gt 200) { $shortDesc = $shortDesc.Substring(0, 197) + "..." }
            
            $missing += @{
                Key = $key
                TaskId = $taskId
                Title = "[$($spec.Prefix)] $taskId - $shortDesc"
                Desc = $desc
                Labels = $labels
                Spec = $spec.Dir
                SpecTitle = $spec.Title
                Phase = $currentPhaseNum
                PhaseName = $currentPhase
                Story = $story
                IsParallel = $isParallel
            }
        }
    }
}

Write-Host "`nMissing issues: $($missing.Count)" -ForegroundColor Cyan

$created = 0
$failed = 0

foreach ($issue in $missing) {
    $idx = $created + $failed + 1
    Write-Host "[$idx/$($missing.Count)] $($issue.Key) - " -NoNewline
    
    $bodyFile = [System.IO.Path]::GetTempFileName()
    $storyLine = if ($issue.Story) { "**Story**: $($issue.Story)" } else { "" }
    $pLine = if ($issue.IsParallel) { "**Parallelizable**: Yes" } else { "" }
    
    $body = "## Task $($issue.TaskId) - $($issue.SpecTitle)`n`n**Spec**: $($issue.Spec)`n**Phase**: $($issue.Phase) - $($issue.PhaseName)`n$storyLine`n$pLine`n`n### Description`n`n$($issue.Desc)`n`n### Acceptance Criteria`n`n- [ ] Implementation matches the task description`n- [ ] Tests pass (if applicable)`n- [ ] No constitution principle violations`n`n### References`n`n- tasks.md: specs/$($issue.Spec)/tasks.md`n- plan.md: specs/$($issue.Spec)/plan.md"
    
    [System.IO.File]::WriteAllText($bodyFile, $body, [System.Text.Encoding]::UTF8)
    
    $ghArgs = @("issue", "create", "-R", $Repo, "--title", $issue.Title, "--body-file", $bodyFile)
    foreach ($lbl in $issue.Labels) {
        $ghArgs += "--label"
        $ghArgs += $lbl
    }
    
    try {
        $result = & gh @ghArgs 2>&1 | Out-String
        if ($result -match 'issues/(\d+)') {
            Write-Host "ok #$($Matches[1])" -ForegroundColor Green
            $created++
        } else {
            Write-Host "WARN: $result" -ForegroundColor Yellow
            $failed++
        }
    }
    catch {
        Write-Host "FAIL: $_" -ForegroundColor Red
        $failed++
    }
    finally {
        Remove-Item $bodyFile -ErrorAction SilentlyContinue
    }
    
    if ($created % 15 -eq 0 -and $created -gt 0) { Start-Sleep -Seconds 1 }
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
Write-Host "Created: $created | Failed: $failed"
