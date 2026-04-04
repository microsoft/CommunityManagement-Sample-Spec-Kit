# Contributing to AcroYoga Community Platform

Thank you for your interest in contributing! This guide covers everything you need to go from clone to first passing PR.

## Prerequisites

- **Node.js 22+** (managed via [fnm](https://github.com/Schniz/fnm) — see `.nvmrc`)
- **Git** 2.40+
- **GitHub Codespaces** (recommended) or a Linux environment

## Quick Start with Codespaces

The fastest way to get started:

1. Click **Code → Codespaces → Create codespace on main** on the repository page
2. Wait for the devcontainer to build (pre-configured in `.devcontainer/devcontainer.json` with Node 22, Azure CLI, GitHub CLI, and PostgreSQL)
3. Dependencies install automatically via `npm ci --force`
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

1. Read `specs/constitution.md` (v1.5.0) — defines 14 mandatory architectural principles
2. Find the relevant spec in `specs/NNN-feature-name/`
3. Read `spec.md`, `plan.md`, and `tasks.md` to understand scope and acceptance criteria
4. Check which tasks are already marked `[X]` (done) vs `[ ]` (pending)

### 2. Create a Branch

```bash
git checkout -b your-feature-branch
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

Run these commands **in order** before submitting a PR. All must pass:

```bash
# 1. Build design tokens (prerequisite for other packages)
npm run tokens:build -w @acroyoga/tokens

# 2. Type check — zero errors
npm run typecheck

# 3. Lint — zero warnings (warnings are errors)
npm run lint -w @acroyoga/web

# 4. Run all tests — tokens (20) → shared-ui (85) → web (580+)
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

1. **Constitution** — Architectural principles and quality gates (`specs/constitution.md`)
2. **Specify** — Feature specs with user scenarios, acceptance criteria, and edge cases
3. **Plan** — Implementation plans with data models and API contracts
4. **Tasks** — Dependency-ordered, actionable task lists
5. **Implement** — Code changes that follow the spec and constitution

When completing a task, mark it `[X]` in the relevant `tasks.md` file.

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

## Quality Gates

Every PR must pass these gates (enforced by CI):

1. **Type check** — `tsc --noEmit` with zero errors
2. **Lint** — ESLint with `jsx-a11y` plugin, zero warnings
3. **Tests** — All Vitest tests pass (tokens → shared-ui → web)
4. **Build** — Next.js production build succeeds
5. **Bundle size** — Initial JS ≤ 200 KB compressed
6. **Accessibility** — No new axe-core violations
7. **API contract** — Any API change updates the central types file with tests
8. **Constitution compliance** — Reviewer confirms no principle violations
9. **i18n compliance** — No raw string literals in UI components
10. **Permission smoke test** — New mutation endpoints include 403 test for unauthorized callers
11. **Auth consistency** — Session-based auth only, no client-injectable headers

## Getting Help

- Read the [constitution](specs/constitution.md) for architectural principles
- Check existing specs in `specs/` for patterns and conventions
- Review existing tests for examples of testing patterns
- See `docs/api-reference.md` for the full API endpoint inventory
- See `docs/database.md` for schema documentation
- See `docs/testing.md` for testing patterns and setup
