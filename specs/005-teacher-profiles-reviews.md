# Feature Spec 005: Teacher Profiles & Reviews

> Priority: P1 — Required for community trust and teacher discovery
> Status: Implemented
> Constitution check: Principles I, III, V, VIII, XI

## User Scenarios & Testing

### US-1: Teacher Profile Page (P0)

**As** a community member looking for a good AcroYoga teacher,
**I want** to view a teacher's full profile including bio, specialties, certifications, and teaching history,
**So that** I can make an informed choice about attending their events.

**Given** I click on a teacher's name anywhere in the app,
**When** the teacher profile page loads,
**Then** I see: bio, specialties (e.g., washing machines, hand-to-hand, therapeutic), certifications with expiry status, profile photos, links to past events they taught, upcoming events they're teaching, and aggregate rating.

### US-2: Teacher Approval Flow (P0)

**As** a user who wants to be listed as a qualified teacher,
**I want** to submit a teacher application with my credentials,
**So that** an admin can verify and approve me.

**Given** I am a logged-in user,
**When** I submit a teacher request with credentials (certification name, issuing body, expiry date, optional proof document),
**Then** the request enters a "pending" state visible to admins at my scope level.

**Given** an admin approves my request,
**When** I view my profile,
**Then** I see a "Verified Teacher" badge and can be assigned as teacher to events.

**Given** my certification expires,
**When** the expiry date passes,
**Then** I see a warning on my profile; admins are notified; my "Verified" badge shows "Expired" status.

### US-3: Post-Event Reviews (P2)

**As** an attendee who just attended a workshop,
**I want** to leave a rating and optional review for the teacher,
**So that** the community benefits from honest feedback.

**Given** I attended an event (RSVP + event date has passed),
**When** I visit the event detail page or the teacher's profile,
**Then** I see a "Leave review" prompt.

**Given** I submit a review (1-5 stars + optional text) within 14 days of the event,
**When** the review is saved,
**Then** it appears on the teacher's profile and contributes to their aggregate rating.

**Given** I attended an event more than 14 days ago,
**When** I try to leave a review,
**Then** the server rejects it: "The review window for this event has closed."

**Given** I try to review a teacher for an event I didn't attend,
**When** I attempt to submit,
**Then** the server rejects it: "You can only review events you attended."

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Teacher profile page: bio, specialties, certifications, photos, teaching history, upcoming events | P0 |
| FR-02 | Teacher application with credentials and optional proof document upload. Documents stored in Azure Blob Storage with restricted access — only the teacher and scoped admins can view. Never exposed in public API responses | P0 |
| FR-03 | Admin approval workflow for teacher requests with scope-aware routing | P0 |
| FR-04 | Certification expiry tracking with automated status transition and admin notification | P1 |
| FR-05 | "Verified Teacher" badge with expiry-aware states: verified / expired / revoked | P0 |
| FR-06 | Event-teacher assignment: event creators pick from verified teachers when creating events. Teachers do not need Event Creator role to be assigned to events | P0 |
| FR-07 | Post-event reviews: 1-5 stars + optional text; only by confirmed attendees. One review per attendee per event-teacher pair (unique constraint). Reported reviews routed to scoped admin moderation queue via spec 002 Report system. 14-day review window after event date; server rejects submissions after window closes | P2 |
| FR-14 | Review reminder notifications: prompt sent to attendees 1 day after event if no review submitted; second reminder at 10 days. No further reminders after submission or window close | P2 |
| FR-08 | Aggregate teacher rating displayed on profile | P2 |
| FR-09 | Insurance expiry alerts: notify teacher 30 days before, notify admin on expiry | P1 |
| FR-10 | Teacher specialties are searchable/filterable tags | P1 |
| FR-11 | "Verified Teacher" is a profile attribute, independent of the Event Creator role. A teacher can teach at others' events without being an Event Creator. A user can hold both teacher status and Event Creator role independently | P0 |
| FR-12 | Proof documents hard-deleted when teacher deletes their account (GDPR). Retained while account is active for re-verification on certification renewal | P0 |
| FR-13 | Teacher account deletion: profile anonymised to "Deleted Teacher", bio/photos/PII removed, proof documents hard-deleted, certifications anonymised, aggregate rating removed. Reviews written about the teacher remain with author attribution intact but teacher name shows "Deleted Teacher". Teaching history entries anonymised | P0 |

### Key Entities

- **TeacherProfile**: id, userId, bio, specialties (array), isDeleted, deletedAt, createdAt, updatedAt
- **Certification**: id, teacherProfileId, name, issuingBody, expiryDate, proofDocumentUrl, verifiedByAdminId, status (pending/verified/expired/revoked)
- **TeacherEvent**: eventId, teacherProfileId, role (lead/assistant)
- **Review**: id, eventId, teacherProfileId, reviewerId, rating (1-5), text, createdAt, reviewWindowClosesAt
- **TeacherPhoto**: id, teacherProfileId, url, sortOrder

### Edge Cases

- Teacher has events assigned but certification expires: events remain listed but teacher badge shows "Expired"; admin notified to decide action
- Review moderation: reported reviews enter scoped admin queue (via spec 002 Report system). Admin can hide a review (soft-delete with reason). Hidden reviews excluded from aggregate rating
- Teacher deletes account: profile anonymised to "Deleted Teacher" — bio, photos, proof documents, and all PII removed. Reviews about them remain (community content) with teacher displayed as "Deleted Teacher". Certifications anonymised. Aggregate rating removed. Teaching history entries anonymised but events remain intact
- Multiple certifications: teacher may have multiple (e.g., AcroYoga International + partner acrobatics); each tracked independently
- Review window edge case: if an event spans multiple days (spec 003), the 14-day window starts from the last day of the event

---

## Success Criteria

| ID | Criterion | Measurement |
|----|-----------|-------------|
| SC-01 | Teacher profile loads with full teaching history in < 2s | Performance test |
| SC-02 | Only admin at teacher's scope or above can approve/reject teacher requests | Integration test |
| SC-03 | Expiry date triggers status transition automatically (no manual intervention) | Integration test with mocked dates |
| SC-04 | Reviews are only submittable by confirmed attendees of past events | Integration test: non-attendee review → 403 |
| SC-05 | Aggregate rating is correctly calculated and updated on each new review | Integration test |
| SC-06 | Teacher deletion anonymises profile and removes PII/photos/docs; reviews remain with "Deleted Teacher" attribution | Integration test |
| SC-07 | Review submission rejected after 14-day window | Integration test with mocked dates |
| SC-08 | Review reminders sent at day 1 and day 10 post-event; no reminder after review submitted | Integration test |
