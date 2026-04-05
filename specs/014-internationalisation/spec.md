# Feature Specification: Internationalisation (i18n)

**Feature Branch**: `014-internationalisation`  
**Created**: 2026-04-04  
**Status**: Implemented  
**Input**: Constitution Principle VIII mandate, ~20 deferred i18n tasks across Specs 001/003/004/005, existing `translations.ts` module and `lint-i18n.sh` CI gate

## Summary

Implement full internationalisation support across the platform. The existing codebase has a centralized `translations.ts` module (41 strings across 7 categories), an i18n CI lint script (warning-only), and partial `Intl` API usage. This spec completes the i18n story by: (1) adopting `next-intl` for locale-aware routing and translation, (2) extracting all hardcoded UI strings into translation files, (3) replacing `toLocaleDateString()`/`toLocaleString()` calls with `Intl.DateTimeFormat`, (4) adding RTL structural support via CSS logical properties, (5) upgrading the CI lint gate from warning to blocking, and (6) delivering a locale switcher UI. The default locale is English (`en`); community-contributed locales can be added by dropping a JSON translation file.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Platform in Default Locale (Priority: P1)

A community member visits the platform. All UI text, dates, times, currency amounts, and numbers are displayed using their browser's preferred locale settings. No hardcoded English strings appear in the UI — all text comes from the translation system. Date/time values respect the user's timezone. Currency amounts use `Intl.NumberFormat` with proper ISO 4217 formatting.

**Why this priority**: The constitution mandates i18n-ready strings from day one (Principle VIII). This is the foundational story — every other i18n feature depends on the translation infrastructure being in place.

**Independent Test**: Load any page. Inspect the DOM for raw English string literals in component output. Verify all visible text traces back to a translation key. Verify dates use `Intl.DateTimeFormat` formatting. Verify currency uses `Intl.NumberFormat`.

**Acceptance Scenarios**:

1. **Given** a user visits any page, **When** the page renders, **Then** all user-facing text is sourced from the translation system (no hardcoded strings in JSX).
2. **Given** an event has a start date, **When** displayed on EventCard or EventDetailPage, **Then** the date is formatted via `Intl.DateTimeFormat` respecting the user's locale and timezone.
3. **Given** an event has a cost, **When** displayed, **Then** the amount is formatted via `Intl.NumberFormat` with the correct ISO 4217 currency code.
4. **Given** the CI pipeline runs, **When** the i18n lint step executes, **Then** it exits with code 1 (blocking) on any raw string literal detected in component files.
5. **Given** the translation module, **When** a developer adds a new UI string, **Then** they add it to the translation file and reference it by key — the lint prevents hardcoded alternatives.

---

### User Story 2 - Switch Locale at Runtime (Priority: P2)

A community member clicks a locale switcher in the site header/footer and selects a different language (e.g., Spanish, French). The page re-renders with all text in the selected locale. The locale preference persists across page navigations and browser sessions via a cookie. Dates, numbers, and currency automatically adapt to the new locale's formatting conventions.

**Why this priority**: Locale switching is the core value proposition of i18n — without it, the translation infrastructure has no user-facing benefit beyond the default locale.

**Independent Test**: Load the homepage in English. Click the locale switcher. Select "Español". Verify all text changes to Spanish. Navigate to another page — Spanish persists. Refresh the browser — Spanish still active.

**Acceptance Scenarios**:

1. **Given** the site header, **When** a user looks for locale options, **Then** a locale switcher UI element is visible showing the current locale.
2. **Given** the locale switcher, **When** the user selects a different locale, **Then** all UI text re-renders in the selected language without a full page reload.
3. **Given** a locale has been selected, **When** the user navigates to another page, **Then** the selected locale persists.
4. **Given** a locale preference is set, **When** the user closes and reopens the browser, **Then** the previously selected locale is restored from a cookie.
5. **Given** the selected locale is Spanish, **When** a date is displayed, **Then** it uses Spanish date formatting (e.g., "4 de abril de 2026").

---

### User Story 3 - RTL Layout Support (Priority: P3)

A community member using an RTL language (Arabic, Hebrew) selects their locale. The entire page layout mirrors — navigation flows right-to-left, text alignment flips, margins/paddings use logical properties. No layout breaks or overlapping elements occur.

**Why this priority**: Constitution VIII mandates structural RTL support. While no RTL locales may ship immediately, the CSS foundation must be in place so adding an RTL locale requires only a translation file, not layout changes.

**Independent Test**: Switch to an RTL locale (or force `dir="rtl"` on `<html>`). Verify the navigation, cards, forms, and text all flow correctly right-to-left. Verify no overlapping or broken spacing.

**Acceptance Scenarios**:

1. **Given** an RTL locale is active, **When** the page renders, **Then** the `<html>` element has `dir="rtl"` and `lang` set to the locale code.
2. **Given** an RTL layout, **When** inspecting CSS, **Then** all spacing uses logical properties (`margin-inline-start` instead of `margin-left`, etc.) or Tailwind's logical equivalents (`ms-*`, `me-*`, `ps-*`, `pe-*`).
3. **Given** an RTL layout, **When** the user views the navigation, **Then** it flows right-to-left with correct icon/text ordering.
4. **Given** an RTL layout, **When** viewing event cards, **Then** card content and metadata are correctly mirrored.

---

### User Story 4 - Community Translation Contribution (Priority: P3)

A community contributor wants to add a new language. They create a new JSON translation file following a documented pattern, submit a PR, and the CI validates the file has all required keys. No code changes are needed — only the translation JSON file.

**Why this priority**: The constitution says "additional locales are added by the community". This story ensures the translation file format is documented and validated.

**Independent Test**: Copy `en.json` to `pt.json`, translate a few keys, leave some untranslated. Submit a PR. CI reports which keys are missing. Fill in all keys — CI passes.

**Acceptance Scenarios**:

1. **Given** a contributor, **When** they read the i18n documentation, **Then** they understand how to create a new locale file.
2. **Given** a new locale file, **When** it is missing required keys, **Then** the CI lint step reports the missing keys.
3. **Given** a complete locale file, **When** added to the translations directory, **Then** the locale appears in the locale switcher without any code changes.

---

### Edge Cases

- Missing translation key falls back to English (default locale), never shows a raw key like `events.rsvp.confirm`
- Pluralization rules differ by locale (e.g., Arabic has 6 plural forms) — use ICU MessageFormat
- Number formatting for currencies without minor units (e.g., JPY) must not show decimals
- Timezone-aware date formatting must handle DST transitions
- Long translated strings must not break layout (German/Finnish words are significantly longer than English)
- Bi-directional text (e.g., English brand names in Arabic text) must render correctly

## Requirements

### Functional Requirements

- **FR-001**: All user-facing strings MUST be sourced from translation files, not hardcoded in components
- **FR-002**: Date/time formatting MUST use `Intl.DateTimeFormat` with locale and timezone parameters
- **FR-003**: Currency formatting MUST use `Intl.NumberFormat` with ISO 4217 currency codes
- **FR-004**: The `<html>` element MUST have correct `lang` and `dir` attributes based on active locale
- **FR-005**: A locale switcher MUST be accessible from every page
- **FR-006**: Locale preference MUST persist across sessions via cookie
- **FR-007**: CSS MUST use logical properties for spacing/alignment to support RTL
- **FR-008**: CI MUST block PRs that introduce hardcoded string literals in component files
- **FR-009**: Adding a new locale MUST require only a JSON translation file — no code changes
- **FR-010**: Missing translation keys MUST fall back to the default locale (English)

### Key Entities

- **Translation files**: JSON files per locale (`en.json`, `es.json`, `fr.json`, etc.)
- **Locale context**: React context providing current locale, direction, and translation function
- **Formatting helpers**: Shared utilities wrapping `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.RelativeTimeFormat`
- **Locale switcher**: UI component for runtime locale selection

## Success Criteria

### Measurable Outcomes

- **SC-001**: Zero hardcoded user-facing strings detected by CI lint (exit code 1)
- **SC-002**: 100% of date/time displays use `Intl.DateTimeFormat` (zero `toLocaleDateString()` calls remaining)
- **SC-003**: All 17 shared-ui components use translation keys for visible text
- **SC-004**: Locale switcher functional with at least 2 locales (en + 1 other)
- **SC-005**: RTL layout renders correctly when `dir="rtl"` is forced
- **SC-006**: New locale can be added with only a JSON file — verified by test

## Constitution Compliance

| Principle | Applicable | Notes |
|-----------|:---:|-------|
| I. API-First | ✅ | Locale preference may be stored server-side for SSR; translation files are static assets |
| II. Test-First | ✅ | Unit tests for formatting helpers; integration tests for locale switching; CI lint for string extraction |
| III. Privacy | N/A | Locale preference is not PII |
| IV. Server-Side Authority | ✅ | Server renders correct `lang`/`dir` attributes; locale detection from Accept-Language header |
| V. UX Consistency | ✅ | All text consistent via translation system; RTL layout mirroring |
| VI. Performance Budget | ✅ | Translation files loaded per-locale (no bundling all locales); lazy-load non-default locales |
| VII. Simplicity | ✅ | Use `next-intl` (maintained, Next.js-native) over custom solution |
| VIII. Internationalisation | ✅ | **Primary spec** — implements all Principle VIII constraints |
| IX. Scoped Permissions | N/A | No permission changes |
| X. Notification Architecture | N/A | Notification i18n deferred to Spec 015 |
| XI. Resource Ownership | N/A | No resource changes |
| XII. Financial Integrity | ✅ | Currency formatting uses `Intl.NumberFormat` with ISO 4217 |
| XIII. Development Environment | ✅ | Translation contributor workflow documented |
| XIV. Managed Identity | N/A | No Azure changes |
