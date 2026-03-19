# Feature Spec 002: Community & Social Features

> Priority: P1 — Required for user retention
> Status: Draft
> Constitution check: Principles I, III, V, VIII, X

## User Scenarios & Testing

### US-1: Set Up My Profile (P0)

**As** a new community member,
**I want** to set up my profile with my name, home city, default RSVP role, and social links,
**So that** other community members can learn about me and organisers can see my preferences.

**Given** I have just logged in for the first time,
**When** I navigate to my profile page,
**Then** I can set: display name, home city (auto-detected or manual), default role (Base/Flyer/Hybrid), bio, social links (Facebook, Instagram, YouTube, website) each with a visibility toggle (everyone / followers / friends / hidden).

### US-2: Control My Privacy (P0)

**As** a privacy-conscious user,
**I want** to control who can see my social links and profile information,
**So that** I share only with people I trust.

**Given** I am on my profile settings,
**When** I set my Instagram link visibility to "friends only",
**Then** only users who are mutual friends can see my Instagram link; others see it as hidden.

**Given** I RSVP to an event with "name visible" unchecked,
**When** someone views the event's attendee list,
**Then** my name does not appear in the public list; I am counted in the aggregate total.

### US-3: Follow and Friend Other Members (P1)

**As** a community member who regularly practices with the same people,
**I want** to follow other members and see when we become mutual friends,
**So that** I can build my trusted community circle.

**Given** I am viewing another user's profile,
**When** I click "Follow",
**Then** I follow that user (one-directional). If they also follow me, we become "friends" (mutual).

**Given** I follow someone,
**When** they follow me back,
**Then** we are both shown as "Friends" and can see each other's friends-only content.

### US-4: Event Discussion Threads (P2)

**As** an event attendee,
**I want** to discuss logistics with other attendees in an event-specific chat thread,
**So that** we can coordinate (rides, gear, etc.) without leaving the app.

**Given** I have RSVP'd to an event,
**When** I open the event discussion tab,
**Then** I see the message history (including messages before I joined) and can post new messages.

**Given** I have not RSVP'd,
**When** I view the event page,
**Then** I can see the discussion thread as read-only.

### US-5: Export and Delete My Data (P0)

**As** a user exercising my GDPR rights,
**I want** to export all my data or delete my account,
**So that** I maintain control over my personal information.

**Given** I am on my profile settings,
**When** I click "Export my data",
**Then** I receive a JSON file containing all my profile data, RSVPs, interests, bookings, and messages within 30 days.

**Given** I click "Delete my account",
**When** I confirm the deletion,
**Then** all my PII is permanently removed; anonymised aggregate data (RSVP counts, etc.) is retained.

### US-6: Block, Mute, and Report Another User (P1)

**As** a community member who feels unsafe or harassed,
**I want** to block, mute, or report another user,
**So that** I can control my experience and escalate harmful behaviour to admins.

**Given** I am viewing another user's profile,
**When** I select "Block",
**Then** the blocked user cannot follow me, message me, or view my profile; any existing follow in either direction is severed; we no longer appear as friends.

**Given** I have blocked a user,
**When** they view an event attendee list I'm on,
**Then** my name is hidden from them (and theirs from me).

**Given** I am in an event discussion thread,
**When** I select "Mute" on another user,
**Then** their messages are hidden from my view in all threads; they are not notified; our follow/friend relationship is unaffected.

**Given** I select "Report" on another user's profile or message,
**When** I submit with a reason (harassment, spam, inappropriate content, other),
**Then** the report is queued for admin review at the reported user's scope level; I receive confirmation that the report was submitted.

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | User profile with name, bio, home city, default role, and social links | P0 |
| FR-02 | Per-platform visibility toggle for social links: everyone / followers / friends / hidden | P0 |
| FR-03 | Home city linked to platform city registry (foreign key to City entity). Auto-detection snaps to nearest registry city (100km threshold, same as spec 001). Manual override selects from registry list | P0 |
| FR-04 | Unidirectional follow; mutual follows = friends | P1 |
| FR-05 | Per-event discussion threads; auto-subscribe on RSVP; read-only for non-attendees | P2 |
| FR-12 | Messages editable and deletable by author (no time limit); edit history preserved. Max message length: 2000 characters. No file/image attachments in v1 | P2 |
| FR-13 | Admins at event scope can delete any message, lock/unlock threads, and pin messages (max 3 pinned per thread) | P2 |
| FR-14 | Message reactions: predefined emoji set (e.g., thumbs up, heart, fire, laugh). One reaction per type per user per message | P2 |
| FR-06 | GDPR data export: async background job generates full JSON. User receives in-app notification (+ email if channel enabled) with a secure, time-limited download link (expires after 7 days). Includes: profile, RSVPs, interests, bookings, credits, messages authored, follows, blocks/mutes. Excludes messages authored by others | P0 |
| FR-07 | GDPR data deletion: hard-delete PII, retain anonymised aggregates. Messages in threads are replaced with "[deleted]" and author set to "Deleted User" (preserves thread continuity). Reactions on deleted user's messages are removed | P0 |
| FR-08 | Profile visibility tiers applied at query time; no PII leakage in API | P0 |
| FR-09 | Block: severs follow/friend, hides profiles mutually, prevents follow/message. Blocking is silent (blocked user is not notified) | P1 |
| FR-10 | Mute: hides a user's messages in all threads from the muter's view. Does not sever follow/friend. Silent | P1 |
| FR-11 | Report: user submits a report (reason enum: harassment/spam/inappropriate/other) with optional text. Routed to scoped admin moderation queue | P1 |

### Key Entities

- **UserProfile**: id, displayName, bio, homeCityId (FK to City), defaultRole, avatarUrl, createdAt, updatedAt
- **SocialLink**: id, userId, platform (facebook/instagram/youtube/website), url, visibility (everyone/followers/friends/hidden)
- **Follow**: id, followerId, followeeId, createdAt
- **Thread**: id, entityType (event/city/country), entityId, createdAt
- **Message**: id, threadId, authorId, content, editHistory (JSON array), isPinned, pinnedBy, isDeleted, deletedBy, createdAt, editedAt
- **Reaction**: id, messageId, userId, emoji, createdAt
- **Block**: id, blockerId, blockedId, createdAt
- **Mute**: id, muterId, mutedId, createdAt
- **Report**: id, reporterId, reportedUserId, reason (enum: harassment/spam/inappropriate/other), details, status (pending/reviewed/actioned/dismissed), reviewedBy, createdAt, reviewedAt

---

## Success Criteria

| ID | Criterion | Measurement |
|----|-----------|-------------|
| SC-01 | Profile setup completes in < 2 minutes including geolocation prompt | UX test |
| SC-02 | Social link visibility enforced server-side; API never returns hidden links | Integration test |
| SC-03 | Data export contains all user PII and is valid JSON | Integration test |
| SC-04 | Account deletion removes all PII from database; aggregate counts unchanged | Integration test with before/after verification |
| SC-05 | Follow/friend state is consistent: A follows B + B follows A = both show "Friends" | Integration test |
