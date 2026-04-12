# Data Model: WCAG Accessibility Audit & Remediation

**Feature**: Spec 019 — WCAG Accessibility Audit & Remediation
**Date**: 2025-07-18

---

## Overview

This feature does **not** introduce new database entities, tables, or persistent data models. It is a UI-layer audit and remediation effort that modifies existing components, styles, tokens, and tests.

The "data model" for this spec consists of:
1. **Design token additions** — new accessibility-specific tokens in the token pipeline
2. **Component prop extensions** — new accessibility-related props on shared-ui components
3. **Test configuration** — axe-core rule configurations and waiver tracking

---

## 1. Design Token Changes

### New Tokens (`packages/tokens/src/global.tokens.json`)

| Token Path | Type | Value | Description |
|---|---|---|---|
| `global.focus-ring-width` | dimension | `2px` | Width of focus indicator outline |
| `global.focus-ring-offset` | dimension | `2px` | Offset between element border and focus ring |
| `global.min-touch-target` | dimension | `44px` | Minimum touch target size (WCAG 2.5.5) |

### Modified Tokens (`packages/tokens/src/color.tokens.json`)

| Token Path | Old Value | New Value | Rationale |
|---|---|---|---|
| `color.semantic.warning` | `#F59E0B` | `#B45309` | Contrast 2.74:1 → 5.74:1 on white |
| `color.semantic.success` | `#10B981` | `#047857` | Contrast 4.45:1 → 5.91:1 on white (margin of safety) |
| `color.category.social` | `#F59E0B` | `#B45309` | Same issue as warning — used as text on white |
| `color.dark.category.social` | `#FBBF24` | `#FCD34D` | Ensure dark mode contrast on `#111827` bg |

### Unchanged Tokens (already AA-compliant)

| Token Path | Value | Contrast on White | Status |
|---|---|---|---|
| `color.surface.foreground` | `#111827` | 16.75:1 | ✅ |
| `color.surface.muted-foreground` | `#6B7280` | 4.87:1 | ✅ |
| `color.brand.primary` | `#6366F1` | 4.56:1 | ✅ |
| `color.semantic.error` | `#EF4444` | 4.63:1 | ✅ |
| `color.semantic.info` | `#3B82F6` | 4.28:1 | ⚠️ Borderline — passes for large text only |

---

## 2. Component Prop Extensions

### Shared-UI Component Changes

#### Modal (`packages/shared-ui/src/Modal/`)
```typescript
interface ModalProps {
  // Existing
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  // New — auto-managed internally, not exposed as props
  // Internal: triggerRef stored on open, restored on close
  // Internal: aria-modal="true" added to <dialog>
}
```

#### Button (`packages/shared-ui/src/Button/`)
```typescript
interface ButtonProps {
  // Existing props unchanged
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  // Behavioural changes (no new props):
  // - aria-busy={loading} added when loading=true
  // - focus-visible outline added via CSS
}
```

#### EventCard (`packages/shared-ui/src/EventCard/`)
```typescript
interface EventCardProps {
  // Existing props unchanged
  event: EventSummary;
  onPress?: (id: string) => void;
  // Behavioural changes:
  // - role changed from "article" to role="link" (navigational)
  //   OR wrapped in <a> tag for proper semantics
  // - Space key handler added alongside Enter
  // - aria-label generated from event data
  // - focus-visible outline added
}
```

#### LocationTree (`packages/shared-ui/src/LocationTree/`)
```typescript
interface LocationTreeProps {
  // Existing props unchanged
  nodes: LocationNode[];
  selectedId?: string;
  onSelect: (node: LocationNode) => void;
  // Behavioural changes:
  // - Arrow key navigation via roving tabindex
  // - aria-level attribute on treeitems
  // - role="group" with aria-label on child containers
  // - Home/End key support
}
```

#### Skeleton (`packages/shared-ui/src/Skeleton/`)
```typescript
interface SkeletonProps {
  // Existing props unchanged
  variant?: 'text' | 'circle' | 'rectangle';
  // Behavioural changes:
  // - prefers-reduced-motion: animation replaced with static state
  // - aria-hidden="true" already present (no change)
}
```

---

## 3. New Shared Components

### SkipLink (new in `packages/shared-ui/src/SkipLink/`)
```typescript
interface SkipLinkProps {
  /** Target element ID to skip to (default: "main-content") */
  targetId?: string;
  /** Visible label text (default: i18n key for "Skip to main content") */
  label?: string;
}
```

**Web implementation**: `<a>` element, visually hidden until focused, absolute positioned at top-left on focus.
**Native implementation**: No-op (mobile apps don't use skip links — screen readers have native section navigation).

---

## 4. Axe-Core Configuration Entity

### Waiver Tracking (`apps/web/src/test/a11y/axe-config.ts`)

```typescript
/** 
 * Axe-core configuration for automated accessibility testing.
 * Waivers MUST reference a tracking issue.
 */
interface AxeWaiver {
  /** axe-core rule ID being waived */
  ruleId: string;
  /** CSS selector(s) to exclude from this rule */
  selectors: string[];
  /** GitHub issue tracking the waiver */
  trackingIssue: string;
  /** Human-readable reason */
  reason: string;
}

/** Known third-party waivers */
const THIRD_PARTY_WAIVERS: AxeWaiver[] = [
  {
    ruleId: 'color-contrast',
    selectors: ['.leaflet-container *'],
    trackingIssue: '#TBD',
    reason: 'Leaflet map internal markup — cannot remediate; accessible alternative view provided',
  },
];
```

---

## 5. State Transitions

No new entity state machines are introduced. The only state-related changes are:

### Modal Open/Close Lifecycle
```
[Closed] → trigger.click() → [Opening: capture activeElement] → [Open: focus first child] 
[Open] → Escape/close → [Closing: restore focus to captured element] → [Closed]
```

### Tree Node Focus State
```
[No focus] → Tab into tree → [First node focused (tabIndex=0)]
[Node focused] → ArrowDown → [Next node focused, previous gets tabIndex=-1]
[Node focused] → ArrowRight (collapsed) → [Node expanded]
[Node focused] → ArrowLeft (expanded) → [Node collapsed]
[Node focused] → ArrowLeft (leaf/collapsed) → [Parent node focused]
[Node focused] → Tab out → [No focus, last active node retains tabIndex=0]
```

---

## Entity Relationship Summary

```
┌─────────────────┐    consumes     ┌──────────────────┐
│ Design Tokens   │───────────────►│ Shared-UI        │
│ (color, global) │                │ Components       │
└─────────────────┘                └──────────────────┘
                                          │
                                    used by │
                                          ▼
                                   ┌──────────────────┐
                                   │ Web App Pages    │
                                   │ (layout, routes) │
                                   └──────────────────┘
                                          │
                                   tested by │
                                          ▼
                                   ┌──────────────────┐
                                   │ A11y Test Suite  │
                                   │ (vitest-axe,     │
                                   │  @axe-core/pw)   │
                                   └──────────────────┘
```
