param(
    [string]$Repo = "MikeWedderburn-Clarke/CommunityManagement-Sample-Spec-Kit",
    [int]$ProjectNumber = 3,
    [string]$Owner = "MikeWedderburn-Clarke",
    [int]$BatchSize = 500
)

$env:Path += ";$env:LOCALAPPDATA\gh-cli\bin"

Write-Host "Fetching all issues from $Repo..."
$issues = gh issue list -R $Repo --state all --limit $BatchSize --json number,title,labels 2>&1 | ConvertFrom-Json
Write-Host "Found $($issues.Count) issues"

# Get project field IDs for setting Spec and Priority values
Write-Host "Fetching project field definitions..."
$fields = gh project field-list $ProjectNumber --owner $Owner --format json 2>&1 | ConvertFrom-Json
$specField = $fields.fields | Where-Object { $_.name -eq "Spec" }
$priorityField = $fields.fields | Where-Object { $_.name -eq "Priority" }
$phaseField = $fields.fields | Where-Object { $_.name -eq "Phase" }
$statusField = $fields.fields | Where-Object { $_.name -eq "Status" }

Write-Host "Spec field ID: $($specField.id)"
Write-Host "Priority field ID: $($priorityField.id)"
Write-Host "Phase field ID: $($phaseField.id)"
Write-Host "Status field ID: $($statusField.id)"

$success = 0
$failed = 0

foreach ($issue in $issues) {
    $num = $issue.number
    $title = $issue.title
    $labels = $issue.labels | ForEach-Object { $_.name }
    
    # Add issue to project
    $url = "https://github.com/$Repo/issues/$num"
    $result = gh project item-add $ProjectNumber --owner $Owner --url $url --format json 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[$($success + $failed + 1)/$($issues.Count)] #$num - FAILED to add: $result"
        $failed++
        continue
    }
    
    $item = $result | ConvertFrom-Json
    $itemId = $item.id
    
    # Determine Spec value from labels
    $specValue = $null
    if ($labels -contains "spec:004-permissions") { $specValue = "004-Permissions" }
    elseif ($labels -contains "spec:001-events") { $specValue = "001-Events" }
    elseif ($labels -contains "spec:002-social") { $specValue = "002-Social" }
    elseif ($labels -contains "spec:003-recurring") { $specValue = "003-Recurring" }
    elseif ($labels -contains "spec:005-teachers") { $specValue = "005-Teachers" }
    
    # Determine Priority from labels
    $prioValue = $null
    if ($labels -contains "priority:P0") { $prioValue = "P0" }
    elseif ($labels -contains "priority:P1") { $prioValue = "P1" }
    elseif ($labels -contains "priority:P2") { $prioValue = "P2" }
    
    # Determine Phase from labels
    $phaseValue = $null
    if ($labels -contains "phase:setup") { $phaseValue = "Setup" }
    elseif ($labels -contains "phase:foundational") { $phaseValue = "Foundational" }
    elseif ($labels -contains "phase:polish") { $phaseValue = "Polish" }
    
    # Set Spec field
    if ($specValue -and $specField) {
        $optionId = ($specField.options | Where-Object { $_.name -eq $specValue }).id
        if ($optionId) {
            gh project item-edit --project-id "PVT_kwHOAFE7b84BR1Fz" --id $itemId --field-id $specField.id --single-select-option-id $optionId 2>&1 | Out-Null
        }
    }
    
    # Set Priority field
    if ($prioValue -and $priorityField) {
        $optionId = ($priorityField.options | Where-Object { $_.name -eq $prioValue }).id
        if ($optionId) {
            gh project item-edit --project-id "PVT_kwHOAFE7b84BR1Fz" --id $itemId --field-id $priorityField.id --single-select-option-id $optionId 2>&1 | Out-Null
        }
    }
    
    # Set Phase field
    if ($phaseValue -and $phaseField) {
        $optionId = ($phaseField.options | Where-Object { $_.name -eq $phaseValue }).id
        if ($optionId) {
            gh project item-edit --project-id "PVT_kwHOAFE7b84BR1Fz" --id $itemId --field-id $phaseField.id --single-select-option-id $optionId 2>&1 | Out-Null
        }
    }
    
    $success++
    $detail = @($specValue, $prioValue, $phaseValue) | Where-Object { $_ } | Join-String -Separator ", "
    Write-Host "[$success/$($issues.Count)] #$num - ok ($detail)"
}

Write-Host ""
Write-Host "=== Done ==="
Write-Host "Added: $success | Failed: $failed"
