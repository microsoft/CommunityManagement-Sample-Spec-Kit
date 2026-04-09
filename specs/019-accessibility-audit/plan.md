# Implementation Plan: WCAG Accessibility Audit & Remediation

**Branch**: `019-wcag-accessibility-audit` | **Date**: 2025-07-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/019-accessibility-audit/spec.md`

## Summary

Conduct a comprehensive WCAG 2.1 AA accessibility audit across the entire AcroYoga Community Platform — web (Next.js 16, App Router, React 19) and mobile (Expo 52, React Native 0.76) — and remediate every issue discovered. The platform has partial accessibility support (form error associations, native `<dialog>` in Modal, ARIA tree roles in LocationTree, live regions in Toast) but critical gaps remain: no skip-navigation links, no focus restoration in modals, no visible focus indicators on interactive cards, no reduced-motion support, no automated accessibility test suite, and incomplete keyboard navigation on complex widgets. This plan covers eight remediation areas through systematic token fixes, component-by-component remediation, layout-level structural changes, and a two-layer automated testing strategy (vitest-axe + @axe-core/playwright).

## Technical Context

**Language/Version**: TypeScript 5.9.3, React 19.2.4, React Native 0.76.6
**Primary Dependencies**: Next.js 16.1.6 (web), Expo 52 (mobile), Tailwind CSS 4.2.1, Style Dictionary 4.4.0 (tokens)
**Storage**: N/A — no database changes for this feature
**Testing**: Vitest 4.1.1 (web/shared-ui), Jest 29.7.0 + jest-expo (mobile), Playwright 1.59.1 (E2E)
**Target Platform**: Web (all modern browsers) + iOS (VoiceOver) + Android (TalkBack)
**Project Type**: Monorepo — 2 apps (web, mobile) + 3 packages (shared-ui, shared, tokens)
**Performance Goals**: Zero regression in LCP < 2.5s, TTI < 3.5s, bundle < 200KB (Constitution VI)
**Constraints**: No new runtime dependencies (Constitution VII); 2 new dev dependencies only (vitest-axe, @axe-core/playwright)
**Scale/Scope**: 20 shared-ui components, 32 web pages, 16 mobile screens, ~80 files to modify/create

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Gate (Principles from spec header: II, V, VI, VII, VIII)

| Principle | Status | Assessment |
|---|---|---|
| **I. API-First Design** | ✅ N/A | No API changes — this is a UI-layer feature |
| **II. Test-First Development** | ✅ PASS | Plan includes comprehensive a11y test suite: vitest-axe for all 20 components, @axe-core/playwright for all 21+ pages, and mobile accessibility assertions. Coverage targets maintained. |
| **III. Privacy & Data Protection** | ✅ N/A | No PII changes |
| **IV. Server-Side Authority** | ✅ N/A | No validation or business logic changes |
| **V. UX Consistency** | ✅ PASS — PRIMARY DRIVER | This spec directly fulfils Principle V: WCAG 2.1 AA, keyboard navigation, 44×44 touch targets, AA contrast, loading/error states. All constraints addressed. |
| **VI. Performance Budget** | ✅ PASS | No new runtime dependencies. Skip link is a single `<a>` tag. Focus-visible CSS is lightweight. vitest-axe and @axe-core/playwright are devDependencies only. Token changes don't affect bundle size. |
| **VII. Simplicity** | ✅ PASS | Native `<dialog>` leveraged instead of focus-trap library. Roving tabindex implemented as a shared hook (~50 lines) instead of a third-party tree library. Global CSS handles reduced motion. Only 2 new dev dependencies, both actively maintained and widely used. |
| **VIII. Internationalisation** | ✅ PASS | Skip link label and all new aria-labels will use i18n translation keys. Focus order respects `dir` attribute for RTL layouts (verified via existing Spec 014 RTL support). No new hardcoded strings. |
| **IX. Scoped Permissions** | ✅ N/A | No permission changes |
| **X. Notification Architecture** | ✅ N/A | Toast live regions already use `aria-live="polite"` — minor enhancement (add `aria-atomic`) |
| **XI. Resource Ownership** | ✅ N/A | No resource model changes |
| **XII. Financial Integrity** | ✅ N/A | No payment changes |
| **XIII. Development Environment** | ✅ PASS | All work in Codespaces/Linux. Token builds via `npm run tokens:build`. Tests via Vitest + Playwright. |
| **XIV. Managed Identity** | ✅ N/A | No Azure service changes |

### Quality Gates Compliance

| Gate | Status | Notes |
|---|---|---|
| 1. Type check | ✅ | New props are typed; no `any` types |
| 2. Tests | ✅ | New a11y test files for all components + pages |
| 3. Lint | ✅ | eslint-plugin-jsx-a11y already active; new code complies |
| 4. Build | ✅ | No structural changes that affect build |
| 5. Bundle size | ✅ | Zero runtime dependency additions |
| 6. Accessibility | ✅ — THIS IS THE FEATURE | Automated axe-core testing + manual verification |
| 7. API contract | ✅ N/A | No API changes |
| 8. Constitution review | ✅ | This document serves as the review |
| 9. i18n compliance | ✅ | All new labels via i18n keys |
| 10. Permission smoke test | ✅ N/A | No new endpoints |
| 11. Auth consistency | ✅ N/A | No auth changes |
| 12. Cross-spec data integrity | ✅ N/A | No cross-spec table references |

**Gate Result: ALL PASS** — no violations, no justifications needed.

## Project Structure

### Documentation (this feature)

```text
specs/019-accessibility-audit/
├── spec.md                              # Feature specification
├── plan.md                              # This file
├── research.md                          # Phase 0: all research decisions
├── data-model.md                        # Phase 1: token + prop changes
├── quickstart.md                        # Phase 1: developer onboarding guide
├── contracts/
│   └── a11y-testing-contract.md         # Phase 1: testing contract definition
└── checklists/
    └── requirements.md                  # Pre-existing spec quality checklist
```

### Source Code (repository root)

```text
packages/tokens/src/
├── color.tokens.json                    # MODIFY: contrast fixes (warning, success, social)
└── global.tokens.json                   # MODIFY: add focus-ring-width, focus-ring-offset, min-touch-target

packages/shared-ui/src/
├── SkipLink/                            # CREATE: new skip-navigation component
│   ├── SkipLink.tsx                     #   shared interface
│   ├── index.web.tsx                    #   web: visually-hidden <a> with :focus styles
│   ├── index.native.tsx                 #   native: no-op
│   ├── SkipLink.test.tsx                #   unit test
│   └── SkipLink.a11y.test.tsx           #   axe-core test
├── Modal/index.web.tsx                  # MODIFY: aria-modal, focus restore, initial focus
├── Button/index.web.tsx                 # MODIFY: focus-visible outline, aria-busy
├── EventCard/index.web.tsx              # MODIFY: semantics, Space key, aria-label, focus outline
├── TeacherCard/index.web.tsx            # MODIFY: same pattern as EventCard
├── DirectoryCard/index.web.tsx          # MODIFY: same pattern as EventCard
├── LocationTree/index.web.tsx           # MODIFY: arrow keys, roving tabindex, aria-level
├── Skeleton/index.web.tsx               # MODIFY: prefers-reduced-motion
├── Toast/index.web.tsx                  # MODIFY: aria-atomic="true"
├── LoadingSpinner/index.web.tsx         # MODIFY: reduced-motion alternative
├── CategoryLegend/index.web.tsx         # MODIFY: ensure non-colour cues (icons/shapes)
├── [all]/index.native.tsx               # MODIFY: add accessibility* props
└── [all]/*.a11y.test.tsx                # CREATE: axe-core tests per component

apps/web/src/
├── app/
│   ├── layout.tsx                       # MODIFY: add SkipLink + <main id="main-content">
│   ├── globals.css                      # MODIFY: focus-visible styles, reduced-motion rule, skip-link styles
│   └── [all pages]/page.tsx             # MODIFY: verify h1, heading hierarchy, landmarks
├── components/
│   ├── NavHeader.tsx                    # MODIFY: nav labels, aria-controls, ESC handler
│   └── events/ExplorerShell.tsx         # MODIFY: tab pattern, aria-controls, panel IDs
└── hooks/
    └── useRovingTabIndex.ts             # CREATE: shared roving tabindex hook

apps/web/e2e/
└── a11y/                                # CREATE: page-level Playwright a11y tests
    ├── home.a11y.spec.ts
    ├── events-listing.a11y.spec.ts
    ├── events-explorer.a11y.spec.ts
    ├── event-detail.a11y.spec.ts
    ├── teachers.a11y.spec.ts
    ├── teacher-profile.a11y.spec.ts
    ├── directory.a11y.spec.ts
    ├── login.a11y.spec.ts
    ├── settings.a11y.spec.ts
    ├── settings-account.a11y.spec.ts
    ├── settings-notifications.a11y.spec.ts
    ├── settings-privacy.a11y.spec.ts
    ├── settings-teacher.a11y.spec.ts
    ├── profile.a11y.spec.ts
    ├── bookings.a11y.spec.ts
    ├── notifications.a11y.spec.ts
    ├── admin.a11y.spec.ts
    ├── concessions.a11y.spec.ts
    └── event-groups.a11y.spec.ts

apps/mobile/
└── [screens]                            # MODIFY: accessibility* props on all interactive elements
```

**Structure Decision**: This feature touches existing code across the entire monorepo. No new packages or workspaces are created. The only new directory is `apps/web/e2e/a11y/` for page-level Playwright tests and the `SkipLink` component directory in shared-ui.

## Complexity Tracking

> No Constitution violations — no justifications needed.

| Aspect | Complexity | Justification |
|--------|-----------|---------------|
| Two test frameworks (vitest-axe + @axe-core/playwright) | Moderate | Component tests catch isolated issues; page tests catch layout/context issues. Both needed per FR-032. The project already uses both Vitest and Playwright. |
| Roving tabindex hook | Low | ~50 lines of code, well-documented APG pattern, shared between tree and calendar |
| 80 files touched | High surface area, low depth | Most changes are small (add a11y attributes, focus styles) but spread across many files |

---

## Phase 0: Research

**Status**: Complete — see [research.md](./research.md)

All research areas resolved:

| Area | Decision | See Research Section |
|---|---|---|
| Focus trapping | Native `<dialog>` + focus restoration wrapper | §1 |
| Skip navigation | Single skip link in root layout.tsx | §2 |
| Arrow key navigation | Roving tabindex per APG | §3 |
| Colour contrast | Fix tokens at source | §4 |
| Automated testing | vitest-axe + @axe-core/playwright | §5 |
| Mobile accessibility | Native accessibility props | §6 |
| Reduced motion | Global CSS + component overrides | §7 |

---

## Phase 1: Design & Contracts

### 1.1 Data Model

**Status**: Complete — see [data-model.md](./data-model.md)

Key decisions:
- **No database changes** — this is purely UI-layer
- **4 token modifications** (contrast fixes) + **3 new tokens** (focus-ring-width, focus-ring-offset, min-touch-target)
- **Component prop extensions** documented for Modal, Button, EventCard, LocationTree, Skeleton
- **New SkipLink component** with web/native split
- **Axe-core waiver configuration** as a typed contract

### 1.2 Interface Contracts

**Status**: Complete — see [contracts/a11y-testing-contract.md](./contracts/a11y-testing-contract.md)

No external API changes. The contract defines:
- Component-level test structure (vitest-axe pattern)
- Page-level test structure (@axe-core/playwright pattern)
- CI gate enforcement rules
- Failure message format
- Waiver tracking format
- Mobile accessibility prop requirements

### 1.3 Quickstart

**Status**: Complete — see [quickstart.md](./quickstart.md)

---

## Phase 2: Implementation Approach

### Work Stream 1 — Foundation (Tokens + Global Styles + SkipLink)

**Dependencies**: None — must be completed first
**Covers**: FR-017, FR-018, FR-019, FR-021, FR-022, FR-023

| Task | Files | Requirements |
|---|---|---|
| Fix contrast tokens | `packages/tokens/src/color.tokens.json` | FR-018, FR-019 |
| Add a11y tokens (focus-ring-width, focus-ring-offset, min-touch-target) | `packages/tokens/src/global.tokens.json` | FR-002, FR-029 |
| Rebuild tokens | `npm run tokens:build` | — |
| Add global focus-visible styles | `apps/web/src/app/globals.css` | FR-002 |
| Add global reduced-motion rule | `apps/web/src/app/globals.css` | FR-021, FR-022, FR-023 |
| Add skip-link styles | `apps/web/src/app/globals.css` | FR-017 |
| Create SkipLink component | `packages/shared-ui/src/SkipLink/*` | FR-017 |
| Add SkipLink + `<main>` to layout | `apps/web/src/app/layout.tsx` | FR-007, FR-017 |
| Add nav labels + ESC handler to NavHeader | `apps/web/src/components/NavHeader.tsx` | FR-007, FR-009 |
| Install vitest-axe (dev) | `package.json` (shared-ui workspace) | FR-032 |
| Install @axe-core/playwright (dev) | `package.json` (web workspace) | FR-032 |

### Work Stream 2 — Shared-UI Component Remediation (P1 Components)

**Dependencies**: Work Stream 1 (tokens + global styles must be available)
**Covers**: FR-001–FR-006, FR-009–FR-016, FR-020

#### 2A: Modal Focus Management
| Task | Files | Requirements |
|---|---|---|
| Add `aria-modal="true"` | `Modal/index.web.tsx` | FR-016 |
| Capture trigger element on open | `Modal/index.web.tsx` | FR-015 |
| Restore focus to trigger on close | `Modal/index.web.tsx` | FR-015 |
| Move focus to first focusable child on open | `Modal/index.web.tsx` | FR-013 |
| Write Modal a11y test | `Modal/Modal.a11y.test.tsx` | FR-032 |

#### 2B: Button Accessibility
| Task | Files | Requirements |
|---|---|---|
| Add `focus-visible` outline using token | `Button/index.web.tsx` | FR-002 |
| Add `aria-busy={loading}` when loading | `Button/index.web.tsx` | FR-009 |
| Write Button a11y test | `Button/Button.a11y.test.tsx` | FR-032 |

#### 2C: Interactive Card Remediation (EventCard, TeacherCard, DirectoryCard)
| Task | Files | Requirements |
|---|---|---|
| Fix semantics (role, aria-label) | `*/index.web.tsx` | FR-001, FR-009, FR-012 |
| Add Space key handler alongside Enter | `*/index.web.tsx` | FR-001 |
| Add focus-visible outline | `*/index.web.tsx` | FR-002 |
| Ensure non-colour cues on category badges | `EventCard/index.web.tsx`, `CategoryLegend/index.web.tsx` | FR-020 |
| Write a11y tests for each card | `*/*.a11y.test.tsx` | FR-032 |

#### 2D: LocationTree Arrow Key Navigation
| Task | Files | Requirements |
|---|---|---|
| Create `useRovingTabIndex` hook | `apps/web/src/hooks/useRovingTabIndex.ts` | FR-003 |
| Implement ArrowUp/Down/Left/Right handlers | `LocationTree/index.web.tsx` | FR-003 |
| Add Home/End key support | `LocationTree/index.web.tsx` | FR-003 |
| Add `aria-level` to tree items | `LocationTree/index.web.tsx` | FR-003 |
| Add `role="group"` with labels to child containers | `LocationTree/index.web.tsx` | FR-003 |
| Write LocationTree a11y test | `LocationTree/LocationTree.a11y.test.tsx` | FR-032 |

#### 2E: Remaining Component Fixes
| Task | Files | Requirements |
|---|---|---|
| Skeleton: add prefers-reduced-motion | `Skeleton/index.web.tsx` | FR-021 |
| Toast: add `aria-atomic="true"` | `Toast/index.web.tsx` | FR-011 |
| LoadingSpinner: reduced-motion alternative | `LoadingSpinner/index.web.tsx` | FR-022 |
| Form components (Input, TextArea, Select): verify required indicators | `*/index.web.tsx` | FR-024, FR-025, FR-026, FR-027 |
| SocialIcons: verify accessible names on icon-only links | `SocialIcons/index.web.tsx` | FR-009 |
| Write a11y tests for all remaining components | `*/*.a11y.test.tsx` | FR-032 |

### Work Stream 3 — Web Page Remediation

**Dependencies**: Work Stream 1 (layout changes), Work Stream 2 (component fixes)
**Covers**: FR-007, FR-008, FR-011, FR-028

| Task | Files | Requirements |
|---|---|---|
| Verify/fix h1 + heading hierarchy on all pages | All `page.tsx` files | FR-008 |
| Verify landmark structure (header/nav/main/footer) | All `page.tsx` + `layout.tsx` files | FR-007 |
| Fix ExplorerShell tab pattern (aria-controls, panel IDs) | `ExplorerShell.tsx` | FR-004, FR-005, FR-006 |
| Add calendar arrow-key navigation | Calendar component in explorer | FR-004 |
| Add live region for filter result count | `ExplorerShell.tsx` | FR-011 |
| Fix notification preferences table (row/column associations) | `settings/notifications/page.tsx` | FR-028 |
| Verify RSVP flow keyboard accessibility | `events/[id]/page.tsx` | FR-001, FR-006 |

### Work Stream 4 — Mobile Accessibility

**Dependencies**: Work Stream 2 (shared-ui native implementations)
**Covers**: FR-029, FR-030, FR-031

| Task | Files | Requirements |
|---|---|---|
| Audit all `index.native.tsx` in shared-ui — add `accessible`, `accessibilityLabel`, `accessibilityRole` | All 20 `index.native.tsx` files | FR-031 |
| Add `accessibilityState` for interactive state (disabled, selected, expanded) | Relevant native components | FR-031 |
| Add `accessibilityLiveRegion="polite"` to Toast native | `Toast/index.native.tsx` | FR-031 |
| Verify all touch targets ≥ 44×44 | All mobile screens | FR-029 |
| Add zoom button alternatives for map gesture | Mobile map view | FR-030 |
| Add button alternatives for swipe gestures | Dismissible notifications | FR-030 |

### Work Stream 5 — Automated Testing Suite

**Dependencies**: Work Streams 1–4 (fixes must be in place so tests pass)
**Covers**: FR-032, FR-033, FR-034, FR-035

| Task | Files | Requirements |
|---|---|---|
| Create axe-core config with WCAG 2.1 AA ruleset | `apps/web/src/test/a11y/axe-config.ts` | FR-032 |
| Create shared test helper for vitest-axe | `packages/shared-ui/src/__tests__/a11y-helpers.ts` | FR-032 |
| Write component a11y tests (20 components) | `*.a11y.test.tsx` in each component dir | FR-032 |
| Create Playwright a11y test scaffold | `apps/web/e2e/a11y/` | FR-032 |
| Write page-level a11y tests (21 pages) | `apps/web/e2e/a11y/*.a11y.spec.ts` | FR-032 |
| Document Leaflet waiver | `axe-config.ts` + tracking issue | FR-035 |
| Add `test:a11y` script to package.json | Root + workspace `package.json` files | FR-033 |
| Verify CI pipeline fails on violation | Manual test: remove an aria-label, confirm CI failure | FR-033, FR-034 |

---

## Post-Design Constitution Re-Check

| Principle | Re-Check Status | Notes |
|---|---|---|
| **II. Test-First** | ✅ | 20 component a11y tests + 21 page a11y tests + mobile assertions planned |
| **V. UX Consistency** | ✅ | All 6 V constraints addressed: keyboard nav (FR-001–006), AA contrast (FR-018–019), 44×44 touch targets (FR-029), loading/error states (unchanged), inline validation (FR-024–027), design tokens (token fixes) |
| **VI. Performance** | ✅ | Zero runtime dependencies. Dev dependencies only. No bundle impact. |
| **VII. Simplicity** | ✅ | Native `<dialog>` over focus-trap lib. One shared hook over library. Global CSS over per-component JS. 2 dev deps justified (> 200 lines of manual scanning logic avoided). |
| **VIII. Internationalisation** | ✅ | All new labels use i18n keys. RTL focus order verified. No hardcoded strings. |

**Post-Design Gate Result: ALL PASS**

---

## Dependency Map

```
Work Stream 1 (Foundation)
    ├── Token contrast fixes
    ├── New a11y tokens
    ├── Global CSS (focus, motion, skip-link)
    ├── SkipLink component
    ├── Layout changes
    └── Dev dependency installs
         │
         ▼
Work Stream 2 (Components)          Work Stream 4 (Mobile)
    ├── 2A: Modal focus mgmt            ├── Native a11y props
    ├── 2B: Button a11y                  ├── Touch targets
    ├── 2C: Card semantics               └── Gesture alternatives
    ├── 2D: Tree navigation
    └── 2E: Remaining fixes
         │
         ▼
Work Stream 3 (Pages)
    ├── Heading hierarchy
    ├── Landmark structure
    ├── Explorer tab pattern
    └── Form associations
         │
         ▼
Work Stream 5 (Testing)
    ├── Component a11y tests
    ├── Page a11y tests
    ├── CI gate setup
    └── Waiver documentation
```

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Leaflet map has unfixable a11y issues | High | Medium | Documented waiver + accessible alternative list view (already exists) |
| Token colour changes break visual design review | Medium | Low | Changes are minor hue shifts; preview in Storybook before merge |
| Roving tabindex hook has edge cases in complex trees | Medium | Medium | Follow APG reference implementation closely; extensive unit tests |
| Page-level Playwright tests are flaky due to network | Low | Medium | Use `waitForLoadState('networkidle')` + retry configuration |
| Mobile accessibility props incomplete without device testing | Medium | High | Use @testing-library/react-native queries as automated baseline; manual VoiceOver/TalkBack testing as validation |

---

## Success Criteria Mapping

| Success Criterion | Work Stream | Verification |
|---|---|---|
| SC-001: 100% keyboard operability | WS 1, 2, 3 | Manual keyboard-only walkthrough of all core flows |
| SC-002: Zero automated violations | WS 5 | CI pipeline passes with axe-core scans |
| SC-003: Screen reader walkthrough pass | WS 2, 3 | Manual VoiceOver/NVDA/TalkBack testing |
| SC-004: AA contrast pass | WS 1 (tokens) | Contrast analysis tool verification |
| SC-005: Zero non-essential animations with reduced motion | WS 1, 2E | Visual inspection with OS reduced-motion enabled |
| SC-006: 100% form field associations | WS 2E, 3 | Screen reader + automated scanning |
| SC-007: 44×44 touch targets | WS 4 | Measurement tool verification |
| SC-008: CI catches regressions | WS 5 | Deliberate violation test |
| SC-009: Screen reader end-to-end journey | WS 2, 3 | Manual: find event → detail → RSVP with screen reader |
| SC-010: Modal focus trap + restore | WS 2A | Keyboard-only testing of every modal trigger |
