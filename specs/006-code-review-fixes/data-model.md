# Data Model: Code Review Remediation

**Spec**: 006 | **Date**: 2026-03-16

---

## Entity Change Overview

Spec 006 introduces **no new tables**. All changes are to the behaviour layer (route handlers, service functions, deletion flows). This document captures the data-model-relevant changes: GDPR deletion scope expansion and query corrections.

---

## GDPR Deletion Scope — Full Table Coverage

The account deletion function must cover all PII-bearing tables across all 5 specs. The table below shows the complete deletion order (existing + new entries).

### Existing deletion steps (Specs 001–004)

| Order | Table | Delete Condition | Spec |
|-------|-------|-----------------|------|
| 1 | notification_preferences | user_id = $userId | 001 |
| 2 | notifications | user_id = $userId | 001 |
| 3 | waitlist_entries | user_id = $userId | 001 |
| 4 | rsvps | user_id = $userId | 001 |
| 5 | events | creator_id = $userId | 001 |
| 6 | message_reactions | user_id = $userId | 002 |
| 7 | messages | sender_id = $userId | 002 |
| 8 | thread_participants | user_id = $userId | 002 |
| 9 | threads | creator_id = $userId | 002 |
| 10 | follows | follower_id = $userId OR followee_id = $userId | 002 |
| 11 | blocked_users | blocker_user_id = $userId OR blocked_user_id = $userId | 002 |
| 12 | reports | reporter_id = $userId | 002 |
| 13 | social_links | user_profile_id IN (SELECT id FROM user_profiles WHERE user_id = $userId) | 002 |
| 14 | user_profiles | user_id = $userId | 002 |
| 15 | occurrence_overrides | (via events) | 003 |
| 16 | bookings | user_id = $userId | 003 |
| 17 | concession_grants | user_id = $userId | 003 |
| 18 | permission_grants | user_id = $userId | 004 |
| 19 | permission_requests | user_id = $userId | 004 |
| 20 | stripe_accounts | user_id = $userId | 004 |

### New deletion steps (Spec 005 — added by this fix)

| Order | Table | Delete Condition | Spec | FK Dependency |
|-------|-------|-----------------|------|---------------|
| 21 | review_reminders | user_id = $userId | 005 | FK → reviews (reviewer reminder) |
| 22 | reviews (authored) | reviewer_id = $userId | 005 | FK → teacher_profiles, events |
| 23 | reviews (about user's teacher profile) | teacher_profile_id IN (SELECT id FROM teacher_profiles WHERE user_id = $userId) | 005 | FK → teacher_profiles |
| 24 | event_teachers | teacher_profile_id IN (SELECT id FROM teacher_profiles WHERE user_id = $userId) | 005 | FK → teacher_profiles, events |
| 25 | teacher_photos | teacher_profile_id IN (SELECT id FROM teacher_profiles WHERE user_id = $userId) | 005 | FK → teacher_profiles |
| 26 | certifications | teacher_profile_id IN (SELECT id FROM teacher_profiles WHERE user_id = $userId) | 005 | FK → teacher_profiles |
| 27 | teacher_requests | user_id = $userId | 005 | FK → users, geography |
| 28 | teacher_profiles | user_id = $userId | 005 | FK → users, cities |

**Order 21–28 MUST be inserted between the existing Spec 004 steps and the final user deletion step.** The order within 21–28 respects FK constraints (children deleted before parents).

---

## Query Corrections

### Teacher Search City Filter — Table Reference Fix

**Current (broken)**:
```sql
-- References wrong table, causing runtime error
WHERE wrong_table.city_id = $cityId
```

**Fixed**:
```sql
-- Correctly references teacher_profiles (or its joined alias)
WHERE teacher_profiles.city_id = $cityId
```

This is a single identifier change in the teacher search service function.

---

## Entities Affected by Auth Migration

No schema changes. The following entities have route handlers that read `x-user-id` from headers and must be migrated to session-based auth:

| Entity Domain | Approximate Route Count | Auth Pattern Change |
|---------------|------------------------|-------------------|
| Events (001) | ~8 routes | header → requireAuth() |
| Venues (001) | ~4 routes | header → requireAuth() |
| RSVPs (001) | ~3 routes | header → requireAuth() |
| User Profiles (002) | ~4 routes | header → requireAuth() |
| Follows (002) | ~3 routes | header → requireAuth() |
| Threads/Messages (002) | ~5 routes | header → requireAuth() |
| Bookings (003) | ~3 routes | header → requireAuth() |
| Recurrence (003) | ~2 routes | header → requireAuth() |
| **Total** | **~32 routes** | All to session-based |

Routes from Specs 004 and 005 already use `requireAuth()` / `getServerSession()` — no migration needed for those.

---

## Entities Requiring Ownership Checks

| Entity | Mutation | Owner Field | Current Check | Required Check |
|--------|----------|-------------|---------------|----------------|
| teacher_profiles | PATCH | user_id | Auth only | Auth + ownership (or admin) |
| teacher_profiles | DELETE | user_id | Auth only | Auth + ownership (or admin) |

---

## Entities Requiring Admin Permission Checks

| Endpoint | Current Check | Required Check |
|----------|---------------|----------------|
| Certification verify (PATCH) | requireAuth() | withPermission('admin') |
| Review moderate (PATCH) | requireAuth() | withPermission('admin') |
| Pending teacher requests (GET) | requireAuth() | withPermission('admin') |
| Expiring certifications (GET) | requireAuth() | withPermission('admin') |
