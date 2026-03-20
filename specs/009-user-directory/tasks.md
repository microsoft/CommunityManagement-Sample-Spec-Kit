# Tasks: User Directory

**Input**: Design documents from `/specs/009-user-directory/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Dependencies**:
- Spec 002 (Community Social) — `user_profiles` table (extended), `social_links` table (constraint modified), `follows`, `blocks`, `mutes` tables, social link visibility logic, follow/block/mute service functions
- Spec 004 (Permissions) — `users` table (auth FK), `geography` table (city→country→continent hierarchy), `requireAuth()` wrapper
- Spec 005 (Teacher Profiles) — `teacher_profiles` table (`badge_status` for verified teacher badge/filter)

**Downstream consumers**: None currently — this is a read-only discovery layer

**Scope**: 1 new column (`directory_visible`), 1 expanded CHECK constraint (4→8 platforms), 5 new indexes, zero new tables. Single `GET /api/directory` endpoint.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migration, shared types, validation schemas, and test harness for 009

- [ ] T001 Create directory structure per plan.md: `apps/web/src/lib/directory/`, `apps/web/src/components/directory/`, `apps/web/src/app/api/directory/`, `apps/web/src/app/directory/`, `apps/web/tests/integration/directory/`, `packages/shared-ui/src/DirectoryCard/`, `packages/shared-ui/src/SocialIcons/`
- [ ] T002 Create database migration file `apps/web/src/db/migrations/009_user_directory.sql` — ALTER TABLE user_profiles ADD COLUMN directory_visible BOOLEAN NOT NULL DEFAULT false; expand social_links platform CHECK constraint from 4→8 values; create 5 partial indexes per data-model.md (idx_profiles_directory_visible, idx_profiles_role_visible, idx_profiles_name_visible, idx_profiles_created_visible, idx_profiles_city_visible)
- [ ] T003 [P] Create shared directory types in `packages/shared/src/types/directory.ts` — export DirectoryEntry, DirectoryQueryParams, DirectoryResponse, DirectorySortMode, RelationshipFilter, RelationshipStatus, VisibleSocialLink, ProfileCompleteness interfaces per contracts/directory-api.ts
- [ ] T004 [P] Expand SocialPlatform type in `packages/shared/src/types/community.ts` — add 'tiktok', 'twitter_x', 'linkedin', 'threads' to the existing 4-value union type (FR-023, research R-1)
- [ ] T005 [P] Create Zod validation schemas in `apps/web/src/lib/directory/schemas.ts` — DirectoryQueryParamsSchema (cursor, pageSize 1–100 default 20, sort, role, city, country, continent, teachersOnly, relationship, search), CursorSchema for decode validation
- [ ] T006 [P] Create PGlite test seed helpers in `apps/web/tests/integration/directory/helpers.ts` — seedDirectoryUsers() creating 10+ users with varied directory_visible states, roles, cities, teacher profiles, social links at various visibility levels, follow/block pairs, and mutual follows (friends)

**Checkpoint**: Scaffolding complete — migration runnable, types importable, test DB harness available

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core service infrastructure that ALL user stories depend on — cursor utilities, base SQL query builder with block exclusion and social link visibility

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Implement cursor encode/decode utilities in `apps/web/src/lib/directory/cursor.ts` — encodeCursor(sortValue, id) → base64 opaque string, decodeCursor(cursor) → validated {sortValue, id} with Zod, per research R-2
- [ ] T008 Implement base directory SQL query builder in `apps/web/src/lib/directory/service.ts` — core SELECT joining user_profiles + geography + teacher_profiles + social_links, block exclusion via NOT EXISTS (symmetric, research R-6), social link visibility FILTER clause (everyone/followers/friends per research R-4), GROUP BY, LIMIT pageSize+1, self-exclusion
- [ ] T009 [P] Update existing Zod SocialPlatform schema in `apps/web/src/lib/validation/community-schemas.ts` (or equivalent) to match expanded 8-value enum — ensure Spec 002 validation layer accepts new platforms

**Checkpoint**: Foundation ready — directory service can build and execute the core query; user story implementation can begin

---

## Phase 3: User Story 1 — Browse the Community Directory (Priority: P1) 🎯 MVP

**Goal**: Logged-in member sees a paginated list of opted-in members with avatar, name, city, role, teacher badge, and social link icon placeholders. Cursor-based pagination.

**Independent Test**: Log in, open /directory, verify only directory_visible=true users appear. Verify each card shows avatar/name/city/role/badge. Scroll to trigger load-more via cursor pagination.

### Tests for User Story 1

- [ ] T010 [P] [US1] Integration test: directory lists only visible members + excludes self in `apps/web/tests/integration/directory/directory-listing.test.ts` — seed 5 visible + 2 hidden users, assert hidden users absent, assert viewer absent (FR-001, FR-004)
- [ ] T011 [P] [US1] Integration test: cursor pagination + hasNextPage in `apps/web/tests/integration/directory/directory-listing.test.ts` — seed 25 visible users, fetch page 1 (20), assert hasNextPage=true + nextCursor present, fetch page 2, assert 5 results + hasNextPage=false (FR-003)

### Implementation for User Story 1

- [ ] T012 [US1] Implement getDirectoryPage() in `apps/web/src/lib/directory/service.ts` — accepts DirectoryQueryParams + viewerId, executes base query with directory_visible=true filter, cursor pagination, returns {entries, nextCursor, hasNextPage} (FR-001, FR-003, FR-004)
- [ ] T013 [US1] Implement GET /api/directory route in `apps/web/src/app/api/directory/route.ts` — requireAuth(), parse + validate query params with DirectoryQueryParamsSchema, call getDirectoryPage(), return DirectoryResponse, 401 on unauth, 400 on invalid params
- [ ] T014 [P] [US1] Create DirectoryCard component in `packages/shared-ui/src/DirectoryCard/DirectoryCard.tsx` — 5-file pattern (DirectoryCard.tsx, DirectoryCard.test.tsx, DirectoryCard.stories.tsx, index.web.tsx, index.native.tsx), display avatar (with placeholder fallback), display name, home city, default role badge, verified teacher badge slot, social icons slot (FR-002)
- [ ] T015 [US1] Create DirectoryList component in `apps/web/src/components/directory/DirectoryList.tsx` — renders list of DirectoryCard, "Load more" button triggers cursor-based next-page fetch, manages entries + pagination state (FR-003)
- [ ] T016 [US1] Create directory browse page in `apps/web/src/app/directory/page.tsx` — server component for initial data fetch, hydrate DirectoryList with first page of results (FR-001)
- [ ] T017 [US1] Add loading skeleton and empty state to directory page — skeleton cards during fetch, "No members found" empty state with i18n-ready string (FR-001, edge case)

**Checkpoint**: User Story 1 complete — directory page renders paginated member cards with cursor-based load-more

---

## Phase 4: User Story 2 — Search and Filter Directory Members (Priority: P1)

**Goal**: Member can filter by role, location, teacher status, text search, and sort by alphabetical/recently-joined. All filters combine with AND logic.

**Independent Test**: Filter by role "Flyer" — only Flyers appear. Add location "Bristol" — only Flyers in Bristol. Type partial name — results narrow. Sort by "recently joined" — newest first. Clear all filters — full directory returns.

### Tests for User Story 2

- [ ] T018 [P] [US2] Integration test: role filter in `apps/web/tests/integration/directory/directory-filters.test.ts` — seed users with Base/Flyer/Hybrid, filter role=flyer, assert only Flyers returned (FR-005)
- [ ] T019 [P] [US2] Integration test: location filters (city, country, continent) in `apps/web/tests/integration/directory/directory-filters.test.ts` — seed users across Bristol/London/Paris, filter country=UK, assert only UK users (FR-006)
- [ ] T020 [P] [US2] Integration test: teacher filter + text search + AND combination in `apps/web/tests/integration/directory/directory-filters.test.ts` — seed verified/unverified teachers, filter teachersOnly=true + search="Mar", assert AND logic (FR-008, FR-009, FR-011)
- [ ] T020a [P] [US2] Integration test: alphabetical sort returns A→Z order and recently-joined sort returns newest-first in `apps/web/tests/integration/directory/directory-sort.test.ts` — seed 5 users with known names and creation dates, verify sort order for both modes (FR-010, US2-AS7)

### Implementation for User Story 2

- [ ] T021 [US2] Add role filter clause to directory query builder in `apps/web/src/lib/directory/service.ts` — append `AND p.default_role = $role` when role param present (FR-005)
- [ ] T022 [US2] Add location filter clauses to directory query builder in `apps/web/src/lib/directory/service.ts` — city/country/continent via geography JOIN (AND g.city = $city / g.country / g.continent), mutually exclusive levels (FR-006)
- [ ] T023 [US2] Add teacher-only and text search filter clauses to directory query builder in `apps/web/src/lib/directory/service.ts` — teacher: AND tp.badge_status='verified' AND tp.is_deleted=false; search: AND lower(p.display_name) LIKE lower($search)||'%' (FR-008, FR-009)
- [ ] T024 [US2] Add alphabetical and recently-joined sort modes to directory query builder in `apps/web/src/lib/directory/service.ts` — alphabetical: ORDER BY display_name, id; recent: ORDER BY created_at DESC, id DESC; update cursor encode/decode per sort mode (FR-010)
- [ ] T025 [US2] Create DirectoryFilters component in `apps/web/src/components/directory/DirectoryFilters.tsx` — role dropdown (Base/Flyer/Hybrid/All), location selector (city/country/continent from geography), teacher toggle, sort selector, text search input, clear-all button (FR-005–FR-012)
- [ ] T026 [US2] Integrate DirectoryFilters with directory page — sync filter state to URL search params, re-fetch API on filter change, reset cursor on filter change, clear-all resets to unfiltered view (FR-011, FR-012)

**Checkpoint**: User Story 2 complete — all search, filter, and sort combinations work with AND logic

---

## Phase 5: User Story 3 — Directory Visibility Opt-In (Priority: P1)

**Goal**: User enables "Show me in the community directory" toggle in profile settings. Defaults false (privacy-first). Toggle on → appear in directory. Toggle off → disappear.

**Independent Test**: New user defaults to directory_visible=false. Enable toggle. Log in as another user — first user now appears in directory. Disable toggle — vanishes from results. Direct profile URL still works.

### Tests for User Story 3

- [ ] T027 [P] [US3] Integration test: default directory_visible=false and toggle behavior in `apps/web/tests/integration/directory/directory-visibility.test.ts` — create user, assert not in directory, toggle on via PATCH, assert in directory, toggle off, assert absent (FR-013, FR-014)
- [ ] T028 [P] [US3] Integration test: GDPR export includes directoryVisible + deletion clears it in `apps/web/tests/integration/directory/directory-visibility.test.ts` (FR-031, FR-032)
- [ ] T028a [P] [US3] Integration test: direct profile URL works even when directory_visible=false in `apps/web/tests/integration/directory/directory-visibility.test.ts` — set user's directory_visible=false, GET /api/profiles/:userId as another user, assert 200 with profile data (FR-015, US3-AS4)
- [ ] T028b [P] [US3] Integration test: PATCH /api/profiles/me returns 401 for unauthenticated requests and only updates own profile in `apps/web/tests/integration/directory/directory-visibility.test.ts` — verify auth enforcement on directoryVisible toggle (QG-10)

### Implementation for User Story 3

- [ ] T029 [US3] Extend PATCH /api/profiles/me to accept directoryVisible field — update Zod request schema in existing route, add directory_visible column to UPDATE SQL (FR-014)
- [ ] T030 [US3] Create DirectoryVisibilityToggle component in `apps/web/src/components/directory/DirectoryVisibilityToggle.tsx` — labeled toggle switch with i18n-ready "Show me in the community directory" label, calls PATCH /api/profiles/me (FR-014)
- [ ] T031 [US3] Add DirectoryVisibilityToggle to profile settings page in `apps/web/src/app/settings/profile/page.tsx` — place below existing profile fields, load current state from profile data (FR-014)
- [ ] T032 [US3] Update GDPR export in `apps/web/src/lib/gdpr/export.ts` to include directory_visible in user profile data section; update GDPR deletion in `apps/web/src/lib/gdpr/deletion.ts` to clear directory_visible on account delete (FR-031, FR-032)

**Checkpoint**: User Story 3 complete — users can opt in/out of directory; privacy-first default enforced; GDPR compliant

---

## Phase 6: User Story 4 — View and Manage Relationships from Directory (Priority: P2)

**Goal**: Each directory card shows relationship status (Friend/Following/Follows Me/None/Blocked). Follow/unfollow/block/unblock actions directly from card without page navigation. Optimistic UI updates.

**Independent Test**: Browse directory as user who follows some members and blocked one. Verify correct status per card. Click Follow — status updates to Following. Click Unfollow — reverts. Blocked users hidden (symmetric).

### Tests for User Story 4

- [ ] T033 [P] [US4] Integration test: relationship status indicators in directory results in `apps/web/tests/integration/directory/directory-relationships.test.ts` — seed mutual follow (friend), one-way follow, follower, blocked pair, verify viewer_follows/follows_viewer correctly derived (FR-019)
- [ ] T034 [P] [US4] Integration test: block exclusion is symmetric in `apps/web/tests/integration/directory/directory-relationships.test.ts` — if A blocks B, B does not see A and A does not see B in directory results (FR-016)

### Implementation for User Story 4

- [ ] T035 [US4] Add relationship status derivation to directory service response mapping in `apps/web/src/lib/directory/service.ts` — map viewer_follows + follows_viewer SQL booleans to RelationshipStatus enum (friend/following/follows_me/none) per DirectoryEntry contract (FR-019)
- [ ] T036 [US4] Add relationship status display to DirectoryCard in `packages/shared-ui/src/DirectoryCard/DirectoryCard.tsx` — badge/label showing Friend/Following/Follows you/None, style per status (FR-019)
- [ ] T037 [US4] Add follow/unfollow action button to DirectoryCard — calls existing POST /api/follows and DELETE /api/follows/:userId, optimistic status toggle without full page reload (FR-020, FR-022)
- [ ] T038 [US4] Add block/unblock action to DirectoryCard — calls existing POST /api/blocks and DELETE /api/blocks/:userId, optimistic removal from DirectoryList on block, confirmation dialog before blocking (FR-021, FR-022, FR-016)

**Checkpoint**: User Story 4 complete — relationship status visible on every card; follow/block actions work inline with optimistic updates

---

## Phase 7: User Story 5 — Social Link Icons with Platform Branding (Priority: P2)

**Goal**: Directory cards show small branded icons for each visible social link (8 platforms). Clicking opens link in new tab. Visibility rules (public/friends_only) enforced server-side.

**Independent Test**: View card for user with instagram (public), linkedin (friends_only), tiktok (public). As non-friend: see instagram + tiktok icons, no linkedin. Click instagram icon — opens in new tab. Become friends — linkedin icon appears.

### Tests for User Story 5

- [ ] T039 [P] [US5] Integration test: social link visibility filtering (everyone, followers, friends, hidden) in `apps/web/tests/integration/directory/directory-visibility.test.ts` — seed user with links at each visibility, verify viewer with no relationship sees only 'everyone' links, follower sees 'everyone'+'followers', friend sees all except 'hidden' (FR-018)

### Implementation for User Story 5

- [ ] T040 [P] [US5] Create SocialIcons component in `packages/shared-ui/src/SocialIcons/` — 5-file pattern (SocialIcons.tsx, SocialIcons.test.tsx, SocialIcons.stories.tsx, index.web.tsx, index.native.tsx), accepts VisibleSocialLink[], renders platform brand icon per platform, each icon is an anchor with target="_blank" rel="noopener noreferrer" (FR-023, FR-024, FR-025)
- [ ] T041 [US5] Create platform icon asset map in `packages/shared-ui/src/SocialIcons/icons.ts` — map SocialPlatform → SVG icon component for facebook, instagram, youtube, website, tiktok, twitter_x, linkedin, threads (FR-024)
- [ ] T042 [US5] Integrate SocialIcons into DirectoryCard — render below city/role area, hide entire social section when visibleSocialLinks is empty for clean card layout (FR-025, edge case)

**Checkpoint**: User Story 5 complete — social link icons render with correct platform branding and visibility enforcement

---

## Phase 8: User Story 6 — Filter by Relationship Type (Priority: P2)

**Goal**: Member can filter directory to Friends, Following, Followers, or Blocked. The "Blocked" filter shows their block list for management with unblock actions.

**Independent Test**: As user with 5 follows, 3 followers (2 mutual), 1 blocked — filter "Friends" → 2 results. "Following" → 5. "Blocked" → 1 with Unblock action.

### Tests for User Story 6

- [ ] T043 [P] [US6] Integration test: relationship filters (friends, following, followers, blocked) in `apps/web/tests/integration/directory/directory-relationships.test.ts` — seed known relationship graph, verify each filter returns correct subset, verify "blocked" filter inverts standard block exclusion (FR-007)

### Implementation for User Story 6

- [ ] T044 [US6] Add relationship filter clauses to directory query builder in `apps/web/src/lib/directory/service.ts` — friends: mutual follow EXISTS; following: viewer follows EXISTS; followers: followee=viewer EXISTS; blocked: blocker_id=viewer EXISTS (inverts normal block exclusion), per research R-7 (FR-007)
- [ ] T045 [US6] Add relationship filter dropdown to DirectoryFilters component in `apps/web/src/components/directory/DirectoryFilters.tsx` — Friends/Following/Followers/Blocked options, combine with other active filters via AND logic (FR-007, FR-011)
- [ ] T046 [US6] Handle "Blocked" filter special case in DirectoryList — show unblock action on each card, skip standard block exclusion for this filter, apply directory_visible=true only for non-blocked filters (FR-007, US6-AS4)

**Checkpoint**: User Story 6 complete — all relationship filters work individually and combined with other filters

---

## Phase 9: User Story 7 — Profile Completeness Indicator (Priority: P3)

**Goal**: User sees a completeness percentage on their own profile: avatar (20%) + display name (20%) + bio (20%) + home city (20%) + ≥1 social link (20%). Computed at render time, not stored. Not shown on other users' profiles.

**Independent Test**: Own profile with only display name → 20%. Add avatar + bio → 60%. Add city + social link → 100%. View someone else's profile → no completeness indicator.

### Tests for User Story 7

- [ ] T047 [P] [US7] Unit test: computeProfileCompleteness pure function in `apps/web/src/lib/directory/completeness.test.ts` — test all 2^5 field combinations, verify 0% through 100% in 20% increments (FR-026, FR-027)

### Implementation for User Story 7

- [ ] T048 [US7] Implement computeProfileCompleteness() in `apps/web/src/lib/directory/completeness.ts` — pure function accepting {avatarUrl, displayName, bio, homeCityId, socialLinkCount}, returns {percentage, fields} per research R-5 (FR-026, FR-027)
- [ ] T049 [US7] Create ProfileCompleteness component in `apps/web/src/components/directory/ProfileCompleteness.tsx` — progress bar/ring showing percentage, field-by-field breakdown with check/missing indicators, i18n-ready labels (FR-026)
- [ ] T050 [US7] Add ProfileCompleteness to own profile settings page in `apps/web/src/app/settings/profile/page.tsx` — render above directory visibility toggle, pass current profile data, show only for own profile (FR-026, FR-028)

**Checkpoint**: User Story 7 complete — profile completeness visible on own profile only, computed client-side

---

## Phase 10: User Story 8 — Proximity-Based Browsing (Priority: P3)

**Goal**: "People near me" sort groups results by geographic proximity: same city → same country → same continent → global, using the geography hierarchy. Falls back to alphabetical if viewer has no home city.

**Independent Test**: As user in Bristol (UK, Europe), sort by proximity — Bristol members first, then UK, then Europe, then global. Within each tier, sub-sorted alphabetically.

### Tests for User Story 8

- [ ] T051 [P] [US8] Integration test: proximity sort tiers + sub-sort + no-city fallback in `apps/web/tests/integration/directory/directory-proximity.test.ts` — seed users in Bristol/London/Paris/Tokyo, verify tier ordering 1→2→3→4 and alphabetical sub-sort within tiers; test viewer with no home city falls back to pure alphabetical (FR-029, FR-030)

### Implementation for User Story 8

- [ ] T052 [US8] Add proximity sort mode to directory query builder in `apps/web/src/lib/directory/service.ts` — CASE expression (g.city=$viewerCity→1, g.country→2, g.continent→3, ELSE 4) AS proximity_tier, ORDER BY proximity_tier ASC, display_name ASC, id ASC; update cursor encode/decode for 3-part proximity cursor {tier, displayName, id} per research R-3 (FR-029)
- [ ] T053 [US8] Handle viewer-no-city fallback in directory service — when viewer's home_city_id IS NULL, set all tiers to 4 (global) which degrades to alphabetical sort (FR-030)
- [ ] T054 [US8] Add "People near me" proximity sort option to DirectoryFilters sort dropdown in `apps/web/src/components/directory/DirectoryFilters.tsx` — labeled "People near me" with i18n-ready string (FR-029)

**Checkpoint**: User Story 8 complete — proximity browsing groups members by geographic distance with graceful fallback

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: i18n, accessibility, GDPR edge cases, and validation across all user stories

- [ ] T055 [P] Extract all directory UI strings to i18n namespace in `apps/web/src/` — filter labels, sort options, empty states ("No members found matching your search"), relationship statuses, "Show me in the community directory", "People near me", profile completeness field labels (FR-035)
- [ ] T056 [P] Accessibility audit for directory page — keyboard navigation for all filter controls, focus management on load-more, ARIA labels on filter dropdowns and toggle, screen reader text for DirectoryCard content, skip-to-content link
- [ ] T057 [P] Add aria-labels and sr-only text to SocialIcons component — each icon must have accessible name identifying platform ("Instagram profile", "LinkedIn profile", etc.)
- [ ] T058 [P] Verify muted users still appear in directory results — add regression test confirming mute does NOT affect directory presence per FR-017 in `apps/web/tests/integration/directory/directory-relationships.test.ts`
- [ ] T059 Run quickstart.md end-to-end smoke test — verify all curl examples work, test commands pass, seed data scenarios produce expected results, migration applies and rolls back cleanly

**Checkpoint**: All polish complete — i18n compliant, accessible, GDPR verified, quickstart validated

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T002 migration, T003 types, T005 schemas) — BLOCKS all user stories
- **US1 Browse (Phase 3)**: Depends on Foundational — minimum viable directory
- **US2 Search/Filter (Phase 4)**: Depends on US1 (needs listing to filter)
- **US3 Visibility (Phase 5)**: Depends on Foundational only — can run in parallel with US1/US2
- **US4 Relationships (Phase 6)**: Depends on US1 (needs DirectoryCard to add status/actions)
- **US5 Social Icons (Phase 7)**: Depends on US1 (needs DirectoryCard for integration)
- **US6 Relationship Filter (Phase 8)**: Depends on US2 (needs DirectoryFilters component) + US4 (needs relationship display)
- **US7 Profile Completeness (Phase 9)**: Depends on Foundational only — independent of directory listing
- **US8 Proximity (Phase 10)**: Depends on US2 (needs sort dropdown in DirectoryFilters)
- **Polish (Phase 11)**: Depends on all stories being complete

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational
    ↓
    ├── Phase 3: US1 Browse (P1) ← MVP
    │       ↓
    │   Phase 4: US2 Search/Filter (P1)
    │       ↓
    │   Phase 10: US8 Proximity (P3)
    │
    ├── Phase 3: US1 Browse (P1)
    │       ↓
    │   Phase 6: US4 Relationships (P2)
    │       ↓
    │   Phase 8: US6 Rel. Filter (P2) ← also needs US2
    │
    ├── Phase 3: US1 Browse (P1)
    │       ↓
    │   Phase 7: US5 Social Icons (P2)
    │
    ├── Phase 5: US3 Visibility (P1) ← parallel with US1
    │
    └── Phase 9: US7 Completeness (P3) ← parallel with US1
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation (Constitution Principle II)
- Service layer before API route before UI components
- Core query logic before UI integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003, T004, T005, T006)
- US3 (Visibility) and US7 (Completeness) can start immediately after Foundational, in parallel with US1
- US4 (Relationships) and US5 (Social Icons) can start in parallel after US1 completes
- All test tasks marked [P] can run in parallel within their story phase
- DirectoryCard (T014) can be built in parallel with the service/route tasks

---

## Parallel Example: User Story 1

```bash
# Launch both US1 tests in parallel:
T010: "Integration test: directory lists only visible members in directory-listing.test.ts"
T011: "Integration test: cursor pagination + hasNextPage in directory-listing.test.ts"

# Then service + DirectoryCard in parallel:
T012: "Implement getDirectoryPage() in service.ts"
T014: "Create DirectoryCard component in packages/shared-ui/src/DirectoryCard/"

# Then sequential (depends on T012 + T014):
T013: "Implement GET /api/directory route in route.ts"
T015: "Create DirectoryList component"
T016: "Create directory page"
T017: "Loading skeleton and empty state"
```

## Parallel Example: After Foundational

```bash
# Three independent streams can begin simultaneously:
Stream A: US1 Browse (T010–T017), then US2 Filter (T018–T026)
Stream B: US3 Visibility (T027–T032) — completely independent
Stream C: US7 Completeness (T047–T050) — completely independent
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 — Browse Directory
4. **STOP and VALIDATE**: Directory displays paginated cards for opted-in members
5. Deploy/demo if ready — members can browse the community

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 Browse → Paginated directory works → **MVP!**
3. US2 Search/Filter → Discovery becomes useful → Deploy
4. US3 Visibility → Users can opt in → Deploy
5. US4 Relationships → Social actions from directory → Deploy
6. US5 Social Icons → Richer cards → Deploy
7. US6 Relationship Filter → Social management view → Deploy
8. US7 Completeness → Profile quality nudge → Deploy
9. US8 Proximity → Local discovery → Deploy
10. Polish → Ship quality

### Parallel Team Strategy

With multiple developers after Foundational:
- **Dev A**: US1 → US2 → US8 (listing → filtering → proximity)
- **Dev B**: US3 → US4 → US6 (visibility → relationships → rel. filter)
- **Dev C**: US5 + US7 (social icons + completeness — smaller scope)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (Constitution Principle II)
- All commands via WSL (Constitution Principle XIII)
- Commit after each task or logical group
- Reuse existing follow/block/mute endpoints from Spec 002 — no new mutation endpoints needed
- Profile completeness is a PURE FUNCTION — never stored in DB (FR-027)
- Social link visibility is filtered SERVER-SIDE in SQL, not client-side (Principle IV)
- Cursor is base64 opaque to client — decoded + Zod-validated server-side
