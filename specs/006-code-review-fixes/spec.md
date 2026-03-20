# Feature Specification: Code Review Remediation — Security, Data Integrity & Quality Fixes

**Feature Branch**: `006-code-review-fixes`  
**Created**: 2026-03-16  
**Status**: Implemented  
**Input**: User description: "Fix all critical, major, and minor issues identified in the cross-spec code review to bring the codebase into full compliance with Constitution v1.3.0."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Secure Authentication on All Routes (Priority: P0)

An attacker attempts to access protected endpoints by crafting spoofed user identity headers. The system must reject these attempts across all 32+ routes that currently rely on a client-supplied header for authentication, ensuring only server-verified sessions grant access.

**Why this priority**: Spoofable authentication is the single largest security vulnerability in the platform. Any authenticated endpoint using the header pattern can be exploited to impersonate any user without credentials.

**Independent Test**: Call any previously header-auth route with a fabricated header and no valid session cookie — the system must return 401 Unauthorized.

**Acceptance Scenarios**:

1. **Given** an unauthenticated request with a spoofed user ID header, **When** it hits any event, venue, teacher, or booking route, **Then** the system returns 401 Unauthorized.
2. **Given** a request with a valid server-side session, **When** it hits any protected route, **Then** the system resolves the caller identity from the session and processes the request.
3. **Given** a valid session for User A, **When** User A calls an event route, **Then** the resolved user ID matches User A's session — not any header value.

---

### User Story 2 — Ownership Verification on Teacher Profiles (Priority: P0)

An authenticated user attempts to edit or delete a teacher profile that belongs to a different user. The system must deny the request with a 403 Forbidden, protecting profile owners from unauthorized modifications.

**Why this priority**: Without ownership checks, any authenticated user can overwrite or remove another user's teacher profile — a direct data integrity and trust violation.

**Independent Test**: Authenticate as User A, attempt to PATCH or DELETE User B's teacher profile — the system must return 403 Forbidden.

**Acceptance Scenarios**:

1. **Given** User A is authenticated and User B owns teacher profile T1, **When** User A sends PATCH to profile T1, **Then** the system returns 403 Forbidden.
2. **Given** User A is authenticated and User B owns teacher profile T1, **When** User A sends DELETE to profile T1, **Then** the system returns 403 Forbidden.
3. **Given** User A is authenticated and owns teacher profile T1, **When** User A sends PATCH to profile T1, **Then** the system processes the update normally.

---

### User Story 3 — Admin-Only Access to Privileged Endpoints (Priority: P0)

A regular authenticated user attempts to verify a certification, moderate a review, list pending teacher applications, or view expiring certifications. The system must deny these requests because they require admin privileges.

**Why this priority**: These endpoints perform privileged operations (approving teachers, moderating content, viewing dashboard-level data). Without role checks, any logged-in user can perform admin actions.

**Independent Test**: Authenticate as a non-admin user, call any of the 4 admin endpoints — the system must return 403 Forbidden.

**Acceptance Scenarios**:

1. **Given** a non-admin authenticated user, **When** they PATCH a certification verify endpoint, **Then** the system returns 403 Forbidden.
2. **Given** a non-admin authenticated user, **When** they GET pending teacher requests, **Then** the system returns 403 Forbidden.
3. **Given** an admin user, **When** they call any admin endpoint, **Then** the system processes the request normally.

---

### User Story 4 — Complete GDPR Account Deletion (Priority: P1)

A user exercises their GDPR right to erasure. The system must delete all personal data across all feature areas, including teacher profiles, certifications, photos, reviews, and review reminders — not just the data from the original 4 specs.

**Why this priority**: Incomplete deletion is a GDPR compliance violation that could expose the platform to regulatory penalties. Teacher data left behind creates a visible privacy failure for the user.

**Independent Test**: Create a user with data spanning all 5 specs. Trigger account deletion. Verify zero rows remain in all 18+ tables for that user.

**Acceptance Scenarios**:

1. **Given** a user with teacher profile, certifications, photos, event-teacher associations, reviews authored, and review reminders, **When** GDPR deletion is triggered, **Then** all records across teacher_profiles, teacher_requests, certifications, teacher_photos, event_teachers, reviews, and review_reminders are removed.
2. **Given** a user with data only in Specs 001-004, **When** GDPR deletion is triggered, **Then** existing deletion steps continue to work correctly (no regressions).
3. **Given** a user who is the subject of reviews by other users, **When** GDPR deletion is triggered, **Then** reviews written about the user's teacher profile are also handled appropriately.

---

### User Story 5 — Performant Message Thread Loading (Priority: P1)

A user opens a thread with 50+ messages. The system must load all messages without issuing per-message queries for block status and reaction summaries, ensuring page load completes within performance budgets.

**Why this priority**: The N+1 query pattern causes 100+ database queries for a single thread view, degrading user experience and risking timeout under concurrent load.

**Independent Test**: Load a thread with 50 messages and verify the total query count is constant (not proportional to message count).

**Acceptance Scenarios**:

1. **Given** a thread with 50 messages, **When** a user loads the thread, **Then** block status and reactions are resolved in batch (constant number of queries regardless of message count).
2. **Given** a thread with 1 message, **When** a user loads the thread, **Then** the result is identical to the current behavior (no regression).

---

### User Story 6 — Performant Follower/Following Lists (Priority: P1)

A user views their followers or following list. The system must load relationship statuses in batch rather than issuing per-entry queries, ensuring the list renders within performance budgets.

**Why this priority**: Similar to M2, this N+1 pattern causes O(n) queries per page, degrading performance for popular users with many followers.

**Independent Test**: Load a user's follower list at max page size and verify the total query count is constant.

**Acceptance Scenarios**:

1. **Given** a user with 50 followers, **When** their follower list is loaded, **Then** relationship statuses are resolved in a single batch query.
2. **Given** a user with 0 followers, **When** their follower list is loaded, **Then** the system returns an empty list without errors.

---

### User Story 7 — Correct Teacher Search by City (Priority: P1)

A user searches for teachers filtered by city. The system must return correct results without a runtime error caused by a wrong table reference.

**Why this priority**: This is a runtime-crashing bug. Any user searching teachers by city will see an error instead of results.

**Independent Test**: Search for teachers with a city filter — the system must return results (or an empty set), not a database error.

**Acceptance Scenarios**:

1. **Given** teachers exist in "Portland", **When** a user searches for teachers in "Portland", **Then** matching teacher profiles are returned.
2. **Given** no teachers exist in "Atlantis", **When** a user searches for teachers in "Atlantis", **Then** the system returns an empty result set with no errors.

---

### User Story 8 — Consistent Validation and Error Handling (Priority: P2)

Developers and API consumers interact with the platform's API. All routes must use the same validation approach and return errors in a consistent shape, making the API predictable and easier to integrate with.

**Why this priority**: Inconsistent validation and error shapes create confusion for API consumers and reduce maintainability. Lower priority because they don't affect security or correctness of existing functionality.

**Independent Test**: Send an invalid payload to the teacher photos endpoint and verify the error response uses the standard shape. Verify the Stripe API version is sourced from a shared constant.

**Acceptance Scenarios**:

1. **Given** an invalid photo upload payload, **When** sent to the teacher photos POST endpoint, **Then** the system returns a validation error using the standard error shape (not a raw typeof check).
2. **Given** a search query containing wildcard characters `%` and `_`, **When** used in an event search, **Then** wildcard characters are escaped and treated as literal text.
3. **Given** the Stripe API version is referenced in multiple files, **When** inspected, **Then** all references point to a single shared constant.

---

### Edge Cases

- What happens when a route has both a spoofed header AND a valid session? The session must always take precedence; the header must be ignored entirely.
- What happens when GDPR deletion is triggered for a user with no teacher data? The new deletion steps must be no-ops that complete without errors.
- What happens when a search query is composed entirely of wildcard characters like `%%%`? The system must escape them and return zero results (matching literal `%%%`), not all records.
- What happens when batch-loading reactions for a thread with zero messages? The batch loader must return an empty result without errors.

## Requirements *(mandatory)*

### Functional Requirements

**Authentication (C1)**
- **FR-001**: System MUST use server-side session verification on all 32+ routes currently using header-based authentication.
- **FR-002**: System MUST NOT read or trust `x-user-id` (or equivalent) client headers for identity resolution on any route.
- **FR-003**: System MUST return 401 Unauthorized when no valid session exists, regardless of headers present.

**Ownership (C2)**
- **FR-004**: System MUST verify that the authenticated user owns a teacher profile before allowing PATCH or DELETE operations on that profile.
- **FR-005**: System MUST return 403 Forbidden when an authenticated user attempts to modify or delete a teacher profile they do not own.

**Admin Permissions (C3)**
- **FR-006**: System MUST verify admin role before processing certification verification, review moderation, teacher request listing, and expiring certifications dashboard requests.
- **FR-007**: System MUST return 403 Forbidden when a non-admin user attempts to access admin-only endpoints.

**GDPR Deletion (M1)**
- **FR-008**: System MUST include teacher_profiles, teacher_requests, certifications, teacher_photos, event_teachers, reviews, and review_reminders in the GDPR account deletion flow.
- **FR-009**: System MUST delete Spec 005 data in the correct dependency order to respect foreign key constraints.
- **FR-010**: Existing deletion steps for Specs 001-004 MUST continue to function without modification.

**Performance (M2, M3)**
- **FR-011**: System MUST batch-load block statuses for all messages in a thread in a single query rather than per-message.
- **FR-012**: System MUST batch-load reaction summaries for all messages in a thread in a single query rather than per-message.
- **FR-013**: System MUST batch-load relationship statuses for all entries in a follower/following page in a single query rather than per-entry.

**Data Correctness (M4)**
- **FR-014**: The teacher search city filter MUST reference the correct user_profiles table.

**Validation & Consistency (Q1-Q4)**
- **FR-015**: The teacher photos POST handler MUST use a Zod schema for input validation instead of manual type checks.
- **FR-016**: All error responses MUST use the shared error helpers from the errors module.
- **FR-017**: The Stripe API version MUST be defined as a single shared constant referenced by all files that need it.
- **FR-018**: ILIKE search parameters MUST escape `%` and `_` wildcard characters in user-supplied input before interpolation.

**Regression Safety**
- **FR-019**: All 339 existing tests MUST continue to pass after changes are applied.
- **FR-020**: New tests MUST be added covering ownership checks (403 for non-owners), admin permission checks (403 for non-admins), and GDPR deletion of teacher-related data.

### Key Entities

- **Route**: An API endpoint handler that processes requests; key attribute is its authentication method (session-based vs. header-based).
- **Teacher Profile**: A user-owned record representing a teacher's public presence; must enforce ownership on mutation.
- **GDPR Deletion Job**: An ordered sequence of data removal steps across all feature tables; must cover all 5 specs.
- **Blocked Users Set**: A batch-loaded collection of user IDs that the current user has blocked; used to filter messages.
- **Reaction Summary Map**: A batch-loaded mapping from message ID to aggregated reaction counts; used to decorate messages.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero routes accept spoofable client headers for identity — 100% of protected routes use server-verified sessions.
- **SC-002**: Non-owners receive 403 Forbidden on 100% of teacher profile mutation attempts.
- **SC-003**: Non-admin users receive 403 Forbidden on 100% of admin-only endpoint requests.
- **SC-004**: GDPR account deletion removes 100% of user data across all 18+ tables spanning all 5 specs, verified by post-deletion audit query returning zero rows.
- **SC-005**: Thread loading with 50 messages completes with a constant number of queries (no more than N queries where N is independent of message count).
- **SC-006**: Follower/following list loading completes with a constant number of queries regardless of page size.
- **SC-007**: Teacher search by city returns correct results without runtime errors.
- **SC-008**: All 339 existing tests pass with zero failures after all changes are applied.
- **SC-009**: New test coverage added for ownership checks, admin permission checks, and GDPR teacher data deletion — minimum 15 new test cases.
- **SC-010**: All error responses conform to the standard error shape defined in the shared errors module.

## Assumptions

- The `getServerSession()` and `requireAuth()` utilities already exist and are proven in Specs 002 and 004 — no new auth infrastructure is needed.
- The `withPermission()` admin role check utility already exists in the permissions module from Spec 004.
- The shared error helpers in `@/lib/errors` already define the standard error shape.
- Foreign key constraints exist between Spec 005 tables, requiring ordered deletion.
- The 339 existing test count is accurate as of the review date and may fluctuate slightly with concurrent work.

## Constraints

- All 339 existing tests MUST continue to pass (zero regressions).
- Changes span all 5 spec areas but will be implemented on branch `006-code-review-fixes` based off `005-teacher-profiles-reviews`.
- No new dependencies or architectural changes — this is a remediation-only effort using existing patterns and utilities.

## Constitution Compliance

This spec directly addresses violations of:

- **Principle I (API-First)** — error response consistency (Q2)
- **Principle III (Privacy)** — GDPR deletion completeness (M1)
- **Principle IV (Server-Side Authority)** — Zod-only validation (Q1)
- **Principle VI (Performance Budget)** — N+1 query elimination (M2, M3)
- **Principle IX (Scoped Permissions)** — admin permission checks (C3)
- **Principle XI (Resource Ownership)** — ownership verification (C2)
- **Quality Gate #11 (Auth Consistency)** — session-based auth everywhere (C1)
- **Quality Gate #12 (Cross-spec Data Integrity)** — GDPR coverage of all specs (M1)
