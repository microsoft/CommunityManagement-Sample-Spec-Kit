# Quickstart: Mock Authentication with Sample Users

**Spec**: 007 | **Date**: 2026-03-16

---

## What This Feature Does

Provides a **mock authentication system** for local development and testing that:
- Automatically signs you in as a sample user when running `npm run dev` (no Entra ID config needed)
- Lets you switch between 6 predefined users covering all permission levels
- Provides shared test helpers so all integration tests use the same sample users
- Is completely inert in production — zero mock code ships to production builds

## Quick Start (Developer)

### 1. Run the app locally

```bash
npm run dev
```

No `.env` configuration needed for auth. If `ENTRA_CLIENT_ID` / `ENTRA_TENANT_ID` are not set, mock auth activates automatically and signs you in as **Alice Global** (global admin).

### 2. Switch users

A floating panel appears in the bottom-right corner showing the current user. Click to switch between:

| User | Permission Level |
|------|-----------------|
| Alice Global | Global Admin — can do everything |
| Bob United Kingdom | Country Admin — manages UK events/venues |
| Charlie Bristol | City Admin — manages Bristol events/venues |
| Diana Creator | Event Creator — can create events in Bristol |
| Eve Member | Regular Member — can RSVP, post, follow |
| Anonymous | Visitor — no session, sees public content only |

### 3. Switch via URL

Append `?mockUser=<slug>` to any URL:

```
http://localhost:3000/events?mockUser=regular-member
http://localhost:3000/api/events?mockUser=bristol-city-admin
```

Useful for curl/Postman testing.

## Quick Start (Test Author)

### Using shared sample users in tests

```typescript
import { seedSampleUsers, SAMPLE_USERS } from "tests/helpers/users";
import { setMockUser } from "@/lib/auth/session";
import { createTestDb } from "tests/helpers/db";

let db: PGlite;

beforeEach(async () => {
  db = await createTestDb();
  setTestDb(db);
  await seedSampleUsers(db);          // Seeds all 5 users + grants + geography
  setMockUser(SAMPLE_USERS.globalAdmin.id);  // Set which user is "logged in"
});

it("should allow admin to create an event", async () => {
  // getServerSession() now returns { userId: SAMPLE_USERS.globalAdmin.id }
  // All permission checks work end-to-end
});

it("should deny member access to admin panel", async () => {
  setMockUser(SAMPLE_USERS.regularMember.id);
  // getServerSession() returns { userId: SAMPLE_USERS.regularMember.id }
  // checkPermission() resolves from seeded grants → denied
});
```

### Testing anonymous flows

```typescript
setMockUser(null);  // getServerSession() returns null
// requireAuth() returns 401, public routes work normally
```

## File Map

| File | Purpose |
|------|---------|
| `src/lib/auth/mock-users.ts` | Sample user definitions (IDs, slugs, grants) |
| `src/lib/auth/mock-seed.ts` | Idempotent seed function for users + grants + geography |
| `src/lib/auth/session.ts` | Modified to check mock auth state in dev mode |
| `src/lib/auth/mock-middleware.ts` | Query parameter `?mockUser=` handling |
| `src/components/dev/MockUserSwitcher.tsx` | Floating dev UI for user switching |
| `src/app/api/dev/mock-user/route.ts` | GET/POST API for user switching (dev only) |
| `tests/helpers/users.ts` | Shared test helper — re-exports + PGlite seed |
