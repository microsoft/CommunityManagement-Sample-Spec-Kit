# Data Model: Teacher Profiles & Reviews

**Spec**: 005 | **Date**: 2026-03-15

---

## Entity Relationship Overview

```
┌─────────────┐       ┌──────────────────┐       ┌──────────────┐
│    users     │──1:1──│ teacher_profiles  │──1:N──│ certifications│
│  (from 004)  │       └──────────────────┘       └──────────────┘
│              │              │                          │
│              │              │──1:N──┌────────────────┐ │ proof_document_blob_path
│              │              │       │ teacher_photos  │ │ → Azure Blob Storage
│              │              │       └────────────────┘
│              │              │
│              │              │──1:N──┌────────────────┐
│              │              │       │ event_teachers  │──N:1── events (from 001)
│              │              │       └────────────────┘
│              │              │
│              │              │──1:N──┌──────────────┐
│              │              │       │   reviews     │──N:1── events (from 001)
│              │              │       └──────────────┘
│              │              │              │
│              │              │              └──N:1── users (reviewer)
│              │
│              │──1:N──┌──────────────────┐
└─────────────┘       │ teacher_requests  │──scope── geography (from 004)
                      └──────────────────┘
```

**Dependencies on other specs**:
- **Spec 004**: `users` table (auth), `permission_grants` (admin scope checks via `withPermission()`), `geography` (scope-aware routing for teacher requests)
- **Spec 001**: `events` table (teaching history, review window), `rsvps` table (attendance verification for reviews)
- **Spec 002**: `reports` table (review moderation — extended with `reported_content_type`), `user_profiles` (separate entity — teacher profile does NOT extend user_profiles)
- **Spec 003**: `occurrence_overrides` (multi-day event edge case — review window from last occurrence)

---

## Entities

### 1. teacher_profiles

Core teacher entity. Independent of Event Creator role (FR-11). One profile per user.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | NOT NULL, UNIQUE, FK → users(id) | One teacher profile per user |
| display_name | varchar(100) | NOT NULL | Denormalised from user_profiles for display; updated on profile change |
| bio | text | NULL | Teacher-specific bio, max 1000 chars (app-level) |
| specialties | text[] | NOT NULL, DEFAULT '{}' | Array of specialty tags (e.g., `{'washing_machines','therapeutic'}`) |
| city_id | uuid | NULL, FK → cities(id) | Primary teaching city (for scope routing) |
| average_rating | decimal(3,2) | NULL | Precomputed; NULL before first review or after deletion |
| review_count | integer | NOT NULL, DEFAULT 0 | Precomputed count of visible reviews |
| badge_status | varchar(20) | NOT NULL, DEFAULT 'pending' | CHECK: pending, verified, expired, revoked |
| verified_at | timestamptz | NULL | When admin approved the application |
| verified_by | uuid | NULL, FK → users(id) | Admin who verified |
| is_deleted | boolean | NOT NULL, DEFAULT false | Soft-delete for anonymisation (GDPR) |
| deleted_at | timestamptz | NULL | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_teacher_user` on `(user_id)` — one profile per user
- `idx_teacher_city` on `(city_id) WHERE is_deleted = false` — city-based teacher search
- `idx_teacher_specialties` GIN on `(specialties) WHERE is_deleted = false` — specialty tag search
- `idx_teacher_badge` on `(badge_status) WHERE is_deleted = false` — filter by verification status
- `idx_teacher_rating` on `(average_rating DESC NULLS LAST) WHERE is_deleted = false AND badge_status = 'verified'` — top-rated teachers

**Check constraints**:
```sql
CHECK (badge_status IN ('pending', 'verified', 'expired', 'revoked'))
CHECK (average_rating IS NULL OR (average_rating >= 1.00 AND average_rating <= 5.00))
CHECK (review_count >= 0)
```

**Validation rules**:
- `bio` max 1000 characters
- `specialties` values must be from the predefined vocabulary (validated at API boundary)
- `average_rating` range 1.00–5.00 or NULL
- `badge_status` transitions: `pending → verified` (admin approve), `verified → expired` (automated on cert expiry), `verified → revoked` (admin action), `expired → verified` (recertification approved)

**Badge status transitions**:
```
pending → verified    (admin approves teacher application)
verified → expired    (all certifications expired — automated job)
verified → revoked    (admin revokes teacher status)
expired → verified    (teacher renews certification, admin re-approves)
revoked → pending     (teacher reapplies — new request required)
```

---

### 2. certifications

Teacher certifications with expiry tracking. A teacher may have multiple (e.g., AcroYoga International + partner acrobatics).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| teacher_profile_id | uuid | NOT NULL, FK → teacher_profiles(id) ON DELETE CASCADE | |
| name | varchar(255) | NOT NULL | Certification name (e.g., "AcroYoga International Level 2") |
| issuing_body | varchar(255) | NOT NULL | (e.g., "AcroYoga International") |
| expiry_date | date | NULL | NULL = no expiry. Checked by daily cron job |
| proof_document_blob_path | varchar(500) | NULL | Path in Azure Blob Storage (relative to container). Never exposed in API |
| proof_document_mime_type | varchar(100) | NULL | e.g., application/pdf, image/jpeg |
| status | varchar(20) | NOT NULL, DEFAULT 'pending' | CHECK: pending, verified, expired, revoked |
| verified_by_admin_id | uuid | NULL, FK → users(id) | Admin who verified this certification |
| verified_at | timestamptz | NULL | |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |
| updated_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `idx_cert_teacher` on `(teacher_profile_id)` — list certs for a teacher
- `idx_cert_expiry` on `(expiry_date) WHERE status = 'verified' AND expiry_date IS NOT NULL` — expiry job query
- `idx_cert_status` on `(status)`

**Check constraints**:
```sql
CHECK (status IN ('pending', 'verified', 'expired', 'revoked'))
```

**Validation rules**:
- `name` max 255 characters, min 1
- `issuing_body` max 255 characters, min 1
- `proof_document_blob_path` set when a proof document is uploaded; cleared (+ blob deleted) on teacher account deletion
- `expiry_date` in the future on initial creation (past dates rejected at API boundary); the cron job handles transition to `expired`

**Status transitions**:
```
pending → verified     (admin approves certification)
pending → revoked      (admin rejects certification)
verified → expired     (automated: expiry_date < current_date)
expired → verified     (teacher uploads new cert + admin re-verifies)
verified → revoked     (admin revokes)
```

---

### 3. teacher_photos

Profile photos for teachers. Separate from user_profiles avatar.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| teacher_profile_id | uuid | NOT NULL, FK → teacher_profiles(id) ON DELETE CASCADE | |
| url | varchar(2048) | NOT NULL | Public CDN URL (EXIF stripped at upload) |
| sort_order | integer | NOT NULL, DEFAULT 0 | For ordering in gallery |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `idx_photos_teacher` on `(teacher_profile_id, sort_order)` — ordered photo list

**Validation rules**:
- Max 10 photos per teacher (app-level check on INSERT)
- `url` must be a valid URL
- Images MUST have EXIF stripped before storage (Principle III)
- `sort_order` renumbered on delete/reorder

---

### 4. event_teachers

Junction table linking events to teachers. An event can have multiple teachers (lead + assistants). A teacher can teach at multiple events.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| event_id | uuid | NOT NULL, FK → events(id) ON DELETE CASCADE | |
| teacher_profile_id | uuid | NOT NULL, FK → teacher_profiles(id) | |
| role | varchar(20) | NOT NULL, DEFAULT 'lead' | CHECK: lead, assistant |
| teacher_display_name | varchar(100) | NOT NULL | Denormalised for historical display after teacher deletion |
| assigned_by | uuid | NOT NULL, FK → users(id) | Event creator who made the assignment |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_event_teacher` on `(event_id, teacher_profile_id)` — one assignment per teacher per event
- `idx_teacher_events` on `(teacher_profile_id)` — teaching history for profile page
- `idx_event_teachers_event` on `(event_id)` — list teachers for an event

**Check constraints**:
```sql
CHECK (role IN ('lead', 'assistant'))
```

**Validation rules**:
- `teacher_profile_id` must reference a teacher with `badge_status = 'verified'` (enforced at service layer, not DB constraint — expired teachers keep existing assignments)
- `assigned_by` must be the event creator or a scoped admin (enforced by `withPermission()`)
- `teacher_display_name` populated from `teacher_profiles.display_name` at assignment time; updated to "Deleted Teacher" on teacher account deletion

---

### 5. reviews

Post-event reviews from attendees about teachers. One review per attendee per event-teacher pair.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| event_id | uuid | NOT NULL, FK → events(id) | |
| teacher_profile_id | uuid | NOT NULL, FK → teacher_profiles(id) | |
| reviewer_id | uuid | NOT NULL, FK → users(id) | |
| rating | smallint | NOT NULL | CHECK: 1–5 |
| text | text | NULL | Optional review text, max 2000 chars (app-level) |
| review_window_closes_at | timestamptz | NOT NULL | Precomputed: event_end + 14 days |
| hidden_at | timestamptz | NULL | Set by admin moderation (soft-hide) |
| hidden_by | uuid | NULL, FK → users(id) | Admin who hid the review |
| hidden_reason | text | NULL | Moderation reason |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_review_unique` on `(event_id, teacher_profile_id, reviewer_id)` — one review per attendee per event-teacher pair (FR-07)
- `idx_reviews_teacher` on `(teacher_profile_id, created_at DESC) WHERE hidden_at IS NULL` — teacher profile reviews list
- `idx_reviews_event` on `(event_id) WHERE hidden_at IS NULL` — event reviews
- `idx_reviews_reviewer` on `(reviewer_id)` — "my reviews" for GDPR export
- `idx_reviews_window` on `(review_window_closes_at)` — reminder job queries

**Check constraints**:
```sql
CHECK (rating >= 1 AND rating <= 5)
```

**Validation rules**:
- One review per `(event_id, teacher_profile_id, reviewer_id)` — enforced by unique index
- `reviewer_id` must have a confirmed RSVP for `event_id` (attendance verified at service layer by querying `rsvps`)
- `review_window_closes_at` computed at submission: `event.end_datetime + 14 days` (or last occurrence end for recurring events)
- Submission rejected if `now() > review_window_closes_at` (server-side, Principle IV)
- `text` max 2000 characters
- `hidden_at` set by admin moderation; hidden reviews excluded from aggregate rating

**Review lifecycle**:
```
submit    → created (rating + optional text; attendance + window validated)
report    → admin reviews via Spec 002 Report system
moderate  → hidden_at set; aggregate rating recalculated
delete    → only by reviewer (within 24h of creation) or admin; triggers aggregate recalc
```

---

### 6. teacher_requests

Teacher applications with admin approval workflow. Follows Spec 004's PermissionRequest pattern with teacher-specific fields.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | NOT NULL, FK → users(id) | Applicant |
| city_id | uuid | NOT NULL, FK → cities(id) | Primary teaching city (determines which admin reviews) |
| bio | text | NULL | Proposed teacher bio |
| specialties | text[] | NOT NULL, DEFAULT '{}' | Proposed specialties |
| status | varchar(20) | NOT NULL, DEFAULT 'pending' | CHECK: pending, approved, rejected |
| reviewed_by | uuid | NULL, FK → users(id) | Admin who reviewed |
| reviewed_at | timestamptz | NULL | |
| review_reason | text | NULL | Reason for approval/rejection |
| created_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_teacher_req_pending` on `(user_id) WHERE status = 'pending'` — one pending application per user
- `idx_teacher_req_status_city` on `(status, city_id)` — admin queue: list pending requests for city
- `idx_teacher_req_user` on `(user_id)` — user's own requests

**Check constraints**:
```sql
CHECK (status IN ('pending', 'approved', 'rejected'))
```

**Validation rules**:
- Only one pending request per user at a time (duplicate pending → 409)
- Rejected requests do not block resubmission; only pending requests block
- `city_id` must reference a valid city
- On approval: service creates `teacher_profiles` row + `certifications` rows from submitted data

**State transitions**:
```
pending → approved  (admin action → creates teacher_profile + certifications)
pending → rejected  (admin action → no profile created)
rejected → [user can create new request]
```

**Certification data at application time**: Certifications are submitted as part of the application (via a separate endpoint for file upload). They are stored in `certifications` table with `status = 'pending'` linked to the teacher profile created on approval. Pre-approval, cert data is stored as JSON metadata on the request:

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| submitted_certifications | jsonb | NOT NULL, DEFAULT '[]' | Array of `{name, issuingBody, expiryDate, proofBlobPath}` |

---

### 7. review_reminders (tracking table)

Tracks which reminders have been sent to avoid duplicates.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| event_id | uuid | NOT NULL, FK → events(id) | |
| teacher_profile_id | uuid | NOT NULL, FK → teacher_profiles(id) | |
| user_id | uuid | NOT NULL, FK → users(id) | Attendee who should receive reminder |
| reminder_type | varchar(10) | NOT NULL | CHECK: day_1, day_10 |
| sent_at | timestamptz | NOT NULL, DEFAULT now() | |

**Indexes**:
- `UNIQUE idx_reminder_unique` on `(event_id, teacher_profile_id, user_id, reminder_type)` — prevent duplicate reminders
- `idx_reminder_event` on `(event_id)` — cleanup

**Notes**: This table prevents the cron job from re-sending reminders. On review submission, no further reminders are sent (the job's query excludes users who have already submitted a review).

---

## Migration SQL

```sql
-- Migration: 005_teachers_reviews
-- Depends on: users (004), events (001), cities (001), rsvps (001)

-- 1. Teacher profiles
CREATE TABLE teacher_profiles (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid NOT NULL UNIQUE REFERENCES users(id),
    display_name      varchar(100) NOT NULL,
    bio               text,
    specialties       text[] NOT NULL DEFAULT '{}',
    city_id           uuid REFERENCES cities(id),
    average_rating    decimal(3,2),
    review_count      integer NOT NULL DEFAULT 0,
    badge_status      varchar(20) NOT NULL DEFAULT 'pending'
                      CHECK (badge_status IN ('pending', 'verified', 'expired', 'revoked')),
    verified_at       timestamptz,
    verified_by       uuid REFERENCES users(id),
    is_deleted        boolean NOT NULL DEFAULT false,
    deleted_at        timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CHECK (average_rating IS NULL OR (average_rating >= 1.00 AND average_rating <= 5.00)),
    CHECK (review_count >= 0)
);

CREATE INDEX idx_teacher_city ON teacher_profiles (city_id) WHERE is_deleted = false;
CREATE INDEX idx_teacher_specialties ON teacher_profiles USING GIN (specialties) WHERE is_deleted = false;
CREATE INDEX idx_teacher_badge ON teacher_profiles (badge_status) WHERE is_deleted = false;
CREATE INDEX idx_teacher_rating ON teacher_profiles (average_rating DESC NULLS LAST)
    WHERE is_deleted = false AND badge_status = 'verified';

-- 2. Certifications
CREATE TABLE certifications (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_profile_id      uuid NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
    name                    varchar(255) NOT NULL,
    issuing_body            varchar(255) NOT NULL,
    expiry_date             date,
    proof_document_blob_path varchar(500),
    proof_document_mime_type varchar(100),
    status                  varchar(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'verified', 'expired', 'revoked')),
    verified_by_admin_id    uuid REFERENCES users(id),
    verified_at             timestamptz,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cert_teacher ON certifications (teacher_profile_id);
CREATE INDEX idx_cert_expiry ON certifications (expiry_date)
    WHERE status = 'verified' AND expiry_date IS NOT NULL;
CREATE INDEX idx_cert_status ON certifications (status);

-- 3. Teacher photos
CREATE TABLE teacher_photos (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_profile_id  uuid NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
    url                 varchar(2048) NOT NULL,
    sort_order          integer NOT NULL DEFAULT 0,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_photos_teacher ON teacher_photos (teacher_profile_id, sort_order);

-- 4. Event-teacher assignments
CREATE TABLE event_teachers (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id              uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    teacher_profile_id    uuid NOT NULL REFERENCES teacher_profiles(id),
    role                  varchar(20) NOT NULL DEFAULT 'lead'
                          CHECK (role IN ('lead', 'assistant')),
    teacher_display_name  varchar(100) NOT NULL,
    assigned_by           uuid NOT NULL REFERENCES users(id),
    created_at            timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, teacher_profile_id)
);

CREATE INDEX idx_teacher_events ON event_teachers (teacher_profile_id);
CREATE INDEX idx_event_teachers_event ON event_teachers (event_id);

-- 5. Reviews
CREATE TABLE reviews (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id                uuid NOT NULL REFERENCES events(id),
    teacher_profile_id      uuid NOT NULL REFERENCES teacher_profiles(id),
    reviewer_id             uuid NOT NULL REFERENCES users(id),
    rating                  smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text                    text,
    review_window_closes_at timestamptz NOT NULL,
    hidden_at               timestamptz,
    hidden_by               uuid REFERENCES users(id),
    hidden_reason           text,
    created_at              timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, teacher_profile_id, reviewer_id)
);

CREATE INDEX idx_reviews_teacher ON reviews (teacher_profile_id, created_at DESC)
    WHERE hidden_at IS NULL;
CREATE INDEX idx_reviews_event ON reviews (event_id) WHERE hidden_at IS NULL;
CREATE INDEX idx_reviews_reviewer ON reviews (reviewer_id);
CREATE INDEX idx_reviews_window ON reviews (review_window_closes_at);

-- 6. Teacher requests (application workflow)
CREATE TABLE teacher_requests (
    id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                   uuid NOT NULL REFERENCES users(id),
    city_id                   uuid NOT NULL REFERENCES cities(id),
    bio                       text,
    specialties               text[] NOT NULL DEFAULT '{}',
    submitted_certifications  jsonb NOT NULL DEFAULT '[]',
    status                    varchar(20) NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by               uuid REFERENCES users(id),
    reviewed_at               timestamptz,
    review_reason             text,
    created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_teacher_req_pending ON teacher_requests (user_id) WHERE status = 'pending';
CREATE INDEX idx_teacher_req_status_city ON teacher_requests (status, city_id);
CREATE INDEX idx_teacher_req_user ON teacher_requests (user_id);

-- 7. Review reminders tracking
CREATE TABLE review_reminders (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id            uuid NOT NULL REFERENCES events(id),
    teacher_profile_id  uuid NOT NULL REFERENCES teacher_profiles(id),
    user_id             uuid NOT NULL REFERENCES users(id),
    reminder_type       varchar(10) NOT NULL CHECK (reminder_type IN ('day_1', 'day_10')),
    sent_at             timestamptz NOT NULL DEFAULT now(),
    UNIQUE (event_id, teacher_profile_id, user_id, reminder_type)
);

CREATE INDEX idx_reminder_event ON review_reminders (event_id);
```

---

## GDPR Data Export Extension

Spec 002's `ExportFileSchema` is extended with a `teacherProfile` section:

```typescript
// Added to ExportFileSchema (from Spec 002 gdpr-api.ts)
teacherProfile?: {
  displayName: string;
  bio: string | null;
  specialties: string[];
  certifications: {
    name: string;
    issuingBody: string;
    expiryDate: string | null;
    status: string;
  }[];
  photos: { url: string }[];
  reviewsReceived: {
    eventId: string;
    eventTitle: string;
    rating: number;
    text: string | null;
    reviewerDisplayName: string;
    createdAt: string;
  }[];
  reviewsWritten: {
    eventId: string;
    eventTitle: string;
    teacherDisplayName: string;
    rating: number;
    text: string | null;
    createdAt: string;
  }[];
};
```

---

## Anonymisation Procedure (Teacher Account Deletion)

Executed within a single database transaction + async blob cleanup:

```sql
-- Step 1: Anonymise teacher profile
UPDATE teacher_profiles
SET display_name = 'Deleted Teacher',
    bio = NULL,
    specialties = '{}',
    average_rating = NULL,
    review_count = 0,
    badge_status = 'revoked',
    is_deleted = true,
    deleted_at = now(),
    updated_at = now()
WHERE id = $teacherProfileId;

-- Step 2: Record proof document paths for async blob deletion
SELECT proof_document_blob_path FROM certifications
WHERE teacher_profile_id = $teacherProfileId
  AND proof_document_blob_path IS NOT NULL;

-- Step 3: Anonymise certifications
UPDATE certifications
SET name = 'Removed',
    issuing_body = 'Removed',
    proof_document_blob_path = NULL,
    proof_document_mime_type = NULL,
    verified_by_admin_id = NULL,
    status = 'revoked',
    updated_at = now()
WHERE teacher_profile_id = $teacherProfileId;

-- Step 4: Delete teacher photos (hard delete — URLs are public CDN, delete from CDN too)
DELETE FROM teacher_photos WHERE teacher_profile_id = $teacherProfileId;

-- Step 5: Update event_teachers display name
UPDATE event_teachers
SET teacher_display_name = 'Deleted Teacher'
WHERE teacher_profile_id = $teacherProfileId;

-- Step 6: Reviews remain intact (community content).
-- Teacher name resolved via teacher_profiles.is_deleted flag in application code.

-- Async (after COMMIT): Delete blobs from Azure Blob Storage
-- containerClient.listBlobsFlat({ prefix: teacherProfileId + '/' }) → delete each
```
