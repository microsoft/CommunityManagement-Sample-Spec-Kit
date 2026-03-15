# Tasks: Teacher Profiles & Reviews

**Input**: Design documents from `/specs/005-teacher-profiles-reviews/`
**Prerequisites**: plan.md, spec.md (005-teacher-profiles-reviews.md), research.md, data-model.md, contracts/, quickstart.md

**Cross-Spec Dependencies**:
- **Spec 004** (Permissions): `withPermission()` middleware, `PermissionRequest` pattern, scope-aware routing
- **Spec 001** (Events & RSVP): `events` table, `rsvps` table (attendance verification), `cities` table
- **Spec 002** (Community Social): Report system (`POST /api/reports`), GDPR export pattern, `user_profiles` table
- **Spec 003** (Recurring/Multi-Day): `occurrence_overrides` (review window from last occurrence)

**Downstream Consumers**: None (Spec 005 is a leaf spec)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in descriptions

---

## Phase 1: Setup (Project Initialisation)

**Purpose**: Install new dependencies and configure environment for Spec 005

- [ ] T001 Install @azure/storage-blob and sharp (EXIF stripping) dependencies via npm
- [ ] T002 [P] Add Spec 005 environment variables to .env.example: AZURE_STORAGE_CONNECTION_STRING, AZURE_STORAGE_CONTAINER_PROOF_DOCS, AZURE_STORAGE_CONTAINER_TEACHER_PHOTOS, SAS_TOKEN_EXPIRY_MINUTES, REVIEW_WINDOW_DAYS, CERT_EXPIRY_ALERT_DAYS
- [ ] T003 [P] Create Azure Blob Storage container setup script in scripts/setup-blob-storage.ts (creates teacher-proof-docs private container and teacher-photos blob-public container)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, shared types, blob storage service, and test helpers that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create database migration src/db/migrations/005_teachers_reviews.sql with all 7 tables (teacher_profiles, certifications, teacher_photos, event_teachers, reviews, teacher_requests, review_reminders), indexes, and check constraints per data-model.md
- [ ] T005 [P] Define teacher types, BadgeStatus/TeacherRequestStatus enums, TeacherSpecialty constants (TEACHER_SPECIALTIES array), and Zod validation schemas for all teacher inputs in src/lib/teachers/types.ts
- [ ] T006 [P] Define review types, Zod validation schemas (SubmitReviewRequest: rating 1–5 integer, text max 2000 chars), and PublicReview type in src/lib/reviews/types.ts
- [ ] T007 [P] Define event-teacher types (EventTeacher, TeacherRole enum), Zod schemas for AssignTeacherRequest in src/lib/teacher-events/types.ts
- [ ] T008 [P] Define shared API response contract types (TeacherProfile, TeacherSummary, Certification, CertificationAdminView) in src/types/teachers.ts and review response types in src/types/reviews.ts
- [ ] T009 Implement Azure Blob Storage service in src/lib/teachers/blob-storage.ts: generateUploadSas (write-only, 30-min expiry), generateDownloadSas (read-only, 15-min expiry), deleteBlob, deleteBlobsByPrefix (for account deletion), with blob path convention {teacherProfileId}/{certificationId}/{filename}
- [ ] T010 [P] Create PGlite test helpers and data factories in tests/helpers/teachers.ts: createTeacherProfile, createCertification, createTeacherRequest, createEventTeacher, submitReview, createReviewableScenario (event + teacher + attendee with confirmed RSVP)

**Checkpoint**: Foundation ready — migration applied, types defined, blob service available. User story implementation can begin.

---

## Phase 3: User Story 2 — Teacher Approval Flow (Priority: P0) 🎯 MVP

**Goal**: Users can submit teacher applications with credentials and proof documents; scoped admins can review, approve, or reject applications. Approved teachers receive a "Verified Teacher" badge.

**Independent Test**: Submit application → admin sees request in queue → approve → teacher_profiles row created with badge_status=verified → teacher appears in directory.

**Why US-2 first**: This story creates teacher profiles that US-1 (profile page) displays and US-3 (reviews) references. Approval flow is the data entry point.

### Service Layer

- [ ] T011 [US2] Implement teacher application functions in src/lib/teachers/service.ts: submitApplication (validate no pending request per user, create teacher_requests row with submitted_certifications JSONB, queue admin notification), listPendingRequests (scoped by city_id via withPermission)
- [ ] T012 [US2] Implement admin approval/rejection functions in src/lib/teachers/service.ts: approveRequest (within transaction: update teacher_requests status, create teacher_profiles row with badge_status=verified, create certifications rows from submitted_certifications JSONB, queue applicant notification), rejectRequest (update status, queue notification with reason)
- [ ] T013 [US2] Implement base certification service in src/lib/teachers/certification-service.ts: createCertificationsFromApplication (bulk insert from JSONB), confirmProofUpload (set proof_document_blob_path after client uploads to SAS URL)

### API Routes

- [ ] T014 [US2] Create POST /api/teachers/apply route in src/app/api/teachers/apply/route.ts: Zod validate SubmitTeacherApplicationRequest, check authenticated, check no pending application (409 on duplicate), create teacher_requests row, return TeacherRequest
- [ ] T015 [P] [US2] Create proof document upload endpoint POST /api/teachers/apply/proof/route.ts in src/app/api/teachers/apply/proof/route.ts: validate authenticated + owns the pending request, validate MIME type (image/jpeg, image/png, application/pdf) + max 10MB, generate write-only SAS URL, return { uploadUrl, blobPath, expiresAt }
- [ ] T016 [US2] Create GET /api/teachers/requests route in src/app/api/teachers/requests/route.ts: withPermission('approveTeacherRequests', scopeFromCity), paginated list of pending requests with applicant display name and email
- [ ] T017 [US2] Create PATCH /api/teachers/requests/:id route in src/app/api/teachers/requests/[id]/route.ts: withPermission check, Zod validate ReviewTeacherRequestBody (decision + optional reason), call approveRequest or rejectRequest, return updated request + optional teacherProfile on approval
- [ ] T018 [P] [US2] Create admin proof document view endpoint GET /api/teachers/requests/:id/proof/:certIndex/route.ts in src/app/api/teachers/requests/[id]/proof/[certIndex]/route.ts: withPermission('viewProofDocument'), generate read-only SAS URL (15-min expiry), return { downloadUrl, mimeType, expiresAt }

### UI Pages

- [ ] T019 [US2] Build teacher application form page in src/app/settings/teacher/page.tsx: form for bio, specialties (multi-select from TEACHER_SPECIALTIES), city picker, certifications list (name, issuing body, expiry date, proof document file upload), submit button, pending status display if application already submitted
- [ ] T020 [US2] Build admin teacher requests queue page in src/app/admin/teachers/page.tsx: list pending requests (scoped to admin's geography), expand to view applicant details + submitted certifications + proof document links (SAS URLs), approve/reject buttons with optional reason modal

**Checkpoint**: Teachers can apply, admins can approve/reject. Approved teachers exist in the database with verified badge status.

---

## Phase 4: User Story 1 — Teacher Profile Page (Priority: P0)

**Goal**: Community members can view a teacher's full profile (bio, specialties, certifications, photos, teaching history, upcoming events, aggregate rating), search the teacher directory, and manage their own profile. Event creators can assign verified teachers to events. Teachers can delete their account with full GDPR anonymisation.

**Independent Test**: Navigate to /teachers → see directory → click teacher → see full profile with certs, photos, teaching history. Event creator assigns teacher to event → teacher appears on event page. Teacher deletes account → profile shows "Deleted Teacher".

### Service Layer

- [ ] T021 [US1] Implement teacher profile read/update/search/delete functions in src/lib/teachers/service.ts: getTeacherProfile (join certifications, photos, event_teachers for recent/upcoming events), updateTeacherProfile (owner-only, validate specialties from TEACHER_SPECIALTIES vocab), searchTeachers (filter by city, specialty, badge_status with GIN index; sort by rating/name/recent; paginated), deleteTeacherProfile (full anonymisation transaction per data-model.md procedure + async blob cleanup via deleteBlobsByPrefix)
- [ ] T022 [P] [US1] Implement event-teacher assignment service in src/lib/teacher-events/service.ts: assignTeacher (validate badge_status=verified, unique constraint, denormalise teacher_display_name, queue notification), removeTeacher (delete row, queue notification), updateAssignmentRole (lead/assistant), listTeachersForEvent, listEventsForTeacher (teaching history with pagination)
- [ ] T023 [P] [US1] Extend certification service in src/lib/teachers/certification-service.ts: addCertification (owner-only, status=pending), updateCertification (name/issuingBody/expiryDate — does NOT auto re-verify expired certs), deleteCertification (hard-delete row + proof doc blob), listCertifications (public: no proof doc URLs, hasProofDocument boolean), verifyCertification (admin: set status verified/revoked, update badge_status if needed)

### API Routes

- [ ] T024 [US1] Create GET /api/teachers route (list/search) in src/app/api/teachers/route.ts: public, Zod validate ListTeachersQuery (city, specialty/specialties, badgeStatus, search, sortBy, page, pageSize), default filter badge_status=verified + is_deleted=false, return TeacherSummary[] with pagination
- [ ] T025 [US1] Create GET, PATCH, DELETE /api/teachers/:id routes in src/app/api/teachers/[id]/route.ts: GET (public — full profile with certs, photos, teaching history per GetTeacherResponse), PATCH (owner-only — bio, specialties, cityId), DELETE (owner or admin — full anonymisation per DeleteTeacherResponse)
- [ ] T026 [P] [US1] Create certification CRUD routes in src/app/api/teachers/[id]/certifications/route.ts (GET list, POST add) and src/app/api/teachers/[id]/certifications/[certId]/route.ts (PATCH update, DELETE remove): owner-only for mutations, public for list (no proof doc URLs)
- [ ] T027 [P] [US1] Create proof document routes in src/app/api/teachers/[id]/certifications/[certId]/proof/route.ts: POST (owner — generate upload SAS URL), GET (admin or owner — generate read SAS URL with withPermission('viewProofDocument'))
- [ ] T028 [P] [US1] Create admin certification verify route PATCH /api/teachers/:id/certifications/:certId/verify in src/app/api/teachers/[id]/certifications/[certId]/verify/route.ts: withPermission, Zod validate VerifyCertificationRequest (decision: verified/revoked + optional reason), return updated cert + teacher badge_status
- [ ] T029 [P] [US1] Create teacher photo routes (GET, POST, DELETE) in src/app/api/teachers/[id]/photos/route.ts: GET (public — list ordered by sort_order), POST (owner — strip EXIF via sharp, upload to teacher-photos container, max 10 photos enforced), DELETE in src/app/api/teachers/[id]/photos/[photoId]/route.ts (owner — delete row + blob, renumber sort_order)
- [ ] T030 [US1] Create event-teacher routes: GET and POST in src/app/api/events/[id]/teachers/route.ts (GET public — list EventTeacher[]; POST creator/admin via withPermission('editEvent') — assign verified teacher), DELETE and PATCH in src/app/api/events/[id]/teachers/[teacherProfileId]/route.ts (remove assignment; update role)

### UI Pages

- [ ] T031 [US1] Build teacher profile page in src/app/teachers/[id]/page.tsx: display bio, specialties (translated tags), certifications (name, issuing body, expiry status, no proof doc links), photo gallery, aggregate rating (stars + count), recent events taught (last 10), upcoming events, "Leave Review" link (if attendee + window open — delegates to US-3), "Deleted Teacher" state for is_deleted profiles
- [ ] T032 [US1] Build teacher directory/search page in src/app/teachers/page.tsx: search by name, filter by specialty (multi-select), filter by city, sort by rating/name/recent, paginated grid of TeacherSummary cards with photo, specialties, rating, badge
- [ ] T033 [US1] Add teacher management section to src/app/settings/teacher/page.tsx: edit bio, update specialties, manage certifications list (add/edit/delete with proof upload), manage photos (upload/reorder/delete), delete teacher account button with confirmation modal

**Checkpoint**: Full teacher profile lifecycle complete — creation (US-2), display, search, assignment to events, and GDPR-compliant deletion. All P0 functional requirements satisfied.

---

## Phase 5: User Story 3 — Post-Event Reviews (Priority: P2)

**Goal**: Attendees can rate and review teachers after attending an event. Reviews are attendance-verified, time-windowed (14 days), one per attendee per event-teacher pair. Aggregate rating updates on the teacher profile. Admins can moderate via the Report system.

**Independent Test**: Attend event → wait for event to end → submit 4-star review → teacher's aggregate rating updates → try duplicate review (409) → wait 15 days → try again (410 window closed). Non-attendee tries to review (403).

### Service Layer

- [ ] T034 [US3] Implement review service in src/lib/reviews/service.ts: submitReview (check confirmed RSVP via rsvps table, check event_teachers assignment exists, compute review_window_closes_at from event end_datetime + 14 days — for recurring events use occurrence end date per R-4, check window open, check unique constraint, insert review, call recalculateAggregate within same transaction), listReviewsForTeacher (paginated, exclude hidden, sort by recent/highest/lowest, include rating distribution), listReviewsForEvent (paginated, exclude hidden, optional teacher filter)
- [ ] T035 [US3] Implement aggregate rating calculation in src/lib/reviews/aggregate.ts: recalculateAggregate (UPDATE teacher_profiles SET average_rating = AVG(rating) WHERE hidden_at IS NULL, review_count = COUNT(*) WHERE hidden_at IS NULL — runs within review submission transaction per R-5)
- [ ] T036 [US3] Implement review moderation functions in src/lib/reviews/service.ts: hideReview (set hidden_at/hidden_by/hidden_reason, recalculate aggregate), unhideReview (clear hidden fields, recalculate), integrates with Spec 002 Report system (reported_content_type='review')
- [ ] T037 [US3] Implement review reminder job in src/lib/reviews/reminder-job.ts: processReviewReminders(asOfDate) — query events ended 1 or 10 days ago, find attendees (confirmed RSVP) who haven't reviewed, check review_reminders table to skip already-sent, insert review_reminders rows, queue review_reminder notifications per R-9

### API Routes

- [ ] T038 [US3] Create POST and GET /api/events/:id/reviews routes in src/app/api/events/[id]/reviews/route.ts: POST (authenticated — Zod validate SubmitReviewRequest, run all server-side checks per contract, return SubmitReviewResponse with updated aggregate), GET (public — paginated ListEventReviewsResponse, optional teacherProfileId filter, exclude hidden)
- [ ] T039 [P] [US3] Create GET /api/teachers/:id/reviews route in src/app/api/teachers/[id]/reviews/route.ts: public, paginated ListTeacherReviewsResponse with sort options (recent/highest/lowest), include aggregate with star distribution {1:n, 2:n, 3:n, 4:n, 5:n}
- [ ] T040 [US3] Create PATCH /api/teachers/:id/reviews/:reviewId route (moderation) in src/app/api/teachers/[id]/reviews/[reviewId]/route.ts: withPermission('moderateReviews', teacherScope), Zod validate ModerateReviewRequest (hidden boolean + reason), return ModerateReviewResponse with updated aggregate
- [ ] T041 [US3] Add review submission UI to teacher profile page in src/app/teachers/[id]/page.tsx: "Leave Review" form (star rating via accessible keyboard-navigable widget, optional text area max 2000 chars), show only if user has confirmed RSVP + window open + no existing review, display existing reviews list with rating, text, reviewer name, event title, date
- [ ] T042 [US3] Add review display section to event detail page: list reviews for event teachers, show aggregate per teacher, review submission prompt if eligible (attendance verified + window open)

**Checkpoint**: Full review lifecycle — submit (with all validations), display, aggregate rating, moderation. Reminders scheduled via cron job.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Scheduled jobs, admin dashboards, cross-spec integrations, and validation

- [ ] T043 Implement certification expiry job in src/lib/teachers/certification-expiry-job.ts: processExpiringCertifications(asOfDate) — daily job: (1) UPDATE certifications SET status='expired' WHERE status='verified' AND expiry_date < asOfDate, queue teacher + admin notifications; (2) query certs expiring within 30 days, queue teacher 30-day warning; (3) if ALL teacher's certs are expired, transition teacher badge_status to 'expired' per R-3
- [ ] T044 [P] Create GET /api/admin/certifications/expiring route in src/app/api/admin/certifications/expiring/route.ts: withPermission (scoped admin), Zod validate ListExpiringCertificationsQuery (daysUntilExpiry default 30, includeExpired default true), return CertificationAdminView[] with teacherDisplayName, daysUntilExpiry, sorted by expiry ascending
- [ ] T045 [P] Build admin expiring certifications dashboard page in src/app/admin/teachers/certifications/page.tsx: list certs expiring within 30 days and already-expired, teacher name + city, days until expiry, link to verify/revoke/view proof doc
- [ ] T046 Extend Spec 002 Report system to support reported_content_type='review': add reported_content_type and reported_content_id columns to reports table (migration or alter), update report creation to accept review reports, ensure scoped admin moderation queue includes review reports
- [ ] T047 Extend Spec 002 GDPR data export (ExportFileSchema) with teacherProfile section: include display_name, bio, specialties, certifications (name, issuing body, expiry, status), photos, reviewsReceived, reviewsWritten per data-model.md export schema
- [ ] T048 [P] Wire scheduled job entry points: register cert-expiry job (daily 02:00 UTC) and review-reminders job (daily 09:00 UTC) in application cron/timer configuration, with asOfDate parameter for testability
- [ ] T049 Run quickstart.md validation: verify all 23 API endpoints return expected status codes, verify both scheduled jobs execute without errors, verify blob storage containers accessible, confirm PGlite test suite passes

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ──────────────────────────────► can start immediately
    │
    ▼
Phase 2: Foundational ──────────────────────► BLOCKS all user stories
    │
    ├──► Phase 3: US-2 Teacher Approval (P0) ──┐
    │         creates teacher profiles           │
    │                                            ▼
    │    Phase 4: US-1 Teacher Profile (P0) ◄───┘
    │         displays profiles, assigns to events, deletion
    │                    │
    │                    ▼
    │    Phase 5: US-3 Post-Event Reviews (P2)
    │         reviews reference teachers + events
    │
    └──► Phase 6: Polish ◄── after all desired stories complete
```

### User Story Dependencies

- **US-2 (P0)**: Can start after Foundational (Phase 2). No dependencies on other user stories. Creates teacher profiles that US-1 and US-3 consume.
- **US-1 (P0)**: Depends on US-2 service layer (T011–T013) being complete so teacher profiles exist. API routes and UI can be built in parallel with US-2 UI tasks.
- **US-3 (P2)**: Depends on US-1 event-teacher assignment (T022) so `event_teachers` rows exist for review validation. Can start service layer after Phase 2 if test factories provide seed data.

### Cross-Spec Integration Points

| Task | Consumes From | Integration |
|------|--------------|-------------|
| T016, T017, T018 | Spec 004 | `withPermission('approveTeacherRequests', scope)` for admin routes |
| T025, T028, T030 | Spec 004 | `withPermission('editEvent')`, `withPermission('viewProofDocument')` |
| T034 | Spec 001 | Query `rsvps` table for attendance verification |
| T034 | Spec 001/003 | Query `events` table for end_datetime; consult occurrence_overrides for multi-day |
| T040, T046 | Spec 002 | Report system extended with `reported_content_type='review'` |
| T047 | Spec 002 | GDPR export extended with `teacherProfile` section |

### Within Each User Story

1. Types/schemas defined (Phase 2) → Service functions → API routes → UI pages
2. Service layer must be complete before API routes that call it
3. API routes can be built in parallel when they use different service functions
4. UI pages depend on their corresponding API routes

### Parallel Opportunities

**Phase 2** — All type definition tasks (T005–T008) run in parallel; T009 (blob service) and T010 (test helpers) also parallel:
```
T004 (migration) ─► sequential (must complete first for schema reference)
T005, T006, T007, T008, T009, T010 ─► all parallel after T004
```

**Phase 3** — After T011–T013 service layer:
```
T014 (apply route) ─► sequential
T015 (proof upload), T018 (admin proof view) ─► parallel with T016–T017
T019, T020 (UI pages) ─► parallel after routes complete
```

**Phase 4** — After T021–T023 service layer:
```
T024 (search), T025 (profile CRUD) ─► sequential (core routes)
T026 (cert routes), T027 (proof routes), T028 (verify), T029 (photos), T030 (events) ─► parallel
T031, T032, T033 (UI pages) ─► parallel after routes complete
```

**Phase 5** — After T034–T037 service layer:
```
T038 (event reviews route) ─► sequential (core)
T039 (teacher reviews), T040 (moderation) ─► parallel after T038
T041, T042 (UI) ─► parallel after routes complete
```

---

## Implementation Strategy

### MVP Scope (Recommended First Delivery)

**Phases 1–3 (US-2)**: Teacher application and admin approval. Delivers the core data pipeline — teachers can apply, admins can approve, verified teacher profiles exist in the system. **19 tasks.**

### Incremental Delivery

1. **MVP**: Phases 1–3 → Teachers can be created via admin approval
2. **+US-1**: Phase 4 → Teacher profiles visible, searchable, assignable to events, deletable
3. **+US-3**: Phase 5 → Reviews and ratings complete the teacher reputation system
4. **+Polish**: Phase 6 → Automated expiry, admin dashboards, GDPR compliance, cross-spec integrations

### Task Summary

| Phase | Story | Tasks | Parallel |
|-------|-------|:-----:|:--------:|
| 1 — Setup | — | 3 | 2 |
| 2 — Foundational | — | 7 | 5 |
| 3 — US-2 Approval | P0 | 10 | 3 |
| 4 — US-1 Profile | P0 | 13 | 8 |
| 5 — US-3 Reviews | P2 | 9 | 2 |
| 6 — Polish | — | 7 | 3 |
| **Total** | | **49** | **23** |
