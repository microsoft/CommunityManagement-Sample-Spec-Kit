# AcroYoga Community Platform

A full-stack community events platform built **entirely through agentic AI development** using [Spec-Kit](https://github.com/speckit). This repository serves as a reference implementation demonstrating how AI agents can ship production-quality software when guided by rigorous specifications and architectural principles.

## What It Does

AcroYoga Community connects practitioners with local events, teachers, and each other. Core capabilities:

- **Event Discovery & RSVP** — Browse, filter, and RSVP to events with role selection (Base/Flyer/Hybrid), waitlist support, and calendar sync
- **Community & Social** — Follow users, threaded discussions, interest-based connections, content moderation and blocking
- **Recurring & Multi-Day Events** — RRule-based recurrence, multi-day festivals, per-occurrence overrides
- **Permissions & Creator Accounts** — Hierarchical role-based access scoped to geographic regions (city → country → global)
- **Teacher Profiles & Reviews** — Verified instructor profiles, certification tracking, ratings and reviews
- **Payments & Bookings** — Stripe Connect for creator payouts, concession pricing, credits, and refund policies

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, React 19, Server Components) |
| Language | TypeScript 5.9 (strict mode) |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL ([node-pg](https://node-postgres.com/)) with raw SQL migrations |
| Auth | [NextAuth.js v5](https://authjs.dev) (mock auth for development) |
| Payments | [Stripe](https://stripe.com) + Stripe Connect |
| Validation | [Zod 4](https://zod.dev) at every API boundary |
| Testing | [Vitest 4](https://vitest.dev) + [PGlite](https://electric-sql.com/product/pglite) (in-memory Postgres) |
| Storage | Azure Blob Storage (media uploads with EXIF stripping) |
| Recurrence | [rrule](https://github.com/jkbrzt/rrule) for iCal-compliant scheduling |

## Project Structure

This is an **npm workspaces monorepo** with shared packages:

```
├── apps/
│   └── web/                    # Next.js 16 web application
│       ├── src/app/            # App Router pages & API routes
│       ├── src/components/     # Web-specific components
│       ├── src/db/             # SQL migrations & seeds
│       ├── src/lib/            # Business logic by domain (20+ modules)
│       ├── .storybook/         # Storybook 10 config
│       └── tests/              # Integration tests (PGlite)
│
├── packages/
│   ├── shared/                 # Cross-platform types & utilities
│   │   └── src/types/          # Shared TypeScript interfaces
│   ├── shared-ui/              # Cross-platform UI components (15 components)
│   │   └── src/                # 5-file pattern per component
│   └── tokens/                 # Design token pipeline
│       ├── src/                # Token definitions (JSON, W3C DTCG format)
│       └── build/              # Generated CSS, TS, Swift, Kotlin
│
├── specs/                      # Spec-Kit feature specifications
│   ├── constitution.md         # Architectural principles (v1.4.0)
│   └── 001–008/                # Feature specs with plans, tasks, contracts
│
└── .agent.md                   # UI Expert agent configuration
```

### Workspaces

| Workspace | Package | Description |
|-----------|---------|-------------|
| `apps/web` | `@acroyoga/web` | Next.js 16 web app (App Router, React 19, Turbopack) |
| `packages/shared` | `@acroyoga/shared` | Shared types and contracts |
| `packages/shared-ui` | `@acroyoga/shared-ui` | 15 cross-platform UI components with design tokens |
| `packages/tokens` | `@acroyoga/tokens` | Design token pipeline (CSS, TS, Swift, Kotlin output) |

## Architectural Principles

The project is governed by a [constitution](specs/constitution.md) (v1.4.0) defining 13 core principles:

1. **API-First Design** — Every feature exposes a versioned REST API before any UI
2. **Test-First Development** — Integration tests against real (in-memory) Postgres; ≥80% service coverage
3. **Privacy & Data Protection** — GDPR-compliant export/deletion; PII encrypted at rest; EXIF stripping
4. **Server-Side Authority** — All business rules enforced server-side; Zod validation at boundaries
5. **UX Consistency** — WCAG 2.1 AA; mobile-first; shared design tokens
6. **Performance Budget** — LCP <2.5s; initial JS <200KB; no N+1 queries
7. **Simplicity** — No premature abstraction; dependencies justified in PRs
8. **Internationalisation** — All strings extractable; locale-aware formatting
9. **Scoped Permissions** — Geographic RBAC with `withPermission()` middleware
10. **Notification Architecture** — Multi-channel, user-configurable, async delivery
11. **Resource Ownership** — Every mutation verifies caller is owner or scoped admin
12. **Financial Integrity** — Server-side pricing; Stripe Connect; signed OAuth state
13. **WSL Mandate** — All npm/node commands must run via WSL on Windows

## Getting Started

### Prerequisites

- Node.js 24+ (managed via fnm)
- PostgreSQL 15+ (or use PGlite for development/testing)
- WSL (Ubuntu) on Windows — all Node.js commands must run in WSL

### Setup

```bash
npm install
npm run tokens:build     # Generate design tokens (CSS, TS, Swift, Kotlin)
```

### Development

```bash
npm run dev              # Concurrent: tokens watch + Next.js dev server
npm run build            # tokens:build → Next.js production build
npm run test             # tokens → shared-ui → web test suite
npm run storybook        # Storybook 10 component explorer
npm run lint             # ESLint (includes jsx-a11y)
```

### Workspace Commands

```bash
npm run test -w @acroyoga/tokens      # Run token pipeline tests (20 tests)
npm run test -w @acroyoga/shared-ui   # Run shared-ui component tests (78 tests)
npm run test -w @acroyoga/web         # Run web integration tests (339 tests)
npm run tokens:build                  # Rebuild design tokens
npm run tokens:watch                  # Watch token source & rebuild on change
```

## Quality Gates

Every PR must pass before merge:

- `tsc --noEmit` — zero type errors
- `vitest run` — all tests pass, no skipped tests without a linked issue
- ESLint — zero warnings (warnings are errors)
- Production build completes
- Bundle size ≤200 KB compressed
- No new axe-core accessibility violations
- API changes update the central types file with corresponding tests
- Constitution compliance confirmed by reviewer
- Permission smoke test for every new mutation endpoint (403 for unauthorized callers)
- Auth consistency — session-based only, no client-injectable headers

## Spec-Kit Workflow

This project was developed using the Spec-Kit agentic workflow:

1. **Constitution** — Define architectural principles and quality gates
2. **Specify** — Write detailed feature specs with user scenarios (Given/When/Then)
3. **Plan** — Generate implementation plans with data models and API contracts
4. **Tasks** — Break plans into dependency-ordered, actionable tasks
5. **Implement** — AI agents execute tasks following the spec and constitution

Each feature lives in `specs/NNN-feature-name/` with its own spec, plan, tasks, data model, research notes, and API contracts.

## License

[MIT](LICENSE)

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.
