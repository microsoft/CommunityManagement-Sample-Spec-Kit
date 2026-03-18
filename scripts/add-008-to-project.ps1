#!/usr/bin/env pwsh
# Adds spec-008 issues to the project board with field values
param(
    [string]$Repo = "microsoft/CommunityManagement-Sample-Spec-Kit",
    [int]$ProjectNumber = 5,
    [string]$Owner = "MikeWedderburn-Clarke",
    [string]$ProjectId = "PVT_kwHOAFE7b84BR1TO"
)

$env:Path += ";$env:LOCALAPPDATA\gh-cli\bin"
$ErrorActionPreference = "Continue"

Write-Host "Fetching spec 008 issues..."
$issuesJson = gh issue list -R $Repo --label "spec:008-ui-system" --state all --limit 200 --json number,title,labels 2>$null
$issues = $issuesJson | ConvertFrom-Json
Write-Host "Found $($issues.Count) spec 008 issues"

# Get field definitions
Write-Host "Fetching project fields..."
$fieldsJson = gh project field-list $ProjectNumber --owner $Owner --format json 2>$null
$fields = $fieldsJson | ConvertFrom-Json
$specField = $fields.fields | Where-Object { $_.name -eq "Spec" }
$priorityField = $fields.fields | Where-Object { $_.name -eq "Priority" }
$phaseField = $fields.fields | Where-Object { $_.name -eq "Phase" }

$specOptionId = ($specField.options | Where-Object { $_.name -eq "008-UI-System" }).id
Write-Host "Spec 008 option ID: $specOptionId"

$success = 0
$failed = 0

foreach ($issue in $issues) {
    $num = $issue.number
    $labels = $issue.labels | ForEach-Object { $_.name }
    $count = $success + $failed + 1

    # Add to project
    $result = gh project item-add $ProjectNumber --owner $Owner --url "https://github.com/$Repo/issues/$num" --format json 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[$count/$($issues.Count)] #$num - FAILED: $result"
        $failed++
        continue
    }

    $item = $result | ConvertFrom-Json
    $itemId = $item.id

    # Set Spec = 008-UI-System
    if ($specOptionId -and $specField) {
        gh project item-edit --project-id $ProjectId --id $itemId --field-id $specField.id --single-select-option-id $specOptionId 2>&1 | Out-Null
    }

    # Set Priority
    $prioValue = $null
    if ($labels -contains "priority:P0") { $prioValue = "P0" }
    elseif ($labels -contains "priority:P1") { $prioValue = "P1" }
    if ($prioValue -and $priorityField) {
        $prioOptionId = ($priorityField.options | Where-Object { $_.name -eq $prioValue }).id
        if ($prioOptionId) {
            gh project item-edit --project-id $ProjectId --id $itemId --field-id $priorityField.id --single-select-option-id $prioOptionId 2>&1 | Out-Null
        }
    }

    # Set Phase
    $phaseValue = $null
    if ($labels -contains "phase:setup") { $phaseValue = "Setup" }
    elseif ($labels -contains "phase:foundational") { $phaseValue = "Foundational" }
    elseif ($labels -contains "phase:polish") { $phaseValue = "Polish" }
    if ($phaseValue -and $phaseField) {
        $phaseOptionId = ($phaseField.options | Where-Object { $_.name -eq $phaseValue }).id
        if ($phaseOptionId) {
            gh project item-edit --project-id $ProjectId --id $itemId --field-id $phaseField.id --single-select-option-id $phaseOptionId 2>&1 | Out-Null
        }
    }

    $success++
    $detail = @("008-UI-System", $prioValue, $phaseValue) | Where-Object { $_ } | Join-String -Separator ", "
    Write-Host "[$success/$($issues.Count)] #$num - ok ($detail)"
}

Write-Host ""
Write-Host "=== Done ==="
Write-Host "Added: $success | Failed: $failed"
