# Quickstart: Permissions & Creator Accounts

**Spec**: 004 | **Date**: 2026-03-15

---

## Prerequisites

- Node.js 20+
- PostgreSQL (or PGlite for tests — handled automatically)
- Stripe test account (for payment integration)
- Microsoft Entra External ID tenant configured (for auth)

## Setup

```bash
# 1. Install dependencies (from repo root)
npm install

# 2. Set environment variables
cp .env.example .env.local
# Fill in:
#   DATABASE_URL=postgresql://...
#   STRIPE_SECRET_KEY=sk_test_...
#   STRIPE_CLIENT_ID=ca_...           (for Connect OAuth)
#   STRIPE_WEBHOOK_SECRET=whsec_...
#   NEXTAUTH_SECRET=...
#   ENTRA_CLIENT_ID=...
#   ENTRA_TENANT_ID=...

# 3. Run database migrations
npm run db:migrate

# 4. Seed geography data (cities/countries/continents)
npm run db:seed:geography

# 5. Create initial Global Admin (first-time setup)
npm run db:seed:admin -- --email admin@example.com
```

## Running Tests

```bash
# Integration tests (uses PGlite — no external DB needed)
npm run test -- tests/integration/permissions/

# Specific test file
npm run test -- tests/integration/permissions/scope-hierarchy.test.ts

# E2E tests (requires running dev server)
npm run dev &
npm run test:e2e -- tests/e2e/creator-request.spec.ts
```

## Key Concepts

### Roles & Capabilities

| Role | Scope | Can Create Events | Can Edit Others' Events | Can Manage Grants |
|------|-------|:-:|:-:|:-:|
| Global Admin | Everywhere | ✅ | ✅ | ✅ |
| Country Admin | Within country | ✅ | ✅ | ✅ (≤ country) |
| City Admin | Within city | ✅ | ✅ | ✅ (city only) |
| Event Creator | Within scope | ✅ | Own only | ❌ |
| Member | N/A | ❌ | ❌ | ❌ |
| Visitor | N/A | ❌ | ❌ | ❌ |

### Permission Check Flow

```
Request arrives
  → Middleware extracts userId from session
  → Load user's grants (from cache or DB)
  → For each grant, check:
      1. Does grant.role have the capability for this action?
      2. Does grant.scope encompass the target scope?
  → If ANY grant passes both checks → ALLOW
  → If NO grant passes → DENY (403) + audit log entry
```

### Scope Hierarchy

```
global → continent → country → city
```

A Country Admin for "uk" implicitly covers all UK cities. A grant at a higher level encompasses all lower levels within that geography.

### Adding Permission Checks to New Endpoints

Wrap your route handler with `withPermission`:

```typescript
import { withPermission } from '@/lib/permissions/middleware';

export const POST = withPermission('createEvent', (req) => ({
  scopeType: 'city',
  scopeValue: req.body.cityId,
}))(async (req, ctx) => {
  // This code only runs if the caller has permission
  // ctx.grant contains the matched grant
});
```

### Testing Permissions

```typescript
import { createTestDb } from '@/tests/helpers/db';
import { grantPermission, checkPermission } from '@/lib/permissions/service';

test('city admin can manage events in their city', async () => {
  const db = await createTestDb();
  const admin = await createTestUser(db);

  await grantPermission(db, {
    userId: admin.id,
    role: 'city_admin',
    scopeType: 'city',
    scopeValue: 'bristol',
    grantedBy: globalAdmin.id,
  });

  const result = await checkPermission(db, admin.id, 'editEvent', {
    scopeType: 'city',
    scopeValue: 'bristol',
  });

  expect(result.allowed).toBe(true);
});
```

## API Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/permissions/grants` | Admin | Create a permission grant |
| GET | `/api/permissions/grants` | Admin | List grants (filtered) |
| DELETE | `/api/permissions/grants` | Admin | Revoke a grant |
| POST | `/api/permissions/check` | Any auth | Check if action is allowed |
| POST | `/api/permissions/requests` | Member | Submit Event Creator request |
| GET | `/api/permissions/requests` | Admin/Member | List requests |
| PATCH | `/api/permissions/requests/:id` | Admin | Approve/reject request |
| POST | `/api/payments/connect` | Creator | Start Stripe Connect OAuth |
| GET | `/api/payments/callback` | System | Stripe OAuth callback |
| GET | `/api/payments/status` | Creator | Check payment account status |
