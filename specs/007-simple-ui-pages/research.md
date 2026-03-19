# Research: 007 — Simple UI Pages

**Feature Branch**: `007-simple-ui-pages`  
**Date**: 2026-03-16

## Research Tasks

### R1: Tailwind CSS setup with Next.js 16

**Question**: How to add Tailwind CSS to an existing Next.js 16 project that currently has no CSS framework?

**Decision**: Install Tailwind CSS v4 with `@tailwindcss/postcss` and PostCSS. Next.js 16 uses PostCSS by default; Tailwind v4 uses CSS-first configuration (no `tailwind.config.js` needed).

**Setup steps**:
1. `npm install tailwindcss @tailwindcss/postcss postcss`
2. Create `postcss.config.mjs` with `@tailwindcss/postcss` plugin
3. Create `src/app/globals.css` with `@import "tailwindcss"` directive
4. Import `globals.css` in `src/app/layout.tsx`

**Rationale**: Tailwind v4 is the current stable release. The CSS-first config approach is simpler (no config file). All existing Tailwind utility classes in the codebase (already used in `EventCard.tsx`, `EventsListPage.tsx`, etc.) work because Tailwind v4 auto-detects content sources.

**Alternatives considered**:
- Tailwind v3: Older; requires `tailwind.config.js`. v4 is simpler.
- CSS Modules: Already have Tailwind classes throughout codebase; switching paradigm would be disruptive.
- No framework (raw CSS): Contradicts spec requirement FR-019.

---

### R2: Shared layout shell pattern in Next.js App Router

**Question**: Best approach for a shared navigation header across all pages in Next.js App Router?

**Decision**: Modify the root `src/app/layout.tsx` to include a `<NavHeader />` client component. The App Router automatically wraps all pages in this layout.

**Rationale**: Next.js App Router's nested layout system is purpose-built for this. The root layout wraps everything; no per-page imports needed. The admin area already has its own `layout.tsx` which adds admin-specific sub-nav below the shared header.

**Alternatives considered**:
- Per-page nav import: Violates DRY; error-prone.
- Middleware-injected HTML: Over-engineered for a React app.

---

### R3: Responsive navigation pattern

**Question**: How to implement mobile-responsive navigation with Tailwind CSS only (no component library)?

**Decision**: Use a `"use client"` NavHeader component with `useState` for mobile menu toggle. Desktop: horizontal flex nav with `hidden sm:flex`. Mobile: hamburger button that toggles a full-width dropdown with `sm:hidden`.

**Rationale**: Simplest pattern that meets FR-003 (responsive below 768px). No JS libraries needed — just a boolean state toggle and Tailwind responsive prefixes.

**Alternatives considered**:
- Headless UI: Adds dependency for a single toggle. Violates Principle VII (Simplicity).
- CSS-only `:target` or `:checked` hack: Poor accessibility.

---

### R4: Authentication state display in navigation

**Question**: How to show auth state (logged-in user name, sign-in link) in the shared nav?

**Decision**: Use `next-auth`'s client-side `useSession()` hook in the NavHeader component. Show user display name + profile link when authenticated; show "Sign In" link when not.

**Rationale**: `next-auth` v5 is already a project dependency. `useSession()` is the standard client-side hook for reading auth state. The mock auth system (spec 007-mock-auth) will provide the session.

**Alternatives considered**:
- Server component with `getServerSession()`: NavHeader needs interactive state (mobile toggle), so it must be a client component. `useSession()` is the correct choice for client components.

---

### R5: Existing component inventory

**Question**: Which pages/components already exist and just need polish vs. which need to be created from scratch?

**Decision**: Inventory based on codebase analysis:

| Page | Status | Work Needed |
|------|--------|-------------|
| Root layout (`layout.tsx`) | Exists (bare) | Add NavHeader, globals.css import, body classes |
| Landing page (`page.tsx`) | Exists (bare `<h1>`) | Replace with hero section + featured events |
| Events list (`events/page.tsx`) | Exists (wraps component) | Minor: add page heading context within layout |
| Event detail (`events/[id]/page.tsx`) | Exists (wraps component) | Add breadcrumb nav back to events list |
| Teacher directory (`teachers/page.tsx`) | Exists (fully styled) | Already well-styled; minor polish only |
| Teacher profile (`teachers/[id]/page.tsx`) | Exists | Polish within layout; ensure reviews + events sections |
| User profile (`profile/page.tsx`) | Exists (form) | Polish form layout; add success/error states |
| Settings landing (`settings/page.tsx`) | Exists | Add sidebar/tab nav linking sub-sections |
| Settings sub-pages | Exist (3 pages) | Minor polish; integrate with settings layout |
| Admin layout (`admin/layout.tsx`) | Exists (styled) | Extend nav to include concessions + teachers links |
| Admin sub-pages | Exist (4 sections) | Minor polish; add dashboard landing with summary counts |
| Bookings (`bookings/page.tsx`) | Exists (styled) | Minor polish; add link to browse events in empty state |
| NavHeader | **Does not exist** | Create from scratch |
| `globals.css` | **Does not exist** | Create from scratch |

**Rationale**: Most pages already have working Tailwind-styled content. The primary work is: (1) the shared nav shell, (2) the landing page hero, (3) settings sidebar nav, and (4) consistency polish across pages.

---

### R6: Landing page data fetching

**Question**: How should the landing page fetch featured/upcoming events?

**Decision**: Use a client component with `fetch('/api/events?limit=6&sort=startDatetime')` to load upcoming events. Reuse the existing `EventCard` component for display.

**Rationale**: The events API already supports filtering, sorting, and pagination. No new endpoint needed (FR-020). Client-side fetch keeps the landing page a client component, consistent with the rest of the app.

**Alternatives considered**:
- Server component with direct DB query: Would bypass the API layer (violates Principle I).
- Static generation: Events are dynamic; SSG would show stale data.

---

### R7: Error and empty state patterns

**Question**: What patterns should be used for loading, error, and empty states?

**Decision**: Standardize on three reusable inline patterns (not abstracted into separate components per Principle VII):
- **Loading**: Tailwind `animate-pulse` skeleton divs (already used in `EventsListPage` and `EventDetailPage`)
- **Error**: Red alert box with error message + "Retry" button (already used in `EventsListPage`)
- **Empty**: Gray centered text with contextual suggestion (e.g., "No bookings yet. Browse events →")

**Rationale**: These patterns already exist in the codebase. Standardizing the visual treatment (consistent colors, spacing) without extracting shared components keeps things simple.

---

## Summary

All research questions are resolved. No NEEDS CLARIFICATION items remain. Key decisions:
1. Tailwind CSS v4 with PostCSS (3 files to create)
2. Root layout modification with client-side NavHeader component
3. Most pages already exist — work is primarily polish and integration
4. Hardcoded strings acceptable for this UI pass (i18n follow-up noted in constitution check)
