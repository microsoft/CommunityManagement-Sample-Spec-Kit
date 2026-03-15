# Research: Teacher Profiles & Reviews

**Spec**: 005 | **Date**: 2026-03-15

---

## R-1: Proof Document Storage — Azure Blob Storage

**Decision**: Use `@azure/storage-blob` SDK with SAS (Shared Access Signature) tokens for restricted upload/download. Proof documents stored in a private container (`teacher-proof-docs`). Access granted only via time-limited SAS URLs generated server-side for the teacher (upload) or scoped admin (view).

**Rationale**: FR-02 requires proof documents stored with restricted access — only the teacher and scoped admins can view. Azure Blob Storage with private container + SAS token pattern satisfies this:
- Container is private (no anonymous access)
- Upload: server generates a write-only SAS URL scoped to the teacher's path prefix (`teachers/{teacherProfileId}/`)
- Download: server generates a read-only SAS URL with short expiry (e.g., 15 minutes) only after `withPermission('viewProofDocument', scope)` check
- No proof document URLs are stored or returned in public API responses — only a boolean `hasProofDocument` field

**Alternatives considered**:
- **Direct file storage on disk**: Not scalable, not cloud-native, doesn't support Azure deployment. Rejected.
- **Database BLOB column**: PostgreSQL `bytea` works but bloats the database. Proof documents can be several MB (scanned certificates). Blob Storage is purpose-built for this.
- **Pre-signed URLs with S3**: AWS-specific. The project deploys to Azure — Blob Storage is the native equivalent.
- **Public URLs with obscure paths (security through obscurity)**: Violates Principle III (Privacy) and Principle IV (Server-Side Authority). Rejected.

**EXIF stripping**: Profile photos and proof documents MUST have EXIF/GPS metadata stripped before storage (Principle III). Use `sharp` library for images at upload time. For PDF proof documents, no EXIF concern.

**Implementation notes**:
- Container: `teacher-proof-docs` (private access level)
- Blob path convention: `{teacherProfileId}/{certificationId}/{filename}`
- DB stores: `proof_document_blob_path` (relative path within container), not the full URL
- SAS token expiry: 15 minutes for reads, 30 minutes for uploads
- Max file size: 10 MB (validated at API boundary with Zod + multer/formidable)
- Accepted MIME types: `image/jpeg`, `image/png`, `application/pdf`

**Account deletion**: FR-12 requires hard-delete of proof documents. On teacher account deletion, enumerate blobs under `{teacherProfileId}/` prefix and delete all. This is a batch operation using `containerClient.listBlobsFlat({ prefix })` + `blobClient.delete()`.

---

## R-2: Teacher Application — Reusing PermissionRequest Pattern

**Decision**: Adapt Spec 004's `permission_requests` pattern into a new `teacher_requests` table with teacher-specific fields (certifications, proof docs). Shares the same lifecycle (`pending → approved | rejected`) and scoped admin routing. Does NOT reuse the `permission_requests` table directly — teacher requests carry domain-specific data that doesn't fit the generic structure.

**Rationale**: Spec 004 established the pattern: user submits a request → scoped admin reviews → approve creates a resource (grant in 004, teacher profile in 005). The workflow is identical but the payload differs:
- 004: `{ scopeValue, message }` → creates `permission_grant`
- 005: `{ city, certifications[], proofDocuments[], bio }` → creates `teacher_profile` + `certifications`

A separate table keeps the schemas clean. The admin UI pattern is reused: same queue view, same approve/reject actions, same scope-aware routing.

**Alternatives considered**:
- **Extend `permission_requests` with jsonb metadata**: Possible but conflates two concerns. The `permission_requests` table is for role grants; teacher requests create a different kind of resource. Violates Principle VII (Simplicity) — a kitchen-sink table is harder to query and maintain.
- **Single unified request table with `request_type` discriminator**: Would work but adds complexity for marginal benefit. We'd need polymorphic joins. Two simple tables is simpler.

---

## R-3: Certification Expiry — Automated Status Transition

**Decision**: A scheduled job (cron/timer) runs daily, queries `certifications WHERE status = 'verified' AND expiry_date < now()`, and transitions them to `expired`. Notifications are sent to the teacher and scoped admin.

**Rationale**: FR-04 requires automated status transition on expiry with no manual intervention. A daily cron job is the simplest approach. The job:
1. `UPDATE certifications SET status = 'expired', updated_at = now() WHERE status = 'verified' AND expiry_date < CURRENT_DATE RETURNING *`
2. For each expired cert: queue teacher notification ("your certification X has expired")
3. For each expired cert: queue admin notification at the teacher's scope level

**Insurance expiry alerts** (FR-09): The same job handles 30-day-before alerts:
1. `SELECT * FROM certifications WHERE status = 'verified' AND expiry_date BETWEEN CURRENT_DATE + INTERVAL '29 days' AND CURRENT_DATE + INTERVAL '30 days'`
2. Queue teacher notification ("your insurance/certification X expires in 30 days")

On actual expiry: admin notified (from the main expiry logic above).

**Alternatives considered**:
- **Database trigger**: PostgreSQL doesn't support time-based triggers. Would need `pg_cron` extension which PGlite doesn't support for tests.
- **Application-level check on profile view**: Lazy — only fires when someone views the profile. Admin wouldn't be notified if no one visits. The spec requires proactive notification.
- **Event-driven with scheduled message queue**: Over-engineered for a daily batch of likely < 100 records. A simple cron job suffices (Principle VII).

**Testing**: Integration tests mock the current date using a `now()` parameter on the service function. No need to mock system time — the function accepts an `asOfDate` parameter:

```typescript
async function processExpiringCertifications(db: Db, asOfDate: Date = new Date())
```

---

## R-4: Review Window Calculation — Multi-Day Event Edge Case

**Decision**: The review window opens when the event ends (or the last occurrence ends for multi-day/recurring events) and closes 14 calendar days later. For recurring events, each occurrence has its own review window.

**Rationale**: FR-07 states "14-day review window after event date." The spec clarifies: "if an event spans multiple days (spec 003), the 14-day window starts from the last day of the event." The calculation:

1. **Single event**: `reviewWindowClosesAt = event.end_datetime + 14 days`
2. **Recurring event (single occurrence)**: `reviewWindowClosesAt = occurrence.end_datetime + 14 days` (end time derived from event template + occurrence_date)
3. **Multi-day event group** (Spec 003): review is per-event within the group. Each event's own end date applies.

The `reviewWindowClosesAt` is stored on the review record for query performance (avoids re-computing). It's computed server-side when the review is submitted and also used in the submission validation check.

**Attendance verification**: Before allowing a review, the service checks:
```sql
SELECT 1 FROM rsvps
WHERE event_id = $eventId
  AND user_id = $reviewerId
  AND status = 'confirmed'
  AND (occurrence_date = $occurrenceDate OR occurrence_date IS NULL)
```

This confirms the reviewer has a confirmed RSVP for the specific event/occurrence.

**Alternatives considered**:
- **Compute window on read**: Simpler schema but makes "list reviews still within window" queries expensive. Storing the close date is a trivial denormalization that greatly simplifies queries.

---

## R-5: Aggregate Rating — Precomputed on Teacher Profile

**Decision**: Store `average_rating` (decimal, 2 places) and `review_count` (integer) directly on `teacher_profiles`. Updated on each review insert/update/hide via a simple recalculation query.

**Rationale**: FR-08 requires aggregate rating on the teacher profile. Computing it on every profile view (`SELECT AVG(rating) FROM reviews WHERE teacher_profile_id = $id`) would work at small scale but adds query overhead on every profile load. Precomputing is simple and keeps profile loads fast (SC-01: < 2s).

**Update strategy**: On review insert or status change (hidden by moderation):
```sql
UPDATE teacher_profiles
SET average_rating = (
  SELECT ROUND(AVG(rating)::numeric, 2)
  FROM reviews
  WHERE teacher_profile_id = $id AND hidden_at IS NULL
),
review_count = (
  SELECT COUNT(*)
  FROM reviews
  WHERE teacher_profile_id = $id AND hidden_at IS NULL
),
updated_at = now()
WHERE id = $id
```

This runs within the same transaction as the review insert. At hundreds of reviews per teacher, the subquery is fast (indexed).

**Teacher deletion**: On deletion, `average_rating` and `review_count` are set to NULL (aggregate rating removed per FR-13).

**Alternatives considered**:
- **Materialised view**: More complex than a column update. Refresh scheduling adds overhead. Not justified at this scale (Principle VII).
- **Compute on read with caching**: Adds a cache layer for a simple counter. The precomputed column is simpler and always consistent.

---

## R-6: Teacher Profile Independence from Event Creator Role

**Decision**: `teacher_profiles` is its own table with `FK → users(id)`. It does NOT reference `permission_grants`. A user can be a Verified Teacher without being an Event Creator, and vice versa. The `event_teachers` junction table allows any verified teacher to be assigned to any event, regardless of who created it.

**Rationale**: FR-11 explicitly states teacher is a profile attribute independent of Event Creator role. This means:
- A teacher can teach at events they didn't create (assigned by the event creator)
- An Event Creator may or may not be a teacher
- A user can hold both roles independently

**Event-teacher assignment** (FR-06): Event creators pick from verified teachers when creating/editing events. The assignment is stored in `event_teachers(event_id, teacher_profile_id, role)` where role is `lead` or `assistant`.

**Alternatives considered**:
- **Teacher as a permission grant role**: Would couple teacher status to the permission system. Teacher status requires domain-specific data (certifications, bio, specialties) that doesn't fit the permission model. The permission system is for access control, not profile attributes.
- **Teacher flag on user_profiles (Spec 002)**: Would work minimally but doesn't accommodate the rich data (certifications, proof docs, specialties, photos, aggregate rating). A separate table is cleaner.

---

## R-7: Review Moderation — Integration with Spec 002 Report System

**Decision**: Reviews are reported via Spec 002's existing `POST /api/reports` endpoint, with `reportedContentType: 'review'` and `reportedContentId: reviewId` (extending the report system's content type enum). Admin moderation sets `hidden_at` on the review, which excludes it from public display and aggregate rating.

**Rationale**: The spec states "Reported reviews routed to scoped admin moderation queue via spec 002 Report system." Reusing the reporting infrastructure avoids building a parallel moderation system. The flow:
1. User reports a review → `POST /api/reports { reportedContentType: 'review', reportedContentId: reviewId, ... }`
2. Report appears in scoped admin queue
3. Admin reviews → if actioned, calls `PATCH /api/teachers/:id/reviews/:reviewId { hidden: true, reason: '...' }`
4. Hidden review excluded from aggregate rating recalculation

**Extension to Spec 002's Report system**: The `reports` table currently supports `reportedMessageId`. We extend to support a generic `reported_content_type` + `reported_content_id` pattern. This is a minor schema evolution:
- Add `reported_content_type` (`message` | `review` | future types) 
- Add `reported_content_id` (uuid — references the reported item)
- Keep `reportedMessageId` as a backward-compatible alias

**Alternatives considered**:
- **Separate review moderation queue**: Duplicate infrastructure. The admin already has a moderation dashboard from Spec 002. Adding reviews to the same queue is simpler.
- **Auto-moderation (sentiment analysis, spam filter)**: Over-engineered for launch. Can be added later. The spec doesn't require it.

---

## R-8: Teacher Account Deletion — Anonymisation Strategy

**Decision**: On teacher account deletion, execute an anonymisation procedure within a single transaction:

1. **teacher_profiles**: Set `display_name = 'Deleted Teacher'`, `bio = NULL`, `specialties = '{}'`, `average_rating = NULL`, `review_count = NULL`, `is_deleted = true`, `deleted_at = now()`
2. **teacher_photos**: Hard-delete all rows + delete blobs from Azure Blob Storage
3. **certifications**: Set `name = 'Removed'`, `issuing_body = 'Removed'`, `proof_document_blob_path = NULL`, `verified_by_admin_id = NULL`; hard-delete proof document blobs from Blob Storage
4. **event_teachers**: Set `teacher_display_name = 'Deleted Teacher'` (denormalised for historical display); keep the assignment records for event history
5. **reviews** (written about the teacher): Remain with author attribution intact. `teacher_profile_id` FK still points to the anonymised row. Teacher display name resolved to "Deleted Teacher" via the profile's `is_deleted` flag.

**Rationale**: FR-13 specifies: reviews remain with "Deleted Teacher" attribution; PII removed; proof documents hard-deleted. The `is_deleted` flag on the profile is the simplest way to resolve display name in queries without denormalizing into every review row.

**Blob cleanup**: Proof documents and photos are hard-deleted from Azure Blob Storage in a fire-and-forget async operation after the DB transaction commits. If blob deletion fails, a cleanup job retries — the DB is the source of truth, and the blobs are orphaned but not accessible (no SAS tokens generated for deleted profiles).

**GDPR data export integration**: Before deletion, the export includes all teacher data (profile, certifications, reviews about them). This extends Spec 002's data export schema with a `teacherProfile` section.

**Alternatives considered**:
- **Hard-delete teacher_profiles row**: Would break FK references from reviews and event_teachers. Anonymisation preserves referential integrity.
- **Cascade delete all reviews**: The spec explicitly states reviews remain as community content. Reviews are not the teacher's data — they're authored by attendees.

---

## R-9: Review Reminders — Notification Scheduling

**Decision**: A scheduled job (daily cron, same infrastructure as R-3) queries for events that ended 1 day or 10 days ago, finds attendees who haven't yet submitted a review, and queues reminder notifications.

**Rationale**: FR-14 requires reminders at day 1 and day 10 post-event. The job:

**Day 1 reminders**:
```sql
SELECT DISTINCT r.user_id, r.event_id, et.teacher_profile_id
FROM rsvps r
JOIN event_teachers et ON et.event_id = r.event_id
LEFT JOIN reviews rev ON rev.event_id = r.event_id
  AND rev.teacher_profile_id = et.teacher_profile_id
  AND rev.reviewer_id = r.user_id
WHERE r.status = 'confirmed'
  AND rev.id IS NULL  -- no review submitted yet
  AND DATE(e.end_datetime) = CURRENT_DATE - INTERVAL '1 day'
```

**Day 10 reminders**: Same query with `INTERVAL '10 days'`.

**No reminder after submission**: The `LEFT JOIN reviews ... WHERE rev.id IS NULL` condition ensures reminders only go to attendees who haven't reviewed yet.

**No reminder after window close**: The job only targets events within the 14-day window (day 1 and day 10 are both within the window by definition).

**Notification type**: `review_reminder` — a distinct subscribable notification type per Principle X. Users can opt out.

**Alternatives considered**:
- **Schedule individual reminders per RSVP at event end**: Creates potentially thousands of scheduled jobs. A daily batch query is simpler and handles all events at once.
- **Client-side reminder (browser notification or in-app banner)**: Can complement but not replace server-side — users may not visit the app. The spec implies push/email reminders.

---

## R-10: Teacher Specialty Tags — Searchable/Filterable

**Decision**: Store specialties as a PostgreSQL text array (`text[]`) on `teacher_profiles`. Search uses `@>` (contains) operator with a GIN index. Predefined tag vocabulary managed as an application-level enum (TypeScript const array), not a separate DB table.

**Rationale**: FR-10 requires searchable/filterable specialties. Examples from the spec: "washing machines, hand-to-hand, therapeutic." This is a small, relatively stable vocabulary. A text array with GIN index provides:
- Efficient contains-query: `WHERE specialties @> ARRAY['therapeutic']`
- Multi-tag filter: `WHERE specialties @> ARRAY['therapeutic', 'hand-to-hand']`
- No join overhead (compared to separate tags table + junction table)

**Predefined vocabulary**: The app defines valid specialties in a TypeScript const:
```typescript
export const TEACHER_SPECIALTIES = [
  'washing_machines', 'hand_to_hand', 'therapeutic',
  'standing', 'l_basing', 'whips_pops', 'icarian',
  'partner_acrobatics', 'yoga', 'dance', 'other',
] as const;
```

Validation at API boundary ensures only known tags are stored. Adding new tags is a code change (reviewed via PR, per Principle VII — no admin UI for tag management at launch).

**Alternatives considered**:
- **Separate `specialties` table + junction table**: Normalised but adds join complexity for minimal benefit. The tag list is small (< 20 items) and stable. A text array is simpler.
- **JSON array column**: Similar to text array but loses PostgreSQL array operators. `text[]` is idiomatic PostgreSQL.
- **Full-text search**: Overkill for tag matching. Tags are exact matches, not free text.
