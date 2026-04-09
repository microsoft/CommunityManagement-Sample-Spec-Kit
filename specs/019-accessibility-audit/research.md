# Research: WCAG Accessibility Audit & Remediation

**Feature**: Spec 019 — WCAG Accessibility Audit & Remediation
**Date**: 2025-07-18
**Status**: Complete

---

## Research Area 1: Focus Trapping Strategy for Native `<dialog>`

### Context
The Modal component uses the native `<dialog>` element with `showModal()`. The spec requires explicit focus trapping (FR-014), focus restoration on close (FR-015), and `aria-hidden`/`inert` on background content (FR-016).

### Decision: Leverage native `<dialog>` + minimal supplemental logic

**Rationale**: The native `<dialog>` element invoked via `showModal()` already provides:
- Built-in focus trapping (Tab cycles within the dialog)
- Built-in `inert` on background content (the "top layer" isolates the dialog)
- Built-in Escape key dismissal

What the native element does **not** provide:
- Focus restoration to the triggering element after close
- `aria-modal="true"` (must be added explicitly for older AT)
- Focus initial placement on the first interactive element (browser moves focus to the dialog element itself, not the first interactive child)

**Approach**: Add a lightweight wrapper around the existing `<dialog>` that:
1. Captures `document.activeElement` before opening → restores on close
2. Moves focus to the first focusable child on open via `useEffect`
3. Adds `aria-modal="true"` attribute

**Alternatives Considered**:
- **Focus-trap library (focus-trap-react)**: Rejected — adds a dependency for behaviour the native `<dialog>` already provides. Violates Constitution Principle VII (Simplicity).
- **Custom focus trap with sentinel elements**: Rejected — fragile, browser-specific edge cases, and native `<dialog>` already handles this.
- **Headless UI Dialog**: Rejected — unnecessary abstraction over native semantics, adds bundle weight.

---

## Research Area 2: Skip Navigation Implementation Pattern

### Context
The spec requires a "Skip to main content" link as the first focusable element on every page (FR-017). The platform uses Next.js App Router with a root `layout.tsx`.

### Decision: Single skip link in root layout, `<main id="main-content">` wrapper

**Rationale**: The Next.js App Router renders a single root layout for all pages. Adding a skip link in `layout.tsx` ensures it appears on every page without per-page duplication. The `<main>` element with `id="main-content"` provides the skip target and a landmark region simultaneously.

**Implementation**:
1. Add `<a href="#main-content" className="skip-link">` as the first child inside `<body>`
2. Wrap `{children}` in `<main id="main-content" tabIndex={-1}>`
3. CSS: `.skip-link` is `sr-only` by default, becomes visible on `:focus`
4. The `tabIndex={-1}` on `<main>` ensures programmatic focus works even though `<main>` is not naturally focusable

**Alternatives Considered**:
- **Multiple skip links (skip to nav, skip to search)**: Deferred — single skip link covers the P1 requirement. Can be added later.
- **Per-page skip link components**: Rejected — duplication across 32 pages, easy to miss.
- **JavaScript-driven scroll**: Rejected — fragile, depends on hydration. Native anchor works pre-hydration.

---

## Research Area 3: Arrow Key Navigation for Tree and Calendar Widgets

### Context
The LocationTree (FR-003) and Calendar panel (FR-004) require arrow-key navigation per the ARIA Authoring Practices Guide (APG).

### Decision: Implement roving tabindex pattern per APG

**Rationale**: The APG tree view pattern uses "roving tabindex" — only one item in the tree has `tabIndex={0}` at a time; all others have `tabIndex={-1}`. Arrow keys move `tabIndex={0}` between items. This keeps the widget as a single Tab stop.

**LocationTree keyboard pattern**:
- `ArrowDown`: Move focus to next visible node
- `ArrowUp`: Move focus to previous visible node
- `ArrowRight`: If collapsed → expand; if expanded → move to first child
- `ArrowLeft`: If expanded → collapse; if leaf/collapsed → move to parent
- `Home`: Move to first tree item
- `End`: Move to last visible tree item
- `Enter`/`Space`: Select the focused node

**Calendar keyboard pattern**:
- `ArrowLeft`/`ArrowRight`: Previous/next day
- `ArrowUp`/`ArrowDown`: Same day previous/next week
- `Home`/`End`: First/last day of week
- `PageUp`/`PageDown`: Previous/next month

**Implementation**: A custom `useRovingTabIndex` hook shared between tree and calendar. Each widget stores the "active descendant" index in React state.

**Alternatives Considered**:
- **aria-activedescendant pattern**: Rejected for tree — requires the container to hold focus while children are visually highlighted. Works well but roving tabindex is more broadly supported by AT.
- **Third-party tree library (react-arborist, etc.)**: Rejected — adds dependency for a component that already exists. Violates Principle VII.
- **Tab key navigation between items**: Rejected — violates APG pattern; makes the widget have many Tab stops, breaking keyboard flow.

---

## Research Area 4: Colour Contrast Remediation Strategy

### Context
The design token system (packages/tokens/) defines all colours centrally. The warning colour `#F59E0B` on white background has a contrast ratio of approximately 2.74:1 — below the 4.5:1 AA minimum for normal text (FR-018).

### Decision: Fix tokens at source + add new a11y-specific tokens

**Rationale**: Fixing tokens centrally propagates contrast fixes to all consuming components automatically (per spec assumption about the design token system). Specific changes:

| Token | Current | Proposed | Contrast on White |
|-------|---------|----------|------------------|
| `color.semantic.warning` | `#F59E0B` (2.74:1) | `#B45309` (5.74:1) | ✅ AA pass |
| `color.semantic.success` | `#10B981` (4.45:1) | `#047857` (5.91:1) | ✅ AA pass |
| `color.surface.muted-foreground` | `#6B7280` (4.87:1) | `#6B7280` (4.87:1) | ✅ Already passes |
| `color.category.social` | `#F59E0B` (2.74:1) | `#B45309` (5.74:1) | ✅ AA pass |

**New tokens to add**:
- `global.focus-ring-offset`: `2px` — consistent offset for focus outlines
- `global.focus-ring-width`: `2px` — minimum visible focus indicator width
- `global.min-touch-target`: `44px` — minimum touch target for interactive elements

**Alternatives Considered**:
- **Per-component colour overrides**: Rejected — creates maintenance burden, tokens should be the single source of truth.
- **Using background-colour washes behind low-contrast text**: Considered as supplemental — useful for badges and category indicators where the token colour is used as a background rather than text.
- **Leaving category colours and adding text labels**: Adopted as supplementary — FR-020 requires colour + non-colour cue.

---

## Research Area 5: Automated Accessibility Testing Framework

### Context
The project uses Vitest for web/shared-ui tests and Jest for mobile. The spec requires automated WCAG 2.1 AA scanning of all pages and components (FR-032, FR-033, FR-034).

### Decision: `vitest-axe` for component tests + Playwright `@axe-core/playwright` for page-level E2E

**Rationale**: Two-layer testing catches issues at both the component and page level:

1. **Component-level** (`vitest-axe`): Renders each shared-ui component in isolation via `@testing-library/react`, then runs axe-core against the rendered DOM. Runs in CI on every PR. Catches ~30–40% of WCAG issues automatically.

2. **Page-level** (`@axe-core/playwright`): Navigates to each page in a real browser via Playwright, then runs axe-core on the full rendered page including layout, navigation, and landmark structure. Catches issues that only appear in full-page context.

**Test file naming convention**: `*.a11y.test.tsx` for component tests, `*.a11y.spec.ts` for Playwright page tests.

**Waiver mechanism**: Known third-party violations (Leaflet map internals) are excluded via axe-core's `disableRules` configuration with a tracking issue reference in comments.

**Alternatives Considered**:
- **jest-axe only**: Rejected — the project primarily uses Vitest, not Jest, for web tests. `vitest-axe` is the compatible wrapper.
- **Pa11y**: Rejected — heavier, less integrated with the existing test stack.
- **Storybook accessibility addon only**: Insufficient — already present but only runs in development, not CI. Retained as a development-time aid.
- **Cypress-axe**: Rejected — project uses Playwright for E2E, not Cypress.

---

## Research Area 6: Mobile Accessibility (Expo/React Native)

### Context
The mobile app uses Expo 52 with React Native 0.76. It has 16 screens with tab-based navigation. The spec requires native accessibility properties on all custom components (FR-031) and minimum 44×44px touch targets (FR-029).

### Decision: Systematic `accessibility*` prop audit + `jest-expo` accessibility assertions

**Rationale**: React Native provides built-in accessibility props that map directly to native iOS/Android accessibility APIs:
- `accessible={true}` — marks element as accessible
- `accessibilityLabel` — announced by VoiceOver/TalkBack
- `accessibilityRole` — maps to native role (button, link, header, etc.)
- `accessibilityState` — disabled, selected, checked, expanded states
- `accessibilityHint` — additional context for what happens on activation
- `accessibilityLiveRegion` — for dynamic content announcements (Android)

**Approach**:
1. Audit all `index.native.tsx` files in shared-ui — add missing `accessible`, `accessibilityLabel`, `accessibilityRole` props
2. Audit all mobile screens — verify touch targets ≥ 44×44
3. Add `accessibilityLiveRegion="polite"` to Toast native implementation
4. Verify Expo Router handles screen transitions with proper focus management

**Testing**: Use `@testing-library/react-native` queries (`getByAccessibilityLabel`, `getByRole`) in existing Jest test suite. No new dependency needed.

**Alternatives Considered**:
- **Detox for mobile E2E accessibility**: Deferred — Detox adds significant CI complexity. Manual VoiceOver/TalkBack testing covers P3 requirements. Can be added later.
- **react-native-a11y library**: Rejected — React Native's built-in accessibility API is sufficient; extra wrapper violates Principle VII.

---

## Research Area 7: Reduced Motion Support

### Context
The platform has no `prefers-reduced-motion` support. Skeleton components use pulse animations, and components may have hover transitions.

### Decision: Global CSS `@media (prefers-reduced-motion: reduce)` + per-component overrides

**Rationale**: A global CSS rule catches most animation cases. Individual components with inline styles (like Skeleton) need component-level overrides.

**Implementation**:
1. Add global rule in `apps/web/src/app/globals.css`:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```
2. Skeleton component: Replace pulse animation with static 60% opacity
3. Toast component: Remove slide-in animation, use instant appearance
4. Card hover effects: Replace transform with opacity change

**Essential animations (retained with simplification)**:
- LoadingSpinner: Replace spin with opacity pulse at low frequency
- Progress bars: Keep width transition but reduce duration to < 200ms

**Alternatives Considered**:
- **JavaScript `matchMedia` hook**: Useful for complex conditional rendering but overkill for CSS animation control. Keep CSS-only approach per Principle VII.
- **A `useReducedMotion()` hook**: Create one for cases where JavaScript behaviour differs (e.g., auto-playing carousels). Not needed for current component set.

---

## Summary

| Research Area | Decision | Key Dependency |
|---|---|---|
| Focus trapping | Native `<dialog>` + minimal wrapper | None (built-in) |
| Skip navigation | Single skip link in root layout | None |
| Arrow key navigation | Roving tabindex per APG | `useRovingTabIndex` hook |
| Colour contrast | Fix tokens at source | Token pipeline rebuild |
| Automated testing | vitest-axe + @axe-core/playwright | 2 new dev dependencies |
| Mobile accessibility | Native accessibility props + existing testing | None |
| Reduced motion | Global CSS + component overrides | None |
