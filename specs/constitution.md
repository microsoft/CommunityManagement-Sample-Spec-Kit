# AcroYoga Community — Project Constitution

> Version 1.0.0 — Governing architectural principles for the AcroYoga Community Events platform.

## Core Principles

### I. API-First Design

Every feature MUST expose a versioned REST (or GraphQL) API before any server-rendered UI is built. No functionality may exist only as a server-rendered page. API contracts are defined in a shared types file and serve as the single source of truth for web, mobile, and third-party consumers.

**Constraints:**
- All mutations go through API endpoints, never direct DB calls from components
- Response shapes are defined as TypeScript interfaces in a central types file
- Breaking changes require a new API version

### II. Test-First Development

No feature is considered complete without automated tests. Integration tests run against a real database (in-memory PGlite for speed). Unit tests cover pure business logic. E2E tests cover critical user flows.

**Constraints:**
- Every service function has at least one integration test
- Test database is isolated per test file using `createTestDb()` pattern
- CI pipeline fails on any test regression
- Coverage thresholds: 80% line coverage for services, 60% overall

### III. Privacy & Data Protection

User PII is never exposed in public API responses. Social information visibility is controlled per-user, per-platform. The system complies with GDPR: users can export and delete their data. Location metadata is stripped from uploaded media.

**Constraints:**
- Public endpoints return aggregate counts, never individual user details unless the user opted in
- All PII fields are encrypted at rest
- Data export endpoint returns all user data as JSON within 30 days (GDPR Article 15)
- Data deletion hard-deletes PII; retains anonymised aggregates for analytics

### IV. Server-Side Authority

The server is the sole authority for all business rules: pricing, capacity, permissions, and validation. Client-side checks are for UX convenience only and MUST be duplicated server-side. No client input is trusted.

**Constraints:**
- All input validated with schema validation (e.g., Zod) at API boundary
- Capacity checks are atomic (SELECT FOR UPDATE or equivalent)
- Price calculations happen server-side only; client displays server-provided values
- Permission checks run in middleware or service layer, never only in UI

### V. UX Consistency

The platform targets WCAG 2.1 AA accessibility. All interactions are designed mobile-first and scale up to desktop. Component patterns are consistent app-wide through a shared design system.

**Constraints:**
- All interactive elements are keyboard navigable
- Colour contrast meets AA minimum (4.5:1 for text, 3:1 for large text)
- Touch targets are minimum 44×44px
- Loading states and error states are handled for every async operation
- Forms show inline validation errors, never only toast/alert

### VI. Performance Budget

The platform must load fast on 3G connections. Performance is measured and enforced in CI.

**Constraints:**
- Largest Contentful Paint (LCP) < 2.5s on 3G
- Time to Interactive (TTI) < 3.5s
- Initial JavaScript bundle < 200KB (compressed)
- Images served in modern formats (WebP/AVIF) with lazy loading below fold
- Map library loaded on demand, not in initial bundle

### VII. Simplicity

Prefer the simplest solution that meets requirements. No premature abstraction, no speculative generality, no over-engineering. Dependencies are added only when they provide clear, measurable value.

**Constraints:**
- No utility/helper files unless the function is used in 3+ places
- No wrapper abstractions around framework primitives
- Dependencies must be actively maintained (updated within last 6 months)
- Configuration over code: use environment variables, not feature flags in code

### VIII. Internationalisation

All user-facing strings are extractable for translation from day one. Date, time, currency, and number formatting use locale-aware APIs. The default locale is English; additional locales are added by the community.

**Constraints:**
- No hardcoded user-facing strings in components — use an i18n library
- Currency formatting uses `Intl.NumberFormat` with ISO 4217 currency codes
- Date/time formatting uses `Intl.DateTimeFormat` respecting user timezone
- RTL layouts supported structurally (CSS logical properties)

### IX. Scoped Permissions

Access control follows a hierarchical model: Global Admin → Country Admin → City Admin → Event Creator. Each role inherits permissions from levels below it. Permissions are checked server-side on every request.

**Constraints:**
- Permissions stored as scoped grants: `(user_id, role, scope_type, scope_value)`
- Event Creators can create events and new venues within their scope but cannot edit others' resources
- Admins at a hierarchy level can manage all resources at and below their level
- Each Event Creator specifies their own payment account for direct payouts

### X. Notification Architecture

Notifications are designed as a rich, multi-channel system from the start, even if only web push is implemented initially. Every notification type has a channel preference, allowing users to opt in/out per channel.

**Constraints:**
- Notification types are enum-driven: `event_reminder`, `rsvp_confirmation`, `waitlist_promoted`, `teacher_approved`, etc.
- User preferences: `(user_id, notification_type, channel, enabled)`
- Channels: web push (v1), email (v2), mobile push (v3), SMS (future)
- Notifications are queued and processed asynchronously (never block the request)

---

## Quality Gates

Every pull request MUST pass these gates before merge:

1. **Type check** — `tsc --noEmit` passes with zero errors
2. **Tests** — `npm run test` passes; no skipped tests without linked issue
3. **Lint** — linter passes with zero warnings (warnings are errors)
4. **Build** — production build completes without errors
5. **Bundle size** — initial JS bundle does not exceed 200KB compressed
6. **Accessibility** — no new axe-core violations in changed components
7. **API contract** — any API change updates the central types file and has a corresponding test
8. **Constitution review** — reviewer confirms the change does not violate any core principle

---

## Governance

- **Constitution changes** require explicit discussion and majority agreement among active contributors
- **Principle violations** in PRs must be flagged by reviewers with a reference to the violated principle number
- **Exceptions** may be granted for prototyping/spike branches clearly labelled as such; exceptions never merge to main
- **Version**: This constitution is versioned. Breaking changes to principles increment the major version.
