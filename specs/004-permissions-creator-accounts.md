# Feature Spec 004: Permissions & Creator Accounts

> Priority: P0 — Required for multi-organiser platform
> Status: Implemented
> Constitution check: Principles IV, IX, XI, XII

## User Scenarios & Testing

### US-1: Scoped Event Creator (P0)

**As** an AcroYoga teacher running events in Bristol,
**I want** to be granted "Event Creator" permission for my city,
**So that** I can create events and venues without waiting for a global admin to do it.

**Given** I have been granted "Event Creator" scoped to Bristol,
**When** I create a new event,
**Then** I can set the location to any existing Bristol venue or create a new Bristol venue.

**Given** I try to create an event in London,
**When** I submit the form,
**Then** the server rejects it with "You do not have permission to create events in London."

**Given** I try to edit another creator's event in Bristol,
**When** I attempt the edit,
**Then** the server rejects it; only the event owner or a Bristol/UK/Global admin can edit it.

### US-2: Hierarchical Admin (P0)

**As** the UK community coordinator,
**I want** country-level admin rights so I can manage all events and venues across UK cities,
**So that** I can moderate content and approve teachers nationally.

**Given** I am a Country Admin for the UK,
**When** I view the admin panel,
**Then** I see all events, venues, and teacher requests for all UK cities.

**Given** a City Admin in Bristol approves an event,
**When** I review that event,
**Then** I can override the approval (e.g., unpublish it) because my scope includes Bristol.

**Given** I try to manage events in France,
**When** I attempt the action,
**Then** it is rejected; my scope does not cover France.

### US-3: Creator Payment Account Setup (P1)

**As** an Event Creator who charges for events,
**I want** to connect my own Stripe account so I receive payments directly,
**So that** the platform facilitates payments without acting as a middleman for my income.

**Given** I am an Event Creator,
**When** I go to my creator settings,
**Then** I can connect my Stripe account via Stripe Connect Standard (OAuth flow); Stripe hosts the full onboarding.

**Given** my Stripe account is connected,
**When** an attendee pays for my event,
**Then** the payment goes to my Stripe account via a direct charge with an optional platform application fee. I manage my own disputes and tax reporting through my Stripe dashboard.

### US-4: Request Event Creator Role (P0)

**As** a community member who wants to organise events in my city,
**I want** to submit a request for the Event Creator role,
**So that** I can start creating events once an admin at my scope level approves me.

**Given** I am a logged-in Member,
**When** I navigate to my profile and click "Request Event Creator",
**Then** I can select a city scope and submit a request with an optional message.

**Given** I have submitted a request,
**When** an admin at my scope level (City, Country, or Global) views pending requests,
**Then** they see my request and can approve or reject it with a reason.

**Given** an admin approves my request,
**When** I next load the app,
**Then** I have Event Creator permissions for the approved scope and can create events.

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Permission grants: `(user_id, role, scope_type, scope_value)` stored in database | P0 |
| FR-02 | Roles: Global Admin, Country Admin, City Admin, Event Creator, Member. Visitor (unauthenticated) is not a role but a distinct access tier | P0 |
| FR-03 | Scope types: global, continent, country, city | P0 |
| FR-04 | Event Creator can create events + new venues within their scope | P0 |
| FR-05 | Event Creator cannot edit other creators' events | P0 |
| FR-06 | Admin at level N can manage all resources at level N and below | P0 |
| FR-07 | Permission checks enforced server-side on every mutation endpoint | P0 |
| FR-08 | Each Event Creator can link their own Stripe account via Stripe Connect Standard (OAuth); platform uses direct charges with optional application fee | P1 |
| FR-09 | Admin panel shows only resources within the admin's scope | P0 |
| FR-10 | Permission grants are managed by admins at the same or higher scope level | P0 |
| FR-11 | Users can self-service request the Event Creator role; requests require admin approval at the target scope level | P0 |
| FR-12 | Admin roles (City/Country/Global Admin) are admin-only grants — no self-service request | P0 |
| FR-13 | Member (default authenticated role): can RSVP, join waitlists, mark interest, follow users, post in discussion threads, manage own profile, export/delete own data, and request Event Creator role. Cannot create events or venues | P0 |
| FR-14 | Visitor (unauthenticated): can browse events, view event details, view teacher profiles, and search/filter. Cannot RSVP, follow, post, or access any mutation endpoint | P0 |
| FR-15 | Permission checks MUST complete in < 50ms (grants are cacheable per user session) | P0 |
| FR-16 | All grant/revoke actions and failed permission checks MUST be logged with userId, action, scope, and timestamp for audit | P0 |

### Key Entities

- **PermissionGrant**: id, userId, role, scopeType, scopeValue, grantedBy, grantedAt, revokedAt
- **PermissionRequest**: id, userId, requestedRole, scopeType, scopeValue, message, status (pending/approved/rejected), reviewedBy, reviewedAt, createdAt
- **CreatorPaymentAccount**: id, userId, stripeAccountId, onboardingComplete, connectedAt
- **PermissionAuditLog**: id, userId, action (grant/revoke/check_failed), role, scopeType, scopeValue, performedBy, timestamp, metadata (JSON)

### Edge Cases

- User has multiple grants (City Admin for Bristol + Event Creator for Bath): server evaluates all grants and applies the most permissive for the requested action
- Admin revokes a creator's permission: existing events remain published but creator can no longer edit them; admin takes over management
- Stripe account disconnected: events by this creator show "payment unavailable"; existing bookings with pending payment are flagged for admin review
- Stripe Connect Standard: creator owns their Stripe account and handles disputes/tax; platform never holds creator funds (aligns with Constitution Principle XII)
- Last admin removed at a scope level: no blocking safeguard needed — hierarchy provides implicit coverage (a Country Admin can manage all cities in their country; a Global Admin covers all countries). The only hard constraint is that at least one Global Admin must always exist
- Duplicate request: user submits a second request for the same scope while one is pending → server rejects with "You already have a pending request for this scope"
- Request rejected: user can resubmit after rejection; previous rejection reason is visible to them

---

## Success Criteria

| ID | Criterion | Measurement |
|----|-----------|-------------|
| SC-01 | No mutation succeeds without a valid permission grant | Integration test: attempt every mutation endpoint without permission → all return 403 |
| SC-02 | Scope hierarchy is correctly resolved (city grant does not cover other cities in same country) | Integration test matrix |
| SC-03 | Admin panel only shows resources within scope; no data leakage across scopes | Integration test with different admin scopes |
| SC-04 | Creator payment account onboarding completes end-to-end with Stripe test mode | Manual test with Stripe test keys |
| SC-05 | Permission check latency < 50ms at p95 under load | Performance test with cached and uncached grants |
| SC-06 | Every grant, revoke, and failed permission check produces an audit log entry | Integration test: perform actions → verify audit log entries exist with correct fields |
