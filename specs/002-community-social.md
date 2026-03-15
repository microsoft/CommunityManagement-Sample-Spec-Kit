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

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | User profile with name, bio, home city, default role, and social links | P0 |
| FR-02 | Per-platform visibility toggle for social links: everyone / followers / friends / hidden | P0 |
| FR-03 | Home city auto-detection via browser geolocation with manual override | P0 |
| FR-04 | Unidirectional follow; mutual follows = friends | P1 |
| FR-05 | Per-event discussion threads; auto-subscribe on RSVP; read-only for non-attendees | P2 |
| FR-06 | GDPR data export: full JSON export of all user data | P0 |
| FR-07 | GDPR data deletion: hard-delete PII, retain anonymised aggregates | P0 |
| FR-08 | Profile visibility tiers applied at query time; no PII leakage in API | P0 |

### Key Entities

- **UserProfile**: id, displayName, bio, homeCity, defaultRole, avatarUrl, createdAt, updatedAt
- **SocialLink**: id, userId, platform (facebook/instagram/youtube/website), url, visibility (everyone/followers/friends/hidden)
- **Follow**: id, followerId, followeeId, createdAt
- **Thread**: id, entityType (event/city/country), entityId, createdAt
- **Message**: id, threadId, authorId, content, createdAt, editedAt

---

## Success Criteria

| ID | Criterion | Measurement |
|----|-----------|-------------|
| SC-01 | Profile setup completes in < 2 minutes including geolocation prompt | UX test |
| SC-02 | Social link visibility enforced server-side; API never returns hidden links | Integration test |
| SC-03 | Data export contains all user PII and is valid JSON | Integration test |
| SC-04 | Account deletion removes all PII from database; aggregate counts unchanged | Integration test with before/after verification |
| SC-05 | Follow/friend state is consistent: A follows B + B follows A = both show "Friends" | Integration test |
