# Contracts: Accessibility Testing — axe-core Configuration

**Feature**: Spec 019 — WCAG Accessibility Audit & Remediation
**Date**: 2025-07-18

---

## Overview

This spec does not introduce new public APIs, endpoints, or external interfaces. The platform's REST API is unchanged. However, the automated accessibility testing infrastructure introduces an **internal testing contract** — the axe-core configuration that defines what is scanned, what is waived, and what the CI gate enforces.

This document defines that contract so that all developers understand the rules of the accessibility CI gate.

---

## 1. Component-Level Test Contract (vitest-axe)

### Test File Convention

Every shared-ui component MUST have an accessibility test file:

```
packages/shared-ui/src/{Component}/{Component}.a11y.test.tsx
```

### Test Structure Contract

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'vitest-axe';

expect.extend(toHaveNoViolations);

describe('{Component} accessibility', () => {
  it('should have no axe-core violations in default state', async () => {
    const { container } = render(<Component {...requiredProps} />);
    const results = await axe(container, {
      rules: AXE_COMPONENT_RULES,
    });
    expect(results).toHaveNoViolations();
  });

  // Additional tests for each visual state:
  // - error state (form components)
  // - loading state (Button, LoadingSpinner)
  // - disabled state
  // - expanded/collapsed state (LocationTree, Modal)
  // - selected state (tree items, tabs)
});
```

### Rule Configuration

```typescript
/** Rules applied to all component-level a11y tests */
const AXE_COMPONENT_RULES = {
  // WCAG 2.1 AA ruleset (axe-core default)
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  },
};
```

---

## 2. Page-Level Test Contract (@axe-core/playwright)

### Test File Convention

Every web app route MUST have an accessibility test:

```
apps/web/e2e/a11y/{page-name}.a11y.spec.ts
```

### Test Structure Contract

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const AXE_PAGE_CONFIG = {
  runOnly: {
    type: 'tag' as const,
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  },
  // Third-party waivers
  exclude: [
    ['.leaflet-container'],  // Leaflet map internals — see waiver #TBD
  ],
};

test.describe('{Page} accessibility', () => {
  test('should have no axe-core violations', async ({ page }) => {
    await page.goto('/{route}');
    // Wait for content to render
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .options(AXE_PAGE_CONFIG)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should have correct landmark structure', async ({ page }) => {
    await page.goto('/{route}');

    // Verify required landmarks exist
    await expect(page.locator('header, [role="banner"]')).toBeVisible();
    await expect(page.locator('nav, [role="navigation"]')).toBeVisible();
    await expect(page.locator('main, [role="main"]')).toBeVisible();
  });

  test('should have valid heading hierarchy', async ({ page }) => {
    await page.goto('/{route}');

    const headings = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(h => ({ level: parseInt(h.tagName[1]), text: h.textContent }));
    });

    // Verify h1 exists and hierarchy is sequential
    expect(headings[0]?.level).toBe(1);
    for (let i = 1; i < headings.length; i++) {
      expect(headings[i].level).toBeLessThanOrEqual(headings[i - 1].level + 1);
    }
  });
});
```

---

## 3. Pages Covered by E2E Accessibility Tests

| Route | Page | Priority | Notes |
|---|---|---|---|
| `/` | Home | P1 | Landing page with event cards |
| `/events` | Events listing | P1 | Search, filter, event cards |
| `/events/explorer` | Events explorer | P1 | Map, calendar, tree, filter pills |
| `/events/[id]` | Event detail | P1 | RSVP flow, share modal |
| `/teachers` | Teacher directory | P1 | Card grid, search |
| `/teachers/[id]` | Teacher profile | P1 | Ratings, certifications, reviews |
| `/directory` | User directory | P1 | Search, cards |
| `/login` | Login | P1 | Auth buttons |
| `/settings` | Settings hub | P2 | Navigation links |
| `/settings/account` | Account settings | P2 | Form fields, labels |
| `/settings/notifications` | Notification prefs | P2 | Table of checkboxes |
| `/settings/privacy` | Privacy settings | P2 | Form fields |
| `/settings/teacher` | Teacher settings | P2 | Form fields |
| `/profile` | User profile | P2 | Display page |
| `/bookings` | Bookings | P2 | List page |
| `/notifications` | Notifications | P2 | List page |
| `/admin` | Admin dashboard | P3 | Admin-only pages |
| `/admin/teachers` | Teacher management | P3 | Admin table |
| `/admin/permissions` | Permissions | P3 | Admin table |
| `/concessions` | Concessions | P3 | Pricing display |
| `/event-groups` | Event groups | P3 | Card grid |

---

## 4. CI Gate Contract

### Enforcement Rules

```yaml
# In CI workflow (e.g., .github/workflows/ci.yml)
accessibility:
  # Component tests (vitest-axe)
  - name: "A11y: Component scan"
    command: "npm run test:a11y -w @acroyoga/shared-ui"
    gate: "zero violations"
    
  # Page tests (@axe-core/playwright)  
  - name: "A11y: Page scan"
    command: "npx playwright test --project=a11y"
    gate: "zero violations (excluding documented waivers)"
    
  # Static analysis (eslint-plugin-jsx-a11y)
  - name: "A11y: Lint"
    command: "npm run lint"  # Already includes jsx-a11y rules
    gate: "zero warnings"
```

### Failure Message Contract

When a violation is detected, the CI output MUST include:

```
ACCESSIBILITY VIOLATION: {rule-id}
  WCAG Criterion: {success-criterion} ({level})
  Impact: {critical|serious|moderate|minor}
  Element: {css-selector}
  Description: {human-readable description}
  Fix: {actionable fix suggestion}
  More info: {deque-university-url}
```

---

## 5. Waiver Contract

### Waiver Format

```typescript
interface AccessibilityWaiver {
  /** Unique waiver ID for tracking */
  id: string;
  /** axe-core rule(s) being waived */
  rules: string[];
  /** CSS selectors excluded from scanning */
  selectors: string[];
  /** Third-party library causing the issue */
  source: string;
  /** Why it cannot be fixed */
  reason: string;
  /** GitHub issue number tracking resolution */
  trackingIssue: string;
  /** Date waiver was approved */
  approvedDate: string;
  /** Date waiver should be re-evaluated */
  reviewDate: string;
}
```

### Initial Waivers

| ID | Rules | Source | Reason | Review Date |
|---|---|---|---|---|
| `WAIVER-001` | `color-contrast`, `aria-*` | Leaflet | Map tile and control internals cannot be modified | 6 months from implementation |

---

## 6. Accessibility Props Contract (Mobile)

### React Native Component Accessibility Requirements

Every interactive component in `index.native.tsx` MUST expose:

```typescript
interface NativeAccessibilityRequirements {
  /** Element is accessible to screen readers */
  accessible: true;
  /** Human-readable label announced by VoiceOver/TalkBack */
  accessibilityLabel: string;
  /** Native role mapping */
  accessibilityRole: 'button' | 'link' | 'header' | 'image' | 'text' | 'checkbox' | 'radio' | 'tab' | 'search' | 'alert';
  /** Current state of interactive elements */
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | 'mixed';
    expanded?: boolean;
    busy?: boolean;
  };
  /** Hint for what happens on activation (optional, supplements label) */
  accessibilityHint?: string;
}
```
