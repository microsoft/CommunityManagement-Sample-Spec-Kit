# Bugfix Plan: Post-Build Error Remediation (Spec 008)

**Branch**: `008-cross-platform-ui` | **Date**: 2026-03-18
**Input**: Build warnings, Storybook warnings, and runtime errors observed after Phase 4 completion

## Summary

Fix five categories of issues discovered during build and runtime testing:

1. **Next.js 16 middleware deprecation** — Rename `middleware.ts` to `proxy.ts` per Next.js 16.1 convention
2. **Storybook workspace package resolution** — Configure Vite aliases so Storybook resolves `@acroyoga/*` workspace packages
3. **Profile page mock-auth incompatibility** — Profile page uses NextAuth `useSession()` which returns "unauthenticated" in mock-auth mode, blocking the profile form
4. **cookies() async breaking change** — `cookies()` from `next/headers` is async in Next.js 16; `getMockSession()` calls it synchronously, breaking cookie-based mock user switching
5. **Teachers page error handling** — No `.catch()` on the fetch chain; API errors leave the page stuck in loading state

## Fixes

### F1: Middleware → Proxy Migration

- Rename `apps/web/src/middleware.ts` → `apps/web/src/proxy.ts`
- Rename exported function `middleware` → `proxy`
- Keep `config` export unchanged
- Reference: https://nextjs.org/docs/messages/middleware-to-proxy

### F2: Storybook Workspace Package Resolution

- Add `viteFinal` to `apps/web/.storybook/main.ts`
- Configure `resolve.alias` for `@acroyoga/shared`, `@acroyoga/shared-ui`, `@acroyoga/tokens`
- Set `build.chunkSizeWarningLimit` to suppress the large-chunk warning (Storybook internal chunks)

### F3: Profile Page Mock-Auth Fix

- Remove `useSession()` from `next-auth/react` in `apps/web/src/app/profile/page.tsx`
- Determine auth status from the `/api/profiles/me` response (401 = unauthenticated, 200 = authenticated)
- Consistent with how events and teachers pages work (fetch-based, no client-side session check)

### F4: cookies() Async Fix

- Make `getMockSession()` async in `apps/web/src/lib/auth/session.ts`
- Dynamically import `cookies` from `next/headers` with `await`
- Preserves the same fallback chain: cookie → module state → default user

### F5: Teachers Page Error Handling

- Add `.catch()` to the fetch chain in `apps/web/src/app/teachers/page.tsx`
- Show error state consistent with EventsListPage pattern

## Verification

- `npm run build` — zero warnings (no middleware deprecation)
- `npx storybook build` — no "unable to find package.json" warnings
- `npm test` — 339/339 tests pass (no regressions)
- Profile page loads in mock-auth mode without sign-in prompt
- Events and Teachers pages show proper error states on API failure
