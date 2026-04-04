# Data Model: Background Jobs & Notifications

**Spec**: 015 | **Date**: 2026-04-04

## Overview

This spec introduces 4 new database tables for notification storage, preference management, and job tracking. The `pg-boss` library manages its own schema for job queue persistence (not documented here — see pg-boss docs).

## Entity Relationship Overview

```
┌──────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│    users     │────→│  notifications        │     │  notification    │
│  (existing)  │     │  (user_id FK)         │     │  _preferences    │
└──────────────┘     └──────────────────────┘     │  (user_id FK)    │
       │                                           └──────────────────┘
       │
       │             ┌──────────────────────┐
       └────────────→│  pg-boss schema      │
                     │  (managed by pg-boss) │
                     │  - job               │
                     │  - schedule           │
                     │  - archive            │
                     └──────────────────────┘
```

## New Tables

### 1. `notifications`

Stores in-app notification records for each user.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | NOT NULL | — | FK → `users.id` ON DELETE CASCADE |
| `type` | `text` | NOT NULL | — | Notification type enum value |
| `title` | `text` | NOT NULL | — | Short title (i18n-rendered at creation time) |
| `body` | `text` | NULL | — | Optional longer description |
| `resource_type` | `text` | NULL | — | Type of linked resource (event, review, profile, etc.) |
| `resource_id` | `uuid` | NULL | — | ID of linked resource for navigation |
| `read` | `boolean` | NOT NULL | `false` | Read/unread status |
| `created_at` | `timestamptz` | NOT NULL | `now()` | Creation timestamp |

**Indexes**:
- `idx_notifications_user_id_created_at` on `(user_id, created_at DESC)` — paginated list query
- `idx_notifications_user_id_read` on `(user_id, read)` WHERE `read = false` — unread count query

### 2. `notification_preferences`

Stores per-user, per-type, per-channel notification preferences.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | NOT NULL | — | FK → `users.id` ON DELETE CASCADE |
| `notification_type` | `text` | NOT NULL | — | Notification type enum value |
| `channel` | `text` | NOT NULL | — | Channel enum value (in_app, email) |
| `enabled` | `boolean` | NOT NULL | `true` | Whether this type+channel is enabled |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | Last update timestamp |

**Indexes**:
- `idx_notification_preferences_user` on `(user_id)` — list all preferences for user
- **Unique constraint**: `uq_notification_preferences` on `(user_id, notification_type, channel)` — one preference per type per channel per user

**Default behavior**: If no preference row exists for a user/type/channel combination, the system treats it as `enabled = true` (opt-out model, not opt-in).

## Enums

### NotificationType

```typescript
export enum NotificationType {
  // Events
  EVENT_RSVP = "event_rsvp",                       // Someone RSVPed to your event
  WAITLIST_PROMOTION = "waitlist_promotion",         // You were promoted from waitlist
  EVENT_CANCELLATION = "event_cancellation",         // An event you RSVPed to was cancelled
  OCCURRENCE_CANCELLATION = "occurrence_cancellation", // A specific occurrence was cancelled

  // Teachers & Reviews
  REVIEW_POSTED = "review_posted",                   // Someone reviewed your teaching
  REVIEW_REMINDER = "review_reminder",               // Reminder to review a past event
  CERT_EXPIRY_WARNING = "cert_expiry_warning",       // Your certification expires soon

  // Community
  FOLLOW_NEW = "follow_new",                         // Someone followed you
  REPORT_RESOLVED = "report_resolved",               // Your content report was resolved

  // Payments
  PAYMENT_RECEIVED = "payment_received",             // You received a payment for an event
}
```

### NotificationChannel

```typescript
export enum NotificationChannel {
  IN_APP = "in_app",     // In-app notification (bell icon)
  EMAIL = "email",       // Email notification
  // PUSH = "push",      // Push notification (deferred to Spec 016 — mobile)
}
```

## Job Types

### Event-Driven Jobs

| Job Type | Trigger | Payload | Handler |
|----------|---------|---------|---------|
| `send_notification` | Any notification event | `{ userId, type, data }` | Resolve templates, check preferences, deliver to enabled channels |
| `send_email` | Email channel delivery | `{ to, subject, html, unsubscribeToken }` | Send via Azure Communication Services |

### Scheduled Jobs (Cron)

| Job Name | Schedule | Description |
|----------|----------|-------------|
| `review-reminder` | `0 9 * * 1` (Mon 9am UTC) | Find events completed in past week without reviews; send reminders to attendees |
| `cert-expiry-check` | `0 8 * * *` (Daily 8am UTC) | Find certifications expiring within 30 days; send warnings to teachers |
| `waitlist-cleanup` | `0 2 * * *` (Daily 2am UTC) | Remove waitlist entries for events in the past |

## Migration SQL

```sql
-- 015-001-notifications.sql

-- In-app notifications
CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        text NOT NULL,
  title       text NOT NULL,
  body        text,
  resource_type text,
  resource_id uuid,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id_created_at
  ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_id_unread
  ON notifications (user_id) WHERE read = false;

-- Notification preferences (per user, per type, per channel)
CREATE TABLE notification_preferences (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  channel           text NOT NULL,
  enabled           boolean NOT NULL DEFAULT true,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_type, channel)
);

CREATE INDEX idx_notification_preferences_user
  ON notification_preferences (user_id);
```

## GDPR Considerations

The existing `deleteUserData()` function MUST be extended to:
1. Delete all rows from `notifications` where `user_id` matches
2. Delete all rows from `notification_preferences` where `user_id` matches
3. Both tables use `ON DELETE CASCADE` from `users.id`, so user deletion automatically cascades

## Unsubscribe Token Schema

Email unsubscribe links use signed tokens to allow preference updates without authentication:

```typescript
interface UnsubscribeToken {
  userId: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  exp: number; // Expiry timestamp (30 days from email send)
}
```

Tokens are signed with `HMAC-SHA256` using the application secret. Verified server-side before updating preferences.
