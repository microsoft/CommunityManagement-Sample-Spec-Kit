# Feature Specification: Entra External ID — Social Login Federation

**Feature Branch**: `011-entra-external-id`  
**Created**: 2026-03-22  
**Status**: Draft  
**Input**: User description: "Entra external ID - use spec-kit process to plan how to implement Entra external ID to enable social logins"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New User Signs In with Google (Priority: P1)

A visitor to the AcroYoga Community platform clicks "Sign in with Google" on the login page. They are redirected to the Entra External ID tenant, which federates to Google OAuth. After authenticating with Google, they are redirected back to the app and automatically have a new platform account created with their Google profile data (display name, email, avatar). They land on the platform as a regular Member.

**Why this priority**: Social login is the primary registration path for new community members. Without it, new users face friction from password creation, reducing sign-up completion. Google is the most commonly used social provider and is therefore the highest-impact first story.

**Independent Test**: Navigate to the login page. Click "Sign in with Google." Complete Google authentication in the Entra External ID-hosted page. Return to the platform. Verify that a new user record is created in the `users` table with the Google email and that the user's session is established via `getServerSession()`. Verify the user has the `member` role.

**Acceptance Scenarios**:

1. **Given** a visitor has no existing account, **When** they authenticate with Google through Entra External ID, **Then** a new user record is created in the `users` table with `provider = "google"` and their Google email address.
2. **Given** a new user has authenticated with Google, **When** `getServerSession()` is called, **Then** it returns a session with a valid `userId` matching their newly created user record.
3. **Given** a new user is created via social login, **When** their default permissions are checked, **Then** they have the `member` role and no elevated permission grants.
4. **Given** a user has already signed in with Google, **When** they sign in again, **Then** no duplicate user record is created and the same `userId` is returned.

---

### User Story 2 - Returning User Signs In via Any Linked Social Provider (Priority: P1)

A returning community member signs in using their social provider (Google, Facebook, or Apple). The platform recognises their existing account by matching the Entra External ID `oid` (Object ID) claim and returns the same `userId` they have always had. Their permission grants, event history, and profile data remain intact across sessions.

**Why this priority**: Account continuity is critical — a returning user who gets a new user record on every login loses all their history, bookings, and permissions. This must work correctly before any social provider is live.

**Independent Test**: Sign in with Google, note the `userId`. Sign out. Sign in again with Google. Verify the same `userId` is returned. Verify no second user record exists in the `users` table for the same email/oid.

**Acceptance Scenarios**:

1. **Given** a user previously authenticated with Google, **When** they sign in again with Google, **Then** `getServerSession()` returns the same `userId` as their original sign-in.
2. **Given** a user has a permission grant as Bristol City Admin, **When** they sign in via social login, **Then** `checkPermission()` resolves their grant correctly using their existing `userId`.
3. **Given** a user has signed in 10 times, **When** the `users` table is queried for their email, **Then** only one record exists.
4. **Given** Entra External ID returns an `oid` claim, **When** the JWT callback processes the token, **Then** the `oid` is stored as the canonical `userId` to ensure consistency across provider re-connections.

---

### User Story 3 - Facebook Social Login (Priority: P2)

A user chooses to sign in via Facebook instead of Google. The Entra External ID tenant federates to Facebook OAuth. The sign-in flow is identical to Google from the user's perspective. The platform receives the same normalised identity claims regardless of which social provider was used.

**Why this priority**: Facebook is the second most-used social provider for community platforms. It extends reach to users who prefer Facebook. It is P2 because the core federation architecture from P1 (Google) handles this without significant additional code — it is primarily a configuration change in the Entra External ID portal plus a minor UI addition.

**Independent Test**: On the login page, click "Sign in with Facebook." Complete Facebook authentication through Entra External ID. Return to the platform and verify a user record is created with `provider = "facebook"` and that a valid session is established.

**Acceptance Scenarios**:

1. **Given** a visitor clicks "Sign in with Facebook", **When** they authenticate through Entra External ID's Facebook federation, **Then** they are returned to the app with a valid session and a new user record.
2. **Given** a Facebook-authenticated user, **When** `getServerSession()` is called, **Then** the session contains the same `userId` format as a Google-authenticated user.
3. **Given** the platform is configured with Facebook as a social provider in Entra External ID, **When** the login page renders, **Then** a "Sign in with Facebook" button is displayed alongside the Google option.

---

### User Story 4 - Apple Social Login (Priority: P2)

A user on an Apple device chooses "Sign in with Apple." The Entra External ID tenant federates to Apple's identity provider. Apple hides email addresses by default (using relay addresses) — the platform handles this gracefully, using the Apple `sub` claim (stable user identifier) rather than email as the primary lookup key.

**Why this priority**: Sign in with Apple is mandatory on iOS apps (App Store guidelines) and preferred by privacy-conscious users. It is P2 alongside Facebook as a second social provider. Apple's relay email behaviour requires special handling compared to Google/Facebook.

**Independent Test**: On the login page, click "Sign in with Apple." Authenticate via Apple. Return to the platform. Verify a user record is created even if the email is an Apple relay address. Verify the same `userId` is returned on subsequent sign-ins by matching on `oid`, not email.

**Acceptance Scenarios**:

1. **Given** a user signs in with Apple using a relay email, **When** `getServerSession()` is called, **Then** a valid session is returned and the user record uses the Apple relay email (or a null email if Apple hides it) without an error.
2. **Given** a user signs in with Apple twice, **When** the second sign-in occurs, **Then** the same `userId` is returned because matching is done on the Entra `oid` claim, not the email address.
3. **Given** an Apple user returns after Apple changes their relay email, **When** they sign in, **Then** the platform recognises them by `oid` and updates their stored email address rather than creating a duplicate.

---

### User Story 5 - User Links Multiple Social Accounts to One Platform Profile (Priority: P3)

An existing platform user who originally signed in with Google also wants to use their Apple account on their iPhone. They visit their profile settings and link their Apple account. From that point, signing in with either Google or Apple gives them the same platform profile and permission grants.

**Why this priority**: Account linking is a power-user feature. Most users pick one social provider and stick with it. This is P3 because it depends on P1 and P2 being complete, and it requires additional UI and database work for the linking flow.

**Independent Test**: Sign in with Google. Go to profile settings > "Linked accounts." Click "Link Apple account." Authenticate with Apple. Verify a new row in the `linked_accounts` table references the original `userId`. Sign out. Sign in with Apple. Verify the same `userId` is returned as the original Google sign-in.

**Acceptance Scenarios**:

1. **Given** a user is signed in with Google, **When** they link their Apple account from profile settings, **Then** a `linked_accounts` record is created linking the Apple `oid` to their existing `userId`.
2. **Given** a user has linked Google and Apple, **When** they sign in with Apple, **Then** `getServerSession()` returns the same `userId` as if they had signed in with Google.
3. **Given** a user attempts to link a social account that is already linked to a different platform profile, **When** the link is attempted, **Then** the server returns an error and no duplicate linking occurs.
4. **Given** a user has linked accounts, **When** they view profile settings, **Then** they can see and remove individual linked accounts (retaining at least one).

---

### User Story 6 - Login Page and Sign-In UI (Priority: P1)

The platform has a dedicated login page (`/login`) that displays available social sign-in options. The page is accessible, mobile-first, and uses design tokens. Users who navigate to protected routes while unauthenticated are redirected to this page with a `callbackUrl` parameter so they are returned to their intended destination after sign-in.

**Why this priority**: Without the login UI, no user can initiate social login. It is P1 because it is required for every other user story to be testable end-to-end.

**Independent Test**: Navigate to `/events/new` while unauthenticated. Verify a redirect to `/login?callbackUrl=/events/new`. Verify the login page displays Google (and other configured) provider buttons. Verify keyboard navigation and focus management on the login page meet WCAG 2.1 AA.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user accesses a protected route, **When** the page loads, **Then** they are redirected to `/login?callbackUrl=[original path]`.
2. **Given** the user successfully authenticates, **When** they are redirected back to the app, **Then** they land on the original `callbackUrl` destination, not the login page.
3. **Given** the login page is rendered, **When** inspected by an axe-core accessibility checker, **Then** zero violations are reported.
4. **Given** the login page is rendered on a 375px viewport, **When** screenshots are taken, **Then** all provider buttons are fully visible and have touch targets ≥ 44×44 px.

---

### Edge Cases

- What happens if Entra External ID returns an `oid` that already exists in the `users` table but with a different email? The `oid` is the canonical identifier — update the stored email to the latest from Entra (emails can change in social providers).
- What happens if Entra External ID is unreachable (network timeout)? Display a clear error on the login page — "Authentication service unavailable, please try again." Do NOT fall back to a mock or development session in production.
- What happens if a user denies the OAuth consent screen? Redirect to `/login` with an error parameter indicating consent was denied.
- What happens if the user's social account email conflicts with an existing email-registered account (if email/password auth is added later)? Out of scope for this spec — if email/password is introduced in a future spec, account merging strategy must be defined then. For now, Entra External ID is the sole auth provider.
- What happens if Entra External ID returns claims without an email (e.g., some Apple users)? Store the `oid` as the lookup key; email is optional in the user record. Display name from the `name` claim is used if available.
- What happens if a user account is disabled in the Entra External ID portal? Entra External ID will return an error token; `getServerSession()` returns `null` and the user is treated as unauthenticated.
- What happens in the mock auth environment (Spec 007) when Entra External ID is not configured? Mock auth activates when `NODE_ENV=development` AND no `ENTRA_CLIENT_ID` is set. Social login UI buttons are replaced with the mock user switcher in development mode.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST configure Microsoft Entra External ID as the identity provider in `next-auth` (Auth.js v5) using the CIAM issuer URL format (`https://{tenant}.ciamlogin.com/{tenant_id}/v2.0`).
- **FR-002**: System MUST support Google as a social sign-in provider, federated through Entra External ID.
- **FR-003**: System MUST support Facebook as a social sign-in provider, federated through Entra External ID.
- **FR-004**: System MUST support Apple as a social sign-in provider, federated through Entra External ID.
- **FR-005**: On first sign-in, the system MUST create a new user record in the `users` table using the Entra External ID `oid` claim as the stable `userId`.
- **FR-006**: On subsequent sign-ins, the system MUST look up the existing user by `oid` and return the same `userId` without creating duplicates.
- **FR-007**: The JWT callback MUST store the Entra `oid` claim as the `userId` so that `getServerSession()` always returns the correct, stable user identity.
- **FR-008**: The system MUST provision new social users with the `member` role by default — no permission grants are created at registration.
- **FR-009**: System MUST provide a `/login` page with social provider sign-in buttons and redirect unauthenticated users from protected routes to this page with a `callbackUrl` parameter.
- **FR-010**: The login page MUST comply with WCAG 2.1 AA: keyboard navigable, 4.5:1 contrast minimum, touch targets ≥ 44×44 px, and pass axe-core with zero violations.
- **FR-011**: All social provider buttons and login copy MUST use i18n-extractable strings — no raw string literals in UI components.
- **FR-012**: The Entra External ID tenant configuration (client ID, tenant ID, tenant domain) MUST be stored in environment variables — never hardcoded.
- **FR-013**: The system MUST support account linking: an authenticated user can connect additional social provider identities to their existing platform `userId` via the `linked_accounts` table.
- **FR-014**: The `linked_accounts` table MUST enforce uniqueness of `(provider_oid)` to prevent the same social identity being linked to two different platform accounts.
- **FR-015**: When linking a social account that is already linked to another `userId`, the server MUST return a 409 Conflict error.
- **FR-016**: In development mode (no Entra credentials configured), the social login UI MUST be replaced by the existing mock user switcher from Spec 007 — no change to the production login flow.
- **FR-017**: The auth configuration MUST be compatible with the existing `requireAuth()` and `withPermission()` middleware — no changes to permission checking logic are required.

### Key Entities

- **User**: Existing entity in the `users` table. Extended with `provider` (the first social provider used) and `provider_oid` (the Entra External ID Object ID — stable cross-session identifier). `provider_oid` is NOT the NextAuth `sub` — it is the Entra `oid` claim from the ID token.
- **LinkedAccount**: New `linked_accounts` table. Each row links a social provider identity (`provider`, `provider_oid`) to a platform `user_id`. Supports the account linking user story. The user's primary `provider_oid` in the `users` table is mirrored as the first row here for consistent lookup logic.
- **AuthSession**: Unchanged shape — `{ userId: string }`. The `userId` is always the platform UUID from the `users` table, not any provider-specific ID. This guarantees backward compatibility with all existing permission checks.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can complete Google sign-in and land on the platform as a Member in under 10 seconds on a broadband connection.
- **SC-002**: Zero duplicate user records exist in the `users` table after a user signs in with the same social provider 10 times in a row.
- **SC-003**: All three social providers (Google, Facebook, Apple) produce a valid session through `getServerSession()` with the same `userId` format.
- **SC-004**: The login page achieves zero axe-core violations and all provider buttons have touch targets ≥ 44×44 px.
- **SC-005**: 100% of existing integration tests continue to pass after the Entra External ID auth config is updated — no regressions in permission checking, RSVP, bookings, or other features.
- **SC-006**: The `requireAuth()` and `withPermission()` middleware require zero code changes — they continue to work correctly with the new auth provider.
- **SC-007**: Developer onboarding time (from cloning the repo to running the app with mock auth) does not increase — the mock auth path from Spec 007 still works without any Entra External ID configuration.

## Assumptions

- Entra External ID (CIAM) tenant has been provisioned in Azure with the application registration completed. The `ENTRA_CLIENT_ID`, `ENTRA_TENANT_ID`, and `ENTRA_TENANT_DOMAIN` values are available.
- Google, Facebook, and Apple identity providers have been configured in the Entra External ID portal as federated social providers (Azure portal > External Identities > All identity providers).
- The platform will use a single Entra External ID tenant for all environments (dev, staging, production) using environment-specific redirect URIs, or separate tenants per environment — this is an operational decision outside this spec.
- The `users` table currently has `id`, `name`, `email`, and `created_at` columns. Migration adds `provider` and `provider_oid` columns.
- Email/password authentication is out of scope — Entra External ID is the sole production auth provider.
- The NextAuth.js (Auth.js v5) `MicrosoftEntraID` provider supports Entra External ID when given the CIAM issuer URL — verified in research (R-1).
