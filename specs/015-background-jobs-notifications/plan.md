# Implementation Plan: Background Jobs & Notifications

**Branch**: `015-background-jobs-notifications` | **Date**: 2026-04-04 | **Spec**: [specs/015-background-jobs-notifications/spec.md](spec.md)
**Input**: Feature specification from `/specs/015-background-jobs-notifications/spec.md`
**Status**: Draft

## Summary

Introduce `pg-boss` as a PostgreSQL-backed job queue for reliable async processing. Create a notification type registry with 10+ notification types across 5 categories. Add `notification_preferences` and `notifications` database tables. Build a job worker process that dequeues and delivers notifications to configured channels. Implement in-app notification storage, a notification bell component, and a preferences management page. Add email delivery via Azure Communication Services with branded templates. Create scheduled jobs for review reminders, certification expiry, and stale waitlist cleanup.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode), React 19, Next.js 16 (App Router)
**Primary Dependencies**: `pg-boss` (PostgreSQL job queue — zero external infra), Azure Communication Services SDK (email)
**Storage**: PostgreSQL tables for notifications and preferences; pg-boss manages its own schema
**Testing**: Vitest + PGlite for integration tests; mock email delivery; test job processing synchronously
**Target Platform**: Web (API routes + worker process)
**Project Type**: Backend infrastructure + UI components
**Performance Goals**: API response latency unchanged (async enqueue < 5ms); job processing < 30s; email delivery < 60s
**Constraints**: No new infrastructure beyond PostgreSQL; job worker runs as sidecar process in Azure Container Apps; pg-boss compatible with PGlite for testing

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. API-First Design | ✅ PASS | REST endpoints: `GET/PUT /api/notifications/preferences`, `GET /api/notifications`, `POST /api/notifications/:id/read`, `GET /api/admin/jobs` (admin-only) |
| II. Test-First Development | ✅ PASS | Integration tests: job enqueue/dequeue cycle, notification delivery, preference enforcement, scheduled job triggers |
| III. Privacy & Data Protection | ✅ PASS | Email addresses encrypted at rest (existing pattern). Notification content may contain PII — stored encrypted. GDPR deletion includes notifications table |
| IV. Server-Side Authority | ✅ PASS | All job dispatch server-side. Preferences validated by Zod schema. No client-side notification logic |
| V. UX Consistency | ✅ PASS | Notification bell follows existing header component patterns. Preferences page uses existing form components |
| VI. Performance Budget | ✅ PASS | Async enqueue adds < 5ms to API response. Worker process is separate — no impact on web server. Zero additional client JS for job processing |
| VII. Simplicity | ✅ PASS | pg-boss uses existing PostgreSQL — no Redis, RabbitMQ, or external queue. Email via Azure Communication Services (already in Azure ecosystem) |
| VIII. Internationalisation | ✅ PASS | Notification templates use i18n keys. Deferred to Spec 014 for full i18n infrastructure; templates ship with English defaults |
| IX. Scoped Permissions | ✅ PASS | Admin job dashboard uses `withPermission('global_admin')`. Notification preferences use `requireAuth()` (user's own data) |
| X. Notification Architecture | ✅ PASS | **Primary implementation** — enum-driven types, per-user per-channel preferences, async delivery, extensible channels |
| XI. Resource Ownership | ✅ PASS | Notifications owned by recipient user. Preferences owned by user. Admin job view requires admin scope |
| XII. Financial Integrity | N/A | No financial operations |
| QG-5: Bundle Size | ✅ PASS | Notification bell is lightweight (icon + count). pg-boss is server-only — not in client bundle |
| QG-10: Permission Smoke Test | ✅ PASS | 403 tests for admin job dashboard. 401 tests for preferences endpoints |

**Gate result: PASS — no violations.**

## Project Structure

### Documentation

```text
specs/015-background-jobs-notifications/
├── spec.md              # Feature specification
├── plan.md              # This file
├── tasks.md             # Dependency-ordered tasks
└── data-model.md        # Database schema, notification types, job types
```

### Source Code

```text
apps/web/src/
├── db/migrations/
│   └── 015-001-notifications.sql    # NEW — notifications, preferences, pg-boss schema
├── lib/
│   ├── notifications/               # NEW — notification domain
│   │   ├── types.ts                 # NotificationType enum, Channel enum
│   │   ├── service.ts               # enqueueNotification(), getNotifications(), markAsRead()
│   │   ├── preferences.ts           # getPreferences(), updatePreferences()
│   │   ├── delivery.ts              # Channel delivery adapters (in-app, email)
│   │   └── templates.ts             # Notification message templates (i18n-ready)
│   ├── jobs/                        # NEW — job infrastructure
│   │   ├── queue.ts                 # pg-boss initialization and singleton
│   │   ├── worker.ts                # Job worker process (dequeue + dispatch)
│   │   ├── scheduled.ts             # Cron job definitions
│   │   └── types.ts                 # Job type definitions
│   └── email/                       # NEW — email delivery
│       ├── client.ts                # Azure Communication Services client
│       └── templates/               # Email HTML templates
│           ├── base.html            # Shared layout with branding
│           ├── notification.html    # Generic notification template
│           └── unsubscribe.html     # One-click unsubscribe confirmation
├── app/api/
│   ├── notifications/
│   │   ├── route.ts                 # GET — list notifications for current user
│   │   ├── preferences/route.ts     # GET/PUT — notification preferences
│   │   └── [id]/read/route.ts       # POST — mark notification as read
│   ├── admin/
│   │   └── jobs/route.ts            # GET — job queue status (admin-only)
│   └── unsubscribe/route.ts         # GET — one-click email unsubscribe (no auth)
├── components/
│   ├── NotificationBell.tsx         # NEW — header notification icon with count badge
│   └── NotificationPreferences.tsx  # NEW — preferences management form
└── app/
    ├── notifications/page.tsx       # NEW — notification list page
    └── settings/notifications/page.tsx  # NEW — notification preferences page

packages/shared/src/types/
└── notifications.ts                 # NEW — NotificationType, NotificationChannel, NotificationPreference types

scripts/
└── start-worker.ts                  # NEW — job worker entry point
```

## Phase Breakdown

### Phase 1: Database & Types
Create migration for notifications and preferences tables. Define notification type enum and channel enum in shared types.

### Phase 2: Job Queue Infrastructure
Install pg-boss. Create queue initialization, worker process, and job type definitions. Test enqueue/dequeue cycle.

### Phase 3: In-App Notifications (US1)
Implement notification service, API routes, notification bell component, and notification list page.

### Phase 4: Preferences (US2)
Implement preferences service, API routes, and preferences management UI.

### Phase 5: Email Channel (US4)
Implement Azure Communication Services email client, branded templates, and unsubscribe flow.

### Phase 6: Scheduled Jobs (US5)
Implement cron job definitions for review reminders, cert-expiry checks, and stale waitlist cleanup.

### Phase 7: Integration & Polish
Connect notification dispatch to existing service functions (RSVP, cancellation, reviews). Run full validation.
