# Copilot Coding Agent Instructions

This project uses the **Spec-Kit** agentic development process. Every change
MUST follow these rules. Violations will be caught by CI and rejected.

## Spec-Kit Process

This repo uses spec-kit for structured feature development:

- `specs/{NNN}-{name}/spec.md` — Feature specification
- `specs/{NNN}-{name}/plan.md` — Implementation plan
- `specs/{NNN}-{name}/tasks.md` — Ordered task list
- `specs/{NNN}-{name}/data-model.md` — Data model (if applicable)
- `specs/constitution.md` — Architectural principles (v1.7.0, 15 principles — **MUST read**)

When assigned an issue:

1. Check if it references a spec task (e.g., "T005 from spec 022")
2. If yes, read the full spec artifacts before coding
3. If no, treat as a standalone bugfix/improvement

## Autonomous Session Protocol

When implementing a task autonomously:

1. **Read the assigned issue** — it maps to a spec task
2. **Read the spec artifacts**: spec.md, plan.md, data-model.md
3. **Create a branch**: `copilot/{spec-number}/{task-id}` (e.g., `copilot/022/T005`)
4. **Implement the change** using the Fast Iteration Workflow below
5. **Create a PR** with `Fixes #{issue-number}` in the description to auto-close the issue
6. **The CI pipeline handles the rest** — fast CI runs automatically, then full CI before merge

## Before Writing Any Code

1. **Find the relevant spec** — Check `specs/` for the feature spec matching
   your issue. Read spec.md, plan.md, tasks.md, and data-model.md before coding.
2. **Read the constitution** — `specs/constitution.md` (v1.7.0) defines 15
   mandatory architectural principles. Key constraints:
   - **I. API-First**: All mutations go through API routes, never direct DB from components.
     Response shapes live in `packages/shared/src/types/`. Error responses use `@/lib/errors`.
   - **II. Test-First**: Every service function needs an integration test. Use `createTestDb()` for PGlite isolation.
   - **III. Privacy**: PII encrypted at rest, EXIF stripped from uploads, GDPR deletion covers all tables.
   - **IV. Server-Side Authority**: Zod schemas validate all request bodies. No trusting client input.
   - **IX. Scoped Permissions**: Use `withPermission()` middleware on all admin/mutation endpoints.
   - **XI. Resource Ownership**: Every mutation verifies caller owns the resource or holds scoped admin.
   - **XII. Financial Integrity**: Server-side pricing only. Stripe Connect with signed OAuth state.
   - **XV. Autonomous Pipeline**: Use fast CI for iteration, full CI before merge only.
3. **Check tasks.md** — If your issue maps to a task, mark it `[X]` when done.

## Monorepo Structure

npm workspaces monorepo — always run commands from the repo root:

| Workspace | Package | Purpose |
|-----------|---------|---------|
| `apps/web/` | `@acroyoga/web` | Next.js 16 web app (App Router, React 19) |
| `apps/mobile/` | `@acroyoga/mobile` | Expo React Native app |
| `packages/shared/` | `@acroyoga/shared` | Shared TypeScript types and contracts |
| `packages/shared-ui/` | `@acroyoga/shared-ui` | 15 cross-platform UI components (design tokens) |
| `packages/tokens/` | `@acroyoga/tokens` | Design token pipeline — **must build before other packages** |

## Fast Iteration Workflow

When implementing a task, run ONLY these checks during development (< 3 min total):

    npm run tokens:build -w @acroyoga/tokens   # 1. Build tokens (prerequisite, ~5s)
    npm run typecheck                           # 2. Zero type errors (~30s)
    npm run lint -w @acroyoga/web               # 3. Zero lint warnings (~20s)
    npm run test -w @acroyoga/{workspace}       # 4. Tests for affected workspace only

Do NOT run during development:
- Full production build (`npm run build -w @acroyoga/web`)
- Storybook build + a11y audit
- Playwright E2E tests
- i18n string lint
- Bundle size check

These full checks run automatically in `ci-full.yml` when the `ready-for-merge`
label is applied. Commit frequently — small, atomic commits on your feature branch.

## Full Validation Checklist — For Pre-Merge Only

Run these in order only when preparing for final merge. All must pass:

    npm run tokens:build -w @acroyoga/tokens   # 1. Build tokens (prerequisite)
    npm run typecheck                           # 2. Zero type errors
    npm run lint -w @acroyoga/web               # 3. Zero lint warnings
    npm run test                                # 4. All tests pass (all workspaces)
    npm run build -w @acroyoga/web              # 5. Production build succeeds

If you add a new API route, you MUST also:
- Add integration tests in `apps/web/tests/integration/`
- Test 403 for unauthorized callers (Constitution QG-10)
- Use `createTestDb()` for PGlite test isolation

## Branch Naming Convention

- Agent sessions: `copilot/{spec-number}/{task-id}` (e.g., `copilot/022/T005`)
- Human features: `feature/{spec-number}-{description}`
- Bugfixes: `fix/{issue-number}-{description}`
- Spikes: `spike/{description}` (exceptions to constitution — MUST NOT merge to main)

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

## Quality Gates (Two-Tier CI)

### Tier 1: Fast CI (`ci-fast.yml`) — every PR push

1. Typecheck (`tsc -b`)
2. Lint (ESLint + jsx-a11y)
3. Affected workspace tests only (via paths-filter)

### Tier 2: Full CI (`ci-full.yml`) — before merge to main

4. All tests across all workspaces
5. Production build
6. Bundle size ≤ 200 KB compressed
7. i18n string lint
8. Storybook build + a11y audit (axe-core)
9. Playwright E2E tests

PRs are blocked if any Tier 1 gate fails. Tier 2 runs when the `ready-for-merge`
label is applied. Agent PRs get this label automatically after Tier 1 passes.

## Deploy-Fix Protocol (Self-Healing Pipeline)

When assigned an issue labelled `deploy-fix-auto`:

1. **Read the issue body** — it contains structured deployment diagnostics:
   - Error category (`runtime`, `dependency`, `config`, `infra`)
   - Container logs, system logs, and smoke test results
   - Suggested fix approach based on error patterns
2. **Identify the root cause** from the logs and error classification
3. **Create a branch**: `copilot/deploy-fix/{issue-number}`
4. **Implement the fix** — focus only on the deployment failure, do not make unrelated changes
5. **Create a PR** with `Fixes #{issue-number}` in the description
6. **The self-healing pipeline handles the rest** — after merge, it will automatically rebuild and redeploy

**Important constraints:**
- `runtime` / `dependency` / `config` errors → fix autonomously
- `infra` errors → propose a fix but add the `needs-human-review` label (Constitution XV)
- Credential/secret errors → do NOT attempt to fix; add `needs-human-review` label instead
- Do NOT modify Bicep infrastructure files without human approval
- Do NOT add or remove environment variables in Bicep without human approval
- Keep fixes minimal and focused on the diagnosed error

