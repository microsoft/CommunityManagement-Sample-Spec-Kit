# Copilot Coding Agent Instructions

This project uses the **Spec-Kit** agentic development process. Every change
MUST follow these rules. Violations will be caught by CI and rejected.

## Before Writing Any Code

1. **Find the relevant spec** — Check `specs/` for the feature spec matching
   your issue. Read spec.md, plan.md, tasks.md, and data-model.md before coding.
2. **Read the constitution** — `specs/constitution.md` (v1.4.0) defines 13
   mandatory architectural principles. Key constraints:
   - **I. API-First**: All mutations go through API routes, never direct DB from components.
     Response shapes live in `packages/shared/src/types/`. Error responses use `@/lib/errors`.
   - **II. Test-First**: Every service function needs an integration test. Use `createTestDb()` for PGlite isolation.
   - **III. Privacy**: PII encrypted at rest, EXIF stripped from uploads, GDPR deletion covers all tables.
   - **IV. Server-Side Authority**: Zod schemas validate all request bodies. No trusting client input.
   - **IX. Scoped Permissions**: Use `withPermission()` middleware on all admin/mutation endpoints.
   - **XI. Resource Ownership**: Every mutation verifies caller owns the resource or holds scoped admin.
   - **XII. Financial Integrity**: Server-side pricing only. Stripe Connect with signed OAuth state.
3. **Check tasks.md** — If your issue maps to a task, mark it `[X]` when done.

## Monorepo Structure

npm workspaces monorepo — always run commands from the repo root:

| Workspace | Package | Purpose |
|-----------|---------|---------|
| `apps/web/` | `@acroyoga/web` | Next.js 16 web app (App Router, React 19) |
| `packages/shared/` | `@acroyoga/shared` | Shared TypeScript types and contracts |
| `packages/shared-ui/` | `@acroyoga/shared-ui` | 15 cross-platform UI components (design tokens) |
| `packages/tokens/` | `@acroyoga/tokens` | Design token pipeline — **must build before other packages** |

## Validation Checklist — REQUIRED Before Completing Any Task

Run these in order. All must pass:

    npm run tokens:build -w @acroyoga/tokens   # 1. Build tokens (prerequisite)
    npm run typecheck                           # 2. Zero type errors
    npm run lint -w @acroyoga/web               # 3. Zero lint warnings
    npm run test                                # 4. All tests pass (tokens > shared-ui > web)
    npm run build -w @acroyoga/web              # 5. Production build succeeds

If you add a new API route, you MUST also:
- Add integration tests in `apps/web/tests/integration/`
- Test 403 for unauthorized callers (Constitution QG-10)
- Use `createTestDb()` for PGlite test isolation

## Auth Pattern

- Web: `getServerSession()` / `requireAuth()` — session-based only
- Never trust client-injectable headers (`x-user-id`, `x-api-key` etc.)
- Admin routes: `withPermission()` middleware, not bare `requireAuth()`

## Code Conventions

- TypeScript strict mode — no `any`, no `@ts-ignore`
- Zod schemas at all API boundaries (no manual `typeof` checks)
- SQL migrations: `apps/web/src/db/migrations/` (raw SQL, no ORM)
- Response types: `packages/shared/src/types/`
- Error responses: `{ error: string, code: string, details?: unknown }` via `@/lib/errors`
- No hardcoded user-facing strings (i18n extractable, Constitution VIII)
- No N+1 queries — use JOINs or `WHERE IN` for lists (Constitution VI)

## Quality Gates (enforced by CI)

The CI pipeline (`.github/workflows/ci.yml`) runs on every PR:

1. Typecheck (`tsc -b`)
2. Lint (ESLint + jsx-a11y)
3. Build (Next.js production)
4. Bundle size <=200KB compressed
5. All tests: tokens (20), shared-ui (85), web (339+)
6. i18n string lint
7. Storybook build + a11y audit (axe-core)

Your PR will be blocked if any gate fails. Fix before requesting review.
