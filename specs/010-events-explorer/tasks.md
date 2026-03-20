# Tasks: Events Explorer

**Input**: Design documents from `/specs/010-events-explorer/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Constitution mandates test-first development. Tests are included and MUST fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Shared types**: `packages/shared/src/types/`
- **Shared UI components**: `packages/shared-ui/src/`
- **Design tokens**: `packages/tokens/src/`
- **Web components**: `apps/web/src/components/events/`
- **Hooks**: `apps/web/src/hooks/`
- **Utilities**: `apps/web/src/lib/`
- **Unit tests**: `apps/web/tests/unit/`
- **Integration tests**: `apps/web/tests/integration/`
- **E2E tests**: `apps/web/tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, add design tokens, define shared types and contracts

- [X] T001 Install runtime dependencies (date-fns, leaflet, react-leaflet, leaflet.markercluster) and dev dependencies (@types/leaflet, @types/leaflet.markercluster) in apps/web/package.json
- [X] T002 [P] Add category color tokens (jam, workshop, class, festival, social, retreat, training) with light/dark values to packages/tokens/src/color.tokens.json
- [X] T003 [P] Rebuild design tokens pipeline — run token build and verify CSS custom properties output in packages/tokens/build/
- [X] T004 [P] Create shared Explorer types (ExplorerFilterState, CalendarViewMode, LocationNode, MapMarkerData, CategoryColorConfig, DateQuickPick) in packages/shared/src/types/explorer.ts per contracts/explorer-types.ts
- [X] T005 [P] Extend City type with continentCode and continentName fields in packages/shared/src/types/cities.ts
- [X] T006 [P] Add EventSummaryWithCoords extension (venueLatitude, venueLongitude) to packages/shared/src/types/events.ts
- [X] T007 Re-export new explorer types from packages/shared/src/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core hooks, utilities, and API adapters that ALL user story panels depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational Phase

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T008 [P] Unit tests for useExplorerFilters hook — URL param parsing, setFilter, toggleCategory, resetFilters, applyQuickPick in apps/web/tests/unit/useExplorerFilters.test.ts
- [X] T009 [P] Unit tests for calendar-utils — buildMonthGrid, buildWeekSlots, getDateRange, isToday, computeOverflow in apps/web/tests/unit/calendar-utils.test.ts
- [X] T010 [P] Unit tests for location-hierarchy — buildLocationTree, computeEventCounts, filterTree, sortAlphabetically in apps/web/tests/unit/location-hierarchy.test.ts
- [X] T011 [P] Unit tests for category-colors — getCategoryColor, getCategoryLabel, CATEGORY_COLORS mapping in apps/web/tests/unit/category-colors.test.ts

### Implementation for Foundational Phase

- [X] T012 Implement useExplorerFilters hook — read/write URL search params via Next.js useSearchParams/useRouter, expose setFilter/toggleCategory/resetFilters/applyQuickPick in apps/web/src/hooks/useExplorerFilters.ts
- [X] T013 [P] Implement calendar-utils — buildMonthGrid (CSS Grid data), buildWeekSlots (30-min intervals), getDateRangeForView, isToday, date arithmetic using date-fns in apps/web/src/lib/calendar-utils.ts
- [X] T014 [P] Implement location-hierarchy — buildLocationTree (group cities by continent/country), computeEventCounts (roll up from city→country→continent), filterTreeBySearch in apps/web/src/lib/location-hierarchy.ts
- [X] T015 [P] Implement category-colors — static CATEGORY_COLORS array mapping EventCategory→CSS custom property name→i18n label key in apps/web/src/lib/category-colors.ts
- [X] T016 Implement API adapter function mapFiltersToQuery (ExplorerFilterState → ListEventsQuery) and extractMapMarkers (EventSummary[] → MapMarkerData[]) in apps/web/src/lib/explorer-api.ts
- [X] T017 Implement useCalendarData hook — compute date range from filters, group events into CalendarDay/WeekTimeSlot/AgendaDayGroup structures using calendar-utils in apps/web/src/hooks/useCalendarData.ts
- [X] T018 Implement useLocationTree hook — fetch cities, build LocationNode[] tree, recompute counts when filters change in apps/web/src/hooks/useLocationTree.ts

**Checkpoint**: Foundation ready — all hooks, utilities, and API adapters are tested and functional. User story panel implementation can begin.

---

## Phase 3: User Story 1 — Browse Events in Calendar Views (Priority: P1) 🎯 MVP

**Goal**: Display events in month/week/list/agenda calendar views with category color-coding. Users can switch views and click events to navigate to detail pages.

**Independent Test**: Navigate to the Explorer page. Verify month view shows event dots colored by category. Switch to week, list, and agenda views — each renders events correctly. Click an event — navigates to detail page.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T019 [P] [US1] Unit tests for CalendarPanel — renders month grid, switches views, displays event dots with category colors, handles empty days, shows "+N more" overflow in apps/web/tests/unit/CalendarPanel.test.tsx
- [X] T020 [P] [US1] Integration test for calendar view switching — mount ExplorerShell, switch month→week→list→agenda, verify events re-render in each view in apps/web/tests/integration/calendar-views.test.tsx
- [ ] T021 [P] [US1] E2E test for calendar user journey — load Explorer, verify default month view, switch views, click event navigates to detail page in apps/web/tests/e2e/explorer-calendar.spec.ts

### Implementation for User Story 1

- [X] T022 [US1] Create ExplorerShell responsive layout container with CSS Grid (3-panel desktop, stacked tablet, single mobile) in apps/web/src/components/events/ExplorerShell.tsx
- [X] T023 [US1] Create CalendarPanel component — month view with CSS Grid (7×6), event dots colored by category token, view mode switcher (month/week/list/agenda) in apps/web/src/components/events/CalendarPanel.tsx
- [X] T024 [US1] Add week view to CalendarPanel — time-slot grid (30-min rows × 7 columns), events positioned as colored blocks in apps/web/src/components/events/CalendarPanel.tsx
- [X] T025 [US1] Add list view to CalendarPanel — chronological event list grouped by date, reuse existing EventCard component in apps/web/src/components/events/CalendarPanel.tsx
- [X] T026 [US1] Add agenda view to CalendarPanel — day-grouped sections with expandable event summaries in apps/web/src/components/events/CalendarPanel.tsx
- [X] T027 [US1] Add recurrence icon indicator for recurring events and multi-day event spanning in month/week views in apps/web/src/components/events/CalendarPanel.tsx
- [X] T028 [US1] Update existing EventCard to use category design tokens (replace hardcoded Tailwind color classes) in apps/web/src/components/events/EventCard.tsx
- [X] T029 [US1] Wire ExplorerShell → CalendarPanel with useExplorerFilters and useCalendarData hooks, add event click navigation to detail page in apps/web/src/app/events/explorer/page.tsx

**Checkpoint**: The calendar panel is fully functional with all four views, category coloring, and event navigation. This is the MVP — independently testable and deployable.

---

## Phase 4: User Story 2 — Filter Events by Category (Priority: P1)

**Goal**: A category legend bar with color swatches acts as quick filter toggles. Toggling categories updates all panels via shared filter state.

**Independent Test**: Load the Explorer. Click "Workshop" in the legend — only Workshop events remain in the calendar. Click again to re-enable. Verify URL params update.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T030 [P] [US2] Unit tests for CategoryLegend shared component — renders all 7 categories with correct colors, toggle on/off fires callback, respects enabled state in packages/shared-ui/src/CategoryLegend/CategoryLegend.test.tsx
- [X] T031 [P] [US2] Integration test for category filtering — toggle category, verify calendar events filter, verify URL params encode category state in apps/web/tests/integration/category-filter.test.tsx

### Implementation for User Story 2

- [X] T032 [P] [US2] Create CategoryLegend shared-ui component (5-file pattern) — types.ts, index.web.tsx, index.native.tsx, CategoryLegend.stories.tsx, CategoryLegend.test.tsx in packages/shared-ui/src/CategoryLegend/
- [X] T033 [US2] Create CategoryLegendBar web wrapper component — connects CategoryLegend to useExplorerFilters().toggleCategory, reads active categories from filter state in apps/web/src/components/events/CategoryLegendBar.tsx
- [X] T034 [US2] Integrate CategoryLegendBar into ExplorerShell layout (below panels) and verify calendar panel re-filters on category toggle in apps/web/src/components/events/ExplorerShell.tsx

**Checkpoint**: Category filtering works across the calendar panel. The legend serves as both a visual key and interactive filter.

---

## Phase 5: User Story 3 — Explore Events on Interactive Map (Priority: P1)

**Goal**: Lazy-loaded Leaflet map with category-colored markers, marker clustering, and event summary popups on click.

**Independent Test**: Load Explorer with geolocated events. Verify markers at correct positions with category colors. Zoom out to see clusters. Click marker to see popup with event summary.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T035 [P] [US3] Unit tests for MapMarkerPopup — renders event name, date, category, location in apps/web/tests/unit/MapMarkerPopup.test.tsx
- [X] T036 [P] [US3] Unit tests for extractMapMarkers — filters events without coords, maps to MapMarkerData correctly in apps/web/tests/unit/extractMapMarkers.test.ts
- [ ] T037 [P] [US3] E2E test for map interactions — load Explorer, verify markers visible, click marker shows popup, click cluster zooms in in apps/web/tests/e2e/explorer-map.spec.ts

### Implementation for User Story 3

- [X] T038 [US3] Create MapPanel component — lazy-loaded via next/dynamic with ssr:false, renders Leaflet map with tile layer (configurable provider), loading skeleton fallback in apps/web/src/components/events/MapPanel.tsx
- [X] T039 [US3] Add category-colored markers to MapPanel — render MapMarkerData[] as Leaflet markers styled by category design token in apps/web/src/components/events/MapPanel.tsx
- [X] T040 [US3] Add marker clustering via leaflet.markercluster — cluster icons styled with design tokens, click-to-zoom behavior in apps/web/src/components/events/MapPanel.tsx
- [X] T041 [US3] Create MapMarkerPopup component — event summary card (name, date, category badge, location) rendered inside Leaflet Popup in apps/web/src/components/events/MapMarkerPopup.tsx
- [X] T042 [US3] Add map error boundary and fallback UI — handle Leaflet load failures with retry option, ARIA role="img" with summary label in apps/web/src/components/events/MapPanel.tsx
- [X] T043 [US3] Integrate MapPanel into ExplorerShell — connect to useExplorerFilters, pass filtered MapMarkerData[], verify bundle stays under 200KB with lazy loading in apps/web/src/components/events/ExplorerShell.tsx

**Checkpoint**: All three P1 stories complete. The Explorer has a functional calendar with category filtering and an interactive map. This is a strong demo-ready state.

---

## Phase 6: User Story 4 — Filter by Location Using Location Tree (Priority: P2)

**Goal**: Hierarchical Continent → Country → City tree with event counts. Selecting a node filters calendar and map, zooms map to that area. Includes tree search.

**Independent Test**: Expand "Europe" → "United Kingdom" → "Bristol" — see counts. Click "Bristol" — calendar shows Bristol events, map zooms to Bristol. Search "Tokyo" — tree filters to match.

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T044 [P] [US4] Unit tests for LocationTree shared component — renders 3-level hierarchy, expands/collapses nodes, shows event counts, fires onSelect callback in packages/shared-ui/src/LocationTree/LocationTree.test.tsx
- [X] T045 [P] [US4] Unit tests for LocationTreePanel — search input filters tree nodes, clears selection resets filters in apps/web/tests/unit/LocationTreePanel.test.tsx
- [ ] T046 [P] [US4] E2E test for location tree journey — expand tree, select city, verify calendar/map filter and map zoom, search tree, clear selection in apps/web/tests/e2e/explorer-location-tree.spec.ts

### Implementation for User Story 4

- [X] T047 [P] [US4] Create LocationTree shared-ui component (5-file pattern) — types.ts, index.web.tsx, index.native.tsx, LocationTree.stories.tsx, LocationTree.test.tsx in packages/shared-ui/src/LocationTree/
- [X] T048 [US4] Create LocationTreePanel web wrapper — connects LocationTree to useLocationTree hook and useExplorerFilters, adds search input with debounced tree filtering in apps/web/src/components/events/LocationTreePanel.tsx
- [X] T049 [US4] Wire location selection to map zoom — when a LocationNode is selected, update MapPanel viewport to center on node coordinates with appropriate zoom level in apps/web/src/components/events/ExplorerShell.tsx
- [X] T050 [US4] Integrate LocationTreePanel into ExplorerShell left column, verify location+category combined filtering works across all panels in apps/web/src/components/events/ExplorerShell.tsx

**Checkpoint**: Location tree is functional. Users can browse events geographically via tree navigation.

---

## Phase 7: User Story 5 — Cross-Panel Synchronization (Priority: P2)

**Goal**: All panels stay synchronized through the shared filter state in URL params. Location changes update calendar + map. Date changes update map markers. Map viewport optionally filters the list.

**Independent Test**: Select "Europe" in tree — calendar filters, map zooms. Change month in calendar — map markers update. Apply "Workshop" filter — all panels update. Verify URL reflects all state.

### Tests for User Story 5

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T051 [P] [US5] Integration test for cross-panel sync — location selection updates calendar+map, date change updates map markers, category toggle updates all three panels in apps/web/tests/integration/explorer-sync.test.tsx
- [X] T052 [P] [US5] Unit test for URL bookmark fidelity — construct URL with filters, navigate to it, verify all panels load with correct filter state in apps/web/tests/unit/url-bookmark.test.ts

### Implementation for User Story 5

- [X] T053 [US5] Add date range sync — when calendar navigates months/weeks, update useExplorerFilters dateFrom/dateTo, MapPanel re-filters markers to visible date range in apps/web/src/components/events/ExplorerShell.tsx
- [X] T054 [US5] Add optional "sync map to list" toggle — when enabled, panning/zooming the map updates a mapBounds filter that constrains the calendar/list events in apps/web/src/components/events/MapPanel.tsx
- [X] T055 [US5] Verify full URL roundtrip — all filter combinations serialize to URL params and deserialize correctly on page load including categories, location, dateFrom, dateTo, view mode in apps/web/src/hooks/useExplorerFilters.ts

**Checkpoint**: All panels are fully synchronized. Any filter change in one panel reflects in all others. URLs are bookmarkable and shareable.

---

## Phase 8: User Story 6 — Responsive Layout Adaptation (Priority: P2)

**Goal**: Desktop shows 3 panels side-by-side. Tablet collapses tree to dropdown, stacks calendar+map. Mobile shows single panel with bottom tab navigation.

**Independent Test**: Open at ≥1024px — 3 panels visible. Resize to 768–1023px — tree collapses, calendar/map stack. Resize to <768px — single panel with List/Map/Filters tabs.

### Tests for User Story 6

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T056 [P] [US6] Integration test for responsive breakpoints — render ExplorerShell at each breakpoint, verify panel visibility and layout in apps/web/tests/integration/explorer-responsive.test.tsx

### Implementation for User Story 6

- [X] T057 [US6] Add tablet layout to ExplorerShell — collapse LocationTreePanel to a dropdown/modal trigger, stack CalendarPanel and MapPanel vertically with toggle between them in apps/web/src/components/events/ExplorerShell.tsx
- [X] T058 [US6] Add mobile layout to ExplorerShell — single visible panel with bottom tab bar (List/Map/Filters), lazy-mount inactive panels, preserve filter state across tab switches in apps/web/src/components/events/ExplorerShell.tsx
- [X] T059 [US6] Ensure touch targets ≥ 44×44px on all interactive elements, verify no horizontal scroll or overlap at any breakpoint in apps/web/src/components/events/ExplorerShell.tsx

**Checkpoint**: Explorer is fully responsive across all three breakpoints with preserved filter state.

---

## Phase 9: User Story 7 — Date Range Quick Picks (Priority: P3)

**Goal**: Pre-set buttons ("This week", "This weekend", "This month", "Next 30 days") set the calendar date range across all panels.

**Independent Test**: Click "This weekend" — calendar shows Saturday/Sunday events only. Click "Next 30 days" — range expands. URL params reflect the date range.

### Tests for User Story 7

- [X] T060 [P] [US7] Unit tests for DateQuickPicks — each button computes correct date range using date-fns, fires onSelect callback in apps/web/tests/unit/DateQuickPicks.test.tsx

### Implementation for User Story 7

- [X] T061 [US7] Create DateQuickPicks component — button group for this-week/this-weekend/this-month/next-30-days, computes dateFrom/dateTo with date-fns, calls useExplorerFilters().applyQuickPick in apps/web/src/components/events/DateQuickPicks.tsx
- [X] T062 [US7] Integrate DateQuickPicks into ExplorerShell above CalendarPanel, verify all panels update on quick pick selection in apps/web/src/components/events/ExplorerShell.tsx

**Checkpoint**: Quick pick date shortcuts are functional and sync across all panels.

---

## Phase 10: User Story 8 — "Near Me" Geolocation (Priority: P3)

**Goal**: "Near me" button uses browser geolocation to center the map on the user's position. Graceful handling of permission denial.

**Independent Test**: Click "Near me" (grant permission) — map centers on user position. Deny permission — friendly message appears.

### Tests for User Story 8

- [ ] T063 [P] [US8] Unit tests for geolocation button — mocks navigator.geolocation, verifies map center on success, verifies error message on denial/timeout in apps/web/tests/unit/near-me.test.tsx

### Implementation for User Story 8

- [ ] T064 [US8] Add "Near me" button to MapPanel — calls navigator.geolocation.getCurrentPosition, pans map to user coordinates on success, shows non-blocking toast on denial/unavailable in apps/web/src/components/events/MapPanel.tsx

**Checkpoint**: Geolocation feature works with proper permission handling.

---

## Phase 11: User Story 9 — Event Density Heatmap (Priority: P3)

**Goal**: Toggle a heatmap overlay on the map showing event concentration by area.

**Independent Test**: Toggle heatmap on — density overlay appears. Apply category filter — heatmap recalculates. Toggle off — returns to markers.

### Tests for User Story 9

- [ ] T065 [P] [US9] Unit tests for heatmap toggle — enables leaflet.heat layer, recalculates on filter change, disables cleanly in apps/web/tests/unit/map-heatmap.test.tsx

### Implementation for User Story 9

- [ ] T066 [US9] Install leaflet.heat dependency and add heatmap toggle to MapPanel — renders HeatmapLayer from event coordinates, recalculates on filter change, toggle between marker and heatmap views in apps/web/src/components/events/MapPanel.tsx

**Checkpoint**: Heatmap visualization is functional as an optional overlay.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, keyboard navigation, i18n, performance, and final validation

- [X] T067 [P] Add ARIA roles and keyboard navigation across all Explorer panels — Tab between panels, Arrow keys within panels, focus indicators visible in apps/web/src/components/events/ExplorerShell.tsx
- [X] T068 [P] Add ARIA grid role to CalendarPanel month view, ARIA listbox to list/agenda views, role="img" with aria-label summary to MapPanel in apps/web/src/components/events/CalendarPanel.tsx and apps/web/src/components/events/MapPanel.tsx
- [X] T069 [P] Extract all user-facing strings to i18n keys — calendar labels, view names, filter labels, empty states, error messages, continent names in apps/web/src/components/events/
- [X] T070 [P] Add loading, error, and empty state UI for all async operations — calendar loading skeleton, map skeleton, tree loading, "no events match" empty state in apps/web/src/components/events/
- [X] T071 [P] Verify Leaflet lazy-load bundle impact — confirm map is not in initial bundle, total JS < 200KB compressed using next/dynamic ssr:false in apps/web/src/components/events/MapPanel.tsx
- [ ] T072 Run quickstart.md validation — execute setup steps, run all test suites (unit, integration, e2e), verify all pass per specs/010-events-explorer/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types, tokens) — BLOCKS all user stories
- **US1 Calendar (Phase 3)**: Depends on Phase 2 — first story to implement
- **US2 Category Legend (Phase 4)**: Depends on Phase 2 foundation. Can parallel with US1 (different files) but integrates with ExplorerShell
- **US3 Map (Phase 5)**: Depends on Phase 2 foundation. Can parallel with US1/US2 (different files)
- **US4 Location Tree (Phase 6)**: Depends on Phase 2 foundation + Phase 5 (map zoom integration)
- **US5 Sync (Phase 7)**: Depends on Phases 3, 5, 6 (all panels must exist)
- **US6 Responsive (Phase 8)**: Depends on Phase 3 (ExplorerShell layout exists)
- **US7 Quick Picks (Phase 9)**: Depends on Phase 2 (filter hook)
- **US8 Near Me (Phase 10)**: Depends on Phase 5 (map exists)
- **US9 Heatmap (Phase 11)**: Depends on Phase 5 (map exists)
- **Polish (Phase 12)**: Depends on all preceding phases

### User Story Dependencies

```
Phase 1: Setup ────────────────────────────────────────► Phase 2: Foundation
                                                              │
                                              ┌───────────────┼───────────────┐
                                              ▼               ▼               ▼
                                      Phase 3: US1    Phase 4: US2    Phase 5: US3
                                      (Calendar)      (Categories)    (Map)
                                              │               │               │
                                              │               │        ┌──────┤
                                              │               │        ▼      ▼
                                              │               │   Phase 6:  Phase 10: US8
                                              │               │   US4       (Near Me)
                                              │               │   (Tree)       │
                                              │               │        │    Phase 11: US9
                                              │               │        │    (Heatmap)
                                              ▼               ▼        ▼
                                           Phase 7: US5 (Cross-Panel Sync)
                                                       │
                                                       ▼
                                           Phase 8: US6 (Responsive)
                                                       │
                                           Phase 9: US7 (Quick Picks) — can parallel with Phase 8
                                                       │
                                                       ▼
                                           Phase 12: Polish
```

### Within Each User Story

1. Tests MUST be written and FAIL before implementation
2. Utility/hook tests → component tests → integration tests
3. Core rendering → interactive behavior → integration with shell
4. Story complete and checkpoint verified before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: T002, T003, T004, T005, T006 can all run in parallel (different files)

**Phase 2 (Foundation)**: T008–T011 (tests) can all run in parallel. T013, T014, T015 (utils) can run in parallel after tests written. T017 and T018 (hooks) can parallel after T012 complete.

**Phase 3–5 (P1 Stories)**: US1, US2, US3 can be developed in parallel by different developers since they target different files. However for a single developer, sequential order is recommended: US1 → US2 → US3 (each builds on ExplorerShell).

**Phase 9–11 (P3 Stories)**: US7, US8, US9 are fully independent and can all parallel.

---

## Parallel Example: Phase 2 Foundation

```text
# Batch 1 — Write all tests in parallel:
T008: Unit tests for useExplorerFilters in apps/web/tests/unit/useExplorerFilters.test.ts
T009: Unit tests for calendar-utils in apps/web/tests/unit/calendar-utils.test.ts
T010: Unit tests for location-hierarchy in apps/web/tests/unit/location-hierarchy.test.ts
T011: Unit tests for category-colors in apps/web/tests/unit/category-colors.test.ts

# Batch 2 — Implement utilities in parallel (after tests written):
T013: calendar-utils in apps/web/src/lib/calendar-utils.ts
T014: location-hierarchy in apps/web/src/lib/location-hierarchy.ts
T015: category-colors in apps/web/src/lib/category-colors.ts
T016: explorer-api adapter in apps/web/src/lib/explorer-api.ts

# Batch 3 — Implement hooks (depend on utils):
T012: useExplorerFilters in apps/web/src/hooks/useExplorerFilters.ts
T017: useCalendarData in apps/web/src/hooks/useCalendarData.ts
T018: useLocationTree in apps/web/src/hooks/useLocationTree.ts
```

## Parallel Example: P1 Stories (Multi-Developer)

```text
# Developer A — User Story 1 (Calendar):
T019–T021: Tests
T022–T029: Calendar implementation

# Developer B — User Story 2 (Categories):
T030–T031: Tests
T032–T034: Category legend implementation

# Developer C — User Story 3 (Map):
T035–T037: Tests
T038–T043: Map implementation
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (tokens, types, dependencies)
2. Complete Phase 2: Foundation (hooks, utils, API adapters)
3. Complete Phase 3: User Story 1 — Calendar Views
4. **STOP and VALIDATE**: Calendar shows events in 4 views with category colors
5. Deploy/demo if ready — this alone replaces the current simple list page

### P1 Complete (Stories 1–3)

1. Setup + Foundation → ready
2. US1 Calendar → test independently → ✅
3. US2 Category Legend → test independently → ✅
4. US3 Interactive Map → test independently → ✅
5. **DEMO**: 3-panel Explorer with calendar, category filtering, and map

### Full P2 (Stories 4–6)

6. US4 Location Tree → geographic navigation → ✅
7. US5 Cross-Panel Sync → unified filtering experience → ✅
8. US6 Responsive Layout → mobile/tablet support → ✅
9. **DEMO**: Full responsive Explorer with all panels synchronized

### P3 Enhancements (Stories 7–9)

10. US7 Date Quick Picks → convenience shortcuts → ✅
11. US8 Near Me → geolocation → ✅
12. US9 Heatmap → density visualization → ✅
13. Polish + accessibility + i18n + performance validation → ✅

### Incremental Delivery

Each story adds value without breaking previous stories. The Explorer is usable after Phase 3 (US1 alone) and progressively enhances with each subsequent story.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Constitution mandates: tests MUST fail before implementation begins
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total tasks: 72
