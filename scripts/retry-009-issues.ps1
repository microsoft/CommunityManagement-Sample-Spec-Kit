#!/usr/bin/env pwsh
# Retry failed issues for Spec 009
$env:Path += ";$env:LOCALAPPDATA\gh-cli\bin"
$repo = "microsoft/CommunityManagement-Sample-Spec-Kit"

$failedIssues = @(
    # Phase 3: US1 (P1, phase:core)
    @{id="T010"; t="Test: directory lists only visible members"; p="priority:P1"; ph="phase:core"; par=$true; s="US1"; b="Integration test: directory lists only visible members + excludes self. File: apps/web/tests/integration/directory/directory-listing.test.ts. FR-001, FR-004"}
    @{id="T011"; t="Test: cursor pagination + hasNextPage"; p="priority:P1"; ph="phase:core"; par=$true; s="US1"; b="Integration test: cursor pagination + hasNextPage. File: apps/web/tests/integration/directory/directory-listing.test.ts. FR-003"}
    @{id="T012"; t="Implement getDirectoryPage() service"; p="priority:P1"; ph="phase:core"; par=$false; s="US1"; b="Implement getDirectoryPage() in apps/web/src/lib/directory/service.ts. FR-001, FR-003, FR-004"}
    @{id="T013"; t="Implement GET /api/directory route"; p="priority:P1"; ph="phase:core"; par=$false; s="US1"; b="Implement GET /api/directory route in apps/web/src/app/api/directory/route.ts. requireAuth(), validate query params, 401/400 errors."}
    @{id="T014"; t="Create DirectoryCard component (5-file)"; p="priority:P1"; ph="phase:core"; par=$true; s="US1"; b="Create DirectoryCard in packages/shared-ui/src/DirectoryCard/ with 5-file pattern. FR-002"}
    @{id="T015"; t="Create DirectoryList component"; p="priority:P1"; ph="phase:core"; par=$false; s="US1"; b="Create DirectoryList in apps/web/src/components/directory/DirectoryList.tsx. Cursor-based load-more. FR-003"}
    @{id="T016"; t="Create directory browse page"; p="priority:P1"; ph="phase:core"; par=$false; s="US1"; b="Create page in apps/web/src/app/directory/page.tsx. Server component, hydrate DirectoryList. FR-001"}
    @{id="T017"; t="Add loading skeleton and empty state"; p="priority:P1"; ph="phase:core"; par=$false; s="US1"; b="Loading skeleton + empty state for directory page. i18n-ready strings. FR-001"}

    # Phase 4: US2 (P1, phase:core)
    @{id="T018"; t="Test: role filter returns correct subset"; p="priority:P1"; ph="phase:core"; par=$true; s="US2"; b="Integration test: role filter in directory-filters.test.ts. FR-005"}
    @{id="T019"; t="Test: location filters (city/country/continent)"; p="priority:P1"; ph="phase:core"; par=$true; s="US2"; b="Integration test: location filters in directory-filters.test.ts. FR-006"}
    @{id="T020"; t="Test: teacher filter + text search + AND"; p="priority:P1"; ph="phase:core"; par=$true; s="US2"; b="Integration test: teacher + text search + AND in directory-filters.test.ts. FR-008, FR-009, FR-011"}
    @{id="T020a"; t="Test: sort order (alphabetical + recent)"; p="priority:P1"; ph="phase:core"; par=$true; s="US2"; b="Integration test: sort order verification in directory-sort.test.ts. FR-010, US2-AS7"}
    @{id="T021"; t="Add role filter clause to query builder"; p="priority:P1"; ph="phase:core"; par=$false; s="US2"; b="Add role filter to service.ts. FR-005"}
    @{id="T022"; t="Add location filter clauses to query builder"; p="priority:P1"; ph="phase:core"; par=$false; s="US2"; b="Add location filter clauses to service.ts via geography JOIN. FR-006"}
    @{id="T023"; t="Add teacher + text search filter clauses"; p="priority:P1"; ph="phase:core"; par=$false; s="US2"; b="Add teacher-only and text search filters to service.ts. FR-008, FR-009"}
    @{id="T024"; t="Add alphabetical + recent sort modes"; p="priority:P1"; ph="phase:core"; par=$false; s="US2"; b="Add sort modes to service.ts. Update cursor encode/decode. FR-010"}
    @{id="T025"; t="Create DirectoryFilters component"; p="priority:P1"; ph="phase:core"; par=$false; s="US2"; b="Create DirectoryFilters in apps/web/src/components/directory/DirectoryFilters.tsx. FR-005 to FR-012"}
    @{id="T026"; t="Integrate DirectoryFilters with page"; p="priority:P1"; ph="phase:core"; par=$false; s="US2"; b="Sync filter state to URL params, re-fetch on change, clear-all. FR-011, FR-012"}

    # Phase 5: US3 (P1, phase:core)
    @{id="T027"; t="Test: directory_visible default + toggle"; p="priority:P1"; ph="phase:core"; par=$true; s="US3"; b="Integration test: directory_visible toggle in directory-visibility.test.ts. FR-013, FR-014"}
    @{id="T028"; t="Test: GDPR export/deletion for directoryVisible"; p="priority:P1"; ph="phase:core"; par=$true; s="US3"; b="Integration test: GDPR export includes directoryVisible, deletion clears it. FR-031, FR-032"}
    @{id="T028a"; t="Test: direct profile URL works when hidden"; p="priority:P1"; ph="phase:core"; par=$true; s="US3"; b="Integration test: direct profile URL works when directory_visible=false. FR-015, US3-AS4"}
    @{id="T028b"; t="Test: 401 for unauthenticated PATCH toggle"; p="priority:P1"; ph="phase:core"; par=$true; s="US3"; b="Integration test: PATCH /api/profiles/me returns 401 for unauth. QG-10 permission smoke test"}
    @{id="T029"; t="Extend PATCH /api/profiles/me for visibility"; p="priority:P1"; ph="phase:core"; par=$false; s="US3"; b="Extend PATCH route to accept directoryVisible. FR-014"}
    @{id="T030"; t="Create DirectoryVisibilityToggle component"; p="priority:P1"; ph="phase:core"; par=$false; s="US3"; b="Toggle component in apps/web/src/components/directory/. FR-014"}
    @{id="T031"; t="Add visibility toggle to profile settings"; p="priority:P1"; ph="phase:core"; par=$false; s="US3"; b="Add toggle to apps/web/src/app/settings/profile/page.tsx. FR-014"}
    @{id="T032"; t="Update GDPR export/deletion for directory"; p="priority:P1"; ph="phase:core"; par=$false; s="US3"; b="Update GDPR export/deletion for directory_visible. FR-031, FR-032"}

    # Phase 6: US4 (P2, phase:core)
    @{id="T033"; t="Test: relationship status in directory results"; p="priority:P2"; ph="phase:core"; par=$true; s="US4"; b="Integration test: relationship status indicators in directory-relationships.test.ts. FR-019"}
    @{id="T034"; t="Test: block exclusion is symmetric"; p="priority:P2"; ph="phase:core"; par=$true; s="US4"; b="Integration test: symmetric block exclusion in directory-relationships.test.ts. FR-016"}
    @{id="T035"; t="Add relationship status derivation to service"; p="priority:P2"; ph="phase:core"; par=$false; s="US4"; b="Map viewer_follows + follows_viewer to RelationshipStatus enum. FR-019"}
    @{id="T036"; t="Add relationship status display to card"; p="priority:P2"; ph="phase:core"; par=$false; s="US4"; b="Badge/label on DirectoryCard showing relationship. FR-019"}
    @{id="T037"; t="Add follow/unfollow action to DirectoryCard"; p="priority:P2"; ph="phase:core"; par=$false; s="US4"; b="Follow/unfollow with optimistic UI. Reuses POST/DELETE /api/follows. FR-020, FR-022"}
    @{id="T038"; t="Add block/unblock action to DirectoryCard"; p="priority:P2"; ph="phase:core"; par=$false; s="US4"; b="Block/unblock with confirmation dialog. Reuses POST/DELETE /api/blocks. FR-021, FR-022, FR-016"}

    # Phase 7: US5 (P2, phase:core)
    @{id="T039"; t="Test: social link visibility filtering"; p="priority:P2"; ph="phase:core"; par=$true; s="US5"; b="Integration test: social link visibility filtering (everyone/followers/friends/hidden). FR-018"}
    @{id="T040"; t="Create SocialIcons component (5-file)"; p="priority:P2"; ph="phase:core"; par=$true; s="US5"; b="Create SocialIcons in packages/shared-ui/src/SocialIcons/ with 5-file pattern. FR-023, FR-024, FR-025"}
    @{id="T041"; t="Create platform icon asset map"; p="priority:P2"; ph="phase:core"; par=$false; s="US5"; b="Map SocialPlatform to SVG icons for all 8 platforms. FR-024"}
    @{id="T042"; t="Integrate SocialIcons into DirectoryCard"; p="priority:P2"; ph="phase:core"; par=$false; s="US5"; b="Render SocialIcons below city/role. Hide when empty. FR-025"}

    # Phase 8: US6 (P2, phase:core)
    @{id="T043"; t="Test: relationship filters (friends/following/etc)"; p="priority:P2"; ph="phase:core"; par=$true; s="US6"; b="Integration test: relationship filters in directory-relationships.test.ts. FR-007"}
    @{id="T044"; t="Add relationship filter to query builder"; p="priority:P2"; ph="phase:core"; par=$false; s="US6"; b="Add relationship filter clauses to service.ts. FR-007, Research R-7"}
    @{id="T045"; t="Add relationship filter to DirectoryFilters"; p="priority:P2"; ph="phase:core"; par=$false; s="US6"; b="Add relationship filter dropdown. FR-007, FR-011"}
    @{id="T046"; t="Handle Blocked filter special case"; p="priority:P2"; ph="phase:core"; par=$false; s="US6"; b="Special handling for Blocked filter in DirectoryList. FR-007, US6-AS4"}

    # Phase 9: US7 (P3, phase:core)
    @{id="T047"; t="Test: computeProfileCompleteness function"; p="priority:P3"; ph="phase:core"; par=$true; s="US7"; b="Unit test: all 2^5 field combos for completeness. FR-026, FR-027"}
    @{id="T048"; t="Implement computeProfileCompleteness()"; p="priority:P3"; ph="phase:core"; par=$false; s="US7"; b="Pure function in apps/web/src/lib/directory/completeness.ts. FR-026, FR-027"}
    @{id="T049"; t="Create ProfileCompleteness component"; p="priority:P3"; ph="phase:core"; par=$false; s="US7"; b="Progress bar/ring with field breakdown. FR-026"}
    @{id="T050"; t="Add ProfileCompleteness to settings page"; p="priority:P3"; ph="phase:core"; par=$false; s="US7"; b="Add to own profile settings page. FR-026, FR-028"}

    # Phase 10: US8 (P3, phase:core)
    @{id="T051"; t="Test: proximity sort tiers + fallback"; p="priority:P3"; ph="phase:core"; par=$true; s="US8"; b="Integration test: proximity sort in directory-proximity.test.ts. FR-029, FR-030"}
    @{id="T052"; t="Add proximity sort to query builder"; p="priority:P3"; ph="phase:core"; par=$false; s="US8"; b="CASE expression for proximity_tier in service.ts. FR-029, Research R-3"}
    @{id="T053"; t="Handle viewer-no-city fallback"; p="priority:P3"; ph="phase:core"; par=$false; s="US8"; b="Fallback to alphabetical when viewer has no home city. FR-030"}
    @{id="T054"; t="Add proximity sort to DirectoryFilters"; p="priority:P3"; ph="phase:core"; par=$false; s="US8"; b="Add 'People near me' sort option. FR-029"}
)

$created = 0
$failed = 0

foreach ($issue in $failedIssues) {
    $title = "[009] $($issue.id) - $($issue.t)"
    $labels = @("spec:009-directory", $issue.p, $issue.ph)
    if ($issue.par) { $labels += "parallelizable" }
    
    $storyPart = ""
    if ($issue.s) { $storyPart = "`n`n**User Story**: $($issue.s)" }
    
    $body = "$($issue.b)$storyPart`n`n---`n_Auto-generated from specs/009-user-directory/tasks.md_"
    $labelStr = ($labels -join ",")
    
    try {
        $result = & gh issue create --repo $repo --title $title --body $body --label $labelStr 2>&1
        if ($LASTEXITCODE -eq 0) {
            $created++
            Write-Host "OK  $($issue.id): $result" -ForegroundColor Green
        } else {
            $failed++
            Write-Host "ERR $($issue.id): $result" -ForegroundColor Red
        }
    } catch {
        $failed++
        Write-Host "ERR $($issue.id): $_" -ForegroundColor Red
    }
    Start-Sleep -Milliseconds 800
}

Write-Host "`nDone: $created created, $failed failed" -ForegroundColor Cyan
