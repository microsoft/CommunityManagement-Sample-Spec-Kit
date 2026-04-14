# Contributing to AcroYoga Community Platform

Thank you for your interest in contributing! This guide covers everything you need to go from clone to first passing PR.

## Prerequisites

- **Node.js 24+** (managed via [fnm](https://github.com/Schniz/fnm) — see `.nvmrc`)
- **Git** 2.40+
- **GitHub Codespaces** (recommended) or a Linux environment

## Quick Start with Codespaces

The fastest way to get started:

1. Click **Code → Codespaces → Create codespace on main** on the repository page
2. Wait for the devcontainer to build (pre-configured in `.devcontainer/devcontainer.json` with Node 24, Azure CLI, GitHub CLI, and PostgreSQL)
3. Dependencies install automatically via `npm ci` and design tokens are pre-built on start
4. Run the validation checklist (see below) to confirm everything works

## Local Setup (Linux)

```bash
# Clone the repository
git clone https://github.com/microsoft/CommunityManagement-Sample-Spec-Kit.git
cd CommunityManagement-Sample-Spec-Kit

# Install dependencies
npm install

# Build design tokens (prerequisite for other packages)
npm run tokens:build -w @acroyoga/tokens

# Verify everything works
npm run typecheck
npm run test
```

> **Note**: This is an npm workspaces monorepo. Always run commands from the repository root unless targeting a specific workspace.

## Project Structure

```
├── apps/web/               # Next.js 16 web app (@acroyoga/web)
│   ├── src/app/            # App Router pages & API routes
│   ├── src/components/     # React components
│   ├── src/db/             # SQL migrations & seeds
│   ├── src/lib/            # Business logic by domain
│   └── tests/              # Integration & unit tests
├── packages/shared/        # Shared TypeScript types (@acroyoga/shared)
├── packages/shared-ui/     # Cross-platform UI components (@acroyoga/shared-ui)
├── packages/tokens/        # Design token pipeline (@acroyoga/tokens)
└── specs/                  # Feature specifications & constitution
```

## Development Workflow

### 1. Find the Spec

Every feature is driven by a specification in `specs/`. Before writing code:

1. Read `specs/constitution.md` (v1.7.0) — defines 15 mandatory architectural principles
2. Find the relevant spec in `specs/NNN-feature-name/`
3. Read `spec.md`, `plan.md`, and `tasks.md` to understand scope and acceptance criteria
4. Check which tasks are already marked `[X]` (done) vs `[ ]` (pending)

### 2. Create a Branch

```bash
# Human contributors:
git checkout -b feature/{spec-number}-{description}
# or for bugfixes:
git checkout -b fix/{issue-number}-{description}

# Agent sessions use:
# copilot/{spec-number}/{task-id}  (e.g., copilot/022/T005)
```

### 3. Make Changes

Follow these conventions:

- **TypeScript strict mode** — no `any`, no `@ts-ignore`
- **Zod schemas** at all API boundaries (no manual `typeof` checks)
- **API-First** — all mutations go through API routes, never direct DB calls from components
- **Error responses** — use `@/lib/errors` helpers for consistent `{ error, code, details? }` shape
- **No hardcoded strings** — all user-facing strings must be i18n-extractable
- **No N+1 queries** — use JOINs or `WHERE IN` for lists
- **Auth** — use `getServerSession()` / `requireAuth()` for authentication; `withPermission()` for admin routes
- **Ownership** — every mutation must verify the caller is the resource owner or holds scoped admin

### 4. Run the Validation Checklist

#### Fast Iteration (during development)

Run these checks during active development — they complete in **< 3 minutes**:

```bash
# 1. Build design tokens (prerequisite for other packages)
npm run tokens:build -w @acroyoga/tokens

# 2. Type check — zero errors
npm run typecheck

# 3. Lint — zero warnings (warnings are errors)
npm run lint -w @acroyoga/web

# 4. Run tests for affected workspace only
npm run test -w @acroyoga/{workspace}
```

Do NOT run during development: production build, Storybook build, Playwright E2E, i18n lint, or bundle size check. These run automatically in the full CI pipeline before merge.

#### Full Validation (before requesting merge)

Run these commands **in order** before applying the `ready-for-merge` label. All must pass:

```bash
# 1. Build design tokens (prerequisite for other packages)
npm run tokens:build -w @acroyoga/tokens

# 2. Type check — zero errors
npm run typecheck

# 3. Lint — zero warnings (warnings are errors)
npm run lint -w @acroyoga/web

# 4. Run all tests — tokens (20) → shared-ui (175) → shared (44) → web (935) → mobile (52)
npm run test

# 5. Production build — must succeed
npm run build -w @acroyoga/web
```

### 5. Submit a Pull Request

- Write a clear title and description explaining what changed and why
- Reference the spec and task numbers (e.g., "Spec 010, T021")
- If you added a new dependency, justify it in the PR description
- If you changed an API, ensure the shared types file is updated

## Spec-Kit Process

This project follows the Spec-Kit agentic development workflow:

1. **Constitution** — Architectural principles and quality gates (`specs/constitution.md`, v1.7.0)
2. **Specify** — Feature specs with user scenarios, acceptance criteria, and edge cases
3. **Plan** — Implementation plans with data models and API contracts
4. **Tasks** — Dependency-ordered, actionable task lists
5. **Issues** — Convert tasks to GitHub issues with workspace labels for parallel execution
6. **Implement** — Code changes that follow the spec and constitution

When completing a task, mark it `[X]` in the relevant `tasks.md` file.

### Autonomous Pipeline

The spec-kit process supports near-fully autonomous execution:

1. **Create an issue** with the `feature-request-auto` label
2. The orchestration pipeline auto-generates spec → plan → tasks → GitHub issues
3. Agent sessions pick up issues, implement on `copilot/{spec}/{task}` branches
4. PRs include `Fixes #{issue-number}` for automatic issue closure on merge
5. Tier 1 CI runs on every push; on pass, `ready-for-merge` is auto-applied
6. Tier 2 CI runs; on pass, the PR is auto-merged
7. **Self-healing deployment** — after merge to `main`, `deploy-and-heal.yml` deploys a canary revision, runs smoke tests (readiness + health + home page), and if they fail: collects structured diagnostics → creates a `deploy-fix-auto` issue → Copilot agent diagnoses and fixes → redeploys automatically (up to 3 iterations)

Human review is required only for: spec approval, constitution amendments, security-sensitive changes, new dependencies, database migrations, and infrastructure errors during self-healing. See [Constitution XV](specs/constitution.md) for the full policy.

## Code Conventions

### API Routes

- All routes live in `apps/web/src/app/api/`
- Use Next.js App Router conventions (`route.ts` with exported `GET`, `POST`, etc.)
- Validate request bodies with Zod schemas
- Return errors via `@/lib/errors` helpers
- Authenticate with `requireAuth()` or `getServerSession()`
- Admin routes must use `withPermission()` middleware

### Database

- Raw SQL migrations in `apps/web/src/db/migrations/`
- No ORM — use `node-pg` with parameterized queries
- Migrations are numbered and executed alphabetically
- Test with PGlite (in-memory PostgreSQL)

### Testing

- **Integration tests**: `apps/web/tests/integration/` — test API route handlers with PGlite
- **Unit tests**: `apps/web/tests/unit/` — test pure functions
- Use `createTestDb()` from `tests/helpers/db.ts` for database isolation
- Every new API mutation needs a test proving 403 for unauthorized callers
- See `docs/testing.md` for detailed testing patterns

### Components

- Shared components: `packages/shared-ui/src/`
- Web-specific components: `apps/web/src/components/`
- Design tokens from `packages/tokens/`
- WCAG 2.1 AA accessibility required
- Storybook stories for all shared components

## Useful Commands

```bash
# Development server (tokens watch + Next.js)
npm run dev

# Run tests for a specific workspace
npm run test -w @acroyoga/tokens
npm run test -w @acroyoga/shared-ui
npm run test -w @acroyoga/web

# Watch mode for tests
npm run test:watch

# Storybook component explorer
npm run storybook

# Database operations
npm run db:migrate -w @acroyoga/web
npm run db:seed:geography -w @acroyoga/web
npm run db:seed:admin -w @acroyoga/web
```

## Quality Gates (Two-Tier CI)

Quality gates are split into two tiers to enable rapid iteration during development (see [Constitution XV](specs/constitution.md)):

### Tier 1: Fast CI (`ci-fast.yml`) — every PR push

1. **Tokens build** — design tokens compile without errors
2. **Type check** — `tsc --noEmit` with zero errors
3. **Lint** — ESLint with `jsx-a11y` plugin, zero warnings
4. **Affected tests** — tests for changed workspaces only (via `dorny/paths-filter`)

### Tier 2: Full CI (`ci-full.yml`) — before merge

Runs when the `ready-for-merge` label is applied, on push to `main`, or manual dispatch:

5. **All tests** — full test suite passes across all workspaces
6. **Build** — Next.js production build succeeds
7. **Bundle size** — Initial JS ≤ 200 KB compressed
8. **Accessibility** — No new axe-core violations
9. **API contract** — Any API change updates the central types file with tests
10. **Constitution compliance** — Reviewer confirms no principle violations
11. **i18n compliance** — No raw string literals in UI components (exit code 1)
12. **Permission smoke test** — New mutation endpoints include 403 test for unauthorized callers
13. **Auth consistency** — Session-based auth only, no client-injectable headers
14. **Storybook** — Build + a11y audit passes
15. **E2E** — Playwright tests pass

### Tier 3: Deployment Verification (`deploy-and-heal.yml`) — post-deploy

Runs after deploying to staging or nightly:

16. **Readiness** — `/api/ready` returns 200 within retry window
17. **Health** — `/api/health` returns `{"status":"healthy"}`
18. **Home page** — Root URL returns HTTP 200
19. **Self-heal** — on failure, diagnostics collected and auto-fix loop triggered (max 3 iterations)

Agent PRs get `ready-for-merge` auto-applied after Tier 1 passes. See `.github/workflows/auto-merge-agent.yml`.

## Internationalisation (i18n)

The platform uses [next-intl](https://next-intl.dev/) for locale-aware rendering. All user-facing strings live in JSON translation files.

### Adding a New String

1. Add the key to `apps/web/messages/en.json` under the appropriate namespace (`common`, `events`, `auth`, etc.)
2. Add the same key to all other locale files (`es.json`, `ar.json`)
3. In your component, use the `useTranslations()` hook:
   ```tsx
   import { useTranslations } from "next-intl";
   const t = useTranslations("events");
   return <p>{t("noEventsMatch")}</p>;
   ```
4. For shared-ui components (cross-platform), pass translated strings via props:
   ```tsx
   <EventCard event={event} labels={{ free: t("free") }} />
   ```
5. For date/time formatting, use the shared helpers:
   ```tsx
   import { formatEventDate, formatCurrency } from "@acroyoga/shared/utils/format";
   ```

### Adding a New Locale

1. Copy `apps/web/messages/en.json` to `apps/web/messages/<locale>.json`
2. Translate all strings in the new file
3. Add the locale to `packages/shared/src/types/i18n.ts` (the `Locale` union type and `SUPPORTED_LOCALES` array)
4. Add the locale to `apps/web/src/i18n/routing.ts`
5. The CI completeness check will verify all keys are present

### Translation Key Naming

- Use dot-separated namespaces: `events.badgeNew`, `common.loading`
- Use camelCase for key names: `signInError`, not `sign-in-error`
- Parameterised strings use ICU MessageFormat: `"{count} events found"`
- Keep keys descriptive but concise

### File Structure

```
apps/web/messages/
├── en.json          # Default locale (English) — source of truth
├── es.json          # Spanish (proof-of-concept)
└── ar.json          # Arabic (RTL stub for structural testing)
```

## Mobile Development

The mobile app is built with Expo/React Native and lives in `apps/mobile/`.

### Prerequisites
- Node.js >= 24
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (macOS) or Android Emulator

### Getting Started
```bash
cd apps/mobile
npx expo start
```

### Running Tests
```bash
cd apps/mobile
npm test
```

### Building
Preview builds use EAS Build:
```bash
npx eas build --profile preview --platform ios
npx eas build --profile preview --platform android
```

## Getting Help

- Read the [constitution](specs/constitution.md) for architectural principles
- Check existing specs in `specs/` for patterns and conventions
- Review existing tests for examples of testing patterns
- See `docs/api-reference.md` for the full API endpoint inventory
- See `docs/database.md` for schema documentation
- See `docs/testing.md` for testing patterns and setup
