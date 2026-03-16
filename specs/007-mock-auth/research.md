# Research: Mock Authentication with Sample Users

**Spec**: 007 | **Date**: 2026-03-16

---

## R-1: Mock Auth Interception Strategy

**Decision**: Override `getServerSession()` at the module level using a conditional import. When `NODE_ENV=development` and no Entra ID credentials are configured, `src/lib/auth/session.ts` checks a module-level variable `_mockUserId` before calling the real `auth()`. This avoids patching NextAuth internals.

**Rationale**: The spec requires mock sessions to flow through the existing `getServerSession()` function (FR-008, QG-11). Three approaches were evaluated:

1. **Wrap `getServerSession()`** (chosen): Add a guard at the top of `getServerSession()` that checks `isMockAuthEnabled()` and returns a `{ userId }` from a module-scoped state variable. Zero changes to `requireAuth()` or `withPermission()` — they call `getServerSession()` and get a valid session object.

2. **NextAuth `CredentialsProvider`**: Register a fake credentials provider in NextAuth config when in dev mode. This would produce real JWT sessions via NextAuth's session flow, but requires a login form interaction and makes user-switching slow (need to sign out / sign in). Also adds auth config branching.

3. **Custom middleware header injection**: Set `x-mock-user-id` in middleware and read it server-side. **Rejected** — explicitly prohibited by Constitution QG-11: "client-injectable headers MUST NOT be used as the authentication mechanism."

**Implementation sketch**:
```typescript
// src/lib/auth/session.ts
let _mockUserId: string | null = null;

export function setMockUser(userId: string | null): void {
  if (process.env.NODE_ENV !== 'development') return;
  _mockUserId = userId;
}

export async function getServerSession(): Promise<Session | null> {
  if (process.env.NODE_ENV === 'development' && isMockAuthEnabled()) {
    if (_mockUserId === null) return null; // Anonymous mode
    return { userId: _mockUserId };
  }
  // Real auth path — unchanged
  const session = await auth();
  if (!session?.user?.id) return null;
  return { userId: session.user.id };
}
```

**PGlite compatibility**: Module-level state works in both the dev server and Vitest (same process). For tests, `setMockUser()` is called in `beforeEach`; for dev server, a cookie or API endpoint sets the state per-request.

---

## R-2: Per-Request vs Per-Process Mock User State

**Decision**: Use a **cookie** (`mock-user-id`) to persist the active mock user selection across requests in the dev server. The `getServerSession()` function reads this cookie (via `cookies()` from `next/headers`) when mock auth is enabled. For tests, use the existing `setMockUser()` module-level function since tests run in a single process.

**Rationale**: Next.js API routes and server components run per-request. A module-level variable would be shared across all concurrent requests. Using a cookie:
- Persists across page navigations without extra state management
- Is set by the user-switcher UI or query parameter middleware
- Is scoped to the browser session (not sent cross-origin)
- Can be cleared for Anonymous mode

**Alternatives considered**:
- **Module-level variable only**: Works for single-user dev, but breaks if two browser tabs want different users. Acceptable trade-off for dev tooling, but cookie is cleaner.
- **AsyncLocalStorage**: Would give per-request isolation in Node.js. Overkill — dev tooling doesn't need request-level isolation since only one developer uses the dev server at a time.
- **Database session table**: Full session persistence. Way too complex for a dev-mode convenience feature.

---

## R-3: Dev User Switcher UI Architecture

**Decision**: A **fixed-position floating panel** rendered by `src/components/dev/MockUserSwitcher.tsx`, included in the root layout only when `NODE_ENV === 'development'`. The component is a Client Component that calls `POST /api/dev/mock-user` to set the cookie.

**Rationale**: 
- Fixed position (bottom-right) keeps it visible on all pages without interfering with layout
- Separate Client Component allows tree-shaking in production builds (never imported)
- API route sets the cookie server-side (HttpOnly not needed — it's dev-only)
- Shows current user name, role badge, and a dropdown of all sample users

**Production safety**: The component is conditionally imported in `layout.tsx`:
```typescript
{process.env.NODE_ENV === 'development' && <MockUserSwitcher />}
```
Next.js dead-code eliminates the import in production builds. The `POST /api/dev/mock-user` route also checks `NODE_ENV` and returns 404 in production.

---

## R-4: Query Parameter User Switching

**Decision**: Next.js middleware (`src/middleware.ts` or `src/lib/auth/mock-middleware.ts`) checks for `?mockUser=<slug>` on incoming requests in development mode. If present, it sets the `mock-user-id` cookie before the request reaches the route handler, then redirects to strip the query parameter.

**Rationale**: This supports curl/Postman testing (US-6) and shareable reproduction URLs. The cookie-set-and-redirect pattern means the mock user persists for subsequent requests without the query parameter.

**Alternatives considered**:
- **Read query param directly in `getServerSession()`**: Server components and API routes don't have easy access to query params without the request object. Middleware is the clean interception point.
- **No redirect, just read per-request**: Simpler, but the query param would need to be on every request. Cookie persistence is more ergonomic.

---

## R-5: Sample User ID Stability

**Decision**: Use **deterministic UUIDs** for sample users — hardcoded UUID constants in the sample user definitions. This ensures the same user IDs across fresh databases, test runs, and developer machines.

**Rationale**: If we used `gen_random_uuid()` for sample users, the IDs would differ between seed runs, making it impossible to hardcode the default mock user ID or reference specific users in tests. Stable IDs also make debug logs and database inspection consistent.

**UUID scheme**: Use UUID v4 format with a recognizable pattern:
```
00000000-0000-4000-a000-000000000001  (Global Admin)
00000000-0000-4000-a000-000000000002  (UK Country Admin)
...
```

---

## R-6: Test Helper Consolidation Strategy

**Decision**: Create `tests/helpers/users.ts` with:
1. `SAMPLE_USERS` — the shared sample user definitions (re-exported from `src/lib/auth/mock-users.ts`)
2. `seedSampleUsers(db: PGlite)` — inserts all users, geography, and permission grants
3. `seedSampleUser(db: PGlite, slug: string)` — inserts a single user and their grants

Existing test files will be migrated incrementally — each file's ad-hoc `createUser()` is replaced with `seedSampleUsers()` or direct `SAMPLE_USERS` references.

**Rationale**: The spec calls out 6+ test files with duplicated `createUser()` functions (SC-004). A shared module eliminates this duplication. Placing definitions in `src/lib/auth/mock-users.ts` (not just in `tests/`) allows the dev seed script and the test helpers to share the same user data.

**Alternatives considered**:
- **Definitions only in `tests/`**: Would require the dev seed to duplicate or import from tests. Keeping definitions in `src/lib/auth/` makes them available to both consumers.
- **Factory pattern (faker-based)**: Random user generation. Doesn't help with dev UX (no stable users to switch between) and adds a dependency.
