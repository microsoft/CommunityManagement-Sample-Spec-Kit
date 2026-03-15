# Feature Spec 004: Permissions & Creator Accounts

> Priority: P0 — Required for multi-organiser platform
> Status: Draft
> Constitution check: Principles IV, IX

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
**Then** I can connect my Stripe account via OAuth (Stripe Connect).

**Given** my Stripe account is connected,
**When** an attendee pays for my event,
**Then** the payment goes to my Stripe account (minus platform fees if applicable).

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Permission grants: `(user_id, role, scope_type, scope_value)` stored in database | P0 |
| FR-02 | Roles: Global Admin, Country Admin, City Admin, Event Creator, Member | P0 |
| FR-03 | Scope types: global, continent, country, city | P0 |
| FR-04 | Event Creator can create events + new venues within their scope | P0 |
| FR-05 | Event Creator cannot edit other creators' events | P0 |
| FR-06 | Admin at level N can manage all resources at level N and below | P0 |
| FR-07 | Permission checks enforced server-side on every mutation endpoint | P0 |
| FR-08 | Each Event Creator can link their own Stripe account for direct payouts | P1 |
| FR-09 | Admin panel shows only resources within the admin's scope | P0 |
| FR-10 | Permission grants are managed by admins at the same or higher scope level | P0 |

### Key Entities

- **PermissionGrant**: id, userId, role, scopeType, scopeValue, grantedBy, grantedAt, revokedAt
- **CreatorPaymentAccount**: id, userId, stripeAccountId, onboardingComplete, connectedAt

### Edge Cases

- User has multiple grants (City Admin for Bristol + Event Creator for Bath): server evaluates all grants and applies the most permissive for the requested action
- Admin revokes a creator's permission: existing events remain published but creator can no longer edit them; admin takes over management
- Stripe account disconnected: events by this creator show "payment unavailable"; existing bookings with pending payment are flagged for admin review

---

## Success Criteria

| ID | Criterion | Measurement |
|----|-----------|-------------|
| SC-01 | No mutation succeeds without a valid permission grant | Integration test: attempt every mutation endpoint without permission → all return 403 |
| SC-02 | Scope hierarchy is correctly resolved (city grant does not cover other cities in same country) | Integration test matrix |
| SC-03 | Admin panel only shows resources within scope; no data leakage across scopes | Integration test with different admin scopes |
| SC-04 | Creator payment account onboarding completes end-to-end with Stripe test mode | Manual test with Stripe test keys |
