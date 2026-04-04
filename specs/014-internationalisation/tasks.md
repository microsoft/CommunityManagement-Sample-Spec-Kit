# Tasks: Internationalisation (i18n)

**Input**: Design documents from `/specs/014-internationalisation/`
**Prerequisites**: plan.md (required), spec.md (required)

**Tests**: Constitution mandates test-first development. Tests are included and MUST fail before implementation.

**Organization**: Tasks are grouped by phase to enable incremental delivery. Each phase builds on the previous.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Translation files**: `apps/web/messages/`
- **i18n config**: `apps/web/src/i18n/`
- **Shared types**: `packages/shared/src/types/`
- **Shared utils**: `packages/shared/src/utils/`
- **Shared UI components**: `packages/shared-ui/src/`
- **Web components**: `apps/web/src/components/`
- **Web pages**: `apps/web/src/app/`
- **Unit tests**: `apps/web/tests/unit/`
- **Integration tests**: `apps/web/tests/integration/`
- **Scripts**: `scripts/`

---

## Phase 1: Infrastructure Setup (US1 — Translation Foundation)

**Purpose**: Install dependencies, create translation file structure, configure next-intl, build formatting helpers

### Tests for Phase 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T001 [P] [US1] Unit tests for shared formatting helpers — `formatEventDate()`, `formatCurrency()`, `formatRelativeTime()`, `formatNumber()` with locale and timezone params in `apps/web/tests/unit/i18n-format.test.ts`
- [ ] T002 [P] [US1] Unit tests for translation key completeness validator — verify all keys in `en.json` exist in other locale files, report missing keys in `apps/web/tests/unit/i18n-completeness.test.ts`

### Implementation for Phase 1

- [ ] T003 [US1] Install `next-intl` in `apps/web/package.json`. Verify compatibility with Next.js 16 App Router
- [ ] T004 [P] [US1] Create shared i18n types — `Locale`, `Direction`, `TranslationNamespace`, `SupportedLocale` — in `packages/shared/src/types/i18n.ts`. Re-export from `packages/shared/src/index.ts`
- [ ] T005 [P] [US1] Create shared formatting helpers — `formatEventDate()` (wraps `Intl.DateTimeFormat` with timezone), `formatCurrency()` (wraps `Intl.NumberFormat` with ISO 4217 validation), `formatRelativeTime()` (wraps `Intl.RelativeTimeFormat`), `formatNumber()` — in `packages/shared/src/utils/format.ts`
- [ ] T006 [US1] Create English translation file `apps/web/messages/en.json` with namespace hierarchy: `common`, `events`, `community`, `permissions`, `teachers`, `payments`, `directory`, `explorer`, `auth`, `errors`
- [ ] T007 [US1] Configure next-intl: create `apps/web/src/i18n/request.ts` (server-side locale resolver from cookie/Accept-Language), `apps/web/src/i18n/routing.ts` (supported locales and default locale config), `apps/web/src/i18n/navigation.ts` (locale-aware Link, redirect, usePathname)
- [ ] T008 [US1] Update `apps/web/next.config.js` to integrate `next-intl` plugin with `createNextIntlPlugin`
- [ ] T009 [US1] Update root layout `apps/web/src/app/layout.tsx` — wrap with `NextIntlClientProvider`, set `lang` and `dir` attributes from resolved locale
- [ ] T010 [US1] Migrate existing `packages/shared/src/utils/translations.ts` — export translation key constants (not string values) that map to keys in the JSON files. Maintain backward compatibility with existing imports

**Checkpoint**: next-intl configured, formatting helpers tested, English translation file created. No UI strings extracted yet — existing behavior unchanged.

---

## Phase 2: String Extraction — Shared UI Components (US1)

**Purpose**: Extract hardcoded strings from all 17 shared-ui components into translation keys

### Tests for Phase 2

- [ ] T011 [P] [US1] Update shared-ui component tests to verify translation key usage — ensure no raw string output in rendered HTML for `EventCard`, `ProfileCompleteness`, `OfflineBanner`, `DirectoryCard` in existing test files under `packages/shared-ui/src/`

### Implementation for Phase 2

- [ ] T012 [P] [US1] Extract strings from `packages/shared-ui/src/EventCard/index.web.tsx` — replace `"Free"` with translation key `events.free`, replace date formatting with `formatEventDate()` helper
- [ ] T013 [P] [US1] Extract strings from `packages/shared-ui/src/ProfileCompleteness/ProfileCompleteness.tsx` — replace hardcoded labels ("Profile photo", "Display name", "Bio", "Home city", "Social link") with translation keys
- [ ] T014 [P] [US1] Extract strings from `packages/shared-ui/src/OfflineBanner/index.web.tsx` — replace default offline message with translation key `common.offlineMessage`
- [ ] T015 [P] [US1] Extract strings from `packages/shared-ui/src/DirectoryCard/index.web.tsx` — replace "Friends", "Follows you", "Unnamed member" with translation keys
- [ ] T016 [P] [US1] Audit and extract strings from remaining 13 shared-ui components — `CategoryLegend`, `LocationTree`, `BookingCard`, `ConcessionBadge`, `Badge`, `Button`, `Card`, `Dialog`, `Input`, `Select`, `Skeleton`, `Toast`, `Tooltip`
- [ ] T017 [US1] Update Storybook decorator in `apps/web/.storybook/preview.ts` to wrap stories with `NextIntlClientProvider` using `en.json` messages

**Checkpoint**: All 17 shared-ui components use translation keys. Storybook renders correctly with translation provider.

---

## Phase 3: String Extraction — Web Components & Pages (US1)

**Purpose**: Extract hardcoded strings from web app components and pages. Replace `toLocaleDateString()` calls with formatting helpers.

### Tests for Phase 3

- [ ] T018 [P] [US1] Integration tests for date formatting in event display — verify `formatEventDate()` output matches expected `Intl.DateTimeFormat` format for event cards, event detail, occurrences in `apps/web/tests/integration/i18n/date-format.test.ts`

### Implementation for Phase 3

- [ ] T019 [P] [US1] Replace all `toLocaleDateString()` / `toLocaleString()` / `toLocaleTimeString()` calls in `apps/web/src/components/events/*.tsx` (15+ files) with `formatEventDate()` from shared formatting helpers
- [ ] T020 [P] [US1] Replace date formatting calls in `apps/web/src/app/**/*.tsx` pages — event detail, event groups, occurrences, discussions, bookings (9+ files)
- [ ] T021 [P] [US1] Extract strings from event components — `EventCard`, `EventFilters`, `ExplorerShell`, `CalendarPanel`, `MapPanel`, `LocationTreePanel`, `EventDetailPage`
- [ ] T022 [P] [US1] Extract strings from community components — discussion pages, thread components, report forms, moderation pages
- [ ] T023 [P] [US1] Extract strings from admin components — permission grant/revoke UI, creator settings, admin dashboard
- [ ] T024 [P] [US1] Extract strings from teacher components — profile pages, review forms, certification display, application forms
- [ ] T025 [P] [US1] Extract strings from payment components — Stripe Connect status, booking confirmation, concession pricing
- [ ] T026 [P] [US1] Extract strings from directory and profile components — user directory, profile page, linked accounts
- [ ] T027 [P] [US1] Extract strings from auth components — login, register, session management pages

**Checkpoint**: All web components and pages use translation keys. Zero `toLocaleDateString()` calls remaining.

---

## Phase 4: Locale Switcher & RTL Support (US2, US3)

**Purpose**: Build locale switcher, add second locale, implement RTL structural support

### Tests for Phase 4

- [ ] T028 [P] [US2] Integration tests for locale switcher — verify locale change triggers re-render, cookie persistence, navigation preservation in `apps/web/tests/integration/i18n/locale-switch.test.ts`
- [ ] T029 [P] [US3] Visual regression tests for RTL layout — verify card mirroring, navigation flow, form alignment in `apps/web/tests/integration/i18n/rtl-layout.test.ts`

### Implementation for Phase 4

- [ ] T030 [US2] Create Spanish translation file `apps/web/messages/es.json` — translate all keys from `en.json` as proof-of-concept second locale
- [ ] T031 [US2] Create `LocaleSwitcher` component in `apps/web/src/components/LocaleSwitcher.tsx` — dropdown showing available locales with current locale highlighted, triggers locale change via `next-intl` router
- [ ] T032 [US2] Add `LocaleSwitcher` to site header/navigation layout — visible on all pages, accessible via keyboard
- [ ] T033 [US3] Audit and convert CSS to logical properties — replace `ml-*`/`mr-*` with `ms-*`/`me-*`, `pl-*`/`pr-*` with `ps-*`/`pe-*`, `left-*`/`right-*` with `start-*`/`end-*` in Tailwind classes across all components
- [ ] T034 [US3] Update `apps/web/src/app/layout.tsx` to set `dir` attribute based on locale direction (LTR/RTL)
- [ ] T035 [US3] Create Arabic translation stub `apps/web/messages/ar.json` — minimal translation for RTL testing (not required to be complete)

**Checkpoint**: Locale switcher functional. Spanish locale fully translated. RTL layout structurally supported.

---

## Phase 5: CI Enforcement & Documentation (US4)

**Purpose**: Upgrade CI lint to blocking, add translation completeness check, document workflow

### Tests for Phase 5

- [ ] T036 [P] [US4] Test that `scripts/lint-i18n.sh` exits with code 1 on raw string detection in `apps/web/tests/unit/lint-i18n-enforcement.test.ts`

### Implementation for Phase 5

- [ ] T037 [US4] Upgrade `scripts/lint-i18n.sh` — change `exit 0` to `exit 1` for violations. Update scan patterns to cover all component directories including new locale-prefixed routes
- [ ] T038 [P] [US4] Add translation key completeness check to CI — script or test that verifies all non-default locale files have every key present in `en.json`. Report missing keys with file path and key name
- [ ] T039 [P] [US4] Add i18n section to `CONTRIBUTING.md` — document: how to add a new string (add key to en.json, use `useTranslations()` hook), how to add a new locale (copy en.json, translate, add to supported locales), naming conventions for translation keys
- [ ] T040 [P] [US4] Add i18n section to `docs/testing.md` — document: how to test with translations in unit tests, how to mock `next-intl` in integration tests, how to verify RTL layout

**Checkpoint**: CI blocks on i18n violations. Translation workflow documented.

---

## Phase 6: Polish & Validation (All Stories)

**Purpose**: Full validation, regression testing, README update

- [ ] T041 Run full validation checklist: `npm run tokens:build -w @acroyoga/tokens` → `npm run typecheck` → `npm run lint -w @acroyoga/web` → `npm run test` → `npm run build -w @acroyoga/web`
- [ ] T042 Verify Storybook builds and all accessibility audits pass with translation provider
- [ ] T043 Update `README.md` — add Spec 014 to specs table, update i18n description in Architectural Principles section
- [ ] T044 Update deferred i18n tasks in Specs 001, 003, 004, 005 — change rationale from "deferred to i18n sprint" to "addressed by Spec 014"

**Checkpoint**: All tests pass, CI green, documentation updated.

---

## Dependencies & Execution Order

- **Phase 1**: No dependencies — can start immediately
- **Phase 2**: Depends on Phase 1 (needs translation file and formatting helpers)
- **Phase 3**: Depends on Phase 1 (needs formatting helpers). Can run in parallel with Phase 2
- **Phase 4**: Depends on Phases 2–3 (strings must be extracted before locale switching is meaningful)
- **Phase 5**: Depends on Phases 1–3 (lint must cover extracted strings)
- **Phase 6**: Depends on all prior phases
