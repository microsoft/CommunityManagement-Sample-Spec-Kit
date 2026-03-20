# Implementation Plan: Events Explorer

**Branch**: `010-events-explorer` | **Date**: 2026-03-19 | **Spec**: [specs/010-events-explorer/spec.md](spec.md)
**Input**: Feature specification from `/specs/010-events-explorer/spec.md`

## Summary

Replace the current simple event list page with an advanced 3-panel Events Explorer featuring a calendar (month/week/list/agenda views), an interactive Leaflet map with clustered markers, and a hierarchical location tree (Continent → Country → City). All panels stay synchronized through shared filter state managed in URL search parameters. Events are color-coded by category using new design tokens. The map is lazy-loaded to stay within the <200KB JS budget. Layout adapts responsively from 3-panel desktop to single-panel mobile with tab navigation.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 19, Next.js 16 (App Router)
**Primary Dependencies**: Next.js 16 (App Router), React 19, Leaflet + react-leaflet (lazy-loaded), Leaflet.markercluster, date-fns (calendar logic), @acroyoga/shared (types), @acroyoga/tokens (design tokens)
**Storage**: N/A — reads from existing `/api/events` and `/api/cities` endpoints
**Testing**: Vitest (unit/integration), Playwright (E2E for P0 flows), @testing-library/react
**Target Platform**: Web (browsers), Azure-hosted
**Project Type**: Web application (Next.js fullstack monorepo — frontend feature)
**Performance Goals**: LCP < 2.5s on simulated 3G; TTI < 3.5s; calendar view switches < 1s; filter updates reflected across all panels < 1s; map smooth with up to 500 markers
**Constraints**: Initial JS bundle < 200KB compressed (map lazy-loaded); design tokens only (no hardcoded colors/spacing); WCAG 2.1 AA; all user strings i18n-extractable; all filter state bookmarkable via URL params; N+1 queries prohibited
**Scale/Scope**: Multi-city platform; ~500 events displayed simultaneously; 7 event categories; 3 responsive breakpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. API-First Design | ✅ PASS | Consumes existing `/api/events` and `/api/cities` endpoints. No new API routes needed — this is a pure frontend feature consuming existing contracts. New types (ExplorerFilterState, LocationNode) defined in shared types. |
| II. Test-First Development | ✅ PASS | Unit tests for filter state hook, location tree builder, calendar helpers. Integration tests for panel sync. E2E tests for P1 user flows (calendar views, category filter, map interaction). |
| III. Privacy & Data Protection | ✅ PASS | Displays only public event data (EventSummary). "Near me" geolocation uses browser API with proper permission handling — no PII stored or sent to server. |
| IV. Server-Side Authority | ✅ PASS | All event data fetched from server. Filter state is client-side URL params that parameterize API calls. No client-side business logic — all filtering delegated to API. Location tree counts derived from API response data. |
| V. UX Consistency | ✅ PASS | Mobile-first responsive layout. All interactive elements keyboard-navigable. Touch targets ≥ 44×44px. Loading/error/empty states for all async operations. Design tokens for all visual values. |
| VI. Performance Budget | ✅ PASS | Leaflet lazy-loaded via `next/dynamic` — not in initial bundle. Calendar renders client-side from cached API data. No N+1 queries — uses existing paginated list endpoint. Map marker clustering prevents rendering overload. |
| VII. Simplicity | ✅ PASS | Single `useExplorerFilters` hook manages all filter state. No abstraction layers — direct component composition. date-fns for calendar math (no full calendar framework). Leaflet is the simplest maintained mapping library. |
| VIII. Internationalisation | ✅ PASS | All UI strings via i18n extraction. Dates formatted with `Intl.DateTimeFormat`. Category labels are i18n keys, not hardcoded strings. Location names from API (server-provided). |
| IX. Scoped Permissions | N/A | Explorer is a read-only public page. No mutations, no permission checks needed. |
| X. Notification Architecture | N/A | No notifications in this feature. |
| XI. Resource Ownership | N/A | Read-only view — no resource mutations. |
| XII. Financial Integrity | N/A | No financial operations. |
| QG-5: Bundle Size | ✅ PASS | Map lazy-loaded. Calendar is pure JS (date-fns). Category tokens are CSS custom properties (zero JS). |
| QG-6: Accessibility | ✅ PASS | Keyboard navigation across panels (Tab to switch, arrows within). ARIA labels on all interactive elements. Map has non-visual fallback. Color not sole information channel (category labels accompany colors). |
| QG-9: i18n Compliance | ✅ PASS | No raw string literals — all text via i18n keys. |

**Gate result: PASS — no violations. Proceed to Phase 0.**

**Post–Phase 1 re-check: PASS** — data model is read-only (no new DB tables), contracts are client-side types only, source structure fits existing monorepo patterns.

## Project Structure

### Documentation (this feature)

```text
specs/010-events-explorer/
├── plan.md              # This file
├── research.md          # Phase 0 — technology decisions & research
├── data-model.md        # Phase 1 — derived client-side data structures
├── quickstart.md        # Phase 1 — developer onboarding for this feature
├── contracts/           # Phase 1 — client-side type contracts
│   ├── explorer-types.ts     # ExplorerFilterState, LocationNode, CategoryColorMap
│   └── explorer-api.ts       # API call signatures and response adapters
└── tasks.md             # Phase 2 (created by /speckit.tasks — not this command)
```

### Source Code (repository root)

```text
packages/tokens/src/
├── color.tokens.json          # MODIFIED — add category color tokens

packages/shared/src/types/
├── events.ts                  # EXISTING — EventSummary, ListEventsQuery, etc.
├── cities.ts                  # EXISTING — City type
└── explorer.ts                # NEW — ExplorerFilterState, LocationNode, CalendarViewMode

packages/shared-ui/src/
├── CategoryLegend/            # NEW — 5-file shared-ui pattern
│   ├── types.ts
│   ├── index.web.tsx
│   ├── index.native.tsx
│   ├── CategoryLegend.stories.tsx
│   └── CategoryLegend.test.tsx
└── LocationTree/              # NEW — 5-file shared-ui pattern
    ├── types.ts
    ├── index.web.tsx
    ├── index.native.tsx
    ├── LocationTree.stories.tsx
    └── LocationTree.test.tsx

apps/web/src/
├── app/events/
│   ├── page.tsx               # EXISTING — MODIFIED to mount ExplorerShell
│   └── explorer/
│       └── page.tsx           # NEW — Events Explorer route (or replaces above)
├── components/events/
│   ├── EventCard.tsx           # EXISTING — reused in list/agenda views
│   ├── EventFilters.tsx        # EXISTING — extended for Explorer
│   ├── ExplorerShell.tsx       # NEW — 3-panel responsive layout container
│   ├── CalendarPanel.tsx       # NEW — month/week/list/agenda views
│   ├── MapPanel.tsx            # NEW — lazy-loaded Leaflet map with markers
│   ├── LocationTreePanel.tsx   # NEW — hierarchical location browser
│   ├── CategoryLegendBar.tsx   # NEW — category filter toggles
│   ├── DateQuickPicks.tsx      # NEW — this week/weekend/month/30-day buttons
│   └── MapMarkerPopup.tsx      # NEW — event summary popup on map markers
├── hooks/
│   ├── useExplorerFilters.ts   # NEW — URL-synced filter state management
│   ├── useCalendarData.ts      # NEW — date range computation + event grouping
│   └── useLocationTree.ts      # NEW — build tree from cities + event counts
└── lib/
    ├── calendar-utils.ts       # NEW — month/week grid builders, date math
    ├── category-colors.ts      # NEW — category → design token mapping
    └── location-hierarchy.ts   # NEW — continent/country/city tree builder

apps/web/tests/
├── unit/
│   ├── calendar-utils.test.ts
│   ├── location-hierarchy.test.ts
│   └── useExplorerFilters.test.ts
├── integration/
│   ├── explorer-sync.test.tsx
│   └── category-filter.test.tsx
└── e2e/
    ├── explorer-calendar.spec.ts
    ├── explorer-map.spec.ts
    └── explorer-location-tree.spec.ts
```

**Structure Decision**: Follows existing monorepo convention. New components live in `apps/web/src/components/events/` alongside existing EventCard and EventFilters. Reusable cross-platform components (CategoryLegend, LocationTree) follow the shared-ui 5-file pattern. Shared types go in `packages/shared/src/types/`. No new API routes — the Explorer is a pure frontend feature consuming existing endpoints.

## Complexity Tracking

> No constitution violations — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)* | | |
