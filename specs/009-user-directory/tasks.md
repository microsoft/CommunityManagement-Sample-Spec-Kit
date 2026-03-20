# Tasks: User Directory

**Input**: Design documents from `/specs/009-user-directory/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Status** (as of branch review 2026-03-20):
- **Phases 1–5 implementation**: Mostly complete (P1 stories functional end-to-end)
- **Phases 6–11**: Partially complete — P2/P3 stories and polish remain
- See individual task checkboxes below; `[x]` = done, `[ ]` = outstanding

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

- [x] T001 Create directory structure per plan.md — `apps/web/src/lib/directory/`, `apps/web/src/app/api/directory/`, `apps/web/src/app/directory/` created. **Note**: `apps/web/src/components/directory/`, `apps/web/tests/integration/directory/`, `packages/shared-ui/src/DirectoryCard/`, and `packages/shared-ui/src/SocialIcons/` were NOT created; components are inline in `page.tsx` and tests are in `tests/integration/community/directory.test.ts`.
- [x] T002 Create database migration file — landed as `apps/web/src/db/migrations/007_user_directory.sql` (sequential migration number, not spec number). Adds `directory_visible` column and one partial index. **Note**: the 4→8 platform CHECK constraint expansion and the additional 4 partial indexes from data-model.md were not included; only the core `directory_visible` column and `idx_user_profiles_directory` index were added.
- [x] T003 [P] Create shared directory types in `packages/shared/src/types/directory.ts` — `DirectoryEntry`, `DirectorySearchParams`, `DirectorySearchResponse`, `SetDirectoryVisibilityRequest`, `DirectoryRelationshipFilter`, `DirectorySortOrder` exported. **Note**: uses `DirectorySearchParams` instead of `DirectoryQueryParams` and `DirectorySearchResponse` instead of `DirectoryResponse`; `ProfileCompleteness` interface not separately exported.
- [ ] T004 [P] Expand SocialPlatform type in `packages/shared/src/types/community.ts` — add 'tiktok', 'twitter_x', 'linkedin', 'threads' to the existing 4-value union type (FR-023, research R-1). **Still at 4 values: facebook/instagram/youtube/website.**
- [x] T005 [P] Create Zod validation schemas in `apps/web/src/lib/validation/directory-schemas.ts` — `directorySearchSchema` (q, cityId, role, verifiedTeacher, relationship, sort, cursor, limit) and `setDirectoryVisibilitySchema` implemented. **Note**: filed at `validation/directory-schemas.ts` rather than `lib/directory/schemas.ts`; country/continent params not included.
- [ ] T006 [P] Create PGlite test seed helpers in `apps/web/tests/integration/directory/helpers.ts` — seedDirectoryUsers() creating 10+ users with varied directory_visible states, roles, cities, teacher profiles, social links at various visibility levels, follow/block pairs, and mutual follows (friends). **Setup code is inline per-test in `community/directory.test.ts`; no reusable helper file.**

**Checkpoint**: Scaffolding complete — migration runnable, types importable, test DB harness available

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core service infrastructure that ALL user stories depend on — cursor utilities, base SQL query builder with block exclusion and social link visibility

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Implement cursor encode/decode utilities — implemented inline in `apps/web/src/lib/directory/service.ts` as `encodeCursor(displayName, userId)` / `decodeCursor(cursor)` using base64 JSON. **Note**: not extracted to a separate `cursor.ts` file.
- [x] T008 Implement base directory SQL query builder in `apps/web/src/lib/directory/service.ts` — `searchDirectory()` executes the core SELECT joining `user_profiles` + `cities` + `teacher_profiles` + `social_links` + `follows`, symmetric block exclusion via NOT EXISTS, social link visibility filtering at query time, self-exclusion, GROUP BY, LIMIT pageSize+1.
- [ ] T009 [P] Update existing Zod SocialPlatform schema in `apps/web/src/lib/validation/community-schemas.ts` (or equivalent) to match expanded 8-value enum — ensure Spec 002 validation layer accepts new platforms. **Not done — community-schemas.ts SocialPlatform still has 4 values.**

**Checkpoint**: Foundation ready — directory service can build and execute the core query; user story implementation can begin

---

## Phase 3: User Story 1 — Browse the Community Directory (Priority: P1) 🎯 MVP

**Goal**: Logged-in member sees a paginated list of opted-in members with avatar, name, city, role, teacher badge, and social link icon placeholders. Cursor-based pagination.

**Independent Test**: Log in, open /directory, verify only directory_visible=true users appear. Verify each card shows avatar/name/city/role/badge. Scroll to trigger load-more via cursor pagination.

### Tests for User Story 1

- [x] T010 [P] [US1] Integration test: directory lists only visible members + excludes self — covered in `apps/web/tests/integration/community/directory.test.ts` ("should only return directory_visible=true members", "should not include the viewer"). **Note**: at `community/` path instead of planned `directory/` path.
- [x] T011 [P] [US1] Integration test: cursor pagination + hasNextPage — covered in `apps/web/tests/integration/community/directory.test.ts` ("should paginate with cursor", "should return null nextCursor when no more pages"). **Note**: at `community/` path instead of planned `directory/` path.

### Implementation for User Story 1

- [x] T012 [US1] Implement getDirectoryPage() in `apps/web/src/lib/directory/service.ts` — implemented as `searchDirectory(viewerId, params)`, returns `{entries, nextCursor, total}`. **Note**: function is named `searchDirectory` not `getDirectoryPage`; returns `total` count instead of `hasNextPage`.
- [x] T013 [US1] Implement GET /api/directory route in `apps/web/src/app/api/directory/route.ts` — `requireAuth()`, Zod validation, `searchDirectory()` call, 401/400 error handling implemented.
- [ ] T014 [P] [US1] Create DirectoryCard component in `packages/shared-ui/src/DirectoryCard/DirectoryCard.tsx` — 5-file pattern (DirectoryCard.tsx, DirectoryCard.test.tsx, DirectoryCard.stories.tsx, index.web.tsx, index.native.tsx), display avatar (with placeholder fallback), display name, home city, default role badge, verified teacher badge slot, social icons slot (FR-002). **Not done — card is rendered inline in `apps/web/src/app/directory/page.tsx` as a `MemberCard` function component.**
- [ ] T015 [US1] Create DirectoryList component in `apps/web/src/components/directory/DirectoryList.tsx` — renders list of DirectoryCard, "Load more" button triggers cursor-based next-page fetch, manages entries + pagination state (FR-003). **Not done — list, pagination state, and "Load more" logic are all inline in `apps/web/src/app/directory/page.tsx`.**
- [x] T016 [US1] Create directory browse page in `apps/web/src/app/directory/page.tsx` — implemented as a `"use client"` component combining listing, filters, loading state, pagination, and empty state. **Note**: spec called for a server component; actual implementation is a client component with inline filter/list/pagination logic.
- [x] T017 [US1] Add loading skeleton and empty state to directory page — skeleton grid (`aria-busy="true"`) during initial load, "No members found" empty state, and "Loading…" label on the load-more button are all implemented inline in `page.tsx`.

**Checkpoint**: User Story 1 complete — directory page renders paginated member cards with cursor-based load-more

---

## Phase 4: User Story 2 — Search and Filter Directory Members (Priority: P1)

**Goal**: Member can filter by role, location, teacher status, text search, and sort by alphabetical/recently-joined. All filters combine with AND logic.

**Independent Test**: Filter by role "Flyer" — only Flyers appear. Add location "Bristol" — only Flyers in Bristol. Type partial name — results narrow. Sort by "recently joined" — newest first. Clear all filters — full directory returns.

### Tests for User Story 2

- [x] T018 [P] [US2] Integration test: role filter — covered in `apps/web/tests/integration/community/directory.test.ts` ("role filter" describe block). **Note**: at `community/` path.
- [ ] T019 [P] [US2] Integration test: location filters (city, country, continent) in `apps/web/tests/integration/directory/directory-filters.test.ts` — seed users across Bristol/London/Paris, filter country=UK, assert only UK users (FR-006). **City filter is tested in `community/directory.test.ts`; country and continent filter tests are missing.**
- [x] T020 [P] [US2] Integration test: teacher filter + text search + AND combination — "verified teacher filter" and "text search" describe blocks in `community/directory.test.ts` cover these. **Note**: AND combination not explicitly tested.
- [ ] T020a [P] [US2] Integration test: alphabetical sort returns A→Z order and recently-joined sort returns newest-first in `apps/web/tests/integration/directory/directory-sort.test.ts` — seed 5 users with known names and creation dates, verify sort order for both modes (FR-010, US2-AS7). **Not done.**

### Implementation for User Story 2

- [x] T021 [US2] Add role filter clause to directory query builder — `AND up.default_role = $role` implemented in `service.ts`.
- [x] T022 [US2] Add location filter clauses to directory query builder — city filter via `up.home_city_id = $cityId` implemented. **Note**: only city-level filtering is implemented via `cityId`; country and continent level filters are not implemented (the service accepts `cityId` only, not `country`/`continent` params per the spec).
- [x] T023 [US2] Add teacher-only and text search filter clauses — `verifiedTeacher` filter (`tp.badge_status = 'verified'`) and ILIKE text search on `display_name` and `bio` implemented in `service.ts`.
- [x] T024 [US2] Add alphabetical and recently-joined sort modes — `name` (alphabetical) and `proximity` sort modes implemented. **Note**: recently-joined (`recent` / `created_at DESC`) sort mode from the spec is not implemented; the two modes are `name` and `proximity`.
- [x] T025 [US2] Create DirectoryFilters component — role dropdown, relationship filter, teacher toggle, sort selector, and debounced text search input are all implemented inline in `apps/web/src/app/directory/page.tsx`. **Note**: not extracted to a separate `DirectoryFilters.tsx` component.
- [ ] T026 [US2] Integrate DirectoryFilters with directory page — sync filter state to URL search params, re-fetch API on filter change, reset cursor on filter change, clear-all resets to unfiltered view (FR-011, FR-012). **Filter state is held in React state and passed to API fetch; it is NOT persisted to URL search params (browser back/forward and shareable URLs not supported). A "Clear all" button is also missing.**

**Checkpoint**: User Story 2 complete — all search, filter, and sort combinations work with AND logic

---

## Phase 5: User Story 3 — Directory Visibility Opt-In (Priority: P1)

**Goal**: User enables "Show me in the community directory" toggle in profile settings. Defaults false (privacy-first). Toggle on → appear in directory. Toggle off → disappear.

**Independent Test**: New user defaults to directory_visible=false. Enable toggle. Log in as another user — first user now appears in directory. Disable toggle — vanishes from results. Direct profile URL still works.

### Tests for User Story 3

- [x] T027 [P] [US3] Integration test: default directory_visible=false and toggle behavior — covered in `apps/web/tests/integration/community/directory.test.ts` ("should default to false for users with no profile", "should set visibility to true", "should toggle visibility back to false", "should only return directory_visible=true members"). **Note**: at `community/` path; API-level (PATCH) toggle test not present.
- [ ] T028 [P] [US3] Integration test: GDPR export includes directoryVisible + deletion clears it in `apps/web/tests/integration/directory/directory-visibility.test.ts` (FR-031, FR-032). **Not done.**
- [ ] T028a [P] [US3] Integration test: direct profile URL works even when directory_visible=false in `apps/web/tests/integration/directory/directory-visibility.test.ts` — set user's directory_visible=false, GET /api/profiles/:userId as another user, assert 200 with profile data (FR-015, US3-AS4). **Not done.**
- [ ] T028b [P] [US3] Integration test: PATCH /api/directory/visibility returns 401 for unauthenticated requests in `apps/web/tests/integration/directory/directory-visibility.test.ts` — verify auth enforcement on directoryVisible toggle (QG-10). **Not done.**

### Implementation for User Story 3

- [x] T029 [US3] Directory visibility toggle endpoint — implemented as `PATCH /api/directory/visibility` in `apps/web/src/app/api/directory/visibility/route.ts`. **Note**: spec called for extending `PATCH /api/profiles/me`; a dedicated `/api/directory/visibility` route was created instead.
- [ ] T030 [US3] Create DirectoryVisibilityToggle component in `apps/web/src/components/directory/DirectoryVisibilityToggle.tsx` — labeled toggle switch with i18n-ready "Show me in the community directory" label, calls PATCH /api/profiles/me (FR-014). **Not done — toggle is inline in `apps/web/src/app/settings/privacy/page.tsx`.**
- [x] T031 [US3] Add DirectoryVisibilityToggle to settings page — toggle added to `apps/web/src/app/settings/privacy/page.tsx`. **Note**: spec called for `settings/profile/page.tsx`; it was added to `settings/privacy/page.tsx` instead.
- [ ] T032 [US3] Update GDPR export in `apps/web/src/lib/gdpr/export.ts` to include directory_visible in user profile data section; update GDPR deletion in `apps/web/src/lib/gdpr/deletion.ts` to clear directory_visible on account delete (FR-031, FR-032). **Not done.**

**Checkpoint**: User Story 3 complete — users can opt in/out of directory; privacy-first default enforced; GDPR compliant

---

## Phase 6: User Story 4 — View and Manage Relationships from Directory (Priority: P2)

**Goal**: Each directory card shows relationship status (Friend/Following/Follows Me/None/Blocked). Follow/unfollow/block/unblock actions directly from card without page navigation. Optimistic UI updates.

**Independent Test**: Browse directory as user who follows some members and blocked one. Verify correct status per card. Click Follow — status updates to Following. Click Unfollow — reverts. Blocked users hidden (symmetric).

### Tests for User Story 4

- [x] T033 [P] [US4] Integration test: relationship status indicators in directory results — "relationship detection" describe block in `apps/web/tests/integration/community/directory.test.ts` covers none/following/follower/friend. **Note**: at `community/` path; blocked-pair status not verified in these tests.
- [x] T034 [P] [US4] Integration test: block exclusion is symmetric — "should not include blocked users" and "should not include users who blocked the viewer" tests in `community/directory.test.ts` cover symmetric hiding (FR-016).

### Implementation for User Story 4

- [x] T035 [US4] Add relationship status derivation to directory service — CASE expression in `service.ts` maps `f_out`/`f_in` JOINs to `friend`/`following`/`follower`/`none` enum values on each `DirectoryEntry`.
- [ ] T036 [US4] Add relationship status display to DirectoryCard in `packages/shared-ui/src/DirectoryCard/DirectoryCard.tsx` — badge/label showing Friend/Following/Follows you/None, style per status (FR-019). **Relationship badge is shown inline in the `MemberCard` function in `page.tsx` — no separate shared-ui DirectoryCard component exists.**
- [ ] T037 [US4] Add follow/unfollow action button to DirectoryCard — calls existing POST /api/follows and DELETE /api/follows/:userId, optimistic status toggle without full page reload (FR-020, FR-022). **Not done — no follow/unfollow action on directory cards.**
- [ ] T038 [US4] Add block/unblock action to DirectoryCard — calls existing POST /api/blocks and DELETE /api/blocks/:userId, optimistic removal from DirectoryList on block, confirmation dialog before blocking (FR-021, FR-022, FR-016). **Not done — no block/unblock action on directory cards.**

**Checkpoint**: User Story 4 complete — relationship status visible on every card; follow/block actions work inline with optimistic updates

---

## Phase 7: User Story 5 — Social Link Icons with Platform Branding (Priority: P2)

**Goal**: Directory cards show small branded icons for each visible social link (8 platforms). Clicking opens link in new tab. Visibility rules (public/friends_only) enforced server-side.

**Independent Test**: View card for user with instagram (public), linkedin (friends_only), tiktok (public). As non-friend: see instagram + tiktok icons, no linkedin. Click instagram icon — opens in new tab. Become friends — linkedin icon appears.

### Tests for User Story 5

- [x] T039 [P] [US5] Integration test: social link visibility filtering (everyone, followers, friends, hidden) — "social link visibility" describe block in `apps/web/tests/integration/community/directory.test.ts` covers `everyone` vs `friends` visibility tiers. **Note**: at `community/` path; `followers` and `hidden` visibility levels not explicitly tested.**

### Implementation for User Story 5

- [ ] T040 [P] [US5] Create SocialIcons component in `packages/shared-ui/src/SocialIcons/` — 5-file pattern (SocialIcons.tsx, SocialIcons.test.tsx, SocialIcons.stories.tsx, index.web.tsx, index.native.tsx), accepts VisibleSocialLink[], renders platform brand icon per platform, each icon is an anchor with target="_blank" rel="noopener noreferrer" (FR-023, FR-024, FR-025). **Not done — social links are rendered inline in `page.tsx` using text abbreviations (IG/YT/FB/🌐) rather than proper SVG brand icons, and only 4 platforms are in the map (missing tiktok/twitter_x/linkedin/threads).**
- [ ] T041 [US5] Create platform icon asset map in `packages/shared-ui/src/SocialIcons/icons.ts` — map SocialPlatform → SVG icon component for facebook, instagram, youtube, website, tiktok, twitter_x, linkedin, threads (FR-024). **Not done.**
- [ ] T042 [US5] Integrate SocialIcons into DirectoryCard — render below city/role area, hide entire social section when visibleSocialLinks is empty for clean card layout (FR-025, edge case). **Partial — social links are rendered inline in `page.tsx`; section is hidden when empty but uses text abbreviations not brand icons.**

**Checkpoint**: User Story 5 complete — social link icons render with correct platform branding and visibility enforcement

---

## Phase 8: User Story 6 — Filter by Relationship Type (Priority: P2)

**Goal**: Member can filter directory to Friends, Following, Followers, or Blocked. The "Blocked" filter shows their block list for management with unblock actions.

**Independent Test**: As user with 5 follows, 3 followers (2 mutual), 1 blocked — filter "Friends" → 2 results. "Following" → 5. "Blocked" → 1 with Unblock action.

### Tests for User Story 6

- [ ] T043 [P] [US6] Integration test: relationship filters (friends, following, followers, blocked) in `apps/web/tests/integration/directory/directory-relationships.test.ts` — seed known relationship graph, verify each filter returns correct subset, verify "blocked" filter inverts standard block exclusion (FR-007). **Partially covered — "relationship filter" describe in `community/directory.test.ts` tests `friends` and `following`; `followers` and `blocked` filter tests are missing.**

### Implementation for User Story 6

- [x] T044 [US6] Add relationship filter clauses to directory query builder — `following`/`followers`/`friends` filters implemented in `service.ts` using `f_out`/`f_in` JOIN conditions. **Note**: `blocked` filter (inverts standard block exclusion to show block list) is NOT implemented.
- [ ] T045 [US6] Add relationship filter dropdown to DirectoryFilters component in `apps/web/src/components/directory/DirectoryFilters.tsx` — Friends/Following/Followers/Blocked options, combine with other active filters via AND logic (FR-007, FR-011). **The relationship dropdown in `page.tsx` has Friends/Following/Followers but not Blocked. No separate component.**
- [ ] T046 [US6] Handle "Blocked" filter special case in DirectoryList — show unblock action on each card, skip standard block exclusion for this filter, apply directory_visible=true only for non-blocked filters (FR-007, US6-AS4). **Not done.**

**Checkpoint**: User Story 6 complete — all relationship filters work individually and combined with other filters

---

## Phase 9: User Story 7 — Profile Completeness Indicator (Priority: P3)

**Goal**: User sees a completeness percentage on their own profile: avatar (20%) + display name (20%) + bio (20%) + home city (20%) + ≥1 social link (20%). Computed at render time, not stored. Not shown on other users' profiles.

**Independent Test**: Own profile with only display name → 20%. Add avatar + bio → 60%. Add city + social link → 100%. View someone else's profile → no completeness indicator.

### Tests for User Story 7

- [x] T047 [P] [US7] Unit test: computeProfileCompleteness pure function — "profile completeness" describe block in `apps/web/tests/integration/community/directory.test.ts` tests 0% and partial completeness. **Note**: at `community/` path; not all 2^5 field combinations are tested.**

### Implementation for User Story 7

- [x] T048 [US7] Implement computeProfileCompleteness() — implemented inline in `service.ts` as `computeCompleteness(row)`. Scores `avatarUrl` (20%), `displayName` (20%), `bio` (20%), `homeCityId` (20%), and social links count (20%). **Note**: not extracted to a standalone `completeness.ts` file; not a pure function (reads from the DB row struct).
- [ ] T049 [US7] Create ProfileCompleteness component in `apps/web/src/components/directory/ProfileCompleteness.tsx` — progress bar/ring showing percentage, field-by-field breakdown with check/missing indicators, i18n-ready labels (FR-026). **Not done — completeness score is displayed inline in `page.tsx` as a thin progress bar when `isOwn` is true, but there is no separate component and no field-by-field breakdown.**
- [ ] T050 [US7] Add ProfileCompleteness to own profile settings page in `apps/web/src/app/settings/profile/page.tsx` — render above directory visibility toggle, pass current profile data, show only for own profile (FR-026, FR-028). **Not done — completeness only appears on the directory card for the viewer's own entry, not on the profile settings page.**

**Checkpoint**: User Story 7 complete — profile completeness visible on own profile only, computed client-side

---

## Phase 10: User Story 8 — Proximity-Based Browsing (Priority: P3)

**Goal**: "People near me" sort groups results by geographic proximity: same city → same country → same continent → global, using the geography hierarchy. Falls back to alphabetical if viewer has no home city.

**Independent Test**: As user in Bristol (UK, Europe), sort by proximity — Bristol members first, then UK, then Europe, then global. Within each tier, sub-sorted alphabetically.

### Tests for User Story 8

- [ ] T051 [P] [US8] Integration test: proximity sort tiers + sub-sort + no-city fallback in `apps/web/tests/integration/directory/directory-proximity.test.ts` — seed users in Bristol/London/Paris/Tokyo, verify tier ordering 1→2→3→4 and alphabetical sub-sort within tiers; test viewer with no home city falls back to pure alphabetical (FR-029, FR-030). **Not done.**

### Implementation for User Story 8

- [x] T052 [US8] Add proximity sort mode to directory query builder — `proximity` sort uses a CASE expression grouping by `home_city_id` match (tier 0), then `country_id` match (tier 1), then global (tier 2), with `display_name ASC` sub-sort. **Note**: continent-level tier (tier 3) from the spec is not implemented; only city/country/global three tiers.**
- [ ] T053 [US8] Handle viewer-no-city fallback in directory service — when viewer's home_city_id IS NULL, set all tiers to 4 (global) which degrades to alphabetical sort (FR-030). **Not explicitly handled — if viewer has no city, the sub-query for city/country tiers will return NULL and all members may land in tier 2 (global), producing an alphabetical result, but this is implicit rather than the explicit guard from the spec.**
- [x] T054 [US8] Add "People near me" proximity sort option to DirectoryFilters sort dropdown — implemented in `page.tsx` as `{ value: "proximity", label: "Near me" }`.

**Checkpoint**: User Story 8 complete — proximity browsing groups members by geographic distance with graceful fallback

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: i18n, accessibility, GDPR edge cases, and validation across all user stories

- [ ] T055 [P] Extract all directory UI strings to i18n namespace in `apps/web/src/` — filter labels, sort options, empty states ("No members found matching your search"), relationship statuses, "Show me in the community directory", "People near me", profile completeness field labels (FR-035). **Not done — all strings are hardcoded in `page.tsx` and `settings/privacy/page.tsx`.**
- [ ] T056 [P] Accessibility audit for directory page — keyboard navigation for all filter controls, focus management on load-more, ARIA labels on filter dropdowns and toggle, screen reader text for DirectoryCard content, skip-to-content link. **Partially done — `aria-label` attributes exist on filter inputs and the load-more button; `aria-busy` is set during loading. Full audit (focus management, keyboard trap testing, skip link) not completed.**
- [ ] T057 [P] Add aria-labels and sr-only text to SocialIcons component — each icon must have accessible name identifying platform ("Instagram profile", "LinkedIn profile", etc.) (FR-024). **Partially done — inline social link anchors in `page.tsx` have `aria-label="{name} on {platform}"`. Blocked on T040 (no separate SocialIcons component).**
- [ ] T058 [P] Verify muted users still appear in directory results — add regression test confirming mute does NOT affect directory presence per FR-017 in `apps/web/tests/integration/directory/directory-relationships.test.ts`. **Not done.**
- [ ] T059 Run quickstart.md end-to-end smoke test — verify all curl examples work, test commands pass, seed data scenarios produce expected results, migration applies and rolls back cleanly. **Not done.**

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

---

## What Needs to Happen Next

This section summarises the outstanding work identified during the branch review (2026-03-20).

### Must-Do Before Merge (P1 gaps)

These items are either required for correctness/compliance or are P1 user story gaps:

1. **T026** — Sync filter state to URL search params so the directory page is bookmarkable and supports browser back/forward. Add a "Clear all" filters button.
2. **T032** — Update GDPR export (`apps/web/src/lib/gdpr/full-export.ts`) to include `directory_visible` in the user profile section, and update GDPR deletion to reset `directory_visible = false` on account deletion (FR-031, FR-032).
3. **T009** — Expand `SocialPlatform` in `apps/web/src/lib/validation/community-schemas.ts` from 4 → 8 values to match T003/T004 — otherwise the Zod validation layer will reject valid social link platforms from the expanded enum.
4. **T004** — Expand `SocialPlatform` type in `packages/shared/src/types/community.ts` from 4 → 8 values (tiktok, twitter_x, linkedin, threads) to match what the directory service and types already support.
5. **T028b** — Add an integration test asserting `PATCH /api/directory/visibility` returns 401 when unauthenticated (auth enforcement regression test, QG-10).

### Recommended Before Merge (P2 — quality & completeness)

6. **T037** — Add follow/unfollow action buttons to directory cards (FR-020). Reuse existing `POST /api/follows` and `DELETE /api/follows/:userId` endpoints; optimistic UI update.
7. **T038** — Add block/unblock action to directory cards (FR-021). Reuse existing `POST /api/blocks` / `DELETE /api/blocks/:userId`; optimistic removal from list; confirmation dialog.
8. **T044/T045/T046** — Add `blocked` option to the relationship filter dropdown and implement the inverted block-exclusion query clause so members can manage their block list from the directory.
9. **T040/T041/T042** — Replace the inline text-abbreviation social icons (IG/YT/FB) with proper SVG brand icons in a new `packages/shared-ui/src/SocialIcons/` component covering all 8 platforms. Add `rel="noopener noreferrer"` to all social link anchors if not already present.
10. **T022 (country/continent)** — Extend the location filter to accept `country` and `continent` params (currently only `cityId` is supported). Update `directorySearchSchema` and the service query builder.
11. **T024 (recently-joined sort)** — Add a `recent` sort mode (`ORDER BY u.created_at DESC, up.user_id ASC`) alongside the existing `name` and `proximity` modes.
12. **T050** — Surface the profile completeness indicator (currently computed but only visible on the directory card for one's own entry) on the `settings/profile` page with a field-by-field breakdown, so users know what to fill in.
13. **T058** — Add a regression test confirming muted users are NOT excluded from directory results (FR-017). The current query doesn't join `mutes`, but an explicit test prevents future regressions.

### Nice-to-Have (P3 — polish)

14. **T014/T015** — Extract the inline `MemberCard` and list/pagination logic in `page.tsx` into separate `packages/shared-ui/src/DirectoryCard/` and `apps/web/src/components/directory/DirectoryList.tsx` components following the 5-file shared-ui pattern.
15. **T049** — Create a standalone `ProfileCompleteness` component with a progress ring and field-by-field breakdown for reuse on the settings page.
16. **T053** — Add an explicit guard in the proximity sort path: when the viewer has no `home_city_id`, skip the correlated sub-queries and fall back directly to `display_name ASC` sort to avoid unnecessary DB work.
17. **T051** — Write an integration test for proximity sort tiers (city → country → continent → global) and the no-city fallback.
18. **T055** — Extract all hardcoded UI strings (filter labels, empty states, relationship badges, toggle label) to an i18n namespace.
19. **T056/T057** — Complete the accessibility audit: focus management after "Load more", skip-to-content link, full keyboard-navigation pass.
20. **T059** — Run the quickstart.md smoke-test end-to-end and fix any curl command or seed-data discrepancies.
