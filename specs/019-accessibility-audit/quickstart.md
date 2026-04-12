# Quickstart: WCAG Accessibility Audit & Remediation

**Feature**: Spec 019 — WCAG Accessibility Audit & Remediation
**Date**: 2025-07-18

---

## What This Feature Does

Brings the entire AcroYoga Community Platform (web + mobile) into full WCAG 2.1 AA accessibility compliance. This covers keyboard navigation, screen reader support, focus management, colour contrast, motion preferences, form accessibility, mobile accessibility, and automated testing.

## Key Decisions

1. **No new dependencies for focus trapping** — native `<dialog>` handles it; we add focus restoration logic only.
2. **Two-layer automated testing** — `vitest-axe` for component isolation, `@axe-core/playwright` for full-page scans.
3. **Token-first colour fixes** — contrast issues fixed at the design token source, propagating to all consumers.
4. **Roving tabindex** for complex widgets (tree, calendar) per ARIA Authoring Practices Guide.
5. **Skip link in root layout** — single implementation covers all 32 pages.
6. **Global reduced-motion CSS** — one media query rule in globals.css handles most animations.

## Architecture Changes

```
packages/tokens/
  └── src/
      ├── color.tokens.json     # Modified: warning, success, social contrast fixes
      └── global.tokens.json    # Modified: new focus-ring-width, focus-ring-offset, min-touch-target

packages/shared-ui/
  └── src/
      ├── SkipLink/             # NEW component
      │   ├── SkipLink.tsx
      │   ├── index.web.tsx
      │   ├── index.native.tsx  # No-op for mobile
      │   └── SkipLink.a11y.test.tsx
      ├── Modal/                # Modified: focus restore, aria-modal
      ├── Button/               # Modified: focus-visible, aria-busy
      ├── EventCard/            # Modified: semantics, Space key, focus styles
      ├── LocationTree/         # Modified: arrow keys, roving tabindex
      ├── Skeleton/             # Modified: prefers-reduced-motion
      └── [all components]/     # Added: *.a11y.test.tsx files

apps/web/
  └── src/
      ├── app/
      │   ├── layout.tsx        # Modified: skip link + <main> landmark
      │   └── globals.css       # Modified: reduced-motion rule, focus styles
      ├── components/
      │   └── NavHeader.tsx     # Modified: nav labels, aria-controls, ESC handler
      └── hooks/
          └── useRovingTabIndex.ts  # NEW hook

apps/web/
  └── e2e/
      └── a11y/                 # NEW: page-level Playwright a11y tests
          ├── home.a11y.spec.ts
          ├── events.a11y.spec.ts
          └── ...

apps/mobile/
  └── [screens + components]    # Modified: accessibility* props on all interactive elements
```

## How to Work on This Feature

### Prerequisites
```bash
npm install                           # Install all workspace dependencies
npm run tokens:build                  # Rebuild design tokens after token changes
```

### Development Workflow
1. **Token changes first** — modify `packages/tokens/src/*.tokens.json`, then `npm run tokens:build`
2. **Shared-ui components** — fix each component, write `*.a11y.test.tsx`, verify in Storybook
3. **Web pages** — fix layout/landmarks/headings, write page-level a11y Playwright tests
4. **Mobile screens** — add `accessibility*` props, verify with `@testing-library/react-native`

### Running Tests
```bash
# Component a11y tests
npm run test -- --filter "a11y" -w @acroyoga/shared-ui

# Page-level a11y tests (requires dev server or build)
npx playwright test --project=a11y

# Full test suite (includes a11y)
npm run test

# Storybook with a11y addon
npm run storybook
```

### Manual Verification
- **Keyboard testing**: Unplug mouse, Tab through every page
- **Screen reader testing**: VoiceOver (macOS Cmd+F5), NVDA (Windows), TalkBack (Android)
- **Reduced motion**: System Preferences → Accessibility → Display → Reduce motion
- **Contrast checking**: Use browser DevTools → Rendering → Emulate vision deficiencies

## Files to Touch (Summary)

| Area | Files | Change Type |
|---|---|---|
| Tokens | 2 JSON files | Modify values |
| Shared-UI | 20 components × 2 files (impl + a11y test) | Modify + Create |
| New component | SkipLink (4 files) | Create |
| New hook | useRovingTabIndex (2 files: hook + test) | Create |
| Web layout | layout.tsx, globals.css | Modify |
| Web components | NavHeader.tsx, ExplorerShell.tsx | Modify |
| Web E2E | ~21 page a11y test files | Create |
| Mobile | ~16 screen/component files | Modify |
| Config | vitest.config, playwright.config | Modify |

**Estimated total**: ~80 files modified/created
