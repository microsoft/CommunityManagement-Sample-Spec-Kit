# Implementation Plan: Internationalisation (i18n)

**Branch**: `014-internationalisation` | **Date**: 2026-04-04 | **Spec**: [specs/014-internationalisation/spec.md](spec.md)
**Input**: Feature specification from `/specs/014-internationalisation/spec.md`
**Status**: Implemented

## Summary

Adopt `next-intl` as the i18n framework for locale-aware routing, translation lookup, and formatting. Extract all hardcoded UI strings (~200+ instances across 50+ component files) into structured JSON translation files. Replace 24+ `toLocaleDateString()`/`toLocaleString()` calls with shared `Intl.DateTimeFormat` formatting helpers. Convert CSS spacing to Tailwind logical properties for RTL support. Upgrade the CI i18n lint gate from warning to blocking. Deliver a locale switcher component and a documented community translation workflow.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode), React 19, Next.js 16 (App Router)
**Primary Dependencies**: `next-intl` (i18n framework for Next.js App Router), existing `@acroyoga/shared` translations module
**Storage**: Translation JSON files in `apps/web/messages/` directory; locale preference in cookie
**Testing**: Vitest (unit tests for formatting helpers), integration tests for locale switching, CI lint for string extraction
**Target Platform**: Web (browsers), with shared formatting utilities available to future mobile app
**Project Type**: Cross-cutting horizontal concern affecting all existing UI code
**Performance Goals**: No increase in initial bundle size; non-default locale files lazy-loaded; translation lookup <1ms
**Constraints**: Must not break any existing tests (740 tests); must not change API contracts; RTL structural support without visual regression

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. API-First Design | ✅ PASS | No new API routes. Translation files are static assets served by Next.js. Locale preference stored in cookie (no API needed). |
| II. Test-First Development | ✅ PASS | Unit tests for formatting helpers (formatDate, formatCurrency, formatRelativeTime). Integration tests for locale switching. CI lint upgraded to blocking. |
| III. Privacy & Data Protection | ✅ PASS | Locale preference is not PII. No user data changes. |
| IV. Server-Side Authority | ✅ PASS | Server-side rendering respects `Accept-Language` header and locale cookie. `lang` and `dir` attributes set server-side. |
| V. UX Consistency | ✅ PASS | All text sourced from translation system ensures consistency. RTL layout support via CSS logical properties. |
| VI. Performance Budget | ✅ PASS | Only the active locale's translation file is loaded. `next-intl` tree-shakes unused formatters. No impact on <200KB JS budget. |
| VII. Simplicity | ✅ PASS | `next-intl` is the de facto i18n library for Next.js App Router — maintained, well-documented, zero-config for basic usage. |
| VIII. Internationalisation | ✅ PASS | **This spec implements all Principle VIII constraints**: extractable strings, `Intl.DateTimeFormat`, `Intl.NumberFormat`, RTL structural support, CI lint enforcement. |
| IX. Scoped Permissions | N/A | No permission changes. |
| X. Notification Architecture | N/A | Notification template i18n deferred to Spec 015. |
| XI. Resource Ownership | N/A | No resource mutations. |
| XII. Financial Integrity | ✅ PASS | Currency formatting uses `Intl.NumberFormat` with ISO 4217 codes — validated by formatting helper. |
| QG-5: Bundle Size | ✅ PASS | Per-locale JSON files loaded on demand. `next-intl` adds ~5KB gzipped to shared bundle. |
| QG-9: i18n Compliance | ✅ PASS | CI lint upgraded from warning to blocking (exit 1). ESLint plugin added for per-file enforcement. |

**Gate result: PASS — no violations. Proceed to implementation.**

## Project Structure

### Documentation (this feature)

```text
specs/014-internationalisation/
├── spec.md              # Feature specification
├── plan.md              # This file — implementation plan
├── tasks.md             # Dependency-ordered implementation tasks
└── data-model.md        # Translation file schema and locale configuration
```

### Source Code (repository root)

```text
apps/web/
├── messages/                      # NEW — Translation JSON files
│   ├── en.json                    # Default locale (English)
│   └── es.json                    # Example second locale (Spanish)
├── src/
│   ├── i18n/                      # NEW — next-intl configuration
│   │   ├── request.ts             # Server-side locale resolution
│   │   ├── routing.ts             # Locale-aware routing config
│   │   └── navigation.ts          # Locale-aware Link, redirect, etc.
│   ├── app/
│   │   └── [locale]/              # MODIFIED — locale prefix in route segments
│   │       └── layout.tsx         # MODIFIED — NextIntlClientProvider, lang/dir attrs
│   ├── components/
│   │   └── LocaleSwitcher.tsx     # NEW — locale selection dropdown
│   └── lib/
│       └── i18n/
│           ├── translations.ts    # EXISTING — MODIFIED to re-export from next-intl
│           └── format.ts          # NEW — shared Intl formatting helpers
│
├── next.config.js                 # MODIFIED — next-intl plugin integration

packages/shared/src/
├── utils/
│   ├── translations.ts            # EXISTING — MODIFIED to export translation keys as constants
│   └── format.ts                  # NEW — platform-agnostic Intl formatting helpers
│
├── types/
│   └── i18n.ts                    # NEW — Locale, Direction, TranslationNamespace types

packages/shared-ui/src/
├── EventCard/index.web.tsx        # MODIFIED — replace hardcoded "Free" with translation key
├── ProfileCompleteness/*.tsx      # MODIFIED — replace hardcoded labels with translation keys
├── OfflineBanner/index.web.tsx    # MODIFIED — use translation key for offline message
├── DirectoryCard/index.web.tsx    # MODIFIED — replace hardcoded strings with translation keys
└── ... (all 17 components audited)

scripts/
└── lint-i18n.sh                   # MODIFIED — exit 1 instead of exit 0
```

## Complexity Tracking

| Concern | Status | Mitigation |
|---------|--------|------------|
| 200+ string extractions | Medium | Phased extraction — shared-ui first, then web components, then pages |
| 24+ date formatting refactors | Low | Single formatting helper; find-and-replace pattern |
| RTL CSS migration | Medium | Tailwind v4 supports logical properties natively (`ms-*`, `me-*`); gradual migration |
| Existing test breakage | Low | Translation keys in tests can use `en.json` values; mock `next-intl` in test setup |
| next-intl + Next.js 16 compat | Low | next-intl supports App Router; verify with Next.js 16 specifically |

## Phase Breakdown

### Phase 1: Infrastructure Setup
Install `next-intl`, create translation file structure, configure locale routing, set up formatting helpers. No UI changes yet — purely infrastructure.

### Phase 2: String Extraction (Shared UI)
Extract hardcoded strings from all 17 shared-ui components into translation keys. Update Storybook stories to use translation provider.

### Phase 3: String Extraction (Web Components & Pages)
Extract hardcoded strings from web app components and pages. Replace `toLocaleDateString()` calls with formatting helpers.

### Phase 4: Locale Switcher & RTL
Build the locale switcher component. Add RTL structural support via CSS logical properties. Add a second locale (Spanish) as proof-of-concept.

### Phase 5: CI & Documentation
Upgrade i18n lint to blocking. Add translation key completeness check. Document the community translation workflow.

### Phase 6: Polish & Validation
Run full validation checklist. Verify no regressions. Update README and contributing guide.
