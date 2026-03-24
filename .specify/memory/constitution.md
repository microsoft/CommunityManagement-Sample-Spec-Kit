<!--
  Sync Impact Report
  Version change: 1.4.0 → 1.5.0 (MINOR — rewrote XIII, added XIV)
  Modified principles: XIII (Development Environment — WSL → Codespaces)
  Unchanged principles: I–XII
  Added sections:
    - XIV. Managed Identity — DefaultAzureCredential for all Azure connections
  Removed sections: (none)
  Alignment matrix: added row for XIV; updated XIII description
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ no updates needed (Constitution Check is generic)
    - .specify/templates/spec-template.md ✅ no updates needed (constitution check line is generic)
    - .specify/templates/tasks-template.md ✅ no updates needed (phase structure unchanged)
    - .specify/templates/constitution-template.md ✅ no updates needed (placeholder structure unchanged)
  Follow-up TODOs:
    - Existing routes using x-user-id header MUST be migrated to getServerSession()/requireAuth()
    - GDPR deletion function MUST be audited to cover Spec 005 tables
    - Specs 003, 004, 005 should add missing principle refs to their headers
-->
# AcroYoga Community — Project Constitution

> Version 1.5.0 — Governing architectural principles for the
> AcroYoga Community Events platform.

## Core Principles

### I. API-First Design

Every feature MUST expose a versioned REST (or GraphQL) API before
any server-rendered UI is built. No functionality may exist only as
a server-rendered page. API contracts are defined in a shared types
file and serve as the single source of truth for web, mobile, and
third-party consumers.

**Rationale:** The platform serves web, mobile, and potential
third-party consumers (calendar sync, partner apps). An API-first
contract ensures all clients share identical business logic.

**Constraints:**
- All mutations MUST go through API endpoints, never direct DB calls from components
- Response shapes MUST be defined as TypeScript interfaces in a central types file
- Breaking changes MUST use a new API version (`/v2/`, `/v3/`, etc.)
- All error responses MUST use the shared `@/lib/errors` helpers to produce a consistent envelope shape (`{ error: string, code: string, details?: unknown }`); ad-hoc `NextResponse.json({ message })` patterns are prohibited

### II. Test-First Development

No feature is considered complete without automated tests.
Integration tests run against a real database (in-memory PGlite for
speed). Unit tests cover pure business logic. E2E tests cover every
P0 user flow identified in feature specs.

**Constraints:**
- Every service function MUST have at least one integration test
- Test database MUST be isolated per test file using `createTestDb()` pattern
- CI pipeline MUST fail on any test regression
- Coverage thresholds: ≥ 80 % line coverage for services, ≥ 60 % overall
- Every P0 user scenario in a feature spec MUST have a corresponding E2E test

### III. Privacy & Data Protection

User PII MUST NOT be exposed in public API responses. Social
information visibility is controlled per-user, per-platform. The
system complies with GDPR: users can export and delete their data.
Location metadata (EXIF) MUST be stripped from uploaded media before
storage.

**Constraints:**
- Public endpoints MUST return aggregate counts, never individual user details unless the user opted in
- All PII fields MUST be encrypted at rest
- Data export endpoint MUST return all user data as JSON within 30 days (GDPR Article 15)
- Data deletion MUST hard-delete PII; anonymised aggregates are retained for analytics
- Every new spec that introduces PII-bearing tables MUST update the GDPR account-deletion function AND the data-export function to cover the new tables; an integration test MUST prove the new data is included in both operations
- Media upload pipeline MUST strip EXIF/GPS metadata; verify with an integration test

### IV. Server-Side Authority

The server is the sole authority for all business rules: pricing,
capacity, permissions, and validation. Client-side checks are for UX
convenience only and MUST be duplicated server-side. No client input
is trusted.

**Constraints:**
- All request-body and query-parameter validation MUST use Zod schemas at the API boundary; manual `typeof`/truthiness checks MUST NOT be used as a substitute for schema validation
- Capacity checks MUST be atomic (`SELECT FOR UPDATE` or equivalent)
- Price calculations MUST happen server-side only; client displays server-provided values
- Permission checks MUST run in middleware or service layer, never only in UI

### V. UX Consistency

The platform targets WCAG 2.1 AA accessibility. All interactions are
designed mobile-first and scale up to desktop. Component patterns
MUST be consistent app-wide through a shared design system with
documented tokens (colour, spacing, typography).

**Constraints:**
- All interactive elements MUST be keyboard navigable
- Colour contrast MUST meet AA minimum (4.5:1 for text, 3:1 for large text)
- Touch targets MUST be minimum 44 × 44 px
- Loading states and error states MUST be handled for every async operation
- Forms MUST show inline validation errors, never only toast/alert
- Design tokens MUST be defined in a single source file consumed by all components

### VI. Performance Budget

The platform MUST load fast on constrained connections and respond
quickly to user actions. Performance is measured and enforced in CI.
Specific thresholds are defined in the Quality Gates section and may
be updated without a constitution version change.

**Constraints:**
- Performance thresholds are enforced as CI quality gates (see Quality Gates section)
- Images MUST be served in modern formats (WebP/AVIF) with lazy loading below fold
- Heavy libraries (maps, rich editors) MUST be loaded on demand, not in initial bundle
- Every async data fetch MUST have a loading state and a timeout
- API mutation endpoints (RSVP, booking, payment) MUST respond in < 1 s at p95 on broadband
- List endpoints MUST NOT execute per-item queries (N+1 pattern); related data MUST be fetched via JOINs, sub-selects, or batch `WHERE IN` queries — reviewers MUST reject any list function whose query count scales linearly with result size

### VII. Simplicity

Prefer the simplest solution that meets requirements. No premature
abstraction, no speculative generality, no over-engineering.
Dependencies are added only when they eliminate significant
complexity that would otherwise require > 200 lines of custom code
or introduce a known-hard problem (e.g., timezone math, payment
processing).

**Constraints:**
- No utility/helper files unless the function is used in 3 + places
- No wrapper abstractions around framework primitives
- Dependencies MUST be actively maintained (commit activity within the last 6 months, no unpatched CVEs)
- Configuration over code: use environment variables, not feature flags in code
- New dependency additions MUST be justified in the PR description

### VIII. Internationalisation

All user-facing strings MUST be extractable for translation from day
one. Date, time, currency, and number formatting MUST use
locale-aware APIs. The default locale is English; additional locales
are added by the community.

**Constraints:**
- No hardcoded user-facing strings in components — MUST use an i18n library
- Currency formatting MUST use `Intl.NumberFormat` with ISO 4217 currency codes
- Date/time formatting MUST use `Intl.DateTimeFormat` respecting user timezone
- RTL layouts MUST be supported structurally (CSS logical properties)
- CI MUST run an i18n lint pass that fails on raw string literals in UI components

### IX. Scoped Permissions

Access control MUST follow a hierarchical model with geographic
scoping. Each role inherits permissions from levels below it.
Permissions are checked server-side on every mutating request. No
user can access or modify resources outside their granted scope.

**Constraints:**
- Permissions are scoped grants associating a user, role, and geographic scope
- Event Creators can create events and new venues within their scope but MUST NOT edit others' resources
- Admins at a hierarchy level can manage all resources at and below their level
- Permission checks MUST run on every mutation; read access respects visibility rules
- When a user holds multiple grants, the server MUST evaluate all and apply the most permissive for the requested action
- Admin-only endpoints (moderation, verification, dashboard, bulk operations) MUST use `withPermission()` middleware (or equivalent role-check decorator) that verifies the caller holds the required admin scope; a bare `requireAuth()` check is insufficient for admin routes

### X. Notification Architecture

Notifications MUST be multi-channel and user-configurable from day
one. Users can opt in or out of each notification type per channel.
New channels can be added without changing the notification contract.

**Constraints:**
- Notification types MUST be enum-driven and extensible
- Each user controls preferences per notification type and per channel
- Notifications MUST be queued and processed asynchronously (never block the request)
- Adding a new channel MUST NOT require changes to existing notification producers
- Waitlist promotions, RSVP changes, and certification-expiry alerts MUST each be distinct, subscribable notification types

### XI. Resource Ownership

Every mutable resource (event, venue, booking, teacher profile)
MUST have a clear owner. Only the owner or an admin at the owner's
scope level (or above) can modify or delete the resource. Ownership
transfers require explicit action, never implicit reassignment.

**Constraints:**
- Every resource record MUST track its creator/owner
- Owner can edit, cancel, or transfer their own resources
- Admin override is scoped: only admins whose scope covers the resource's location can act
- When an owner leaves the platform, resources MUST be flagged for admin review, not auto-deleted
- Recurring event series and individual occurrence overrides share the ownership of the parent event
- Every mutation route MUST verify that the authenticated caller is the resource owner OR holds an admin scope grant covering that resource; checking authentication alone is insufficient — a test MUST prove that an authenticated non-owner receives 403

### XII. Financial Integrity

All monetary transactions MUST be processed server-side through a
verified payment provider. The platform facilitates payments between
attendees and event creators but MUST NOT hold funds. Prices, fees,
and refund rules are computed server-side and are never trusted from
the client.

**Constraints:**
- Each Event Creator MUST connect their own payment account; the platform MUST NOT pool creator funds
- Price calculations (including currency, concessions, and fees) MUST happen server-side only
- Refund eligibility MUST be determined by server-side rules tied to event cancellation policies
- All payment state transitions MUST be logged for auditability
- Cross-capacity booking (e.g., festival day + full-weekend pass) MUST be validated atomically in a single transaction
- OAuth flows (e.g., Stripe Connect) MUST use a signed or opaque `state` parameter (e.g., HMAC-signed token); raw user IDs or other guessable values MUST NOT be passed as the OAuth `state`

### XIII. Development Environment

All development, package management, and build tooling MUST be
executed in GitHub Codespaces or a consistent Linux container
environment. Codespaces is the primary development environment,
providing pre-configured containers with all dependencies and
tooling ready to use.

**Rationale:** Codespaces eliminates environment inconsistencies
across contributors, provides instant onboarding with zero local
setup, and ensures parity between development, CI/CD, and
production environments.

**Constraints:**
- `npm install`, `npm ci`, and any package manager invocations MUST run in the Codespaces container or CI runner
- Build scripts (`npm run build`, `tokens:build`, etc.) MUST run in a Linux environment (Codespaces or CI)
- Test suites MUST run in a Linux environment as the primary execution environment
- CI workflows run on `ubuntu-latest`; Codespaces ensures local–CI parity
- A `.devcontainer/devcontainer.json` MUST be maintained at the repo root with all required tooling pre-installed

### XIV. Managed Identity

All Azure service-to-service connections MUST use Azure Managed
Identity with `DefaultAzureCredential` from `@azure/identity`.
Shared keys, connection strings, and static credentials MUST NOT
be used for cloud service authentication in deployed environments.

**Rationale:** Managed Identity eliminates credential rotation
overhead, prevents secret leakage, and follows Azure security
best practices. `DefaultAzureCredential` provides a seamless
fallback chain that works in Codespaces, CI, and production.

**Constraints:**
- Azure Blob Storage MUST be accessed via `DefaultAzureCredential`, never shared keys or connection strings
- Azure PostgreSQL MUST use Microsoft Entra token authentication via Managed Identity in deployed environments; password auth is permitted only for local development with PGlite
- Azure Key Vault MUST use RBAC with Managed Identity (already enforced)
- Azure Container Registry MUST use Managed Identity for image pulls (already enforced)
- SAS tokens (where required for client-side uploads) MUST use User Delegation SAS, never account-key-based SAS
- The `AZURE_CLIENT_ID` environment variable MUST be set in all deployed containers to identify the User-Assigned Managed Identity
- New Azure service integrations MUST use `DefaultAzureCredential` — PR reviewers MUST reject any code that introduces shared keys or connection strings for Azure services

---

## Principle–Spec Alignment Matrix

| Principle | 001 Discovery | 002 Social | 003 Recurring | 004 Permissions | 005 Teachers |
|-----------|:---:|:---:|:---:|:---:|:---:|
| I. API-First | ✅ | ✅ | ✅ | ✅ | ✅ |
| II. Test-First | ✅ | ✅ | ✅ | ✅ | ✅ |
| III. Privacy | ✅ | ✅ | | | ✅ |
| IV. Server-Side Authority | ✅ | ✅ | ✅ | ✅ | ✅ |
| V. UX Consistency | ✅ | ✅ | | | ✅ |
| VI. Performance Budget | ✅ | ✅ | ✅ | | ✅ |
| VII. Simplicity | | | ✅ | | |
| VIII. Internationalisation | ✅ | ✅ | | | ✅ |
| IX. Scoped Permissions | | | | ✅ | ✅ |
| X. Notification Architecture | ✅ | ✅ | ✅ | | ✅ |
| XI. Resource Ownership | ✅ | | ✅ | ✅ | ✅ |
| XII. Financial Integrity | | | ✅ | ✅ | ✅ |
| XIII. Development Environment | ✅ | ✅ | ✅ | ✅ | ✅ |
| XIV. Managed Identity | ✅ | ✅ | ✅ | ✅ | ✅ |

> **Usage:** Each spec's header SHOULD list the principles that apply.
> Specs 003, 004, and 005 should be updated to include XI and XII
> where marked above.

---

## Quality Gates

Every pull request MUST pass these gates before merge:

1. **Type check** — `tsc --noEmit` passes with zero errors
2. **Tests** — `npm run test` passes; no skipped tests without linked issue
3. **Lint** — linter passes with zero warnings (warnings are errors)
4. **Build** — production build completes without errors
5. **Bundle size** — initial JS bundle MUST NOT exceed 200 KB compressed
6. **Accessibility** — no new axe-core violations in changed components
7. **API contract** — any API change updates the central types file and has a corresponding test
8. **Constitution review** — reviewer confirms the change does not violate any core principle
9. **i18n compliance** — no raw user-facing string literals in UI components (automated lint)
10. **Permission smoke test** — any new mutation endpoint MUST include an integration test proving a 403 response for an unauthorised caller
11. **Auth consistency** — all API routes MUST authenticate through `getServerSession()` or the `requireAuth()` wrapper; client-injectable headers (e.g., `x-user-id`, `x-api-key`) MUST NOT be used as the authentication mechanism; PR reviewers MUST reject any route that reads identity from a request header instead of the session
12. **Cross-spec data integrity** — any new spec that references tables defined in another spec MUST include an integration test that exercises the cross-spec query path with realistic data; additionally, any new PII table MUST appear in the GDPR deletion and data-export test suites before the PR can merge

### Performance Thresholds

These thresholds enforce Principle VI (Performance Budget) and may
be updated by the team without a constitution version change:

- Largest Contentful Paint (LCP) < 2.5 s on simulated 3G
- Time to Interactive (TTI) < 3.5 s
- Initial JavaScript bundle < 200 KB (compressed)
- Map library loaded on demand, not in initial bundle
- API mutation response time (RSVP, booking, payment) < 1 s at p95

---

## Governance

### Amendment Procedure

1. Author opens a PR with proposed constitution changes and a justification summary.
2. All active contributors are tagged for review; a 72-hour review window begins.
3. Approval requires majority agreement among active contributors.
4. On merge, the author updates both canonical copies (`specs/constitution.md` and `.specify/memory/constitution.md`).

### Version Bumping Policy

This constitution follows semantic versioning:

- **MAJOR** (e.g., 2.0.0): A principle is removed, materially redefined, or a governance rule is reversed.
- **MINOR** (e.g., 1.2.0): A new principle, section, or quality gate is added; existing guidance is materially expanded.
- **PATCH** (e.g., 1.2.1): Clarifications, typo fixes, or non-semantic wording improvements.

### Compliance Reviews

- Every PR reviewer MUST verify the change does not violate any core principle (Quality Gate #8).
- Principle violations MUST be flagged with a reference to the violated principle number (e.g., "Violates Principle IX — no permission check on new endpoint").
- A quarterly review of the principle–spec alignment matrix is RECOMMENDED to catch drift.

### Exceptions

Exceptions may be granted for prototyping/spike branches clearly
labelled as such (branch prefix `spike/` or `prototype/`).
Exceptions MUST NOT merge to `main`.

**Version**: 1.5.0 | **Ratified**: 2026-03-16 | **Last Amended**: 2026-03-22
