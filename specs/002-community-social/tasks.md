# Tasks: Community & Social Features

**Input**: Design documents from `/specs/002-community-social/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Dependencies**:
- Spec 004 (Permissions) — `withPermission()`, `withAuth()`, Member role, `users` table, Entra ID auth
- Spec 001 (Event Discovery) — `cities` table (homeCityId FK), `events` table (thread entity), `rsvps` table (thread access), geolocation snap

**Downstream consumers**:
- Spec 005 uses Report system for review moderation
- All specs use UserProfile for display names

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding, database migration, shared types, and test harness for 002

- [ ] T001 Create directory structure for 002 per plan.md: `src/lib/profiles/`, `src/lib/follows/`, `src/lib/threads/`, `src/lib/safety/`, `src/lib/gdpr/`, `src/types/`, and all API route directories under `src/app/api/`
- [ ] T002 Create database migration file `src/db/migrations/002_community_social.sql` with all 10 tables + sentinel user INSERT per data-model.md
- [ ] T003 [P] Create shared contract types in `src/types/community.ts` — export all enums (`SocialPlatform`, `LinkVisibility`, `Relationship`, `ThreadEntityType`, `ReactionEmoji`, `ReportReason`, `ReportStatus`, `ExportStatus`) and entity interfaces (`UserProfilePublic`, `UserProfileSelf`, `SocialLink`, `FollowEntry`, `Thread`, `Message`, `ReactionSummary`, `Block`, `Mute`, `Report`, `DataExport`, `ExportFileSchema`)
- [ ] T004 [P] Create Zod validation schemas in `src/lib/validation/community-schemas.ts` — schemas for all API request bodies: `UpdateProfileRequest`, `SetSocialLinksRequest`, `DetectCityRequest`, `CreateFollowRequest`, `CreateMessageRequest`, `EditMessageRequest`, `ToggleReactionRequest`, `SetThreadLockRequest`, `SetMessagePinRequest`, `CreateBlockRequest`, `CreateMuteRequest`, `CreateReportRequest`, `ReviewReportRequest`, `DeleteAccountRequest`
- [ ] T005 [P] Add new permission actions `moderateThread` and `moderateReports` to Spec 004's permission action enum in the shared permissions types
- [ ] T006 [P] Create PGlite test harness for 002 in `tests/integration/helpers/community-test-db.ts` — `createTestDb()` that runs migrations 004 → 001 → 002 in order, provides seed helpers for users, cities, events, and RSVPs

**Checkpoint**: Scaffolding complete — migration runnable, types importable, test DB harness available

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core service utilities that ALL user stories depend on — relationship computation, block checking, auth wrappers

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Implement relationship computation in `src/lib/follows/relationship.ts` — `getRelationship(viewerId, profileOwnerId): Promise<Relationship>` using follows table JOIN to derive `self | friend | follower | none`
- [ ] T008 [P] Implement block check helper in `src/lib/safety/blocks.ts` — `isBlocked(userA, userB): Promise<boolean>` with symmetric OR query per research R-5
- [ ] T009 [P] Implement mute list loader in `src/lib/safety/mutes.ts` — `getMutedUserIds(userId): Promise<string[]>` for thread message filtering
- [ ] T010 Implement social link visibility filter in `src/lib/profiles/visibility.ts` — `filterSocialLinks(links, viewerId, relationship): SocialLink[]` per research R-2 logic (everyone → followers → friends → hidden cascade)

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 — Set Up My Profile (Priority: P0) 🎯 MVP

**Goal**: A new user can create/edit their profile with display name, home city (auto-detected or manual), default role, bio, avatar, and social links with per-platform visibility.

**Independent Test**: Call `PUT /api/profiles/me` with profile data, then `GET /api/profiles/me` and verify all fields returned. Call `PUT /api/profiles/me/social-links` with links, then `GET /api/profiles/:userId` as another user and verify visibility filtering.

### Implementation for User Story 1

- [ ] T011 [P] [US1] Create profile types in `src/lib/profiles/types.ts` — TypeScript types for `UserProfile`, `SocialLink`, `ProfileRow`, `SocialLinkRow` matching data-model.md columns
- [ ] T012 [P] [US1] Create follow types in `src/lib/follows/types.ts` — TypeScript types for `FollowRow`, `FollowEntry` matching data-model.md
- [ ] T013 [US1] Implement profile service in `src/lib/profiles/service.ts` — `getMyProfile(userId)`, `getProfile(userId, viewerId)` (with block check + visibility filtering), `upsertProfile(userId, data)` (INSERT on first call, UPDATE after), `setSocialLinks(userId, links)` (upsert — delete missing platforms, insert/update provided)
- [ ] T014 [US1] Implement home city detection in `src/lib/profiles/service.ts` — `detectHomeCity(lat, lon)` delegating to Spec 001's `/api/cities/nearest` endpoint (100km Haversine snap per R-1)
- [ ] T015 [P] [US1] Create API route `GET /api/profiles/me` in `src/app/api/profiles/me/route.ts` — `withAuth` wrapper, calls `getMyProfile`, returns `UserProfileSelf`
- [ ] T016 [P] [US1] Create API route `PUT /api/profiles/me` in `src/app/api/profiles/me/route.ts` — `withAuth`, Zod validate `UpdateProfileRequest`, calls `upsertProfile`, returns `UpdateProfileResponse`
- [ ] T017 [P] [US1] Create API route `PUT /api/profiles/me/social-links` in `src/app/api/profiles/me/social-links/route.ts` — `withAuth`, Zod validate `SetSocialLinksRequest` (max 1 per platform, valid URLs), calls `setSocialLinks`
- [ ] T018 [P] [US1] Create API route `POST /api/profiles/me/detect-city` in `src/app/api/profiles/me/detect-city/route.ts` — `withAuth`, Zod validate `DetectCityRequest`, delegates to city snap logic, returns `DetectCityResponse`
- [ ] T019 [US1] Create API route `GET /api/profiles/:userId` in `src/app/api/profiles/[userId]/route.ts` — public/authenticated, calls `getProfile(userId, viewerId)` with block check (return 404 if blocked), visibility-filtered social links, includes follower/following/friend counts and relationship status
- [ ] T020 [US1] Create profile page `src/app/profile/page.tsx` — own profile view/edit form: display name, bio, default role, avatar URL, home city (auto-detect button + manual picker), social links with per-platform visibility dropdown
- [ ] T021 [US1] Create other user profile page `src/app/profile/[userId]/page.tsx` — read-only display with visibility-filtered social links, follow button, block/mute/report actions

**Checkpoint**: Profile setup fully functional — users can create profiles with social links and visibility controls

---

## Phase 4: User Story 2 — Control My Privacy (Priority: P0)

**Goal**: Social link visibility enforced server-side; blocked users see 404; hidden links never leak in API responses.

**Independent Test**: Set link visibility to `friends`, then `GET /api/profiles/:userId` as non-friend — verify link absent. Block a user, then `GET /api/profiles/:userId` — verify 404. Verify `GET /api/profiles/:userId` response never contains `hidden` links regardless of caller.

### Implementation for User Story 2

- [ ] T022 [US2] Add privacy settings page `src/app/settings/privacy/page.tsx` — displays current blocks list, mutes list, with unblock/unmute actions; social link visibility management (redirect to profile edit)
- [ ] T023 [US2] Add block enforcement to profile API route `src/app/api/profiles/[userId]/route.ts` — ensure `isBlocked()` check returns 404 for blocked pairs, and social link visibility filter is applied using `getRelationship()` + `filterSocialLinks()`
- [ ] T024 [US2] Add block enforcement to attendee list (integration point with Spec 001) — when returning event attendee lists, filter out blocked users in each direction so neither party sees the other

**Checkpoint**: Privacy controls verified — visibility tiers enforced, blocks hide profiles mutually

---

## Phase 5: User Story 3 — Follow and Friend Other Members (Priority: P1)

**Goal**: Users can follow/unfollow others. Mutual follows derive friend status used for visibility tier resolution.

**Independent Test**: User A follows User B → A appears in B's followers. B follows A back → both listed as friends. `GET /api/follows/friends` returns mutual follows. Unfollow → friend status reverted.

### Implementation for User Story 3

- [ ] T025 [US3] Implement follow service in `src/lib/follows/service.ts` — `follow(followerId, followeeId)` (check: not self, not blocked, not duplicate; return `becameFriends` boolean), `unfollow(followerId, followeeId)` (return `wasFriends`), `getFollowers(userId, page, pageSize)`, `getFollowing(userId, page, pageSize)`, `getFriends(userId, page, pageSize)` using mutual follow JOIN
- [ ] T026 [P] [US3] Create API route `POST /api/follows` in `src/app/api/follows/route.ts` — `withAuth`, Zod validate `CreateFollowRequest`, calls `follow()`, returns `CreateFollowResponse`
- [ ] T027 [P] [US3] Create API route `DELETE /api/follows/:followeeId` in `src/app/api/follows/[followeeId]/route.ts` — `withAuth`, calls `unfollow()`, returns `UnfollowResponse`
- [ ] T028 [P] [US3] Create API route `GET /api/follows/followers` in `src/app/api/follows/followers/route.ts` — `withAuth`, paginated, calls `getFollowers()`
- [ ] T029 [P] [US3] Create API route `GET /api/follows/following` in `src/app/api/follows/route.ts` (GET handler) — `withAuth`, paginated, calls `getFollowing()`
- [ ] T030 [P] [US3] Create API route `GET /api/follows/friends` in `src/app/api/follows/friends/route.ts` — `withAuth`, paginated, calls `getFriends()`
- [ ] T031 [US3] Wire follow/unfollow button on profile page `src/app/profile/[userId]/page.tsx` — show Follow/Unfollow/Friends badge based on relationship status

**Checkpoint**: Follow system operational — friend status derived, visibility tiers now fully functional for social links

---

## Phase 6: User Story 6 — Block, Mute, and Report (Priority: P1)

**Goal**: Users can block (symmetric hide + sever follows), mute (hide messages in threads), and report other users to scoped admin queues.

**Independent Test**: Block user → follows severed, profile returns 404, messages hidden. Mute user → messages filtered from thread view, follows preserved. Report user → report appears in scoped admin queue.

### Implementation for User Story 6

### Block

- [ ] T032 [US6] Implement block service in `src/lib/safety/blocks.ts` — `blockUser(blockerId, blockedId)` (check: not self, not already blocked; sever follows both directions; return `severedFollows` count), `unblockUser(blockerId, blockedId)`, `getBlockList(userId)`
- [ ] T033 [P] [US6] Create API route `POST /api/blocks` in `src/app/api/blocks/route.ts` — `withAuth`, Zod validate `CreateBlockRequest`, calls `blockUser()`, returns `CreateBlockResponse`
- [ ] T034 [P] [US6] Create API route `DELETE /api/blocks/:blockedId` in `src/app/api/blocks/[blockedId]/route.ts` — `withAuth`, calls `unblockUser()`
- [ ] T035 [P] [US6] Create API route `GET /api/blocks` in `src/app/api/blocks/route.ts` (GET handler) — `withAuth`, calls `getBlockList()`

### Mute

- [ ] T036 [US6] Implement mute service in `src/lib/safety/mutes.ts` — `muteUser(muterId, mutedId)` (check: not self, not duplicate), `unmuteUser(muterId, mutedId)`, `getMuteList(userId)`
- [ ] T037 [P] [US6] Create API route `POST /api/mutes` in `src/app/api/mutes/route.ts` — `withAuth`, Zod validate `CreateMuteRequest`, calls `muteUser()`
- [ ] T038 [P] [US6] Create API route `DELETE /api/mutes/:mutedId` in `src/app/api/mutes/[mutedId]/route.ts` — `withAuth`, calls `unmuteUser()`
- [ ] T039 [P] [US6] Create API route `GET /api/mutes` in `src/app/api/mutes/route.ts` (GET handler) — `withAuth`, calls `getMuteList()`

### Report

- [ ] T040 [US6] Implement report service in `src/lib/safety/reports.ts` — `submitReport(reporterId, data)` (check: not self-report, rate limit 10/24h; route to scoped admin queue via reported user's home city), `getReportQueue(adminId, scope, filters, pagination)` (filter by admin's permission scope using 004's geography hierarchy), `reviewReport(reportId, adminId, status, notes)` (state machine: pending→reviewed/actioned/dismissed)
- [ ] T041 [P] [US6] Create API route `POST /api/reports` in `src/app/api/reports/route.ts` — `withAuth`, Zod validate `CreateReportRequest`, calls `submitReport()`
- [ ] T042 [P] [US6] Create API route `GET /api/reports` in `src/app/api/reports/route.ts` (GET handler) — `withPermission('moderateReports', scopeFromAdmin)`, paginated, calls `getReportQueue()`
- [ ] T043 [US6] Create API route `PATCH /api/reports/:id` in `src/app/api/reports/[id]/route.ts` — `withPermission('moderateReports', ...)`, Zod validate `ReviewReportRequest`, calls `reviewReport()`

**Checkpoint**: Safety system operational — blocks symmetric, mutes filter thread messages, reports routed to scoped admins

---

## Phase 7: User Story 4 — Event Discussion Threads (Priority: P2)

**Goal**: Per-event discussion threads with messages, edit history, reactions, and admin moderation (lock, pin, delete). RSVP-based write access; read-only for non-attendees. Block/mute filtering in message lists.

**Independent Test**: RSVP to event → post message. Non-RSVP user → read-only. Edit message → edit history preserved. Admin locks thread → non-admins cannot post. Pin 3 messages → 4th pin rejected. Block user → their messages hidden.

### Implementation for User Story 4

### Core Thread & Message Logic

- [ ] T044 [P] [US4] Create thread types in `src/lib/threads/types.ts` — TypeScript types for `ThreadRow`, `MessageRow`, `ReactionRow`, `EditHistoryEntry` matching data-model.md
- [ ] T045 [US4] Implement thread access control in `src/lib/threads/access.ts` — `getThreadAccess(threadId, userId): Promise<{ canRead: boolean, canPost: boolean }>` checking: RSVP status (active=read+write, cancelled/none=read-only), thread lock (locked=admin-only write), block check (blocked=no access)
- [ ] T046 [US4] Implement thread service in `src/lib/threads/service.ts` — `getOrCreateThread(entityType, entityId)` (auto-create on first access), `getThreadByEntity(entityType, entityId)`, `listMessages(threadId, viewerId, before?, limit?)` (cursor pagination, exclude blocked users' messages, exclude muted users' messages for viewer, pinned messages separate), `getMessageCount(threadId)`
- [ ] T047 [US4] Implement message CRUD in `src/lib/threads/service.ts` — `createMessage(threadId, authorId, content)` (check access + thread lock + block), `editMessage(messageId, authorId, newContent)` (push old content to editHistory, set editedAt; author-only), `deleteMessage(messageId, deleterId, isAdmin)` (author: content→"[deleted]"; admin: content→"[deleted by admin]"; set is_deleted + deleted_by)
- [ ] T048 [US4] Implement reaction logic in `src/lib/threads/reactions.ts` — `toggleReaction(messageId, userId, emoji)` (toggle: INSERT if not exists, DELETE if exists; return action + updated reaction summary), `getReactionSummary(messageId, viewerId)` (counts + viewer's reacted flags)
- [ ] T049 [US4] Implement moderation actions in `src/lib/threads/service.ts` — `lockThread(threadId, locked)`, `pinMessage(messageId, adminId, pinned)` (enforce max 3 pinned per thread on pin)

### API Routes

- [ ] T050 [P] [US4] Create API route `GET /api/threads/by-entity/:entityType/:entityId` in `src/app/api/threads/by-entity/[entityType]/[entityId]/route.ts` — returns thread metadata
- [ ] T051 [US4] Create API route `GET /api/threads/:threadId/messages` in `src/app/api/threads/[threadId]/messages/route.ts` — authenticated or public, cursor pagination, block/mute filtering, returns `ListMessagesResponse` with `canPost` + `isLocked` + `pinnedMessages`
- [ ] T052 [P] [US4] Create API route `POST /api/threads/:threadId/messages` in `src/app/api/threads/[threadId]/messages/route.ts` — `withAuth`, Zod validate `CreateMessageRequest`, calls `createMessage()` with access check
- [ ] T053 [P] [US4] Create API route `PATCH /api/threads/:threadId/messages/:messageId` in `src/app/api/threads/[threadId]/messages/[messageId]/route.ts` — `withAuth`, author-only, Zod validate `EditMessageRequest`, calls `editMessage()`
- [ ] T054 [P] [US4] Create API route `DELETE /api/threads/:threadId/messages/:messageId` in `src/app/api/threads/[threadId]/messages/[messageId]/route.ts` — `withAuth` (author) or `withPermission('moderateThread', scopeFromEventCity)` (admin), calls `deleteMessage()`
- [ ] T055 [P] [US4] Create API route `POST /api/threads/:threadId/messages/:messageId/reactions` in `src/app/api/threads/[threadId]/messages/[messageId]/reactions/route.ts` — `withAuth`, Zod validate `ToggleReactionRequest`, calls `toggleReaction()`
- [ ] T056 [P] [US4] Create API route `PATCH /api/threads/:threadId/lock` in `src/app/api/threads/[threadId]/lock/route.ts` — `withPermission('moderateThread', scopeFromEventCity)`, calls `lockThread()`
- [ ] T057 [P] [US4] Create API route `PATCH /api/threads/:threadId/messages/:messageId/pin` in `src/app/api/threads/[threadId]/messages/[messageId]/pin/route.ts` — `withPermission('moderateThread', ...)`, Zod validate `SetMessagePinRequest`, calls `pinMessage()`

### Frontend

- [ ] T058 [US4] Create event discussion page `src/app/events/[id]/discussion/page.tsx` — message list with pinned messages at top, compose box (disabled if no RSVP or thread locked, show reason), edit/delete on own messages, reaction toggles, admin actions (lock/pin) if scoped admin

**Checkpoint**: Discussion threads functional — messages, reactions, edit history, moderation, block/mute filtering all working

---

## Phase 8: User Story 5 — Export and Delete My Data (Priority: P0)

**Goal**: GDPR data export (async job → JSON download with 7-day link) and account deletion (anonymise messages, sever relationships, nullify PII) in a single transaction.

**Independent Test**: Request export → status transitions pending→ready → download JSON → verify all user data present. Delete account → verify PII nullified, messages show "[deleted]", aggregate counts preserved, session invalidated.

### Implementation for User Story 5

### Export

- [ ] T059 [P] [US5] Create GDPR types in `src/lib/gdpr/types.ts` — `DataExportRow`, `ExportFileSchema` (profile, socialLinks, rsvps, eventInterests, credits, messagesAuthored, follows, blocks, mutes)
- [ ] T060 [US5] Implement data export service in `src/lib/gdpr/export.ts` — `requestExport(userId)` (check one active export per user; INSERT data_exports with status=pending), `processExport(exportId)` (query all user data across tables, assemble `ExportFileSchema` JSON, store to Azure Blob or local temp + signed URL, update status=ready + download_url + expires_at), `getExports(userId)` (list user's exports), `downloadExport(exportId, userId)` (verify ownership + not expired, return file), `cleanupExpiredExports()` (transition expired, delete files)
- [ ] T061 [P] [US5] Create API route `POST /api/account/export` in `src/app/api/account/export/route.ts` — `withAuth`, calls `requestExport()`, returns `RequestExportResponse`
- [ ] T062 [P] [US5] Create API route `GET /api/account/exports` in `src/app/api/account/exports/route.ts` — `withAuth`, calls `getExports()`
- [ ] T063 [P] [US5] Create API route `GET /api/account/exports/:id/download` in `src/app/api/account/exports/[id]/download/route.ts` — `withAuth`, calls `downloadExport()`, returns JSON file (Content-Disposition: attachment), or 410 if expired

### Deletion

- [ ] T064 [US5] Implement account deletion service in `src/lib/gdpr/deletion.ts` — `deleteAccount(userId, confirmation)` executing the 11-step deletion sequence from gdpr-api.ts contract in a single transaction: delete reactions on/by user, anonymise messages (author→sentinel, content→"[deleted]"), delete follows/blocks/mutes, delete social links, anonymise RSVPs (user→sentinel), anonymise reports (reporter→sentinel), delete data exports, nullify user profile PII, invalidate session
- [ ] T065 [US5] Create API route `DELETE /api/account` in `src/app/api/account/route.ts` — `withAuth`, Zod validate `DeleteAccountRequest` (confirmation="DELETE"), calls `deleteAccount()`, returns `DeleteAccountResponse`

### Frontend

- [ ] T066 [US5] Create account settings page `src/app/settings/account/page.tsx` — export data button (show export history + status + download links), delete account button with "DELETE" confirmation input, warning text about irreversibility

**Checkpoint**: GDPR compliance complete — export delivers full JSON with 7-day link, deletion anonymises all PII and preserves thread continuity

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Env config, error handling, integration validation, and quickstart verification

- [ ] T067 [P] Add `EXPORT_STORAGE_URL` and `EXPORT_LINK_EXPIRY_DAYS` environment variables to `.env.example` and environment config module per quickstart.md
- [ ] T068 [P] Add 403 integration tests for every mutation endpoint (unauthenticated caller returns 403) per constitution QG-10
- [ ] T069 [P] Verify all API response shapes match TypeScript interfaces in `src/types/community.ts` — no extra fields leaked, no PII in public responses per constitution Principle III
- [ ] T070 Run full migration sequence (004 → 001 → 002) against a clean PostgreSQL instance and verify all tables, indexes, and constraints created successfully
- [ ] T071 Run quickstart.md validation — execute all setup steps, start dev server, hit key endpoints, run integration test suite
- [ ] T072 Verify cross-spec integration: profile `homeCityId` FK resolves to Spec 001 city, thread `entityId` resolves to Spec 001 event, thread access checks query Spec 001 RSVPs, admin moderation uses Spec 004 `withPermission()` with scope resolution

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (types + migration must exist) — BLOCKS all user stories
- **US1: Profile (Phase 3)**: Depends on Phase 2 (needs `getRelationship`, `filterSocialLinks`, `isBlocked`)
- **US2: Privacy (Phase 4)**: Depends on Phase 3 (profile endpoints must exist to test filtering)
- **US3: Follow/Friend (Phase 5)**: Depends on Phase 2 only (independent from US1 at service layer, but US1 profile page wires the follow button)
- **US6: Block/Mute/Report (Phase 6)**: Depends on Phase 2 (builds on `isBlocked` foundation)
- **US4: Threads (Phase 7)**: Depends on Phase 2 + Phase 6 (needs block/mute filtering in message lists)
- **US5: GDPR (Phase 8)**: Depends on Phases 3–7 (export queries all tables; deletion touches all entities)
- **Polish (Phase 9)**: Depends on all prior phases

### User Story Dependencies

```
Phase 1 (Setup)
  └─→ Phase 2 (Foundational)
        ├─→ Phase 3 (US1: Profile) ──→ Phase 4 (US2: Privacy)
        ├─→ Phase 5 (US3: Follow)
        └─→ Phase 6 (US6: Block/Mute/Report)
              └─→ Phase 7 (US4: Threads)
                    └─→ Phase 8 (US5: GDPR) ──→ Phase 9 (Polish)
```

### Parallel Opportunities

- **Phase 1**: T003, T004, T005, T006 can all run in parallel
- **Phase 2**: T008, T009 in parallel; T007 and T010 depend on follows/profiles types
- **Phase 3**: T011+T012 in parallel; T015–T018 in parallel (independent API routes)
- **Phase 5 + Phase 6**: Can start in parallel after Phase 2 (US3 and US6 are independent)
- **Phase 6 blocks**: T033–T035 in parallel; T037–T039 in parallel; T041–T042 in parallel
- **Phase 7**: T050, T052–T057 mostly parallel (independent route files after service is built)
- **Phase 8**: T059, T061–T063 in parallel after export service
- **Phase 9**: T067, T068, T069 in parallel

### Within Each User Story

1. Types/models first
2. Service layer (business logic) second
3. API routes third (consume service layer)
4. Frontend pages last (consume API routes)

---

## Summary

| Metric | Value |
|--------|-------|
| **Total tasks** | 72 |
| **Phase 1 — Setup** | 6 tasks |
| **Phase 2 — Foundational** | 4 tasks |
| **Phase 3 — US1: Profile** | 11 tasks |
| **Phase 4 — US2: Privacy** | 3 tasks |
| **Phase 5 — US3: Follow** | 7 tasks |
| **Phase 6 — US6: Block/Mute/Report** | 12 tasks |
| **Phase 7 — US4: Threads** | 15 tasks |
| **Phase 8 — US5: GDPR** | 8 tasks |
| **Phase 9 — Polish** | 6 tasks |
| **Parallel opportunities** | 38 tasks marked [P] |
| **Suggested MVP scope** | Phases 1–4 (Setup → US1 Profile → US2 Privacy) = 24 tasks |

### Implementation Strategy

1. **MVP (Phases 1–4)**: Profile setup + privacy controls — the P0 foundation all other specs depend on
2. **Core Social (Phase 5)**: Follow/friend system — enables visibility tiers
3. **Safety (Phase 6)**: Block/mute/report — required before public-facing threads
4. **Threads (Phase 7)**: Event discussion — depends on safety enforcement
5. **GDPR (Phase 8)**: Export + deletion — must touch all prior entities, built last
6. **Polish (Phase 9)**: Cross-cutting validation and hardening
