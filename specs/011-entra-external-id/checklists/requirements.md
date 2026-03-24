# Spec Quality Checklist: Entra External ID — Social Login Federation

**Spec**: 011-entra-external-id | **Date**: 2026-03-22  
**Reviewer**: *(fill in before merge)*

---

## Specification Completeness

- [x] Feature has a descriptive title and clear summary
- [x] All user stories have priorities (P1, P2, P3)
- [x] Every user story is independently testable
- [x] Every user story has Given/When/Then acceptance scenarios
- [x] Edge cases are documented (null email, duplicate oid, disabled account, network failure)
- [x] Functional requirements (FR-xxx) cover all acceptance scenarios
- [x] Key entities are defined (User, LinkedAccount, AuthSession)
- [x] Success criteria are measurable (SC-xxx)
- [x] Assumptions are explicitly listed

---

## Constitution Compliance

- [x] **I. API-First**: New endpoints defined in `contracts/link-account-api.ts`. Response types in `packages/shared/src/types/auth.ts`. Error envelope uses `{ error, code }` pattern.
- [x] **II. Test-First**: Integration tests for `upsertSocialUser`, `getUserIdByOid`, link endpoint, GDPR functions. Tests written before implementation (TDD).
- [x] **III. Privacy**: PII fields identified. GDPR deletion and export updated to cover new tables. Integration tests prove GDPR coverage. `provider_oid` is pseudonymous — included in deletion.
- [x] **IV. Server-Side Authority**: `oid` validated server-side from Entra token. `signIn` callback rejects tokens without `oid`. `linkToken` verified server-side. No client input trusted.
- [x] **V. UX Consistency**: Login page WCAG 2.1 AA. Mobile-first. Touch targets ≥ 44×44 px. Loading and error states on sign-in buttons. Design tokens used.
- [x] **VI. Performance Budget**: JWT session (no DB per request). User provisioning is a single upsert. No N+1 queries. Account linking is a single INSERT.
- [x] **VII. Simplicity**: No new npm dependencies. Social providers configured in Azure portal (not in app). Single OIDC endpoint. No custom OAuth flows.
- [x] **VIII. Internationalisation**: All login page strings in `auth-messages.ts` (i18n keys). No raw string literals. Error messages use i18n keys.
- [x] **IX. Scoped Permissions**: No changes to permission system. New users get `member` role by default (no grants). `withPermission()` unchanged.
- [x] **XI. Resource Ownership**: Account linking verifies caller owns the account. DELETE `/api/auth/link/:id` verifies the linked_account belongs to the authenticated user.
- [x] **XIII. Development Environment**: No platform-specific tooling. Codespaces-compatible. Mock auth (Spec 007) unchanged.
- [x] **XIV. Managed Identity**: Entra External ID in production uses `DefaultAzureCredential`-compatible token flow. No shared keys or connection strings introduced for Azure services. `AZURE_CLIENT_ID` env var documented.
- [x] **QG-10**: `POST /api/auth/link` has integration test proving 401 for unauthenticated and 403 for non-owner.
- [x] **QG-11**: All routes use `getServerSession()` / `requireAuth()`. No client-injectable headers. Verified in auth config.
- [x] **QG-12**: `linked_accounts` references `users.id`. GDPR deletion integration test covers new tables. New PII fields covered in export test.

---

## Data Model Review

- [x] Migrations are written in raw SQL (no ORM) following existing convention
- [x] Migration filenames follow `NNN-NNN-description.sql` convention
- [x] New columns are `NULL`-safe for existing rows (no breaking changes)
- [x] `UNIQUE` constraint on `provider_oid` (partial index for nulls)
- [x] `ON DELETE CASCADE` on `linked_accounts.user_id → users.id` (GDPR compliance)
- [x] PII fields documented in data-model.md PII table

---

## API Contract Review

- [x] Request types defined with Zod validation notes
- [x] All response codes documented (200, 400, 401, 409, 422)
- [x] Error responses use `{ error: string, code: string }` envelope (Constitution I)
- [x] Idempotency behaviour documented (same oid + same userId → 200, no duplicate row)
- [x] CSRF protection documented for account-linking flow

---

## Tasks Review

- [x] Tasks are ordered by dependency (migrations → types → service → API → UI)
- [x] All P1 user stories covered in Phase 3
- [x] All P2 user stories covered in Phase 4
- [x] All P3 user stories covered in Phase 5
- [x] GDPR and a11y tasks in final phase
- [x] Integration tests precede implementation tasks in each phase
- [x] Constitution alignment matrix update included (T034)
- [x] Parallel tasks marked with `[P]`

---

## Open Questions / Risks

| # | Question | Owner | Status |
|---|---------|-------|--------|
| 1 | Which Entra External ID tenant will be used for staging vs. production? One tenant or two? | Platform Ops | Open |
| 2 | Are Facebook App credentials already provisioned? Or does this spec block on Facebook app creation? | Platform Ops | Open |
| 3 | Apple Developer account set up with Sign in with Apple? Requires paid developer membership. | Platform Ops | Open |
| 4 | Should the login page include email/password as a future option? If yes, the layout needs to accommodate it. | Product | Open |
| 5 | Is account linking in scope for the initial release (MVP), or should it be deferred to a follow-up? | Product | Open — currently P3 |
