# Tasks: WCAG Accessibility Audit & Remediation

**Input**: Design documents from `/specs/019-accessibility-audit/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/a11y-testing-contract.md, quickstart.md

**Tests**: Tests are included — the spec explicitly requires automated accessibility testing (FR-032–FR-035) and Constitution Principle II mandates test-first development. Component `*.a11y.test.tsx` and page-level `*.a11y.spec.ts` tests are integral deliverables.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. This feature is a UI-layer audit/remediation with no database changes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo**: `packages/tokens/src/`, `packages/shared-ui/src/`, `apps/web/src/`, `apps/mobile/`
- Tokens: `packages/tokens/src/*.tokens.json`
- Shared UI: `packages/shared-ui/src/{Component}/`
- Web app: `apps/web/src/app/`, `apps/web/src/components/`, `apps/web/src/hooks/`
- Web E2E: `apps/web/e2e/a11y/`
- Mobile: `apps/mobile/app/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dev dependencies, update design tokens, and establish global accessibility foundation styles that all subsequent phases depend on.

- [x] T001 Install `vitest-axe` as devDependency in `packages/shared-ui/package.json`
- [ ] T002 Install `@axe-core/playwright` as devDependency in `apps/web/package.json`
- [x] T003 [P] Fix colour contrast tokens: update `color.semantic.warning` from `#F59E0B` to `#B45309`, `color.semantic.success` from `#10B981` to `#047857`, `color.category.social` from `#F59E0B` to `#B45309`, and `color.dark.category.social` from `#FBBF24` to `#FCD34D` in `packages/tokens/src/color.tokens.json`
- [x] T004 [P] Add new accessibility tokens: `global.focus-ring-width` (2px), `global.focus-ring-offset` (2px), `global.min-touch-target` (44px) in `packages/tokens/src/global.tokens.json`
- [x] T005 Rebuild design tokens by running `npm run tokens:build` to propagate token changes
- [x] T006 [P] Add global `focus-visible` outline styles using `focus-ring-width` and `focus-ring-offset` tokens in `apps/web/src/app/globals.css`
- [x] T007 [P] Add global `@media (prefers-reduced-motion: reduce)` rule to disable non-essential animations in `apps/web/src/app/globals.css`
- [x] T008 [P] Add `.skip-link` CSS styles (sr-only default, visible on `:focus`) in `apps/web/src/app/globals.css`
- [ ] T009 Create axe-core shared configuration with WCAG 2.1 AA ruleset and Leaflet waiver in `apps/web/src/test/a11y/axe-config.ts`
- [ ] T010 [P] Create shared vitest-axe test helper with `toHaveNoViolations` extension in `packages/shared-ui/src/__tests__/a11y-helpers.ts`
- [ ] T011 [P] Add `test:a11y` npm script to root `package.json` and workspace `package.json` files for shared-ui and web

**Checkpoint**: Foundation tokens rebuilt, global CSS rules active, test infrastructure ready. All subsequent phases can now consume updated tokens and test helpers.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create new shared components and hooks that multiple user stories depend on. MUST be complete before any user story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T012 Create `SkipLink` shared interface with `targetId` and `label` props in `packages/shared-ui/src/SkipLink/SkipLink.tsx`
- [x] T013 Implement `SkipLink` web version as visually-hidden `<a>` with `:focus` visibility in `packages/shared-ui/src/SkipLink/index.web.tsx`
- [x] T014 [P] Implement `SkipLink` native version as no-op component in `packages/shared-ui/src/SkipLink/index.native.tsx`
- [x] T015 Write SkipLink unit test verifying visibility on focus and target navigation in `packages/shared-ui/src/SkipLink/SkipLink.test.tsx`
- [ ] T016 Write SkipLink axe-core accessibility test in `packages/shared-ui/src/SkipLink/SkipLink.a11y.test.tsx`
- [x] T017 Export SkipLink from shared-ui barrel file in `packages/shared-ui/src/index.ts`
- [x] T018 Create `useRovingTabIndex` hook implementing the ARIA APG roving tabindex pattern (ArrowUp/Down/Left/Right, Home/End, tabIndex management) in `apps/web/src/hooks/useRovingTabIndex.ts`
- [x] T019 Write unit tests for `useRovingTabIndex` covering arrow key navigation, Home/End, expand/collapse, and tabIndex state in `apps/web/src/hooks/__tests__/useRovingTabIndex.test.ts`

**Checkpoint**: SkipLink component and roving tabindex hook ready. User story implementation can now begin in parallel.

---

## Phase 3: User Story 1 — Keyboard-Only Navigation Across All Pages (Priority: P1) 🎯 MVP

**Goal**: Every interactive element on every page is reachable and operable via keyboard only. Visible focus indicators on all interactive elements. Complex widgets (LocationTree, Calendar) support full arrow-key navigation per ARIA APG.

**Independent Test**: Unplug the mouse, start at the home page, Tab through every core flow (browse events, event detail, RSVP, teacher profile, directory, explorer, settings). Every element must receive visible focus and be operable.

### Implementation for User Story 1

- [x] T020 [US1] Add SkipLink as first child of `<body>` and wrap `{children}` in `<div id="main-content" tabIndex={-1}>` in `apps/web/src/app/layout.tsx`
- [ ] T021 [P] [US1] Add `focus-visible` outline using token-based CSS to Button component in `packages/shared-ui/src/Button/index.web.tsx`
- [x] T022 [P] [US1] Fix EventCard semantics: add Space key handler alongside Enter in `packages/shared-ui/src/EventCard/index.web.tsx`
- [x] T023 [P] [US1] Fix TeacherCard semantics: add Space key handler alongside Enter in `packages/shared-ui/src/TeacherCard/index.web.tsx`
- [x] T024 [P] [US1] Fix DirectoryCard semantics: add Space key handler alongside Enter in `packages/shared-ui/src/DirectoryCard/index.web.tsx`
- [ ] T025 [US1] Integrate `useRovingTabIndex` into LocationTree: implement ArrowUp/Down/Left/Right, Home/End, add `aria-level` on treeitems, add `role="group"` with `aria-label` on child containers in `packages/shared-ui/src/LocationTree/index.web.tsx`
- [ ] T026 [US1] Add arrow-key navigation to CalendarPanel: Left/Right for prev/next day, Up/Down for prev/next week, Home/End for first/last day of week, PageUp/PageDown for prev/next month in `apps/web/src/components/events/CalendarPanel.tsx`
- [ ] T027 [P] [US1] Ensure event filter pills and toggle buttons are activatable via Enter and Space when focused in `apps/web/src/components/events/EventFilters.tsx`
- [ ] T028 [P] [US1] Add keyboard-accessible zoom controls and marker selection (or verify accessible list-view alternative exists) for MapPanel in `apps/web/src/components/events/MapPanel.tsx`
- [ ] T029 [US1] Add ESC handler to close mobile nav, add `aria-controls` linking hamburger to nav panel in `apps/web/src/components/NavHeader.tsx`
- [ ] T030 [US1] Fix ExplorerShell tab pattern: add `aria-controls` linking tabs to panels, add unique `id` on each panel, verify Tab/Enter activation in `apps/web/src/components/events/ExplorerShell.tsx`

**Checkpoint**: All interactive elements are keyboard-navigable with visible focus indicators. LocationTree and Calendar have full arrow-key support. Core user flows are completable without a mouse.

---

## Phase 4: User Story 2 — Screen Reader Compatibility Across All Pages (Priority: P1)

**Goal**: Every page has correct landmark regions, logical heading hierarchy, meaningful accessible names on all controls, and ARIA live regions for dynamic content changes.

**Independent Test**: Enable VoiceOver/NVDA/TalkBack, navigate every page by landmarks and headings. Verify all interactive elements announce name/role/state. Trigger dynamic updates (RSVP, filter, toast) and verify announcements.

### Implementation for User Story 2

- [ ] T031 [US2] Verify and fix `<h1>` heading + sequential heading hierarchy (h1→h2→h3, no skipped levels) on home page in `apps/web/src/app/page.tsx`
- [ ] T032 [P] [US2] Verify and fix heading hierarchy on events listing page in `apps/web/src/app/events/page.tsx`
- [ ] T033 [P] [US2] Verify and fix heading hierarchy on events explorer page in `apps/web/src/app/events/explorer/page.tsx` (or relevant route)
- [ ] T034 [P] [US2] Verify and fix heading hierarchy on event detail page in `apps/web/src/app/events/[id]/page.tsx`
- [ ] T035 [P] [US2] Verify and fix heading hierarchy on teachers directory page in `apps/web/src/app/teachers/page.tsx`
- [ ] T036 [P] [US2] Verify and fix heading hierarchy on teacher profile page in `apps/web/src/app/teachers/[id]/page.tsx`
- [ ] T037 [P] [US2] Verify and fix heading hierarchy on user directory page in `apps/web/src/app/directory/page.tsx`
- [ ] T038 [P] [US2] Verify and fix heading hierarchy on login page in `apps/web/src/app/login/page.tsx`
- [ ] T039 [P] [US2] Verify and fix heading hierarchy on all settings pages: `apps/web/src/app/settings/page.tsx`, `settings/account/page.tsx`, `settings/notifications/page.tsx`, `settings/privacy/page.tsx`, `settings/teacher/page.tsx`
- [ ] T040 [P] [US2] Verify and fix heading hierarchy on profile, bookings, and notifications pages in `apps/web/src/app/profile/page.tsx`, `apps/web/src/app/bookings/page.tsx`, `apps/web/src/app/notifications/page.tsx`
- [ ] T041 [P] [US2] Verify and fix heading hierarchy on admin pages in `apps/web/src/app/admin/page.tsx` and sub-routes
- [ ] T042 [P] [US2] Verify and fix heading hierarchy on concessions and event-groups pages in `apps/web/src/app/concessions/page.tsx`, `apps/web/src/app/event-groups/page.tsx`
- [ ] T043 [US2] Verify landmark structure (banner, navigation, main, contentinfo) is present on all pages via layout.tsx and NavHeader — fix any missing landmarks in `apps/web/src/app/layout.tsx`
- [ ] T044 [P] [US2] Add meaningful `aria-label` to all icon-only buttons (close, notification bell, social icons) in `packages/shared-ui/src/SocialIcons/index.web.tsx` and `apps/web/src/components/NotificationBell.tsx`
- [ ] T045 [P] [US2] Ensure star ratings and verification badges announce as meaningful text (e.g., "4.5 out of 5 stars", "Verified teacher") in `packages/shared-ui/src/TeacherCard/index.web.tsx` and teacher profile page
- [x] T046 [US2] Add `aria-atomic="true"` to Toast live region in `packages/shared-ui/src/Toast/index.web.tsx`
- [ ] T047 [US2] Add `aria-live="polite"` live region announcing updated result count when filters change in `apps/web/src/components/events/ExplorerShell.tsx`
- [ ] T048 [US2] Ensure RSVP confirmation message uses `aria-live="assertive"` to auto-announce in `apps/web/src/components/events/EventDetailPage.tsx`
- [ ] T049 [P] [US2] Ensure all decorative images use `aria-hidden="true"` or empty `alt=""` and all informational images have descriptive `alt` text across all shared-ui components

**Checkpoint**: Screen reader users can navigate by landmarks and headings on all pages. All interactive elements announce name/role/state. Dynamic updates are announced automatically.

---

## Phase 5: User Story 3 — Focus Management in Modals and Dialogs (Priority: P1)

**Goal**: Modal focus trapping, focus restoration on close, and skip-to-content link on every page.

**Independent Test**: Open any modal via keyboard, verify focus moves into modal, Tab cycles within modal only, Escape closes and restores focus to trigger. On any page, verify first Tab shows "Skip to main content" link that bypasses navigation.

### Implementation for User Story 3

- [x] T050 [US3] Add `aria-modal="true"` attribute to the `<dialog>` element in `packages/shared-ui/src/Modal/index.web.tsx`
- [x] T051 [US3] Capture `document.activeElement` as trigger reference before calling `showModal()` in `packages/shared-ui/src/Modal/index.web.tsx`
- [x] T052 [US3] Move focus to first focusable child inside modal on open via `useEffect` in `packages/shared-ui/src/Modal/index.web.tsx`
- [x] T053 [US3] Restore focus to captured trigger element on modal close in `packages/shared-ui/src/Modal/index.web.tsx`
- [ ] T054 [US3] Write Modal accessibility test verifying: focus moves into modal on open, Tab cycles within modal only, Escape closes modal, focus restores to trigger, `aria-modal="true"` present in `packages/shared-ui/src/Modal/Modal.a11y.test.tsx`
- [ ] T055 [US3] Verify SharePanel modal (event detail page) correctly traps focus and restores on close in `apps/web/src/components/events/SharePanel.tsx`

**Checkpoint**: All modals trap focus, restore focus on close, and support Escape dismissal. Skip link works on every page (implemented in T020).

---

## Phase 6: User Story 4 — Accessible Forms with Clear Error Feedback (Priority: P2)

**Goal**: All form fields have programmatic labels, required indicators, error associations, and format guidance announced by screen readers.

**Independent Test**: Navigate to each settings page with a screen reader. Verify label/description announced on focus, required status announced, submit with errors to verify error messages are associated and announced.

### Implementation for User Story 4

- [x] T056 [P] [US4] Verify/add programmatic `<label>` associations and `aria-required` on all Input fields in `packages/shared-ui/src/Input/index.web.tsx`
- [x] T057 [P] [US4] Verify/add programmatic `<label>` associations and `aria-required` on all TextArea fields in `packages/shared-ui/src/TextArea/index.web.tsx`
- [x] T058 [P] [US4] Verify/add programmatic `<label>` associations and `aria-required` on all Select fields in `packages/shared-ui/src/Select/index.web.tsx`
- [ ] T059 [US4] Ensure validation error messages use `aria-describedby` to associate errors with their fields, and errors are announced via `aria-live` in `packages/shared-ui/src/Input/index.web.tsx`, `TextArea/index.web.tsx`, `Select/index.web.tsx`
- [ ] T060 [US4] Add format guidance (e.g., `aria-describedby` pointing to help text) for fields expecting specific formats (URLs, dates) across form components
- [ ] T061 [US4] Fix notification preferences table: ensure each checkbox announces both row header (notification type) and column header (channel) via `<th scope="row">`, `<th scope="col">`, and proper `<td>` associations in `apps/web/src/components/NotificationPreferences.tsx` (or `apps/web/src/app/settings/notifications/page.tsx`)
- [ ] T062 [P] [US4] Write axe-core a11y test for Input component in `packages/shared-ui/src/Input/Input.a11y.test.tsx`
- [ ] T063 [P] [US4] Write axe-core a11y test for TextArea component in `packages/shared-ui/src/TextArea/TextArea.a11y.test.tsx`
- [ ] T064 [P] [US4] Write axe-core a11y test for Select component in `packages/shared-ui/src/Select/Select.a11y.test.tsx`

**Checkpoint**: All forms are fully accessible — labels, required indicators, error associations, and format guidance all work with screen readers.

---

## Phase 7: User Story 5 — Sufficient Colour Contrast in All Visual States (Priority: P2)

**Goal**: All text meets AA contrast minimums. Non-text UI components meet 3:1 contrast. No information conveyed by colour alone.

**Independent Test**: Audit every page with a contrast-checking tool across all states (default, hover, focus, active, disabled). Verify non-colour cues accompany all colour-coded indicators.

### Implementation for User Story 5

> Note: Token-level contrast fixes were completed in Phase 1 (T003). This phase addresses component-level colour-only information patterns and visual state contrast.

- [ ] T065 [P] [US5] Add non-colour cues (icons or shapes) alongside colour-coded event category badges in `packages/shared-ui/src/CategoryLegend/index.web.tsx`
- [ ] T066 [P] [US5] Add non-colour cues alongside category indicators on EventCard in `packages/shared-ui/src/EventCard/index.web.tsx`
- [ ] T067 [P] [US5] Ensure map markers use distinct shapes or icons per category (not colour alone) in `apps/web/src/components/events/MapMarkerPopup.tsx` and `MapPanel.tsx`
- [ ] T068 [P] [US5] Verify disabled form elements are distinguishable via means beyond colour (e.g., reduced opacity + visual indicator) in `packages/shared-ui/src/Button/index.web.tsx`, `Input/index.web.tsx`
- [ ] T069 [US5] Audit Badge component for contrast compliance across all variants (default, success, warning, error) in `packages/shared-ui/src/Badge/index.web.tsx`
- [ ] T070 [P] [US5] Write axe-core a11y test for CategoryLegend component in `packages/shared-ui/src/CategoryLegend/CategoryLegend.a11y.test.tsx`
- [ ] T071 [P] [US5] Write axe-core a11y test for Badge component in `packages/shared-ui/src/Badge/Badge.a11y.test.tsx`

**Checkpoint**: All text and non-text elements meet AA contrast minimums. Colour is never the sole differentiator for information.

---

## Phase 8: User Story 6 — Respecting Motion and Animation Preferences (Priority: P2)

**Goal**: When `prefers-reduced-motion: reduce` is active, all non-essential animations are removed or replaced with simple opacity transitions. Essential loading indicators remain functional but simplified.

**Independent Test**: Enable "Reduce motion" in OS settings. Navigate the platform — skeleton shimmers, card hovers, toast slide-ins, and page transitions should be eliminated or replaced with opacity changes. Loading spinners still indicate progress.

### Implementation for User Story 6

> Note: The global `@media (prefers-reduced-motion: reduce)` rule was added in Phase 1 (T007). This phase handles component-specific overrides.

- [x] T072 [P] [US6] Replace Skeleton pulse animation with static 60% opacity when reduced-motion is active in `packages/shared-ui/src/Skeleton/index.web.tsx`
- [x] T073 [P] [US6] Replace LoadingSpinner continuous spin with opacity pulse at low frequency when reduced-motion is active in `packages/shared-ui/src/LoadingSpinner/index.web.tsx`
- [ ] T074 [P] [US6] Remove or simplify Toast slide-in animation to instant appearance when reduced-motion is active in `packages/shared-ui/src/Toast/index.web.tsx`
- [ ] T075 [P] [US6] Replace card hover scale/transform effects with simple opacity/colour change when reduced-motion is active in `packages/shared-ui/src/EventCard/index.web.tsx`, `TeacherCard/index.web.tsx`, `DirectoryCard/index.web.tsx`
- [ ] T076 [P] [US6] Write axe-core a11y test for Skeleton component in `packages/shared-ui/src/Skeleton/Skeleton.a11y.test.tsx`
- [ ] T077 [P] [US6] Write axe-core a11y test for LoadingSpinner component in `packages/shared-ui/src/LoadingSpinner/LoadingSpinner.a11y.test.tsx`
- [ ] T078 [P] [US6] Write axe-core a11y test for Toast component in `packages/shared-ui/src/Toast/Toast.a11y.test.tsx`

**Checkpoint**: Zero non-essential animations play when reduced-motion is enabled. Essential indicators remain functional. Default experience is unchanged.

---

## Phase 9: User Story 7 — Mobile Accessibility on Touch Devices (Priority: P3)

**Goal**: All mobile touch targets ≥ 44×44px. Native accessibility props (`accessible`, `accessibilityLabel`, `accessibilityRole`, `accessibilityState`) on all interactive components. Gesture alternatives provided.

**Independent Test**: Open mobile app with TalkBack/VoiceOver. Verify all interactive elements announce label and role. Measure touch targets ≥ 44×44. Verify gesture alternatives exist for pinch-to-zoom and swipe.

### Implementation for User Story 7

- [ ] T079 [P] [US7] Add `accessible`, `accessibilityLabel`, `accessibilityRole` props to Button native implementation in `packages/shared-ui/src/Button/index.native.tsx`
- [ ] T080 [P] [US7] Add `accessible`, `accessibilityLabel`, `accessibilityRole` props to EventCard native implementation in `packages/shared-ui/src/EventCard/index.native.tsx`
- [ ] T081 [P] [US7] Add `accessible`, `accessibilityLabel`, `accessibilityRole` props to TeacherCard native implementation in `packages/shared-ui/src/TeacherCard/index.native.tsx`
- [ ] T082 [P] [US7] Add `accessible`, `accessibilityLabel`, `accessibilityRole` props to DirectoryCard native implementation in `packages/shared-ui/src/DirectoryCard/index.native.tsx`
- [ ] T083 [P] [US7] Add `accessible`, `accessibilityLabel`, `accessibilityRole` props to Modal native implementation in `packages/shared-ui/src/Modal/index.native.tsx`
- [ ] T084 [P] [US7] Add `accessible`, `accessibilityLabel`, `accessibilityRole` props to Input, TextArea, Select native implementations in `packages/shared-ui/src/Input/index.native.tsx`, `TextArea/index.native.tsx`, `Select/index.native.tsx`
- [ ] T085 [P] [US7] Add `accessibilityLiveRegion="polite"` to Toast native implementation in `packages/shared-ui/src/Toast/index.native.tsx`
- [ ] T086 [P] [US7] Add `accessible`, `accessibilityLabel`, `accessibilityRole` props to remaining shared-ui native components: Avatar, Badge, Card, EmptyState, LocationTree, OfflineBanner, ProfileCompleteness, Skeleton, SocialIcons, LoadingSpinner in their respective `index.native.tsx` files
- [ ] T087 [P] [US7] Add `accessibilityState` (disabled, selected, expanded, busy) to interactive native components that support these states in relevant `index.native.tsx` files
- [ ] T088 [US7] Verify all touch targets on mobile screens meet minimum 44×44px; fix any undersized targets in `apps/mobile/app/(tabs)/index.tsx` and other screen files
- [ ] T089 [US7] Add visible zoom-in/zoom-out button alternatives for map pinch-to-zoom gesture in mobile map view
- [ ] T090 [US7] Add on-screen button alternatives for any swipe-to-dismiss gestures (notifications, modals) in mobile screens

**Checkpoint**: Mobile app fully accessible — all elements announce label/role via VoiceOver/TalkBack, touch targets meet 44×44 minimum, gesture alternatives available.

---

## Phase 10: User Story 8 — Automated Accessibility Testing and CI Enforcement (Priority: P3)

**Goal**: Comprehensive automated a11y test suite scanning every shared-ui component and every web page. CI gate fails on new violations. Clear actionable error messages.

**Independent Test**: Introduce a deliberate violation (remove an `aria-label`), run CI, verify build fails with clear error identifying element, rule, and WCAG criterion. Fix and verify pass.

### Tests for User Story 8

> **NOTE: Write these tests FIRST, then verify they pass against remediated code**

#### Component-Level axe-core Tests (vitest-axe)

- [ ] T091 [P] [US8] Write axe-core a11y test for Button component (default, loading, disabled states) in `packages/shared-ui/src/Button/Button.a11y.test.tsx`
- [ ] T092 [P] [US8] Write axe-core a11y test for EventCard component in `packages/shared-ui/src/EventCard/EventCard.a11y.test.tsx`
- [ ] T093 [P] [US8] Write axe-core a11y test for TeacherCard component in `packages/shared-ui/src/TeacherCard/TeacherCard.a11y.test.tsx`
- [ ] T094 [P] [US8] Write axe-core a11y test for DirectoryCard component in `packages/shared-ui/src/DirectoryCard/DirectoryCard.a11y.test.tsx`
- [ ] T095 [P] [US8] Write axe-core a11y test for Modal component (open, closed states) in `packages/shared-ui/src/Modal/Modal.a11y.test.tsx`
- [ ] T096 [P] [US8] Write axe-core a11y test for LocationTree component in `packages/shared-ui/src/LocationTree/LocationTree.a11y.test.tsx`
- [ ] T097 [P] [US8] Write axe-core a11y test for Avatar component in `packages/shared-ui/src/Avatar/Avatar.a11y.test.tsx`
- [ ] T098 [P] [US8] Write axe-core a11y test for Card component in `packages/shared-ui/src/Card/Card.a11y.test.tsx`
- [ ] T099 [P] [US8] Write axe-core a11y test for EmptyState component in `packages/shared-ui/src/EmptyState/EmptyState.a11y.test.tsx`
- [ ] T100 [P] [US8] Write axe-core a11y test for OfflineBanner component in `packages/shared-ui/src/OfflineBanner/OfflineBanner.a11y.test.tsx`
- [ ] T101 [P] [US8] Write axe-core a11y test for ProfileCompleteness component in `packages/shared-ui/src/ProfileCompleteness/ProfileCompleteness.a11y.test.tsx`
- [ ] T102 [P] [US8] Write axe-core a11y test for SocialIcons component in `packages/shared-ui/src/SocialIcons/SocialIcons.a11y.test.tsx`

#### Page-Level Playwright Tests (@axe-core/playwright)

- [ ] T103 [P] [US8] Create Playwright a11y test scaffold with shared config, Leaflet waiver exclude, and landmark/heading helpers in `apps/web/e2e/a11y/a11y-helpers.ts`
- [ ] T104 [P] [US8] Write page-level a11y test for home page (`/`) in `apps/web/e2e/a11y/home.a11y.spec.ts`
- [ ] T105 [P] [US8] Write page-level a11y test for events listing (`/events`) in `apps/web/e2e/a11y/events-listing.a11y.spec.ts`
- [ ] T106 [P] [US8] Write page-level a11y test for events explorer (`/events/explorer`) in `apps/web/e2e/a11y/events-explorer.a11y.spec.ts`
- [ ] T107 [P] [US8] Write page-level a11y test for event detail (`/events/[id]`) in `apps/web/e2e/a11y/event-detail.a11y.spec.ts`
- [ ] T108 [P] [US8] Write page-level a11y test for teachers directory (`/teachers`) in `apps/web/e2e/a11y/teachers.a11y.spec.ts`
- [ ] T109 [P] [US8] Write page-level a11y test for teacher profile (`/teachers/[id]`) in `apps/web/e2e/a11y/teacher-profile.a11y.spec.ts`
- [ ] T110 [P] [US8] Write page-level a11y test for user directory (`/directory`) in `apps/web/e2e/a11y/directory.a11y.spec.ts`
- [ ] T111 [P] [US8] Write page-level a11y test for login (`/login`) in `apps/web/e2e/a11y/login.a11y.spec.ts`
- [ ] T112 [P] [US8] Write page-level a11y tests for settings pages (`/settings`, `/settings/account`, `/settings/notifications`, `/settings/privacy`, `/settings/teacher`) in `apps/web/e2e/a11y/settings.a11y.spec.ts`
- [ ] T113 [P] [US8] Write page-level a11y test for profile (`/profile`) in `apps/web/e2e/a11y/profile.a11y.spec.ts`
- [ ] T114 [P] [US8] Write page-level a11y test for bookings (`/bookings`) in `apps/web/e2e/a11y/bookings.a11y.spec.ts`
- [ ] T115 [P] [US8] Write page-level a11y test for notifications (`/notifications`) in `apps/web/e2e/a11y/notifications.a11y.spec.ts`
- [ ] T116 [P] [US8] Write page-level a11y tests for admin pages (`/admin`, `/admin/teachers`, `/admin/permissions`) in `apps/web/e2e/a11y/admin.a11y.spec.ts`
- [ ] T117 [P] [US8] Write page-level a11y test for concessions (`/concessions`) in `apps/web/e2e/a11y/concessions.a11y.spec.ts`
- [ ] T118 [P] [US8] Write page-level a11y test for event-groups (`/event-groups`) in `apps/web/e2e/a11y/event-groups.a11y.spec.ts`

### CI Integration for User Story 8

- [ ] T119 [US8] Add Playwright `a11y` project configuration (browser, baseURL, test directory) to `apps/web/playwright.config.ts` (or root config)
- [ ] T120 [US8] Document Leaflet third-party waiver with tracking issue reference in `apps/web/src/test/a11y/axe-config.ts`
- [ ] T121 [US8] Verify CI pipeline: introduce a deliberate `aria-label` removal, confirm build fails with actionable error, then revert

**Checkpoint**: Full automated a11y test suite running — 20 component tests + 21 page tests. CI gate rejects violations with clear error messages.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, documentation, and final validation.

- [ ] T122 [P] Verify all new `aria-label` values use i18n translation keys (not hardcoded English) across all modified shared-ui components
- [ ] T123 [P] Verify RTL focus order and landmark reading direction align with `dir` attribute across layout and navigation components
- [ ] T124 Run full `npm run test:a11y` suite and fix any remaining violations across all workspaces
- [ ] T125 Run full Playwright a11y page scan (`npx playwright test --project=a11y`) and fix any remaining violations
- [ ] T126 Perform manual keyboard-only walkthrough of all core flows (home → events → detail → RSVP → teachers → directory → settings) and fix any issues found
- [ ] T127 Perform manual screen reader walkthrough (VoiceOver or NVDA) of core flows and fix any issues found
- [ ] T128 [P] Verify `prefers-reduced-motion` behaviour: enable reduced motion in OS, navigate all pages, confirm zero non-essential animations
- [ ] T129 Run quickstart.md validation: follow the developer workflow steps in `specs/019-accessibility-audit/quickstart.md` and verify all commands succeed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion (tokens rebuilt, test helpers ready) — BLOCKS all user stories
- **US1 Keyboard Navigation (Phase 3)**: Depends on Phase 2 (SkipLink, useRovingTabIndex)
- **US2 Screen Reader (Phase 4)**: Depends on Phase 2; independent of Phase 3
- **US3 Focus Management (Phase 5)**: Depends on Phase 2; independent of Phases 3–4
- **US4 Form Accessibility (Phase 6)**: Depends on Phase 2; independent of Phases 3–5
- **US5 Colour Contrast (Phase 7)**: Depends on Phase 1 (token fixes); independent of Phases 3–6
- **US6 Reduced Motion (Phase 8)**: Depends on Phase 1 (global CSS rule); independent of Phases 3–7
- **US7 Mobile Accessibility (Phase 9)**: Depends on Phase 2 (shared-ui types); independent of web phases
- **US8 Automated Testing (Phase 10)**: Depends on Phases 3–9 (code must be remediated so tests pass)
- **Polish (Phase 11)**: Depends on all previous phases

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 — SkipLink and useRovingTabIndex
- **US2 (P1)**: Requires Phase 2 — can start in parallel with US1
- **US3 (P1)**: Requires Phase 2 — can start in parallel with US1 and US2
- **US4 (P2)**: Requires Phase 2 — can start in parallel with P1 stories
- **US5 (P2)**: Requires Phase 1 only — can start earliest of all story phases
- **US6 (P2)**: Requires Phase 1 only — can start earliest of all story phases
- **US7 (P3)**: Requires Phase 2 — can proceed in parallel with all web stories
- **US8 (P3)**: Requires all remediation complete — LAST story phase before Polish

### Within Each User Story

- Models/tokens before components
- Components before page-level integration
- Implementation before a11y tests (for US8, tests written against remediated code)
- Core implementation before integration verification

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003, T004, T006, T007, T008, T010, T011)
- SkipLink native (T014) can run in parallel with web implementation
- US1: Card fixes (T022, T023, T024), filter/map fixes (T027, T028) can all run in parallel
- US2: All heading hierarchy fixes (T031–T042) can run in parallel across pages
- US5: All non-colour cue tasks (T065–T068) can run in parallel
- US6: All reduced-motion component overrides (T072–T075) can run in parallel
- US7: All native accessibility prop additions (T079–T087) can run in parallel
- US8: All component a11y tests (T091–T102) can run in parallel; all page tests (T104–T118) can run in parallel
- **US1, US2, US3, US4 can be worked on in parallel** once Phase 2 completes
- **US5 and US6 can start as soon as Phase 1 completes** (earliest possible)
- **US7 (mobile) is fully independent** of all web-focused stories

---

## Parallel Example: User Story 1

```bash
# Launch all card fix tasks in parallel (different files):
Task T022: "Fix EventCard semantics in packages/shared-ui/src/EventCard/index.web.tsx"
Task T023: "Fix TeacherCard semantics in packages/shared-ui/src/TeacherCard/index.web.tsx"
Task T024: "Fix DirectoryCard semantics in packages/shared-ui/src/DirectoryCard/index.web.tsx"
Task T027: "Fix filter pills in apps/web/src/components/events/EventFilters.tsx"
Task T028: "Fix MapPanel in apps/web/src/components/events/MapPanel.tsx"
```

## Parallel Example: User Story 8

```bash
# Launch all component a11y tests in parallel (different files):
Task T091: "Button a11y test in packages/shared-ui/src/Button/Button.a11y.test.tsx"
Task T092: "EventCard a11y test in packages/shared-ui/src/EventCard/EventCard.a11y.test.tsx"
Task T093: "TeacherCard a11y test in packages/shared-ui/src/TeacherCard/TeacherCard.a11y.test.tsx"
# ... (all 12 component tests can run simultaneously)

# Launch all page a11y tests in parallel (different files):
Task T104: "Home page test in apps/web/e2e/a11y/home.a11y.spec.ts"
Task T105: "Events listing test in apps/web/e2e/a11y/events-listing.a11y.spec.ts"
# ... (all 15 page tests can run simultaneously)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 3 Only)

1. Complete Phase 1: Setup (tokens, global CSS, dev deps)
2. Complete Phase 2: Foundational (SkipLink, useRovingTabIndex)
3. Complete Phase 3: User Story 1 — Keyboard Navigation
4. Complete Phase 5: User Story 3 — Focus Management (Modals)
5. **STOP and VALIDATE**: Keyboard-only walkthrough of all core flows
6. Deploy/demo: Platform is keyboard-accessible — the single most impactful improvement

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Keyboard) + US3 (Focus) → Test independently → **MVP! Platform is keyboard-accessible**
3. Add US2 (Screen Reader) → Test independently → Screen readers work
4. Add US4 (Forms) + US5 (Contrast) + US6 (Motion) → Test independently → Full P2 coverage
5. Add US7 (Mobile) → Test independently → Mobile accessible
6. Add US8 (Testing) → CI gate enforced → Regressions prevented
7. Polish → Final cross-cutting validation

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (Keyboard Navigation) + US3 (Focus Management)
   - Developer B: US2 (Screen Reader Compatibility)
   - Developer C: US5 (Colour Contrast) + US6 (Reduced Motion)
   - Developer D: US7 (Mobile Accessibility)
3. After all remediation:
   - Developer A: US8 — Component a11y tests (T091–T102)
   - Developer B: US8 — Page a11y tests (T104–T118)
   - Developer C: US4 (Form Accessibility) + US8 CI integration
4. Team: Polish & cross-cutting validation

---

## Notes

- [P] tasks = different files, no dependencies — safe to run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Token changes (Phase 1) propagate automatically to all consuming components
- No new runtime dependencies — only 2 devDependencies (vitest-axe, @axe-core/playwright)
- No database changes — this is purely UI-layer remediation
- ~80 files modified/created across the monorepo (20 components × 2 + layout + pages + tests)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Leaflet map violations are waived with tracking issue — accessible list-view alternative exists
