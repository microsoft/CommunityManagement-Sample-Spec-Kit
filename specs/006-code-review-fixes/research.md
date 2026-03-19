# Research: Code Review Remediation

**Spec**: 006 | **Date**: 2026-03-16

---

## R-1: Auth Migration Pattern — Replacing Header-Based Auth

**Decision**: Replace all `request.headers.get('x-user-id')` calls across 32+ routes with `getServerSession()` from `@/lib/auth/session`. Routes that need the session to exist use the `requireAuth()` wrapper from `@/lib/auth/middleware`, which returns 401 if no session is present.

**Rationale**: The codebase already has two auth patterns coexisting. Specs 002 and 004 introduced `getServerSession()` and `requireAuth()` — these are battle-tested with existing integration tests. The header-based pattern is a leftover from early development and is a security vulnerability (spoofable). Migration is mechanical: replace the header read with a session read and update the user ID reference.

**Migration pattern**:
```typescript
// BEFORE (vulnerable)
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // ... use userId
}

// AFTER (secure)
export const POST = requireAuth(async (request, { user }) => {
  const userId = user.id;
  // ... use userId
});
```

**Alternatives considered**:
- **Custom middleware that reads from both header and session**: Rejected. This perpetuates the insecure pattern. The header must be fully removed, not treated as a fallback.
- **Gradual migration with feature flag**: Rejected. This is a security fix, not a feature rollout. All routes must be fixed in a single branch to close the vulnerability.

**Test impact**: Existing tests that set `x-user-id` headers must be updated to use session-based auth in test helpers. The `tests/helpers/` directory likely has a helper for creating authenticated requests that needs to be session-aware.

---

## R-2: Ownership Verification Pattern for Teacher Profiles

**Decision**: Add an ownership check in the teacher profile PATCH and DELETE handlers that queries `teacher_profiles.user_id` and compares it to the authenticated session user. Return 403 if they differ and the caller is not an admin.

**Rationale**: Constitution Principle XI mandates "Every mutation route MUST verify that the authenticated caller is the resource owner OR holds an admin scope grant." The pattern is already used in Spec 001 (event ownership) and Spec 003 (booking ownership). Teacher profiles follow the same pattern: load the resource, check `resource.user_id === session.user.id`, allow admin override via `withPermission()`.

**Implementation approach**:
```typescript
// In teacher profile PATCH/DELETE handlers
const profile = await getTeacherProfile(profileId);
if (!profile) return notFoundError('Teacher profile');
if (profile.user_id !== user.id) {
  const isAdmin = await hasPermission(user.id, 'admin', profile.city_id);
  if (!isAdmin) return forbiddenError('Not the profile owner');
}
```

**Alternatives considered**:
- **Middleware-based ownership**: Would require passing the resource type and ID to generic middleware. Over-engineers a simple inline check. The explicit pattern is clearer and already established in prior specs.

---

## R-3: Admin Permission Checks for Privileged Endpoints

**Decision**: Wrap the 4 admin-only endpoints with `withPermission('admin')` from `@/lib/permissions/middleware`. The endpoints are: certification verification (PATCH), review moderation (PATCH), pending teacher applications (GET), and expiring certifications dashboard (GET).

**Rationale**: Constitution Principle IX and Quality Gate #10 require that "Admin-only endpoints MUST use `withPermission()` middleware." The middleware already exists from Spec 004 and handles scope resolution. It returns 403 with a standard error shape for non-admin callers.

**Affected endpoints**:
1. `PATCH /api/teachers/[id]/certifications/[certId]/verify` — admin verifies a certification
2. `PATCH /api/reviews/[id]/moderate` — admin moderates a review
3. `GET /api/teachers/requests/pending` — admin views pending teacher applications
4. `GET /api/teachers/certifications/expiring` — admin views expiring certifications dashboard

**Alternatives considered**:
- **Inline role check in each handler**: Violates DRY and bypasses the standard middleware pattern. The `withPermission()` wrapper is the established pattern.

---

## R-4: GDPR Deletion Extension for Spec 005 Tables

**Decision**: Extend the existing GDPR account deletion function to include 7 additional tables from Spec 005, deleted in reverse-FK order: `review_reminders` → `reviews` → `event_teachers` → `teacher_photos` → `certifications` → `teacher_requests` → `teacher_profiles`.

**Rationale**: Constitution Principle III and Quality Gate #12 mandate that "Every new spec that introduces PII-bearing tables MUST update the GDPR account-deletion function." The deletion function currently covers Specs 001–004. Spec 005 tables have foreign key dependencies that require ordered deletion (e.g., `reviews` references `teacher_profiles`, so reviews must be deleted first).

**Deletion order** (new steps, appended before the existing user deletion step):
```
1. DELETE FROM review_reminders WHERE user_id = $userId
2. DELETE FROM reviews WHERE reviewer_id = $userId
3. DELETE FROM reviews WHERE teacher_profile_id IN (SELECT id FROM teacher_profiles WHERE user_id = $userId)
4. DELETE FROM event_teachers WHERE teacher_profile_id IN (SELECT id FROM teacher_profiles WHERE user_id = $userId)
5. DELETE FROM teacher_photos WHERE teacher_profile_id IN (SELECT id FROM teacher_profiles WHERE user_id = $userId)
6. DELETE FROM certifications WHERE teacher_profile_id IN (SELECT id FROM teacher_profiles WHERE user_id = $userId)
7. DELETE FROM teacher_requests WHERE user_id = $userId
8. DELETE FROM teacher_profiles WHERE user_id = $userId
```

**Alternatives considered**:
- **CASCADE deletes on foreign keys**: Risky — cascading could accidentally delete data we want to preserve (e.g., reviews about a teacher written by another user should be handled explicitly, not cascaded from the teacher profile). Explicit deletion steps give precise control.
- **Soft-delete only**: Violates GDPR hard-delete requirement. The spec mandates hard-delete of PII.

---

## R-5: N+1 Query Fix for Message Thread Loading

**Decision**: Replace per-message `isBlocked()` and `getReactions()` calls with batch queries that load all block statuses and reaction summaries for the thread in two upfront queries, then decorate messages in-memory.

**Rationale**: Constitution Principle VI prohibits N+1 patterns: "List endpoints MUST NOT execute per-item queries." Loading 50 messages currently issues 100+ queries (1 block check + 1 reaction query per message). Batch loading reduces this to a constant number of queries regardless of message count.

**Batch pattern**:
```typescript
// Load all messages for thread
const messages = await getThreadMessages(threadId, page);

// Batch: get all blocked user IDs for the current user
const blockedSet = new Set(
  await db().query(
    `SELECT blocked_user_id FROM blocked_users WHERE blocker_user_id = $1`,
    [currentUserId]
  ).then(r => r.rows.map(row => row.blocked_user_id))
);

// Batch: get reaction summaries for all message IDs
const messageIds = messages.map(m => m.id);
const reactionMap = await db().query(
  `SELECT message_id, emoji, COUNT(*) as count
   FROM message_reactions
   WHERE message_id = ANY($1)
   GROUP BY message_id, emoji`,
  [messageIds]
).then(r => /* build Map<messageId, ReactionSummary[]> */);

// Decorate in-memory
const decorated = messages.map(m => ({
  ...m,
  isBlockedSender: blockedSet.has(m.sender_id),
  reactions: reactionMap.get(m.id) || [],
}));
```

**Alternatives considered**:
- **Single JOIN query**: A massive JOIN would denormalise reactions across message rows. More complex SQL, harder to maintain, and the in-memory decoration approach is simpler and well-understood.
- **DataLoader pattern**: Overkill for a REST API with a known batch boundary. DataLoader shines in GraphQL resolvers where batch boundaries are implicit.

---

## R-6: N+1 Query Fix for Follower/Following Lists

**Decision**: Replace per-entry `getRelationshipStatus()` calls with a batch query that loads all relationship statuses for the page of users in a single `WHERE IN` query.

**Rationale**: Same as R-5. Loading 50 followers currently issues 50 relationship queries. A single `WHERE IN` query resolves all relationships at once.

**Batch pattern**:
```typescript
// Load follower page
const followers = await getFollowers(userId, page);
const followerIds = followers.map(f => f.follower_id);

// Batch: check which followers the current user follows back
const followBackSet = new Set(
  await db().query(
    `SELECT followee_id FROM follows
     WHERE follower_id = $1 AND followee_id = ANY($2)`,
    [currentUserId, followerIds]
  ).then(r => r.rows.map(row => row.followee_id))
);

// Decorate
const decorated = followers.map(f => ({
  ...f,
  isFollowedBack: followBackSet.has(f.follower_id),
}));
```

---

## R-7: Teacher Search Table Reference Fix

**Decision**: Fix the city filter in the teacher search query to reference `user_profiles` (or `teacher_profiles`) instead of the wrong table alias. This is a one-line bug fix.

**Rationale**: The teacher search by city query references a wrong table name, causing a runtime SQL error. The fix is to correct the table reference to the actual table that holds the city relationship.

---

## R-8: ILIKE Wildcard Escaping

**Decision**: Create a shared `escapeIlike(input: string): string` utility that escapes `%`, `_`, and `\` characters in user-supplied search input before interpolation into ILIKE clauses.

**Rationale**: Without escaping, a user searching for literal `%` or `_` characters gets unexpected results (wildcard expansion). The utility is simple:

```typescript
function escapeIlike(input: string): string {
  return input
    .replace(/\\/g, '\\\\')  // escape backslash first
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

// Usage: WHERE name ILIKE '%' || $1 || '%' with $1 = escapeIlike(userInput)
```

**Alternatives considered**:
- **Full-text search (tsvector)**: Overkill for a simple name/title search with wildcard matching. ILIKE with proper escaping is the established pattern.

---

## R-9: Zod Validation for Teacher Photos

**Decision**: Replace manual `typeof` checks in the teacher photos POST handler with a Zod schema. Follows the same pattern used across all other routes in the codebase.

**Rationale**: Constitution Principle IV mandates "All request-body validation MUST use Zod schemas at the API boundary." A Zod schema for photos would validate URL format, alt text length, and display order.

```typescript
const teacherPhotoSchema = z.object({
  url: z.string().url(),
  alt_text: z.string().max(200).optional(),
  display_order: z.number().int().min(0).optional(),
});
```

---

## R-10: Stripe API Version Constant

**Decision**: Define `STRIPE_API_VERSION` as a single constant in a shared config file (e.g., `@/lib/payments/constants.ts`) and update all references to use it.

**Rationale**: Constitution Principle VII (Simplicity) and general DRY — a magic string repeated across files is error-prone. A single constant ensures consistent Stripe API version across the codebase.

```typescript
// @/lib/payments/constants.ts
export const STRIPE_API_VERSION = '2024-04-10' as const;
```
