# Tasks: Entra External ID — Social Login Federation

**Input**: Design documents from `/specs/011-entra-external-id/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Constitution II mandates test-first development. Integration tests are included and MUST be written and FAIL before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Cross-Spec Dependencies**: Spec 004 (users table, permission system) MUST be applied. Spec 007 (mock auth) MUST be applied. This spec modifies the auth config established in Spec 004.

**Downstream Impact**: All features that rely on `getServerSession()` or `requireAuth()` are unaffected — the session shape is unchanged. Spec 007 mock auth continues to work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Auth lib**: `apps/web/src/lib/auth/`
- **API routes**: `apps/web/src/app/api/`
- **Page routes**: `apps/web/src/app/`
- **Components**: `apps/web/src/components/auth/`
- **Shared types**: `packages/shared/src/types/`
- **Migrations**: `apps/web/src/db/migrations/`
- **Integration tests**: `apps/web/tests/integration/`
- **E2E tests**: `apps/web/tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment config, SQL migrations, and shared type definitions that all user stories depend on.

- [X] T001 Add `ENTRA_TENANT_DOMAIN` to the Zod env schema in `apps/web/src/lib/config.ts` — validates string min(1); add to `.env.example` with a placeholder comment
- [X] T002 [P] Create SQL migration `apps/web/src/db/migrations/011-001-add-social-auth-columns.sql` — adds `provider`, `provider_oid` (unique where not null), `avatar_url`, `updated_at` columns to the `users` table per data-model.md
- [X] T003 [P] Create SQL migration `apps/web/src/db/migrations/011-002-create-linked-accounts.sql` — creates `linked_accounts` table with `UNIQUE (provider_oid)` and `REFERENCES users(id) ON DELETE CASCADE` per data-model.md
- [X] T004 [P] Add `LinkedAccount`, `SocialUserProfile`, `SocialProvider`, `UserSocialFields`, `ProviderButtonConfig`, `SOCIAL_PROVIDERS` to `packages/shared/src/types/auth.ts` per `contracts/auth-types.ts`
- [X] T005 Re-export new auth types from `packages/shared/src/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth config update, user provisioning service, and session plumbing. All user stories depend on this.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Tests for Foundational Phase

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T006 [P] Integration tests for `upsertSocialUser` in `apps/web/tests/integration/social-user.test.ts`:
  - New user → inserts row in users table with correct fields
  - Existing user (same oid) → updates email, displayName, avatarUrl; does NOT create duplicate
  - Apple user with null email → inserts without error, email column is null
  - `getUserIdByOid()` → returns platform UUID for known oid, null for unknown oid
  - Cross-lookup: `getUserIdByOid()` finds userId via `linked_accounts` when not in `users.provider_oid`

### Implementation for Foundational Phase

- [X] T007 Create `apps/web/src/lib/auth/social-user.ts`:
  - `upsertSocialUser(profile: SocialUserProfile): Promise<string>` — INSERT ON CONFLICT (provider_oid) DO UPDATE, returns `users.id`
  - `getUserIdByOid(oid: string): Promise<string | null>` — checks `users.provider_oid` UNION `linked_accounts.provider_oid`, returns platform userId or null
- [X] T008 Update `apps/web/src/lib/auth/config.ts`:
  - Change `MicrosoftEntraID` issuer from `login.microsoftonline.com/{ENTRA_TENANT_ID}/v2.0` to `https://${ENTRA_TENANT_DOMAIN}.ciamlogin.com/${ENTRA_TENANT_ID}/v2.0`
  - Add `signIn` callback: extract `profile.oid`, call `upsertSocialUser()`, return false if no oid
  - Update `jwt` callback: set `token.userId` from `profile.oid` (via `getUserIdByOid()` to map oid → platform UUID)
  - Update `session` callback: set `session.user.id = token.userId` (unchanged session shape)

**Checkpoint**: Auth config updated, user provisioning service complete and tested. Google sign-in can now create/retrieve a platform user. Proceed to user story phases.

---

## Phase 3: User Story 1 + 2 + 6 — Google Sign-In, Account Continuity, Login Page (Priority: P1) 🎯 MVP

**Goal**: Users can sign in with Google through Entra External ID. Returning users get the same userId. Unauthenticated users are redirected to a login page with social provider buttons.

**Independent Test**: Start the app with Entra External ID credentials configured. Navigate to a protected route — redirect to `/login`. Click "Sign in with Google." Complete the Entra-hosted Google authentication. Return to the app. Verify `getServerSession()` returns a `userId`. Sign out. Sign in again with Google — same `userId` returned. Zero duplicate users in the DB.

### Tests for User Stories 1, 2, 6

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T009 [P] Integration test for protected route redirect in `apps/web/tests/integration/login-redirect.test.ts`:
  - GET protected route with no session → 401 (API) or redirect to `/login?callbackUrl=...` (page)
  - GET `/login` → renders login page (200)
- [X] T010 [P] Integration test for account continuity in `apps/web/tests/integration/social-user.test.ts` (extend T006 file):
  - Call `upsertSocialUser` twice with the same oid → second call returns the same userId
  - Verify only one row in users table after two upserts

### Implementation for User Stories 1, 2, 6

- [X] T011 Create login page `apps/web/src/app/login/page.tsx` — server component that resolves `callbackUrl` from search params (validates same-origin), passes `LoginPageConfig` to client sub-component
- [X] T012 Create `apps/web/src/components/auth/LoginButtons.tsx` — client component:
  - When `entraConfigured = false` (no `NEXT_PUBLIC_AUTH_CONFIGURED`): renders Spec 007 MockUserSwitcher
  - When `entraConfigured = true`: renders social provider buttons (Google, Facebook, Apple) using `SOCIAL_PROVIDERS` from shared types
  - Each button calls `signIn('microsoft-entra-id', { callbackUrl })` via next-auth/react
  - Loading state: disable button + show spinner during sign-in redirect
  - Error state: display i18n error message if `error` search param present
- [X] T013 Create `apps/web/src/components/auth/auth-messages.ts` — i18n message keys: `auth.signInWithGoogle`, `auth.signInWithFacebook`, `auth.signInWithApple`, `auth.signInError`, `auth.signInLoading`, `auth.loginPageTitle`, `auth.loginPageSubtitle`
- [X] T014 [P] Update NextAuth middleware (`apps/web/src/middleware.ts` or equivalent) to redirect unauthenticated users accessing page routes to `/login?callbackUrl=[path]`
- [X] T015 [P] Verify `callbackUrl` validation in login page server component: only allow same-origin URLs; redirect to `/` if `callbackUrl` is absent or external

**Checkpoint**: Google sign-in works end-to-end. Unauthenticated users are redirected to `/login`. Returning users receive the same userId. User Stories 1, 2, and 6 are complete and independently testable.

---

## Phase 4: User Stories 3 + 4 — Facebook and Apple Social Login (Priority: P2)

**Goal**: Facebook and Apple social providers are available on the login page and produce valid sessions.

**Note**: Facebook and Apple social providers are configured in the Entra External ID portal (not in app code). The platform code changes in this phase are primarily UI additions (two new provider buttons) and Apple's special handling of relay emails.

**Independent Test**: On the login page, click "Sign in with Facebook." Authenticate via Entra → Facebook. Return to app — valid session established. Repeat for Apple. Verify Apple relay email is handled without error (email can be null).

### Tests for User Stories 3, 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T016 [P] Unit test for `upsertSocialUser` with `email = null` in `apps/web/tests/integration/social-user.test.ts` — verifies no DB error and user is created with null email (covers Apple relay email scenario)
- [X] T017 [P] Unit test for `getUserIdByOid` — Apple oid matches after second sign-in despite null email

### Implementation for User Stories 3, 4

- [X] T018 Verify `LoginButtons.tsx` already renders Facebook and Apple buttons via `SOCIAL_PROVIDERS` array (implemented in T012 — confirm all three are present and accessible)
- [X] T019 Verify `upsertSocialUser` handles `null` email without error (confirmed by T016 test) — no additional code changes if T007 handles nullable email
- [X] T020 Add Apple-specific display name fallback: if `profile.name` is null (Apple sometimes omits it after first consent), use `profile.email` prefix or "Apple User" as the default display name in `upsertSocialUser`
- [X] T021 [P] Accessibility audit of `LoginButtons.tsx`: verify all three provider buttons have accessible labels (`aria-label` includes provider name), meet 44×44 px touch target, and pass axe-core

**Checkpoint**: All three social providers (Google, Facebook, Apple) produce valid sessions. User Stories 3 and 4 are complete.

---

## Phase 5: User Story 5 — Account Linking (Priority: P3)

**Goal**: Authenticated users can link additional social provider identities to their platform account. Signing in with any linked identity returns the same userId.

**Independent Test**: Sign in with Google. Go to profile settings. Click "Link Apple account." Authenticate with Apple via Entra External ID. Verify a row in `linked_accounts` links the Apple oid to the user's userId. Sign out. Sign in with Apple. Verify the same userId is returned.

### Tests for User Story 5

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T022 [P] Integration tests for `POST /api/auth/link` in `apps/web/tests/integration/link-account.test.ts`:
  - Unauthenticated request → 401
  - Valid link with unused oid → 200 + linked_accounts row created
  - Same oid linked to same userId again → 200 (idempotent, no second row)
  - Same oid already linked to different userId → 409 Conflict
  - Invalid/expired linkToken → 422
  - Non-owner attempt (user A tries to link to user B's account via tampered token) → 401/403
- [X] T023 Integration test for cross-provider login after linking in `apps/web/tests/integration/social-user.test.ts`:
  - Link Apple oid to user with Google oid
  - `getUserIdByOid(appleOid)` → returns the Google user's platform userId

### Implementation for User Story 5

- [X] T024 Create `apps/web/src/app/api/auth/link/route.ts` — `POST /api/auth/link`:
  - `requireAuth()` guard → 401 if unauthenticated
  - Zod validation of request body (`LinkAccountRequestBody` from contracts)
  - Verify `linkToken` against server-side session storage → 422 if invalid/expired
  - Check `linked_accounts` for `provider_oid` uniqueness → 409 if already linked to different user
  - INSERT into `linked_accounts` (idempotent: ON CONFLICT DO NOTHING for same user+oid)
  - Return `LinkAccountSuccessResponse`
- [X] T025 Create `apps/web/src/app/api/auth/link/init/route.ts` — `GET /api/auth/link/init`:
  - `requireAuth()` guard
  - Generate UUID link token, store in user session with 10-minute expiry
  - Return `LinkInitResponse`
- [X] T026 Create `apps/web/src/app/api/auth/link/[id]/route.ts` — `DELETE /api/auth/link/:id`:
  - `requireAuth()` guard
  - Verify the linked_accounts row belongs to the authenticated user → 403 if not
  - Guard against removing last identity: count (users.provider_oid + linked_accounts rows) — if 1, return 409
  - DELETE from linked_accounts
  - Return `UnlinkAccountSuccessResponse`
- [X] T027 Create `apps/web/src/components/auth/LinkedAccountsList.tsx` — profile settings UI:
  - Fetch `/api/profile/linked-accounts` (or derive from session/page props)
  - List linked accounts with provider icon and "Remove" button
  - "Add account" button: calls `/api/auth/link/init` then `signIn()` with link callback
  - Disable "Remove" on the last identity with tooltip explaining why

**Checkpoint**: Account linking is complete. Users can connect multiple social providers and sign in with any of them.

---

## Phase 6: GDPR, Cross-Cutting Concerns, and Polish

**Purpose**: GDPR compliance for new PII fields, i18n completeness, accessibility audit.

### Tests for Phase 6

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T028 [P] Integration test for GDPR deletion in `apps/web/tests/integration/gdpr-social.test.ts`:
  - Seed user with provider_oid, email, avatar_url, and linked_accounts rows
  - Call GDPR deletion function
  - Verify `linked_accounts` rows are deleted
  - Verify `users.provider_oid`, `users.avatar_url`, `users.email`, `users.display_name` are anonymised
- [X] T029 [P] Integration test for GDPR export in `apps/web/tests/integration/gdpr-social.test.ts`:
  - Seed user with linked accounts
  - Call GDPR export function
  - Verify export JSON includes `linked_accounts` array and social fields from `users`

### Implementation for Phase 6

- [X] T030 Update GDPR deletion service to include:
  - `DELETE FROM linked_accounts WHERE user_id = $userId`
  - `UPDATE users SET provider_oid = NULL, avatar_url = NULL, email = '[deleted]', display_name = '[deleted]', provider = NULL WHERE id = $userId`
- [X] T031 Update GDPR data-export service to include `linked_accounts` rows and social fields from `users` in the export JSON
- [X] T032 [P] i18n audit: verify all strings in `LoginButtons.tsx`, `LinkedAccountsList.tsx`, and error messages use keys from `auth-messages.ts` — zero raw string literals
- [X] T033 [P] Accessibility audit of login page and linked accounts UI:
  - Run axe-core → zero violations
  - Verify all provider buttons: `aria-label` set, 44×44 px touch target
  - Verify error messages announced via `role="alert"` or `aria-live`
- [X] T034 [P] Update `specs/constitution.md` Principle–Spec Alignment Matrix to include Spec 011 row

**Checkpoint**: All GDPR, i18n, and accessibility requirements met. Spec 011 is fully complete.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (migrations, types). BLOCKS all user stories
- **P1 User Stories (Phase 3)**: Depends on Phase 2 — Google sign-in, account continuity, login page
- **P2 User Stories (Phase 4)**: Depends on Phase 3 — Facebook and Apple (mostly config + UI)
- **P3 User Story (Phase 5)**: Depends on Phase 3 (auth baseline) — account linking
- **Phase 6**: Depends on Phase 4 + 5 — GDPR covers all new tables; a11y covers all new UI

### Within Each Phase

- Tests MUST be written and FAIL before implementation
- Migrations before service functions
- Service functions before API routes
- API routes before UI components

### Parallel Opportunities

- T002 and T003 (migrations) can run in parallel
- T004 and T005 (types) can run in parallel with migrations
- T006 (integration tests) can be written while T007 (service implementation) is in progress
- T009, T010 (Phase 3 tests) can run in parallel with each other
- T011–T015 implementation tasks: T011 and T014 can run in parallel
- T016 and T017 (Phase 4 tests) can run in parallel
- T022 and T023 (Phase 5 tests) can run in parallel
- T028 and T029 (GDPR tests) can run in parallel
- T030 and T031 (GDPR implementation) can run in parallel
- T032, T033, T034 can run in parallel

---

## Implementation Strategy

### MVP (Phase 1 + 2 + 3 only)

1. Apply migrations (T001–T003)
2. Add shared types (T004–T005)
3. Write and fail integration tests for social-user service (T006)
4. Implement social-user service (T007)
5. Update auth config (T008)
6. Write and fail login page tests (T009–T010)
7. Implement login page + buttons (T011–T015)
8. **VALIDATE**: Google sign-in works end-to-end in staging
9. Deploy MVP

### Full Delivery (all phases)

- Complete MVP first
- Phase 4: Facebook + Apple (primarily portal config + minor Apple null-email handling)
- Phase 5: Account linking (new endpoints + UI)
- Phase 6: GDPR + i18n + a11y hardening
