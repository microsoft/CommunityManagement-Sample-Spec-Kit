# Feature Specification: Mock Authentication with Sample Users

**Feature Branch**: `007-mock-auth`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: User description: "Build a mock authentication system with sample users for local development and testing. Provide a mock auth provider that bypasses real Entra ID in development mode. Define sample users with different roles, scopes, and attributes. Allow switching between users via a dev-only UI component or query parameter. Provide test helper functions to seed sample users and permission grants. Respect the existing session/permission architecture. Include sample users covering all permission levels with realistic attributes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Runs App Locally Without Entra ID (Priority: P1)

A developer clones the repository and runs the app in development mode. Without any Entra ID configuration, they are automatically signed in as a default sample user and can interact with the full application. The mock auth provider intercepts the normal auth flow and returns a valid session through `getServerSession()`, so all permission checks, middleware, and route protection work identically to production.

**Why this priority**: Without this, developers cannot run the app locally at all — it is the foundation for all other mock auth functionality and the entire local development experience.

**Independent Test**: Start the app with `NODE_ENV=development` and no Entra ID credentials configured. Navigate to any authenticated page — the developer sees content as the default sample user instead of being redirected to a login page or receiving 401 errors.

**Acceptance Scenarios**:

1. **Given** the app is running in development mode, **When** a developer accesses an authenticated route, **Then** the request has a valid session with the default sample user's `userId`.
2. **Given** the app is running in development mode, **When** `getServerSession()` is called from any route handler, **Then** it returns a `Session` object with the active mock user's `userId`.
3. **Given** the app is running in production mode, **When** no Entra ID tokens are present, **Then** the mock auth provider is completely inactive and `getServerSession()` returns `null` as normal.

---

### User Story 2 - Developer Switches Between Sample Users (Priority: P1)

A developer needs to test how the application behaves for users with different permission levels. They use a dev-only UI component (visible only in development mode) to switch between predefined sample users — for example, from a Global Admin to a Regular Member. After switching, all subsequent requests use the selected user's session, and permission-gated features reflect the new user's access level immediately.

**Why this priority**: Testing different permission levels is essential for validating the permission system, admin panels, and role-specific features during development.

**Independent Test**: While running locally, use the user switcher to change from Global Admin to Regular Member. Attempt to access an admin-only page — it should now return 403. Switch back to Global Admin — the admin page loads successfully.

**Acceptance Scenarios**:

1. **Given** the app is in development mode, **When** the developer selects "Bristol City Admin" from the user switcher, **Then** all subsequent requests use that user's session and permission grants.
2. **Given** the developer has switched to "Regular Member", **When** they attempt to access `viewAdminPanel`, **Then** they receive a 403 forbidden response.
3. **Given** the developer has switched to "Global Admin", **When** they access any admin feature, **Then** the permission check passes and the feature loads.
4. **Given** the app is in production mode, **When** the page renders, **Then** the user switcher component is not present in the DOM.

---

### User Story 3 - Sample Users Are Seeded with Correct Permission Grants (Priority: P1)

When the app starts in development mode (or when tests initialize), all sample users and their corresponding permission grants are seeded into the database. Each sample user has the correct role, scope, and permission grants so that the permission system works end-to-end without manual setup.

**Why this priority**: Without seeded permission grants, mock auth sessions would have no matching grants in the database, and `checkPermission()` would deny everything. This is required for mock auth to function correctly.

**Independent Test**: Start the app in development mode. Query the users table — all sample users exist with correct attributes. Query the permission_grants table — each admin/creator user has the expected grants. Call `checkPermission()` for each sample user with their expected actions — all return `allowed: true`.

**Acceptance Scenarios**:

1. **Given** the app starts in development mode with an empty database, **When** the seed process runs, **Then** all sample users exist in the users table with realistic profile data.
2. **Given** sample users are seeded, **When** `checkPermission()` is called for the Global Admin with any action at global scope, **Then** it returns `allowed: true` with `effectiveRole: "global_admin"`.
3. **Given** sample users are seeded, **When** `checkPermission()` is called for the Bristol City Admin with `createEvent` at Bristol city scope, **Then** it returns `allowed: true`.
4. **Given** sample users are seeded, **When** `checkPermission()` is called for the Regular Member with `viewAdminPanel`, **Then** it returns `allowed: false` with `effectiveRole: "member"`.

---

### User Story 4 - Test Helpers Seed Sample Users into PGlite (Priority: P2)

Test authors use shared helper functions to seed sample users and their permission grants into the PGlite test database. Instead of each test file defining its own ad-hoc `createUser()` function with hardcoded values, all tests import from a single source of sample user data and seeding utilities. This ensures consistency across test files and eliminates duplication.

**Why this priority**: Consolidating test user creation reduces duplication across test files and makes tests more readable and maintainable. It builds on the sample user definitions from P1.

**Independent Test**: In a new integration test, import the seed helper and call it with the test database. Verify that all sample users and grants exist. Run an existing test suite — all tests still pass with the shared helpers.

**Acceptance Scenarios**:

1. **Given** a test file needs authenticated requests, **When** it imports and calls the sample user seed helper, **Then** all sample users and permission grants are inserted into the PGlite database.
2. **Given** the seed helper has run, **When** a test sets the active mock user to "UK Country Admin", **Then** `getServerSession()` returns that user's `userId` within the test context.
3. **Given** multiple test files use the seed helpers, **When** sample user data changes (e.g., a new attribute), **Then** only the single shared definition needs updating.

---

### User Story 5 - Anonymous/Visitor Testing (Priority: P2)

A developer needs to test unauthenticated flows — what anonymous visitors see, how the app handles missing sessions, and that public endpoints work without auth. The user switcher includes an "Anonymous / Visitor" option that clears the mock session entirely, causing `getServerSession()` to return `null`.

**Why this priority**: Testing the unauthenticated experience is important for verifying public pages, login flows, and proper 401 handling, but depends on the core mock auth infrastructure being in place.

**Independent Test**: Switch to "Anonymous / Visitor" in the user switcher. Access a protected route — receive 401. Access a public route — it loads normally with no session.

**Acceptance Scenarios**:

1. **Given** the developer selects "Anonymous / Visitor", **When** `getServerSession()` is called, **Then** it returns `null`.
2. **Given** the session is null, **When** a protected route is accessed, **Then** `requireAuth()` returns 401 as expected.
3. **Given** the session is null, **When** a public route is accessed, **Then** the page renders normally.

---

### User Story 6 - Query Parameter User Switching (Priority: P3)

A developer can switch the active mock user by appending a query parameter to any URL (e.g., `?mockUser=bristol-city-admin`). This is useful for sharing specific test scenarios via URL, testing API endpoints with tools like curl or Postman, and automated testing scripts that need to control the user context per-request.

**Why this priority**: Nice-to-have convenience for API testing and shareable reproduction URLs, but the UI switcher covers the primary use case.

**Independent Test**: Make a request to `GET /api/events?mockUser=global-admin` — the response reflects Global Admin permissions. Make the same request with `?mockUser=regular-member` — see reduced data or 403 for admin-only fields.

**Acceptance Scenarios**:

1. **Given** the app is in development mode, **When** a request includes `?mockUser=uk-country-admin`, **Then** the session for that request uses the UK Country Admin's `userId`.
2. **Given** the app is in production mode, **When** a request includes `?mockUser=global-admin`, **Then** the query parameter is completely ignored and has no effect on authentication.
3. **Given** a request includes `?mockUser=nonexistent-user`, **When** the mock auth processes the request, **Then** it falls back to the default sample user rather than returning an error.

---

### Edge Cases

- What happens if the mock auth seed runs against a database that already has some sample users? Seed should be idempotent — upsert rather than fail on duplicates.
- What happens if a developer has real Entra ID credentials configured while in development mode? Real auth should take precedence; mock auth only activates when no real auth provider is configured (or via explicit opt-in).
- What happens if the sample user definition references a city/country that doesn't exist in the seed data? The seed process must also create any referenced cities, countries, and other dependent data.
- How does the mock auth interact with CSRF protection or other security middleware? Mock auth should go through the same session infrastructure, so CSRF tokens and other protections remain active.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a mock authentication provider that produces valid sessions through the existing `getServerSession()` function when running in development mode.
- **FR-002**: System MUST define at least six sample users covering all permission levels: Global Admin, Country Admin (UK), City Admin (Bristol), Event Creator (Bristol), Regular Member (no grants), and Anonymous/Visitor (no session).
- **FR-003**: Each sample user MUST have realistic attributes including name, email, and profile data consistent with the platform's user model.
- **FR-004**: System MUST provide a development-only UI component that allows switching between sample users. This component MUST NOT be included in production builds.
- **FR-005**: System MUST support switching the active mock user via a query parameter on any request, active only in development mode.
- **FR-006**: System MUST provide seeding functions that insert all sample users and their permission grants into the database, usable by both the dev server startup and test setup.
- **FR-007**: Seed functions MUST be idempotent — running them multiple times against the same database MUST NOT create duplicate records or fail.
- **FR-008**: Mock auth MUST go through `getServerSession()` so that all existing `requireAuth()` and `withPermission()` middleware works without modification. Client-injectable headers (e.g., `x-user-id`) MUST NOT be used as the mock auth mechanism, per Constitution QG-11.
- **FR-009**: Mock auth MUST be completely inert in production mode — no mock sessions, no user switcher UI, no query parameter handling.
- **FR-010**: The Anonymous/Visitor option MUST cause `getServerSession()` to return `null`, triggering the same 401 responses as a genuinely unauthenticated request.
- **FR-011**: Test helper functions MUST allow setting the active mock user within a test context so that individual tests can control which user's session is returned.
- **FR-012**: Sample user definitions MUST be importable as a single shared module, eliminating the need for ad-hoc user creation across test files.
- **FR-013**: The seed process MUST also create any dependent reference data (cities, countries) that sample users' permission scopes reference.
- **FR-014**: The user switcher UI MUST display the current active user's name and role, providing clear visual feedback about which user context is active.

### Key Entities

- **Sample User**: A predefined user identity with a stable ID, name, email, and profile data. Used for both development sessions and test seeding. Each sample user maps to a specific permission level.
- **Sample Permission Grant**: A predefined permission grant linking a sample user to a role and scope. Mirrors the existing `PermissionGrant` structure (role, scopeType, scopeValue). Created during seeding so that `checkPermission()` resolves correctly.
- **Mock Session**: A development-mode-only session object produced by the mock auth provider. Contains the active sample user's `userId` and is returned by `getServerSession()`. Identical in shape to a real production session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new developer can run the app locally and interact with all features within 2 minutes of starting the dev server, with zero external auth configuration required.
- **SC-002**: Developers can switch between all sample user roles and verify permission behavior in under 10 seconds per switch.
- **SC-003**: 100% of existing integration tests continue to pass after adopting the shared sample user helpers.
- **SC-004**: Zero ad-hoc `createUser()` helper functions remain duplicated across test files after migration to shared helpers.
- **SC-005**: All permission levels (global_admin, country_admin, city_admin, event_creator, member, visitor) are exercisable through the sample user set.
- **SC-006**: Mock auth produces zero runtime artifacts in production builds — no UI components, no query parameter handling, no mock session logic.
- **SC-007**: The sample user seed completes in under 2 seconds on a fresh database.

## Assumptions

- The platform's existing user table schema supports all attributes needed for sample users (id, name, email, profile fields). No schema changes are expected.
- Development mode is determined by `NODE_ENV=development` or an equivalent environment variable.
- The existing `auth()` function from NextAuth can be wrapped or intercepted cleanly to return mock session data without modifying the NextAuth configuration itself.
- Cities and countries referenced by sample user scopes (UK, Bristol) already exist in seed data or will be created as part of this feature's seed process.
- The PGlite test database used in integration tests supports the same SQL schema as the production database.
