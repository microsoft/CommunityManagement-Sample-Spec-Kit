# Quickstart: Event Discovery & RSVP

**Spec**: 001 | **Date**: 2026-03-15

---

## Prerequisites

- Node.js 20+
- PostgreSQL (or PGlite for tests — handled automatically)
- Stripe test account with Connect enabled (from Spec 004 setup)
- Microsoft Entra External ID tenant configured (from Spec 004 setup)
- Spec 004 migrations applied (`004_permissions.sql`)

## Setup

```bash
# 1. Install dependencies (from repo root)
npm install

# 2. Ensure environment variables are set (extends .env.local from 004)
# Existing from 004:
#   DATABASE_URL, STRIPE_SECRET_KEY, STRIPE_CLIENT_ID, STRIPE_WEBHOOK_SECRET
#   NEXTAUTH_SECRET, ENTRA_CLIENT_ID, ENTRA_TENANT_ID
# New for 001:
#   NEXT_PUBLIC_BASE_URL=http://localhost:3000   (for OG meta tags, .ics URLs)

# 3. Run database migrations (001 depends on 004)
npm run db:migrate

# 4. Seed cities and countries (extends geography seed from 004)
npm run db:seed:cities

# 5. Start development server
npm run dev
```

## Running Tests

```bash
# All 001 integration tests (uses PGlite — no external DB needed)
npm run test -- tests/integration/events/
npm run test -- tests/integration/rsvp/
npm run test -- tests/integration/waitlist/
npm run test -- tests/integration/credits/
npm run test -- tests/integration/cities/
npm run test -- tests/integration/venues/

# Specific test file
npm run test -- tests/integration/rsvp/capacity-enforcement.test.ts

# E2E tests (requires running dev server)
npm run dev &
npm run test:e2e -- tests/e2e/browse-events.spec.ts
npm run test:e2e -- tests/e2e/rsvp-flow.spec.ts
```

## Key Concepts

### Event Lifecycle

```
Creator creates event (requires Event Creator permission from 004)
  → Event is published (visible to all visitors)
  → Members can RSVP (with role selection)
  → When full → waitlist available
  → Members can cancel RSVP (refund/credit rules apply)
  → Creator can cancel entire event (automatic refunds)
```

### RSVP Flow (Free Event)

```
1. User views event detail page
2. Clicks "RSVP" → selects role (Base/Flyer/Hybrid)
3. If event has prerequisites → tick confirmation checkbox
4. Server: check permission (authenticated member) → check capacity (SELECT FOR UPDATE) → INSERT RSVP
5. Confirmation shown with "Add to calendar" + "Cancel RSVP" options
```

### RSVP Flow (Paid Event)

```
1–3. Same as free event
4. Server: check capacity → create Stripe charge via Connect (direct charge to creator)
   - Auto-apply available credits from this creator (FIFO)
   - Charge remainder (or zero if fully covered by credits)
5. INSERT RSVP with stripe_charge_id
6. Confirmation shown
```

### Cancellation Flows

| Scenario | Action |
|----------|--------|
| Free event, user cancels | RSVP cancelled, spot opened, waitlist promoted |
| Paid event, within refund window | User chooses credit (default) or Stripe refund |
| Paid event, after refund window | No refund/credit; cancellation confirmed |
| Creator cancels entire event | All paid RSVPs get automatic Stripe refund (not credit) |

### Geolocation City Snap

```
1. Browser requests geolocation permission
2. On consent → send (lat, lon) to GET /api/cities/nearest?lat=X&lon=Y
3. Server: Haversine distance to all cities with active events
4. If nearest is within 100km → filter events to that city
5. If none within 100km → show all events with city picker prompt
6. On denial → show all events globally with prominent city picker
```

### Permission Integration (from Spec 004)

Event creation and venue creation use Spec 004's middleware:

```typescript
import { withPermission } from '@/lib/permissions/middleware';

// Create event — requires Event Creator role scoped to the event's city
export const POST = withPermission('createEvent', async (req) => {
  const body = await req.json();
  const venue = await getVenue(body.venueId);
  return { scopeType: 'city', scopeValue: venue.citySlug };
})(async (req, ctx) => {
  // Handler runs only if permission check passed
});

// RSVP — requires authenticated Member (any authenticated user)
export const POST = withPermission('rsvp', () => ({
  scopeType: 'global',
  scopeValue: null,
}))(async (req, ctx) => {
  // Handler runs only if user is authenticated
});
```

### Credit System

```typescript
// At checkout, auto-apply credits:
const credits = await getAvailableCredits(userId, creatorId, currency);
let remaining = eventCost;

for (const credit of credits) {
  if (remaining <= 0) break;
  const apply = Math.min(credit.remainingBalance, remaining);
  await consumeCredit(credit.id, apply);
  remaining -= apply;
}

if (remaining > 0) {
  // Charge remainder via Stripe Connect
  await createStripeCharge(remaining, currency, creatorStripeAccountId);
}
```

### Testing Capacity Enforcement

```typescript
import { createTestDb } from '@/tests/helpers/db';
import { createEvent, rsvpToEvent } from '@/tests/helpers/events';

test('concurrent RSVPs cannot exceed capacity', async () => {
  const db = await createTestDb();
  const event = await createEvent(db, { capacity: 1 });
  const [user1, user2] = await createTestUsers(db, 2);

  // Race two RSVPs
  const [result1, result2] = await Promise.all([
    rsvpToEvent(db, event.id, user1.id, 'base'),
    rsvpToEvent(db, event.id, user2.id, 'flyer'),
  ]);

  // Exactly one succeeds, one gets waitlisted
  const confirmed = [result1, result2].filter(r => r.status === 'confirmed');
  const waitlisted = [result1, result2].filter(r => r.waitlisted);
  expect(confirmed).toHaveLength(1);
  expect(waitlisted).toHaveLength(1);
});
```

## API Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/events` | Public | List/filter events |
| POST | `/api/events` | Creator | Create event |
| GET | `/api/events/:id` | Public | Event detail |
| PATCH | `/api/events/:id` | Owner/Admin | Edit event |
| DELETE | `/api/events/:id` | Owner/Admin | Cancel event (triggers refunds) |
| POST | `/api/events/:id/rsvp` | Member | RSVP to event |
| DELETE | `/api/events/:id/rsvp` | Member | Cancel RSVP |
| POST | `/api/events/:id/waitlist` | Member | Join waitlist |
| DELETE | `/api/events/:id/waitlist` | Member | Leave waitlist |
| POST | `/api/events/:id/interest` | Member | Toggle interest |
| GET | `/api/events/:id/ics` | Public | Download .ics file |
| GET | `/api/venues` | Public | List venues |
| POST | `/api/venues` | Creator | Create venue |
| GET | `/api/venues/:id` | Public | Venue detail |
| PATCH | `/api/venues/:id` | Owner/Admin | Edit venue |
| GET | `/api/cities` | Public | List platform cities |
| GET | `/api/cities/nearest` | Public | Geolocation snap |
| GET | `/api/credits` | Member | Credit balance for a creator |

## Reused from Spec 004

The following are **not duplicated** — they are imported from Spec 004:

| Module | Purpose |
|--------|---------|
| `src/lib/permissions/middleware.ts` | `withPermission()` HOF for route handlers |
| `src/lib/permissions/service.ts` | `checkPermission()` for programmatic checks |
| `src/lib/permissions/types.ts` | Role, ScopeType, PermissionAction types |
| `src/lib/payments/stripe-connect.ts` | Stripe charge creation for paid events |
| Auth session (next-auth) | Session management, `userId` extraction |
