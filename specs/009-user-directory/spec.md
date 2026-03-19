# Feature Spec 009: User Directory

> Priority: P1 — Core community discovery feature
> Status: Draft
> Constitution check: Principles I, II, III, IV, VI, IX, XI

## User Scenarios & Testing

### US1: Browse the Community Directory (P1)

**As** a logged-in community member,
**I want** to browse a paginated list of members who have opted in to the directory,
**So that** I can discover other AcroYoga practitioners in my community.

**Given** I navigate to `/directory`,
**When** the page loads,
**Then** I see a grid of member cards showing display name, home city, default role, avatar, and verified teacher badge if applicable.

**Given** I scroll to the bottom of the page,
**When** there are more results,
**Then** a "Load more" button fetches the next page using cursor-based pagination.

**Given** no members have opted in to the directory,
**When** the page loads,
**Then** I see an empty state: "No members found. Adjust your filters or be the first to join!"

### US2: Search and Filter Directory Members (P1)

**As** a community member browsing the directory,
**I want** to search by name/bio and filter by city, role, and teacher status,
**So that** I can quickly find specific people or narrow down who I'm looking for.

**Given** I type text into the search box,
**When** the input changes (debounced),
**Then** the directory refreshes showing only members whose display name or bio contains the query.

**Given** I select a city filter,
**When** the filter is applied,
**Then** only members whose home city matches are shown.

**Given** I select a role filter (Base/Flyer/Hybrid),
**When** the filter is applied,
**Then** only members with that default role are shown.

**Given** I toggle "Verified Teachers only",
**When** the filter is applied,
**Then** only members with an active verified teacher badge are shown.

### US3: Directory Visibility Opt-In (P1)

**As** a community member,
**I want** to control whether I appear in the public directory,
**So that** I can decide who can discover me.

**Given** I navigate to my profile settings,
**When** I toggle "Show me in the community directory",
**Then** a PATCH request updates my `directory_visible` flag.

**Given** `directory_visible = false` (default),
**When** anyone searches the directory,
**Then** I do not appear in results.

**Given** `directory_visible = true`,
**When** anyone (except users I've blocked or who've blocked me) browses the directory,
**Then** I appear in results.

### US4: View Relationship Status in Directory (P2)

**As** a logged-in member viewing the directory,
**I want** to see my relationship with each member (friend, following, follower, or none),
**So that** I can understand my existing connections at a glance.

**Given** I am following a member,
**When** I see their directory card,
**Then** their card shows a "Following" badge.

**Given** a member is also following me back,
**When** I see their card,
**Then** their card shows a "Friends" badge.

### US5: Social Link Icons with Visibility (P2)

**As** a directory visitor,
**I want** to see social link icons on member cards,
**So that** I can quickly connect with members on their preferred platforms.

**Given** a member has social links visible to my relationship level,
**When** I see their directory card,
**Then** I see icon buttons for each visible platform (Instagram, YouTube, Facebook, website).

### US6: Filter by Relationship Type (P2)

**As** a logged-in member,
**I want** to filter the directory to show only people I follow, who follow me, or mutual friends,
**So that** I can manage my community connections.

**Given** I select "My Friends" filter,
**When** the filter is applied,
**Then** only mutual followers appear in the directory.

### US7: Profile Completeness Indicator (P3)

**As** a member browsing the directory,
**I want** to see a profile completeness percentage on my own card,
**So that** I am encouraged to complete my profile.

**Given** I view the directory and see my own card,
**When** my profile is incomplete,
**Then** my card shows a completeness indicator (e.g., "70% complete") with a link to my settings.

### US8: Proximity-Based Discovery (P3)

**As** a member looking for local practitioners,
**I want** to see members sorted by proximity to my home city,
**So that** I can connect with people near me.

**Given** I have set a home city on my profile,
**When** I use the "Near me" sort option,
**Then** the directory is sorted by geographic proximity (same city first, then same country, then globally).

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Paginated directory listing (cursor-based, 20 per page) showing only `directory_visible = true` members | P1 |
| FR-02 | Text search on display_name and bio fields (ILIKE) | P1 |
| FR-03 | Filter by home_city_id | P1 |
| FR-04 | Filter by default_role (base/flyer/hybrid) | P1 |
| FR-05 | Filter by verified teacher status (badge_status = 'verified') | P1 |
| FR-06 | Opt-in toggle: `directory_visible` boolean on user_profiles, default false | P1 |
| FR-07 | Block/hide enforcement: blocked users never appear in each other's directory views | P1 |
| FR-08 | Relationship indicator on each directory card (friend/following/follower/none) | P2 |
| FR-09 | Social links visible per relationship-aware visibility rules | P2 |
| FR-10 | Filter by relationship type (following/followers/friends) | P2 |
| FR-11 | Profile completeness score (0-100) computed server-side | P3 |
| FR-12 | Proximity sort by home city (same city → same country → global) | P3 |
| FR-13 | No N+1 queries — single SQL per page with JOINs and json_agg() | P1 |
| FR-14 | Anonymous (unauthenticated) users cannot access the directory | P1 |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | Directory page load < 500ms (covered by single-query design + indexes) |
| NFR-02 | Privacy-first: users opt in, never appear by default |
| NFR-03 | GDPR: `directory_visible` reset to false on account deletion |

---

## Out of Scope

- Messaging or connection requests from directory (covered by existing follows API)
- Importing contacts or bulk invites
- Public (unauthenticated) directory access
