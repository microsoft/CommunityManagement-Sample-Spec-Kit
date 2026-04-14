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
- **User Directory** — Browse, search, and filter community members with relationship status, proximity sort, social link icons, and profile completeness
- **Cross-Platform UI** — Shared design token pipeline (CSS, TS, Swift, Kotlin) with 17 reusable components and Storybook 10 component explorer
- **Events Explorer** — Interactive map, calendar, and location tree for advanced event discovery with synchronized filtering
- **Azure Deployment** — Production deployment on Azure Container Apps with Managed Identity, Front Door CDN, and automated CI/CD

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, React 19, Server Components, `proxy.ts`) |
| Language | TypeScript 5.9 (strict mode) |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL ([node-pg](https://node-postgres.com/)) with raw SQL migrations |
| Auth | [NextAuth.js v5](https://authjs.dev) (mock auth for development) |
| Payments | [Stripe](https://stripe.com) + Stripe Connect |
| Validation | [Zod 4](https://zod.dev) at every API boundary |
| Testing | [Vitest 4](https://vitest.dev) + [PGlite](https://electric-sql.com/product/pglite) (in-memory Postgres) |
| Components | [Storybook 10](https://storybook.js.org) with `@storybook/react-vite` |
| Storage | Azure Blob Storage (media uploads with EXIF stripping) |
| Recurrence | [rrule](https://github.com/jkbrzt/rrule) for iCal-compliant scheduling |

## Project Structure

This is an **npm workspaces monorepo** with shared packages:

```
├── apps/
│   ├── web/                    # Next.js 16 web application
│   │   ├── src/app/            # App Router pages & API routes
│   │   ├── src/components/     # Web-specific components
│   │   ├── src/db/             # SQL migrations & seeds
│   │   ├── src/lib/            # Business logic by domain (20+ modules)
│   │   ├── .storybook/         # Storybook 10 config
│   │   └── tests/              # Integration tests (PGlite)
│   └── mobile/                 # Expo/React Native mobile app
│
├── packages/
│   ├── shared/                 # Cross-platform types & utilities
│   │   └── src/types/          # Shared TypeScript interfaces
│   ├── shared-ui/              # Cross-platform UI components (17 components)
│   │   └── src/                # 5-file pattern per component
│   └── tokens/                 # Design token pipeline
│       ├── src/                # Token definitions (JSON, W3C DTCG format)
│       └── build/              # Generated CSS, TS, Swift, Kotlin
│
├── specs/                      # Spec-Kit feature specifications
│   ├── constitution.md         # Architectural principles (v1.7.0, 15 principles)
│   └── 001–021/                # Feature specs with plans, tasks, contracts
│
├── .github/
│   ├── copilot-instructions.md # Autonomous agent session protocol
│   └── workflows/
│       ├── ci-fast.yml         # Tier 1: typecheck + lint + affected tests (<3 min)
│       ├── ci-full.yml         # Tier 2: full quality gates (ready-for-merge)
│       ├── deploy.yml          # CD pipeline (staging → production) with smoke tests
│       ├── deploy-and-heal.yml     # Self-healing deploy loop (canary → test → fix → retry)
│       ├── deploy-fix-orchestrate.yml # Lightweight deploy-fix issue orchestration
│       ├── auto-merge-agent.yml    # Auto-merge for agent PRs
│       ├── speckit-orchestrate.yml # Spec-kit orchestration pipeline
│       └── feature-request-auto.yml # Issue → spec automation
│
└── .agent.md                   # UI Expert agent configuration
```

### Workspaces

| Workspace | Package | Description |
|-----------|---------|-------------|
| `apps/web` | `@acroyoga/web` | Next.js 16 web app (App Router, React 19, Turbopack) |
| `packages/shared` | `@acroyoga/shared` | Shared types and contracts |
| `packages/shared-ui` | `@acroyoga/shared-ui` | 17 cross-platform UI components with design tokens |
| `packages/tokens` | `@acroyoga/tokens` | Design token pipeline (CSS, TS, Swift, Kotlin output) |
| `apps/mobile` | `@acroyoga/mobile` | Expo/React Native mobile app |

### Specifications

Each feature is developed from a full spec (user scenarios, data model, API contracts, implementation plan, and tasks). All specs live in `specs/`:

| Spec | Name | Priority | Status |
|------|------|----------|--------|
| 001 | [Event Discovery & RSVP](specs/001-event-discovery-rsvp/) | P0 | Implemented |
| 002 | [Community & Social](specs/002-community-social/) | P1 | Implemented |
| 003 | [Recurring & Multi-Day Events](specs/003-recurring-multiday/) | P1 | Implemented |
| 004 | [Permissions & Creator Accounts](specs/004-permissions-creator-accounts/) | P0 | Implemented |
| 005 | [Teacher Profiles & Reviews](specs/005-teacher-profiles-reviews/) | P1 | Implemented |
| 006 | [Code Review Fixes](specs/006-code-review-fixes/) | P0 | Implemented |
| 007a | [Mock Authentication](specs/007-mock-auth/) | P1 | Implemented |
| 007b | [Simple UI Pages](specs/007-simple-ui-pages/) | P0 | Implemented |
| 008 | [Cross-Platform UI](specs/008-cross-platform-ui/) | P0 | Implemented (web) |
| 009 | [User Directory](specs/009-user-directory/) | P1 | Implemented |
| 010 | [Events Explorer](specs/010-events-explorer/) | P1 | Implemented |
| 011a | [Azure Deployment](specs/011-azure-deployment/) | P1 | Implemented |
| 011b | [Entra External ID](specs/011-entra-external-id/) | P1 | Implemented |
| 012 | [Managed Identity Deploy](specs/012-managed-identity-deploy/) | P2 | Implemented |
| 013 | [Platform Improvements](specs/013-platform-improvements/) | P2 | Complete |
| 014 | [Internationalisation](specs/014-internationalisation/) | P1 | Implemented |
| 015 | [Background Jobs & Notifications](specs/015-background-jobs-notifications/) | P1 | Implemented |
| 016 | [Mobile App (Expo/React Native)](specs/016-mobile-app/) | P1 | Implemented |

> Specs 006 and 007 are internal infrastructure (security hardening, dev tooling, UI pages). Specs 011–012 cover Azure production deployment with Managed Identity and Entra External ID social login. Spec 013 added CONTRIBUTING.md, API reference docs, database/testing docs, Playwright E2E tests, and triaged all remaining tasks across specs 001–010. Specs 014–016 are the next wave of features — i18n (Constitution VIII), background jobs & notifications (Constitution X), and native mobile apps completing the cross-platform vision from Spec 008.

## Roadmap

All P0 and P1 features are implemented across 16 specs (001–016). The next wave of work is captured in two new specs:

| Priority | Spec | Scope | Tasks |
|----------|------|-------|-------|
| **Next** | [017 — SEO & Social Sharing](specs/017-seo-social-sharing/) | `generateMetadata()` for all public pages, `next/og` branded sharing images, Schema.org JSON-LD (Event + Person), dynamic sitemap, canonical URLs, social share panel with UTM tracking | 49 tasks, 9 phases |
| **Next** | [018 — Performance Optimization](specs/018-performance-optimization/) | Database indexes, server-side query caching, skeleton loading states (closes Spec 001 T064), error boundaries (closes Spec 001 T065), SSR conversion, image optimization, bundle size CI gate | 43 tasks, 10 phases |

Additional deferred work (lower priority, not yet specced):
- **UI Component Extraction** — 21 presentational component wrappers (Spec 001 deferred tasks)
- **WCAG Manual Audit** — Keyboard navigation and screen reader testing beyond axe-core automation
- **Geolocation & Heatmap** — "Near Me" button and event density heatmap (Spec 010 deferred)

## Documentation

- **[Contributing Guide](CONTRIBUTING.md)** — Setup, workflow, conventions, and quality gates
- **[API Reference](docs/api-reference.md)** — All 92 API endpoints with auth requirements
- **[Database Schema](docs/database.md)** — 39 tables, relationships, and migration process
- **[Testing Guide](docs/testing.md)** — PGlite setup, test patterns, and coverage areas
- **[Deployment Runbook](docs/deployment-runbook.md)** — Azure deployment procedures
- **[Environment Setup](docs/environment-setup.md)** — Environment variables and configuration

## Architectural Principles

The project is governed by a [constitution](specs/constitution.md) (v1.7.0) defining 15 core principles:

1. **API-First Design** — Every feature exposes a versioned REST API before any UI
2. **Test-First Development** — Integration tests against real (in-memory) Postgres; ≥80% service coverage
3. **Privacy & Data Protection** — GDPR-compliant export/deletion; PII encrypted at rest; EXIF stripping
4. **Server-Side Authority** — All business rules enforced server-side; Zod validation at boundaries
5. **UX Consistency** — WCAG 2.1 AA; mobile-first; shared design tokens
6. **Performance Budget** — LCP <2.5s; initial JS <200KB; no N+1 queries
7. **Simplicity** — No premature abstraction; dependencies justified in PRs
8. **Internationalisation** — All strings in `apps/web/messages/*.json`; `next-intl` locale switching; `Intl.DateTimeFormat`/`Intl.NumberFormat` formatting; RTL structural support; CI-blocking lint
9. **Scoped Permissions** — Geographic RBAC with `withPermission()` middleware
10. **Notification Architecture** — Multi-channel, user-configurable, async delivery
11. **Resource Ownership** — Every mutation verifies caller is owner or scoped admin
12. **Financial Integrity** — Server-side pricing; Stripe Connect; signed OAuth state
13. **Codespaces Mandate** — All development runs in GitHub Codespaces
14. **Managed Identity** — Azure Managed Identity with DefaultAzureCredential for all service connections
15. **Autonomous Development Pipeline** — Two-tier CI (fast iteration + full pre-merge); auto-merge for agent PRs; workspace-isolated concurrency; self-healing deployment loop (deploy → smoke test → diagnose → auto-fix → redeploy); human gates only for architecture and security decisions

## Getting Started

### Prerequisites

- Node.js 24+ (managed via fnm — see `.nvmrc`)
- PostgreSQL 15+ (or use PGlite for development/testing)
- GitHub Codespaces (recommended) or a Linux environment — ensures local–CI parity

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
npm run test -w @acroyoga/shared-ui   # Run shared-ui component tests (85 tests)
npm run test -w @acroyoga/web         # Run web integration tests (630+ tests)
npm run tokens:build                  # Rebuild design tokens
npm run tokens:watch                  # Watch token source & rebuild on change
```

## Quality Gates (Two-Tier CI)

Quality gates are split into two tiers to enable rapid iteration during development while maintaining full quality before merge (see [Constitution XV](specs/constitution.md)).

### Tier 1: Fast CI (`ci-fast.yml`) — every PR push

Runs automatically on every PR, targeting **< 3 minutes**:

- **Tokens build** — design tokens compile without errors
- **Type check** — `tsc --noEmit` with zero errors
- **Lint** — ESLint with `jsx-a11y`, zero warnings
- **Affected tests** — only tests for changed workspaces (via `dorny/paths-filter`)

### Tier 2: Full CI (`ci-full.yml`) — before merge to main

Runs when the `ready-for-merge` label is applied, on push to `main`, or via manual dispatch:

- All tests across all workspaces
- Production build completes
- Bundle size ≤ 200 KB compressed
- No new axe-core accessibility violations
- API changes update the central types file with corresponding tests
- Constitution compliance confirmed by reviewer
- i18n string lint — no raw string literals in UI
- Permission smoke test for every new mutation endpoint (403 for unauthorized callers)
- Auth consistency — session-based only, no client-injectable headers
- Storybook build + a11y audit
- Playwright E2E tests

### Tier 3: Deployment Verification (`deploy-and-heal.yml`) — post-deploy

Runs after deploying to staging or nightly via the self-healing pipeline:

- **Readiness** — `/api/ready` returns 200 within retry window
- **Health** — `/api/health` returns `{"status":"healthy"}`
- **Home page** — Root URL returns HTTP 200
- **Self-heal** — on failure, structured diagnostics are collected, a fix issue is created for the Copilot agent, and the pipeline retries after the fix merges (max 3 iterations)

Agent PRs (from `copilot/*` branches) get the `ready-for-merge` label auto-applied after Tier 1 passes, and are auto-merged after Tier 2 passes. See the [auto-merge workflow](.github/workflows/auto-merge-agent.yml) for details.

## Spec-Kit Workflow

This project was developed using the Spec-Kit agentic workflow:

1. **Constitution** — Define architectural principles and quality gates (`specs/constitution.md`)
2. **Specify** — Write detailed feature specs with user scenarios (Given/When/Then)
3. **Plan** — Generate implementation plans with data models and API contracts
4. **Tasks** — Break plans into dependency-ordered, actionable tasks
5. **Issues** — Convert tasks to GitHub issues with workspace labels for parallel execution
6. **Implement** — AI agents execute tasks following the spec and constitution

Each feature lives in `specs/NNN-feature-name/` with its own spec, plan, tasks, data model, research notes, and API contracts.

### Autonomous Pipeline

The spec-kit process can run near-fully autonomously:

- **Create an issue** with the `feature-request-auto` label → the [orchestration workflow](.github/workflows/feature-request-auto.yml) determines the next spec number and triggers `speckit-orchestrate.yml`
- **`speckit-orchestrate.yml`** scaffolds the spec folder and creates a Copilot agent issue to run specify → plan → tasks → issues in sequence
- **Agent sessions** pick up implementation issues, create `copilot/{spec}/{task}` branches, and open PRs with `Fixes #N`
- **Tier 1 CI** runs automatically; on pass, `ready-for-merge` is auto-applied
- **Tier 2 CI** runs; on pass, the PR is auto-merged via squash
- **Self-healing deployment** — after merge, `deploy-and-heal.yml` deploys as a canary revision, runs smoke tests, and if they fail: collects structured diagnostics → creates a fix issue → Copilot agent fixes it → redeploys (up to 3 iterations)

Human review is required only at two gates: (1) spec approval before implementation, and (2) the `ready-for-merge` label for human PRs. Infrastructure and credential errors always escalate to human review. See [Constitution XV](specs/constitution.md) for the full policy.

## License

[MIT](LICENSE)

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.
