# Feature Specification: Background Jobs & Notifications

**Feature Branch**: `015-background-jobs-notifications`  
**Created**: 2026-04-04  
**Status**: Draft  
**Input**: Constitution Principle X mandate, deferred tasks from Specs 003 (notification dispatch) and 005 (review reminders, cert-expiry), existing service functions awaiting async processing

## Summary

Implement a background job system and multi-channel notification architecture. The platform has deferred async processing across multiple specs: occurrence cancellation notifications (Spec 003), review reminder scheduling (Spec 005), and certification expiry alerts (Spec 005). Service functions for these operations already exist but are called synchronously. This spec introduces: (1) a job queue using PostgreSQL-backed `pg-boss` for reliable async processing, (2) notification types as an extensible enum with per-user channel preferences, (3) email delivery via Azure Communication Services, (4) in-app notification storage and real-time delivery, and (5) user preference management for notification opt-in/opt-out per type per channel.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receive In-App Notifications (Priority: P1)

A community member performs an action that triggers a notification (e.g., someone RSVPs to their event, their waitlist position is promoted, a review is posted on their profile). An in-app notification appears in the notification bell. The notification count badge updates in real time. Clicking a notification navigates to the relevant resource.

**Why this priority**: In-app notifications are the foundation — they work without any external service configuration and provide immediate value.

**Independent Test**: Create an event, have another user RSVP. Verify the event creator sees a notification in the bell icon. Click the notification — navigates to the event. Verify the notification is marked as read.

**Acceptance Scenarios**:

1. **Given** a user's event receives an RSVP, **When** the creator views the notification bell, **Then** an unread notification appears with the RSVP details.
2. **Given** unread notifications exist, **When** the notification bell renders, **Then** a count badge shows the number of unread notifications.
3. **Given** a notification is displayed, **When** the user clicks it, **Then** they navigate to the relevant resource (event, review, profile).
4. **Given** a notification is clicked, **When** the user returns to the notification list, **Then** the notification is marked as read and the count badge decrements.
5. **Given** multiple notification types, **When** displayed in the list, **Then** each type has a distinct icon and message template.

---

### User Story 2 - Configure Notification Preferences (Priority: P1)

A community member visits their notification settings page and sees all notification types grouped by category. For each type, they can toggle individual channels (in-app, email) on or off. Preferences are saved immediately and respected by the notification system.

**Why this priority**: User control over notifications is mandated by Constitution Principle X. Without preferences, notifications would be opt-out-impossible.

**Independent Test**: Navigate to notification preferences. Toggle off email for "Event RSVP" notifications. Have someone RSVP. Verify in-app notification appears but no email is sent. Toggle email back on — next RSVP triggers both.

**Acceptance Scenarios**:

1. **Given** the notification settings page, **When** it loads, **Then** all notification types are listed with toggles for each channel (in-app, email).
2. **Given** a notification type, **When** the user toggles off the email channel, **Then** the preference is saved server-side and no email is sent for that type.
3. **Given** a notification type with email toggled off, **When** the user toggles it back on, **Then** subsequent notifications of that type include email delivery.
4. **Given** default preferences, **When** a new user signs up, **Then** all notification types are enabled for all channels by default.

---

### User Story 3 - Background Job Processing (Priority: P1)

The system processes asynchronous tasks reliably without blocking API responses. Jobs include: sending notifications, processing review reminders, checking certification expiry, and dispatching occurrence cancellation notices. Failed jobs are retried with exponential backoff. Job status is visible to admins.

**Why this priority**: Background processing is the infrastructure that enables all async features. Without it, notification delivery blocks API responses (violating Constitution Principle X).

**Independent Test**: Cancel an event occurrence. Verify the API responds immediately (< 200ms). Verify attendee notifications are delivered asynchronously within 30 seconds.

**Acceptance Scenarios**:

1. **Given** an action triggers a notification, **When** the API handler runs, **Then** the notification is enqueued (not sent synchronously) and the API responds within its normal latency.
2. **Given** a job is enqueued, **When** the job worker processes it, **Then** the notification is delivered to all opted-in channels for all affected users.
3. **Given** a job fails, **When** the retry policy applies, **Then** the job is retried with exponential backoff (max 3 retries).
4. **Given** a job permanently fails, **When** max retries are exhausted, **Then** the job is moved to a dead-letter queue and logged.
5. **Given** the admin dashboard, **When** an admin views job status, **Then** they see job queue depth, failure rate, and recent errors.

---

### User Story 4 - Email Notifications (Priority: P2)

A community member receives email notifications for important events (waitlist promotion, event cancellation, certification expiry warning). Emails are formatted with the platform's branding and include a direct link to the relevant resource. Users can unsubscribe from email notifications via a one-click link.

**Why this priority**: Email is the primary out-of-app notification channel. It depends on the job queue (US3) and preferences (US2) being in place.

**Independent Test**: Enable email notifications. Cancel an event. Verify attendees receive a branded email with event details and a link to the platform.

**Acceptance Scenarios**:

1. **Given** email is enabled for a notification type, **When** the notification fires, **Then** an email is sent via Azure Communication Services with platform branding.
2. **Given** an email notification, **When** the recipient views it, **Then** it contains a direct link to the relevant resource.
3. **Given** an email notification, **When** the recipient clicks "Unsubscribe", **Then** email is disabled for that notification type (one-click, no login required).
4. **Given** email delivery fails, **When** the job worker detects the failure, **Then** the job is retried per the retry policy.

---

### User Story 5 - Scheduled Jobs (Priority: P2)

The system runs scheduled tasks on a cron-like schedule: review reminders (weekly), certification expiry checks (daily), and stale waitlist cleanup (daily). Scheduled jobs use the same queue infrastructure as event-driven jobs.

**Why this priority**: Several deferred tasks (Spec 005 T037, T048) specifically require cron/scheduler functionality.

**Independent Test**: Configure a daily certification expiry check. Verify it runs at the scheduled time and sends notifications to teachers with certifications expiring within 30 days.

**Acceptance Scenarios**:

1. **Given** a scheduled job configuration, **When** the cron time arrives, **Then** the job is enqueued and processed by the job worker.
2. **Given** the review reminder job, **When** it runs, **Then** it identifies events completed in the past week without reviews and sends reminders to attendees.
3. **Given** the cert-expiry job, **When** it runs, **Then** it identifies certifications expiring within 30 days and sends warnings to the teacher.

---

### Edge Cases

- Job queue must survive server restarts (PostgreSQL-backed persistence)
- Duplicate notification prevention — idempotency keys prevent re-sending on retry
- Rate limiting on email sends to avoid provider throttling
- Timezone-aware scheduling for user-local cron jobs
- Notification templates must be i18n-ready (link to Spec 014)
- Bulk operations (e.g., cancel event with 100 attendees) must enqueue individual jobs, not one mega-job

## Requirements

### Functional Requirements

- **FR-001**: Notifications MUST be enqueued asynchronously — never block the API response
- **FR-002**: Notification types MUST be enum-driven and extensible without code changes to the queue
- **FR-003**: Users MUST be able to opt in/out of each notification type per channel
- **FR-004**: Failed jobs MUST be retried with exponential backoff (max 3 retries)
- **FR-005**: Permanently failed jobs MUST be logged and visible to admins
- **FR-006**: Email notifications MUST include an unsubscribe link that works without login
- **FR-007**: Scheduled jobs MUST use the same queue infrastructure as event-driven jobs
- **FR-008**: In-app notifications MUST track read/unread status per user
- **FR-009**: Notification delivery MUST respect user preferences before sending
- **FR-010**: All notification templates MUST be i18n-extractable (no hardcoded strings)

### Key Entities

- **Notification types**: Enum of all triggerable events (RSVP, waitlist, cancellation, review, cert-expiry, etc.)
- **Notification preferences**: Per-user, per-type, per-channel boolean flags
- **Notifications**: Stored in-app notification records with read/unread status
- **Jobs**: Background job records with status, retry count, error details
- **Channels**: Extensible channel registry (in-app, email, push — push deferred to mobile spec)

## Success Criteria

### Measurable Outcomes

- **SC-001**: Zero synchronous notification sends in API handlers (all enqueued)
- **SC-002**: Job processing latency < 30 seconds from enqueue to delivery
- **SC-003**: All 5 deferred notification/job tasks from Specs 003/005 resolved
- **SC-004**: Notification preferences UI functional with all types and channels
- **SC-005**: Email delivery success rate > 99% (excluding unsubscribes)
- **SC-006**: Scheduled jobs run within 60 seconds of their configured cron time

## Constitution Compliance

| Principle | Applicable | Notes |
|-----------|:---:|-------|
| I. API-First | ✅ | Notification preferences and history exposed via REST endpoints |
| II. Test-First | ✅ | Integration tests for job enqueue/process cycle, preference enforcement, email mocking |
| III. Privacy | ✅ | Email addresses used for delivery are PII — encrypted at rest per existing patterns |
| IV. Server-Side Authority | ✅ | Notification dispatch is entirely server-side. Preferences validated by Zod schemas |
| V. UX Consistency | ✅ | Notification bell and preferences page follow existing design token patterns |
| VI. Performance Budget | ✅ | Async processing ensures zero API latency impact. Job worker is a separate process |
| VII. Simplicity | ✅ | `pg-boss` uses existing PostgreSQL — no new infrastructure (Redis, RabbitMQ, etc.) |
| VIII. Internationalisation | ✅ | Notification templates use i18n keys (depends on Spec 014 infrastructure) |
| IX. Scoped Permissions | ✅ | Admin job dashboard requires admin permission via `withPermission()` |
| X. Notification Architecture | ✅ | **Primary spec** — implements all Principle X constraints |
| XI. Resource Ownership | ✅ | Notification preferences are user-owned resources |
| XII. Financial Integrity | N/A | No financial operations |
| XIII. Development Environment | ✅ | Job worker runs in dev via npm script; no external service needed for in-app notifications |
| XIV. Managed Identity | ✅ | Azure Communication Services accessed via Managed Identity |
