# Quickstart: Community & Social Features

**Spec**: 002 | **Date**: 2026-03-15

---

## Prerequisites

- Node.js 20+
- PostgreSQL (or PGlite for tests — handled automatically)
- Spec 004 migrations applied (`004_permissions.sql`) — provides `users`, `permission_grants`, `geography`
- Spec 001 migrations applied (`001_events.sql`) — provides `cities`, `events`, `rsvps`
- Microsoft Entra External ID tenant configured (from Spec 004 setup)

## Setup

```bash
# 1. Install dependencies (from repo root)
npm install

# 2. Ensure environment variables are set (extends .env.local from 004)
# Existing from 004: DATABASE_URL, NEXTAUTH_SECRET, ENTRA_CLIENT_ID, ENTRA_TENANT_ID
# Existing from 001: NEXT_PUBLIC_BASE_URL
# New for 002:
#   EXPORT_STORAGE_URL=...          (Azure Blob Storage connection for GDPR exports)
#   EXPORT_LINK_EXPIRY_DAYS=7       (default: 7)

# 3. Run database migrations (002 depends on 004 + 001)
npm run db:migrate

# 4. Start development server
npm run dev
```

## Running Tests

```bash
# All 002 integration tests (uses PGlite — no external DB needed)
npm run test -- tests/integration/profiles/
npm run test -- tests/integration/follows/
npm run test -- tests/integration/threads/
npm run test -- tests/integration/safety/
npm run test -- tests/integration/gdpr/

# Specific test file
npm run test -- tests/integration/safety/block-enforcement.test.ts

# E2E tests (requires running dev server)
npm run dev &
npm run test:e2e -- tests/e2e/profile-setup.spec.ts
npm run test:e2e -- tests/e2e/privacy-controls.spec.ts
npm run test:e2e -- tests/e2e/data-export.spec.ts
```

## Key Concepts

### Profile Setup Flow

```
User logs in (first time)
  → Profile page prompts: display name, home city, default role
  → Browser geolocation fires → calls /api/cities/nearest (reuses 001)
  → If city matched within 100km → pre-fill homeCityId
  → If not matched → show city picker from /api/cities
  → User adds social links with per-platform visibility
  → Profile saved via PUT /api/profiles/me
```

### Social Link Visibility

| Visibility | Who can see |
|-----------|-------------|
| `everyone` | Any visitor or member |
| `followers` | Users who follow the profile owner (+ friends + self) |
| `friends` | Mutual follows only (+ self) |
| `hidden` | Only the profile owner |

Visibility is enforced at query time in the API — hidden links never appear in API responses for non-authorised viewers (Principle III).

### Follow & Friend Model

```
A follows B (unidirectional)
  → A is: following B
  → B is: followed by A

B follows A back (both directions exist)
  → A and B are now "friends" (mutual)
  → Both see each other's friends-only social links
```

No explicit "friend request" — following is instant, friendship is derived.

### Discussion Thread Access

| User state | Read | Write |
|-----------|:----:|:-----:|
| Active RSVP to event | ✅ | ✅ |
| Cancelled RSVP | ✅ | ❌ |
| No RSVP | ✅ | ❌ |
| Blocked (either direction) | ❌ (messages hidden) | ❌ |
| Muted by viewer | ❌ (messages hidden from muter only) | ✅ (can post normally) |
| Thread locked | ✅ | ❌ (admins only) |

### Block vs Mute

| Action | Severs follow? | Hides profile? | Hides messages? | Silent? |
|--------|:-:|:-:|:-:|:-:|
| **Block** | ✅ Both directions | ✅ Mutual | ✅ Mutual | ✅ |
| **Mute** | ❌ | ❌ | ✅ One-way (muter only) | ✅ |

### Account Deletion Sequence

```
User confirms deletion
  → Transaction begins
  → Anonymise messages: content → "[deleted]", author → sentinel
  → Remove reactions on & by user
  → Sever follows, blocks, mutes
  → Delete social links
  → Anonymise RSVPs (preserve counts)
  → Nullify PII on user profile
  → Invalidate session
  → Transaction committed
```

### GDPR Export Contents

The export JSON includes: profile, social links, RSVPs, event interests, credits, authored messages, follows, blocks, and mutes. It **excludes** messages written by other users.

## Adding Permission Checks to 002 Endpoints

Mutation endpoints reuse Spec 004's `withPermission()` middleware:

```typescript
// Member-required mutations (follow, post message, report)
export const POST = withAuth(async (req, ctx) => {
  // All authenticated users are implicit Members (from 004)
  // No explicit permission grant needed — auth session is sufficient
});

// Admin moderation (delete others' messages, lock thread, review reports)
export const DELETE = withPermission('moderateThread', (req) => ({
  scopeType: 'city',
  scopeValue: eventCitySlug, // resolved from thread → event → venue → city
}))(async (req, ctx) => {
  // Only scoped admins reach here
});
```
