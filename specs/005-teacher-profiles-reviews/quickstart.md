# Quickstart: Teacher Profiles & Reviews

**Spec**: 005 | **Date**: 2026-03-15

---

## Prerequisites

- Node.js 20+
- PostgreSQL (or PGlite for tests — handled automatically)
- Azure Storage account (for proof document uploads)
- Specs 001, 002, 003, 004 migrations applied (teacher features depend on users, events, rsvps, geography, cities, reports)
- Microsoft Entra External ID tenant configured (for auth)

## Setup

```bash
# 1. Install dependencies (from repo root)
npm install

# 2. Set environment variables (add to .env.local)
# --- Existing from prior specs ---
#   DATABASE_URL=postgresql://...
#   NEXTAUTH_SECRET=...
#   ENTRA_CLIENT_ID=...
#   ENTRA_TENANT_ID=...

# --- New for Spec 005 ---
#   AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
#   AZURE_STORAGE_CONTAINER_PROOF_DOCS=teacher-proof-docs
#   AZURE_STORAGE_CONTAINER_TEACHER_PHOTOS=teacher-photos
#   SAS_TOKEN_EXPIRY_MINUTES=15
#   REVIEW_WINDOW_DAYS=14
#   CERT_EXPIRY_ALERT_DAYS=30

# 3. Run database migrations (includes 005_teachers_reviews.sql)
npm run db:migrate

# 4. Create Azure Blob Storage containers (one-time setup)
npm run setup:blob-storage
# This creates:
#   - teacher-proof-docs (private access)
#   - teacher-photos (blob-level public read)
```

## Running Tests

```bash
# Integration tests (uses PGlite — no external DB or Azure Storage needed)
npm run test -- tests/integration/teachers/
npm run test -- tests/integration/reviews/
npm run test -- tests/integration/teacher-events/

# Specific test file
npm run test -- tests/integration/reviews/review-window.test.ts

# All spec 005 tests
npm run test -- tests/integration/teachers/ tests/integration/reviews/ tests/integration/teacher-events/

# E2E tests (requires running dev server + Azure Storage emulator)
npm run dev &
npm run test:e2e -- tests/e2e/teacher-profile.spec.ts
npm run test:e2e -- tests/e2e/teacher-approval.spec.ts
```

**Azure Storage in tests**: Integration tests mock blob storage with an in-memory adapter. E2E tests use Azurite (Azure Storage emulator) — install with `npm install -g azurite` and run `azurite --silent` before E2E tests.

## Key Concepts

### Teacher Profile vs User Profile

Teacher profiles are a **separate entity** from Spec 002's `user_profiles`. A user can have both — the user profile is their general community identity; the teacher profile is their teaching credentials and history.

```
user_profiles (Spec 002)     teacher_profiles (Spec 005)
├── display_name             ├── display_name (denormalised)
├── bio                      ├── bio (teacher-specific)
├── home_city                ├── city_id (teaching city)
├── avatar_url               ├── specialties[]
└── default_role             ├── certifications[]
                             ├── photos[]
                             ├── average_rating
                             └── badge_status
```

### Teacher is Independent of Event Creator

A Verified Teacher does NOT need the Event Creator role (Spec 004). The roles are independent:

| Scenario | Event Creator? | Verified Teacher? | What they can do |
|----------|:-:|:-:|---|
| Teacher only | ❌ | ✅ | Can be assigned to others' events. Cannot create events. |
| Creator only | ✅ | ❌ | Can create events. Cannot be listed as teacher. |
| Both | ✅ | ✅ | Can create events AND be assigned as teacher. |
| Neither | ❌ | ❌ | Regular member — RSVP, review, etc. |

### Teacher Application Flow

```
Member submits application
  → POST /api/teachers/apply (bio, specialties, certifications + proof docs)
  → teacher_requests row created (status: pending)
  → Scoped admin notified

Admin reviews at /admin/teachers
  → PATCH /api/teachers/requests/:id { decision: 'approved' }
  → teacher_profiles row created (badge_status: verified)
  → certifications rows created (status: verified)
  → Teacher notified

Teacher now appears in teacher directory and can be assigned to events
```

### Review Submission Flow

```
Attendee visits event page or teacher profile (after attending)
  → POST /api/events/:id/reviews { teacherProfileId, rating, text? }
  → Server checks:
      1. Confirmed RSVP exists for this user + event? (from rsvps table)
      2. Review window open? (event end + 14 days > now)
      3. No duplicate review? (unique constraint)
  → Review created, aggregate rating recalculated
```

### Certification Expiry

A daily cron job (`npm run job:cert-expiry`) handles:

1. **30 days before expiry**: Notify teacher ("Your certification X expires in 30 days")
2. **On expiry day**: Transition cert status `verified → expired`, notify admin
3. **All certs expired**: Teacher badge transitions `verified → expired`

### Proof Document Access

Proof documents are **never** in public API responses. Access flow:

```
Teacher uploads proof doc
  → POST /api/teachers/:id/certifications/:certId/proof
  → Server generates write SAS URL → teacher uploads to Blob Storage
  → proof_document_blob_path stored in DB

Admin views proof doc
  → GET /api/teachers/:id/certifications/:certId/proof
  → withPermission('viewProofDocument', teacherScope) check
  → Server generates read SAS URL (15-min expiry) → redirect to signed URL
```

### Testing Patterns

```typescript
import { createTestDb } from '@/tests/helpers/db';
import { createTeacherProfile, submitReview } from '@/tests/helpers/teachers';

test('only attendees can submit reviews', async () => {
  const db = await createTestDb();
  const teacher = await createTeacherProfile(db, { badgeStatus: 'verified' });
  const event = await createTestEvent(db, { teachers: [teacher.id] });
  const nonAttendee = await createTestUser(db);

  const result = await submitReview(db, {
    eventId: event.id,
    teacherProfileId: teacher.id,
    reviewerId: nonAttendee.id,
    rating: 5,
  });

  expect(result.error).toBe('You can only review events you attended.');
});

test('review window closes after 14 days', async () => {
  const db = await createTestDb();
  const { event, teacher, attendee } = await createReviewableScenario(db);

  // Simulate 15 days after event end
  const result = await submitReview(db, {
    eventId: event.id,
    teacherProfileId: teacher.id,
    reviewerId: attendee.id,
    rating: 4,
    asOfDate: addDays(event.endDatetime, 15),
  });

  expect(result.error).toBe('The review window for this event has closed.');
});
```

## API Endpoints Summary

| Method | Path | Auth | Priority | Description |
|--------|------|------|:---:|-------------|
| GET | `/api/teachers` | Public | P0 | List/search teachers (filterable by specialty, city) |
| POST | `/api/teachers/apply` | Member | P0 | Submit teacher application |
| GET | `/api/teachers/:id` | Public | P0 | Get teacher profile |
| PATCH | `/api/teachers/:id` | Owner | P0 | Update own teacher profile (bio, specialties) |
| GET | `/api/teachers/:id/certifications` | Public | P0 | List teacher's certifications (no proof doc URLs) |
| POST | `/api/teachers/:id/certifications` | Owner | P1 | Add certification to own profile |
| PATCH | `/api/teachers/:id/certifications/:certId` | Owner | P1 | Update certification |
| DELETE | `/api/teachers/:id/certifications/:certId` | Owner | P1 | Remove certification |
| POST | `/api/teachers/:id/certifications/:certId/proof` | Owner | P0 | Upload proof document (returns SAS upload URL) |
| GET | `/api/teachers/:id/certifications/:certId/proof` | Admin | P0 | View proof document (returns SAS read URL) |
| GET | `/api/teachers/:id/photos` | Public | P0 | List teacher photos |
| POST | `/api/teachers/:id/photos` | Owner | P0 | Upload teacher photo |
| DELETE | `/api/teachers/:id/photos/:photoId` | Owner | P0 | Delete teacher photo |
| GET | `/api/teachers/:id/reviews` | Public | P2 | List reviews for teacher |
| GET | `/api/teachers/requests` | Admin | P0 | List pending teacher requests (scoped) |
| PATCH | `/api/teachers/requests/:id` | Admin | P0 | Approve/reject teacher request |
| GET | `/api/events/:id/teachers` | Public | P0 | List teachers for an event |
| POST | `/api/events/:id/teachers` | Creator/Admin | P0 | Assign teacher to event |
| DELETE | `/api/events/:id/teachers/:teacherId` | Creator/Admin | P0 | Remove teacher from event |
| POST | `/api/events/:id/reviews` | Attendee | P2 | Submit review for event teacher |
| GET | `/api/events/:id/reviews` | Public | P2 | List reviews for event |
| GET | `/api/admin/certifications/expiring` | Admin | P1 | List expiring/expired certifications |
| DELETE | `/api/teachers/:id` | Owner | P0 | Delete teacher account (anonymisation) |

## Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `cert-expiry` | Daily 02:00 UTC | Expire certifications, send 30-day alerts |
| `review-reminders` | Daily 09:00 UTC | Send day-1 and day-10 review reminders |
