# Implementation Plan: Simple UI Pages — Cohesive Platform User Experience

**Branch**: `007-simple-ui-pages` | **Date**: 2026-03-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-simple-ui-pages/spec.md`

## Summary

Add polished Tailwind CSS pages to the AcroYoga Community Platform, providing a cohesive user experience across all existing features. All API routes already exist — this is purely presentational work. The feature adds a shared navigation layout shell, a landing page, and polishes all major page routes (events, teachers, profile, settings, admin, bookings) into a consistent, responsive design.

## Technical Context

**Language/Version**: TypeScript 5.9 / React 19 / Next.js 16  
**Primary Dependencies**: Next.js App Router, React 19, Tailwind CSS v4 (to be installed), next-auth  
**Storage**: N/A (all APIs already exist; no new DB tables)  
**Testing**: Vitest (existing integration tests cover APIs; UI tests are visual verification + nav smoke tests)  
**Target Platform**: Web — responsive 320px–1920px  
**Project Type**: Web application (Next.js App Router)  
**Performance Goals**: LCP < 2.5s on 3G; initial JS bundle < 200KB compressed  
**Constraints**: Tailwind utility classes only (no component libraries); no new API endpoints; must use existing `EventsListPage`, `EventDetailPage`, `EventCard`, `EventFilters` components  
**Scale/Scope**: ~10 page types to create or polish; 1 shared layout component; 1 navigation component

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applies? | Status | Notes |
|-----------|----------|--------|-------|
| I. API-First | ✅ | PASS | No new APIs. All pages consume existing API routes via `fetch()`. |
| II. Test-First | ✅ | PASS | Nav smoke tests + visual verification. Existing API integration tests provide backend coverage. |
| III. Privacy | ✅ | PASS | Pages render server-provided data only. No new PII exposure. Public pages show only aggregate/opted-in data. |
| IV. Server-Side Authority | ✅ | PASS | No client-side business logic. All data comes from existing validated API routes. |
| V. UX Consistency | ✅ | PASS | Core focus of this feature. Shared layout, responsive design, keyboard-navigable, loading/error/empty states. |
| VI. Performance Budget | ✅ | PASS | Tailwind CSS is utility-only (minimal CSS). No heavy libraries in initial bundle. Lazy loading for images. |
| VII. Simplicity | ✅ | PASS | Pure presentational pages. No new abstractions. Tailwind utilities only. |
| VIII. Internationalisation | ⚠️ | DEFERRED | Spec explicitly uses hardcoded strings for this MVP UI pass. i18n extraction is a follow-up. This is acceptable for a presentational spike that will be i18n-wrapped before production. |
| IX. Scoped Permissions | ✅ | PASS | Admin pages reuse existing `withPermission()` middleware. Non-admin access shows unauthorized message. |
| X. Notification Architecture | N/A | — | No notification changes. |
| XI. Resource Ownership | N/A | — | No mutations. Read-only pages. |
| XII. Financial Integrity | N/A | — | No payment changes. Bookings page is read-only display. |

**Gate violations requiring justification:**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| VIII. Hardcoded strings | MVP UI pages need visible text immediately; i18n wrapping is spec 008 follow-up | Extracting all strings to i18n keys before any page exists adds complexity to a purely visual feature with no user-facing production release yet |

## Project Structure

### Documentation (this feature)

```text
specs/007-simple-ui-pages/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal — no new data)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (page route contracts)
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx            # MODIFY: add shared nav shell, Tailwind globals import
│   ├── page.tsx              # MODIFY: landing page with hero + featured events
│   ├── events/
│   │   ├── page.tsx          # EXISTS: wraps EventsListPage (minor polish)
│   │   └── [id]/
│   │       └── page.tsx      # EXISTS: wraps EventDetailPage (add breadcrumb)
│   ├── teachers/
│   │   ├── page.tsx          # EXISTS: teacher directory (already styled)
│   │   └── [id]/
│   │       └── page.tsx      # EXISTS: teacher profile (polish)
│   ├── profile/
│   │   └── page.tsx          # EXISTS: profile form (polish)
│   ├── settings/
│   │   ├── page.tsx          # EXISTS: settings landing (add sidebar nav)
│   │   ├── account/page.tsx  # EXISTS
│   │   ├── privacy/page.tsx  # EXISTS
│   │   └── teacher/page.tsx  # EXISTS
│   ├── admin/
│   │   ├── layout.tsx        # EXISTS: admin layout (extend nav links)
│   │   ├── permissions/      # EXISTS
│   │   ├── requests/         # EXISTS
│   │   ├── teachers/         # EXISTS
│   │   └── concessions/      # EXISTS
│   └── bookings/
│       └── page.tsx          # EXISTS: bookings list (polish)
├── components/
│   ├── NavHeader.tsx         # NEW: shared navigation header
│   └── events/
│       ├── EventCard.tsx     # EXISTS (no changes)
│       ├── EventDetailPage.tsx # EXISTS (no changes)
│       ├── EventFilters.tsx  # EXISTS (no changes)
│       └── EventsListPage.tsx # EXISTS (no changes)
└── app/globals.css           # NEW: Tailwind CSS directives
```

**Structure Decision**: Existing Next.js App Router structure. One new component (`NavHeader.tsx`), one new CSS file (`globals.css`), and modifications to existing pages. No new directories needed.
