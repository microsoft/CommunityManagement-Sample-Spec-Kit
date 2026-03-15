# Research: Permissions & Creator Accounts

**Spec**: 004 | **Date**: 2026-03-15

---

## R-1: Permission Caching Strategy

**Decision**: In-memory session cache (Map per user session) with lazy load on first check, invalidated on grant/revoke mutation.

**Rationale**: The spec requires < 50ms p95 for permission checks. A DB round-trip per check would add ~5–15ms per query, compounding with multiple grants. Caching all grants for a user at session start (or first permission check) into a simple in-memory Map gives O(1) lookups. Grants rarely change mid-session.

**Alternatives considered**:
- **Redis cache**: Adds infrastructure complexity. PGlite tests can't easily include Redis. Unnecessary at current scale (hundreds of creators, not millions). Redis would be justified if we needed cross-instance cache sharing, but Next.js API routes on a single instance share memory within the process.
- **Database query per check with index**: Viable for correctness but risks p95 spikes under load. Would require composite index on `(user_id, role, scope_type)`.
- **JWT claims**: Embedding grants in JWT avoids DB lookups entirely but makes revocation slow (must wait for token expiry or maintain a blocklist). Incompatible with real-time grant/revoke.

**Cache invalidation approach**: When a grant is created or revoked, the affected user's session cache is cleared. Their next permission check triggers a fresh DB load. For multi-instance deployments, a future upgrade could use Redis pub/sub, but this is not needed at launch.

---

## R-2: Scope Hierarchy Resolution

**Decision**: Static hierarchy map `{ city → country → continent → global }` with iterative parent walk. A city grant checks city, then country, then continent, then global.

**Rationale**: The geographic hierarchy is fixed and well-known. No dynamic hierarchy configuration needed. The resolution algorithm is: given a target scope `(type, value)`, collect all user grants, and for each grant check if its scope encompasses the target using the hierarchy:

```
global > continent > country > city
```

A Country Admin for "UK" covers all cities in the UK because `country("UK")` is an ancestor of `city("Bristol")`. This requires a geography lookup table mapping cities → countries → continents.

**Alternatives considered**:
- **Closure table / nested sets**: Overkill for a 4-level fixed hierarchy. These patterns shine when the hierarchy is dynamic and deep (org charts, file systems). Our hierarchy is static.
- **Materialised scope paths** (e.g., `global/europe/uk/bristol`): Attractive for prefix matching but adds denormalization. The 4-level lookup table is simpler and the spec says simplicity (Principle VII).
- **Recursive CTE**: Elegant but slower than a simple in-memory walk for 4 levels. Also harder to test with PGlite.

**Geography data**: A seeded `geography` table with columns `(city, country, continent)` provides the lookup. Seeded from a static dataset. Event creation validates the city exists in this table.

---

## R-3: Multiple Grants — Most Permissive Wins

**Decision**: Collect all grants for user, evaluate each against the requested action+scope, return `allowed` if any grant satisfies the check.

**Rationale**: The spec states "When a user holds multiple grants, the server MUST evaluate all and apply the most permissive for the requested action" (FR, Edge Cases). This means:

- User has City Admin for Bristol + Event Creator for Bath
- Action: create event in Bristol → City Admin grant covers it ✅
- Action: create event in Bath → Event Creator grant covers it ✅
- Action: create event in London → neither covers it ❌

The algorithm is:
1. Load all grants for user (from cache)
2. For each grant, check if `grant.role` has the `action` capability AND `grant.scope` encompasses `target.scope`
3. Return true if any grant passes

**Role capability matrix**:

| Role | Create Event/Venue | Edit Own Event | Edit Others' Events | Manage Grants | Approve Requests |
|------|--------------------|----------------|---------------------|---------------|------------------|
| Global Admin | ✅ (all) | ✅ | ✅ (all) | ✅ (all) | ✅ (all) |
| Country Admin | ✅ (country) | ✅ | ✅ (country) | ✅ (≤ country) | ✅ (≤ country) |
| City Admin | ✅ (city) | ✅ | ✅ (city) | ✅ (city only) | ✅ (city only) |
| Event Creator | ✅ (scope) | ✅ | ❌ | ❌ | ❌ |
| Member | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## R-4: Authentication Integration — Microsoft Entra External ID

**Decision**: Use `next-auth` (v5 / Auth.js) with Microsoft Entra External ID as the identity provider. Social providers (Google, Facebook, Apple) configured through Entra's external identity federation. The auth session carries `userId` but NOT permission grants (those are loaded separately from the permission cache).

**Rationale**: Entra External ID handles user registration, social login federation, and MFA. The app only needs the authenticated `userId` to look up permission grants. Keeping grants out of the auth token avoids stale-permission issues on grant/revoke.

**Alternatives considered**:
- **Entra app roles / groups**: Entra supports app role assignment, but geographic scoping (city/country) is not natively supported. We'd need custom claims, adding coupling to Entra's configuration for every new city. Keeping roles in our DB is simpler and more flexible.
- **Custom JWT claims for grants**: Same staleness problem as above. Revocation requires token invalidation.

---

## R-5: Stripe Connect Standard Integration

**Decision**: Stripe Connect Standard with OAuth flow. Platform creates a direct charge with an optional application fee on each booking. Creator owns their Stripe account entirely.

**Rationale**: Constitutional Principle XII mandates the platform MUST NOT hold creator funds. Stripe Connect Standard satisfies this:
- Creator creates/owns their Stripe account via Stripe-hosted onboarding
- Platform creates charges on behalf of the creator (direct charge model)
- Funds go directly to the creator's Stripe account
- Platform can optionally take an application fee per charge
- Creator manages disputes, refunds, and tax reporting through their own Stripe dashboard

**Alternatives considered**:
- **Stripe Connect Express**: Platform has more control over the connected account. But this means the platform manages some aspects of the account, which conflicts with Principle XII (platform must not hold funds or act as intermediate).
- **Stripe Connect Custom**: Full control — directly conflicts with the creator owning their financial relationship.
- **Direct Stripe links (no Connect)**: Creator manages everything outside the platform. Poor UX — attendees leave the platform to pay. No way to associate payments with bookings.

**Implementation notes**:
- OAuth flow: Platform redirects to Stripe → user onboards → Stripe redirects back with `stripe_user_id`
- Store `stripe_user_id` in `creator_payment_accounts` table
- On booking payment: `stripe.charges.create({ amount, currency, source: tokenFromAttendee, stripe_account: creatorStripeAccountId, application_fee_amount: optionalFee })`
- Webhook handling for `account.updated` to track onboarding completion status

---

## R-6: Audit Logging Strategy

**Decision**: Append-only `permission_audit_log` table. Async write (fire-and-forget from service layer, but within the same transaction for grants/revokes to ensure atomicity). Structured JSON metadata field for extensibility.

**Rationale**: The spec requires "All grant/revoke actions and failed permission checks MUST be logged with userId, action, scope, and timestamp" (FR-16). An append-only table is simple, queryable, and auditable.

**Alternatives considered**:
- **External logging service (Application Insights, etc.)**: Good for operational logs but not for compliance audit trails that need to be queried alongside business data. We'll use Application Insights for operational monitoring separately; the DB audit log is the compliance record.
- **Event sourcing**: Overkill. We don't need to replay state from the audit log. It's purely an audit trail.

**Performance consideration**: Failed permission checks (403s) also produce audit entries. Under normal operation, these are rare. Under attack (brute-force permission probing), they could spike. Mitigate with rate limiting at the API layer. The audit write itself is a single INSERT — negligible overhead.

---

## R-7: Global Admin Protection

**Decision**: Before revoking the last Global Admin grant, the service checks `COUNT(*) WHERE role='global_admin' AND revoked_at IS NULL`. If count would drop to 0, reject with an error.

**Rationale**: The spec states "at least one Global Admin must always exist." This is the only hard constraint — other scope levels can have zero admins because higher-level admins provide implicit coverage.

**Implementation**: A database-level CHECK constraint isn't practical for this (requires cross-row validation). Instead, the `revokeGrant()` service function checks the count before revoking. This is wrapped in a transaction with `SELECT FOR UPDATE` to prevent race conditions where two concurrent revocations could both pass the check.

---

## R-8: Permission Middleware Design

**Decision**: A `withPermission(action, scopeResolver)` higher-order function wrapping Next.js route handlers. The `scopeResolver` extracts the target scope from the request (e.g., the city of the event being created).

**Rationale**: Middleware pattern ensures permission checks can't be accidentally skipped. Every mutation route handler is wrapped:

```typescript
export const POST = withPermission('createEvent', (req) => ({
  scopeType: 'city',
  scopeValue: req.body.cityId
}))(async (req, ctx) => {
  // handler runs only if permission check passed
});
```

**Alternatives considered**:
- **Global middleware (Next.js middleware.ts)**: Runs on every request including static assets. Too broad. Permission checks need access to request body which isn't available in Edge middleware.
- **Manual checks in each handler**: Error-prone — easy to forget. The wrapper pattern makes the check declarative and visible.
- **Decorator pattern**: TypeScript doesn't have stable decorators for functions. The HOF approach is idiomatic.
