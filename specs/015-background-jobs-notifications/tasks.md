# Tasks: Background Jobs & Notifications

**Input**: Design documents from `/specs/015-background-jobs-notifications/`
**Prerequisites**: plan.md (required), spec.md (required)

**Tests**: Constitution mandates test-first development. Tests are included and MUST fail before implementation.

**Organization**: Tasks are grouped by phase to enable incremental delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Shared types**: `packages/shared/src/types/`
- **Migrations**: `apps/web/src/db/migrations/`
- **Notification service**: `apps/web/src/lib/notifications/`
- **Job infrastructure**: `apps/web/src/lib/jobs/`
- **Email delivery**: `apps/web/src/lib/email/`
- **API routes**: `apps/web/src/app/api/`
- **Web components**: `apps/web/src/components/`
- **Web pages**: `apps/web/src/app/`
- **Integration tests**: `apps/web/tests/integration/`
- **Scripts**: `scripts/`

---

## Phase 1: Database & Types (Blocking Prerequisites)

**Purpose**: Create database schema and shared type definitions

### Tests for Phase 1

- [ ] T001 [P] [US1] Integration test for notifications table — insert, query by user, mark as read, cascade delete in `apps/web/tests/integration/notifications/notifications-db.test.ts`
- [ ] T002 [P] [US2] Integration test for preferences table — insert defaults, update per-type per-channel, query by user in `apps/web/tests/integration/notifications/preferences-db.test.ts`

### Implementation for Phase 1

- [ ] T003 [US3] Create migration `apps/web/src/db/migrations/015-001-notifications.sql` with tables: `notification_types` (enum reference), `notification_channels` (enum reference), `notification_preferences` (user_id, type, channel, enabled), `notifications` (id, user_id, type, title, body, resource_type, resource_id, read, created_at), and indexes
- [ ] T004 [P] [US1] Create shared notification types in `packages/shared/src/types/notifications.ts` — `NotificationType` enum (event_rsvp, waitlist_promotion, event_cancellation, occurrence_cancellation, review_posted, review_reminder, cert_expiry_warning, follow_new, report_resolved, payment_received), `NotificationChannel` enum (in_app, email), `NotificationPreference`, `Notification`, `NotificationListResponse` types. Re-export from `packages/shared/src/index.ts`
- [ ] T005 [P] [US3] Create job type definitions in `apps/web/src/lib/jobs/types.ts` — `JobType` enum, `JobPayload` discriminated union, `JobStatus` type

**Checkpoint**: Database schema created, types defined. No runtime code yet.

---

## Phase 2: Job Queue Infrastructure (US3 — Background Processing)

**Purpose**: Install pg-boss, create queue initialization, worker process, test enqueue/dequeue

### Tests for Phase 2

- [ ] T006 [P] [US3] Integration test for job enqueue and dequeue — verify job is persisted, worker picks it up, handler is called with correct payload, failed jobs are retried in `apps/web/tests/integration/jobs/queue.test.ts`
- [ ] T007 [P] [US3] Integration test for job retry and dead-letter — verify exponential backoff timing, max retry count, dead-letter queue insertion in `apps/web/tests/integration/jobs/retry.test.ts`

### Implementation for Phase 2

- [ ] T008 [US3] Install `pg-boss` in `apps/web/package.json`. Create queue singleton in `apps/web/src/lib/jobs/queue.ts` — pg-boss initialization with PostgreSQL connection, graceful shutdown handler
- [ ] T009 [US3] Create job worker in `apps/web/src/lib/jobs/worker.ts` — register handlers for each job type, process jobs with error handling, log failures
- [ ] T010 [US3] Create worker entry point script `scripts/start-worker.ts` — initialize pg-boss, register all job handlers, start processing loop
- [ ] T011 [US3] Add `enqueueJob()` helper in `apps/web/src/lib/jobs/queue.ts` — type-safe job enqueue with payload validation, deduplication key support

**Checkpoint**: Job queue functional — can enqueue and process jobs. Worker runs as separate process.

---

## Phase 3: In-App Notifications (US1)

**Purpose**: Implement notification service, API routes, bell component, notification list

### Tests for Phase 3

- [ ] T012 [P] [US1] Integration tests for notification service — `createNotification()`, `getNotificationsForUser()`, `markAsRead()`, `getUnreadCount()`, `deleteNotification()` in `apps/web/tests/integration/notifications/service.test.ts`
- [ ] T013 [P] [US1] Integration tests for notification API routes — GET list (auth, pagination), POST mark-as-read (auth, ownership), 403 for other users' notifications in `apps/web/tests/integration/notifications/routes.test.ts`

### Implementation for Phase 3

- [ ] T014 [US1] Implement notification service in `apps/web/src/lib/notifications/service.ts` — `createNotification()` (insert + enqueue delivery job), `getNotificationsForUser()` (paginated, sorted by created_at desc), `markAsRead()`, `getUnreadCount()`, `deleteNotificationsForUser()` (GDPR deletion)
- [ ] T015 [P] [US1] Implement in-app delivery adapter in `apps/web/src/lib/notifications/delivery.ts` — `deliverInApp()` (insert into notifications table — already done by createNotification), `deliverEmail()` (stub, implemented in Phase 5)
- [ ] T016 [US1] Create API routes: `GET /api/notifications` (list for current user, paginated), `POST /api/notifications/:id/read` (mark as read, ownership check) in `apps/web/src/app/api/notifications/`
- [ ] T017 [US1] Create notification message templates in `apps/web/src/lib/notifications/templates.ts` — i18n-ready template functions for each notification type, returning title + body + resource link
- [ ] T018 [US1] Create `NotificationBell` component in `apps/web/src/components/NotificationBell.tsx` — bell icon with unread count badge, dropdown showing recent notifications, click to navigate to resource
- [ ] T019 [US1] Create notification list page `apps/web/src/app/notifications/page.tsx` — full notification history with infinite scroll, read/unread filter, mark-all-as-read action
- [ ] T020 [US1] Add `NotificationBell` to site header layout — visible on all authenticated pages

**Checkpoint**: In-app notifications functional end-to-end. Users see notifications in bell and list page.

---

## Phase 4: Notification Preferences (US2)

**Purpose**: Implement preferences service, API routes, and preferences management UI

### Tests for Phase 4

- [ ] T021 [P] [US2] Integration tests for preferences service — `getPreferences()` (defaults on first access), `updatePreference()` (toggle per type per channel), `getEnabledChannels()` (filter channels for a notification type) in `apps/web/tests/integration/notifications/preferences-service.test.ts`
- [ ] T022 [P] [US2] Integration tests for preferences API routes — GET (auth), PUT (auth, validation), 403 for other users' preferences in `apps/web/tests/integration/notifications/preferences-routes.test.ts`

### Implementation for Phase 4

- [ ] T023 [US2] Implement preferences service in `apps/web/src/lib/notifications/preferences.ts` — `getPreferences()` (return all types × channels with defaults), `updatePreference()` (upsert per type per channel), `getEnabledChannels()` (query enabled channels for a notification type and user)
- [ ] T024 [US2] Create API routes: `GET /api/notifications/preferences` (current user's preferences), `PUT /api/notifications/preferences` (update with Zod validation) in `apps/web/src/app/api/notifications/preferences/`
- [ ] T025 [US2] Create `NotificationPreferences` component in `apps/web/src/components/NotificationPreferences.tsx` — grouped by category (Events, Community, Teachers, Payments), toggle per type per channel
- [ ] T026 [US2] Create preferences page `apps/web/src/app/settings/notifications/page.tsx` — settings layout with NotificationPreferences component
- [ ] T027 [US2] Integrate preferences check into notification delivery — before delivering to any channel, query user preferences and skip disabled channels

**Checkpoint**: Users can manage notification preferences. Delivery respects preferences.

---

## Phase 5: Email Channel (US4)

**Purpose**: Implement email delivery via Azure Communication Services

### Tests for Phase 5

- [ ] T028 [P] [US4] Integration tests for email delivery — mock Azure Communication Services client, verify email construction, verify unsubscribe link generation, verify preference check in `apps/web/tests/integration/notifications/email-delivery.test.ts`
- [ ] T029 [P] [US4] Integration tests for unsubscribe route — verify one-click unsubscribe updates preferences, works without authentication, returns confirmation page in `apps/web/tests/integration/notifications/unsubscribe.test.ts`

### Implementation for Phase 5

- [ ] T030 [US4] Create email client in `apps/web/src/lib/email/client.ts` — Azure Communication Services SDK initialization with Managed Identity, `sendEmail()` function
- [ ] T031 [P] [US4] Create email templates in `apps/web/src/lib/email/templates/` — `base.html` (branded layout with header, footer, unsubscribe link), `notification.html` (generic notification with title, body, action button)
- [ ] T032 [US4] Implement email delivery adapter in `apps/web/src/lib/notifications/delivery.ts` — `deliverEmail()` renders template with notification data, sends via email client, includes signed unsubscribe link
- [ ] T033 [US4] Create unsubscribe route `apps/web/src/app/api/unsubscribe/route.ts` — verify signed token, update notification preferences, return confirmation HTML page. No authentication required (email link access)

**Checkpoint**: Email notifications delivered via Azure Communication Services. One-click unsubscribe functional.

---

## Phase 6: Scheduled Jobs (US5)

**Purpose**: Implement cron job definitions for periodic tasks

### Tests for Phase 6

- [ ] T034 [P] [US5] Integration tests for scheduled jobs — verify review reminder identifies eligible events, cert-expiry identifies expiring certs, waitlist cleanup removes stale entries in `apps/web/tests/integration/jobs/scheduled.test.ts`

### Implementation for Phase 6

- [ ] T035 [US5] Create scheduled job definitions in `apps/web/src/lib/jobs/scheduled.ts` — `reviewReminderJob` (weekly: find events completed in past week without reviews, enqueue reminder notifications), `certExpiryJob` (daily: find certifications expiring within 30 days, enqueue warning notifications), `waitlistCleanupJob` (daily: remove stale waitlist entries for past events)
- [ ] T036 [US5] Register scheduled jobs in worker startup — configure pg-boss cron schedules in `scripts/start-worker.ts`
- [ ] T037 [US5] Create admin job dashboard route `GET /api/admin/jobs` in `apps/web/src/app/api/admin/jobs/route.ts` — queue depth, processing count, failure rate, recent errors. Protected by `withPermission('global_admin')`

**Checkpoint**: Scheduled jobs configured and running. Admin can monitor job queue health.

---

## Phase 7: Integration & Polish

**Purpose**: Connect notification dispatch to existing services, update deferred tasks, run validation

- [ ] T038 [US1] Add notification dispatch calls to existing event service — RSVP (notify creator), waitlist promotion (notify promoted user), event cancellation (notify attendees) in `apps/web/src/lib/events/service.ts`
- [ ] T039 [P] [US1] Add notification dispatch to community service — new follower notification in `apps/web/src/lib/community/service.ts`
- [ ] T040 [P] [US1] Add notification dispatch to teacher review service — review posted notification in `apps/web/src/lib/teachers/reviews.ts`
- [ ] T041 [US1] Add notification dispatch to recurring event service — occurrence cancellation notification in `apps/web/src/lib/events/recurring.ts`
- [ ] T042 Run full validation checklist: `npm run tokens:build -w @acroyoga/tokens` → `npm run typecheck` → `npm run lint -w @acroyoga/web` → `npm run test` → `npm run build -w @acroyoga/web`
- [ ] T043 Update `README.md` — add Spec 015 to specs table
- [ ] T044 Update deferred tasks in Specs 003 and 005 — change rationale from "deferred to notifications sprint" / "deferred to background jobs sprint" to "addressed by Spec 015"
- [ ] T045 Add notification-related GDPR deletion to existing `deleteUserData()` function — delete notifications, preferences, and job references for user

**Checkpoint**: All deferred notification/job tasks resolved. Full validation passes.

---

## Dependencies & Execution Order

- **Phase 1**: No dependencies — can start immediately
- **Phase 2**: Depends on Phase 1 (needs migration and types)
- **Phase 3**: Depends on Phase 2 (needs job queue for async delivery)
- **Phase 4**: Depends on Phase 3 (needs notification service)
- **Phase 5**: Depends on Phases 3–4 (needs delivery pipeline and preferences)
- **Phase 6**: Depends on Phase 2 (needs job queue infrastructure)
- **Phase 7**: Depends on all prior phases
