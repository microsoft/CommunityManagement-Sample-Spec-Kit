# Feature Specification: User Directory

**Feature Branch**: `009-user-directory`  
**Created**: 2026-03-19  
**Status**: In Progress (core service, types, schemas, shared-ui, tests merged to main 2026-03-22)  
**Input**: User description: "A comprehensive user directory for the AcroYoga Community platform that allows members to discover, search, filter, and browse other community members. The directory builds on top of existing user profile infrastructure (Spec 002) and permissions (Spec 004) to provide a discovery layer."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse the Community Directory (Priority: P1)

A logged-in community member opens the user directory and sees a paginated list of other members who have opted into directory visibility. Each card shows the member's avatar, display name, home city, default role (Base/Flyer/Hybrid), verified teacher badge (if applicable), and icons for their visible social links. The member scrolls through the list using cursor-based pagination to discover new people in the community.

**Why this priority**: The core directory listing is the foundation for all other directory features. Without a browsable list of members, search, filtering, and relationship management have nothing to operate on. This is the minimum viable product that delivers community discovery value.

**Independent Test**: Log in as a sample user. Open the directory page. Verify that only users with `directory_visible = true` appear. Verify each card displays avatar, display name, home city, role, teacher badge (where applicable), and social link icons. Verify pagination loads additional results.

**Acceptance Scenarios**:

1. **Given** a logged-in user opens the directory, **When** the page loads, **Then** a paginated list of members with `directory_visible = true` is displayed, each showing avatar, display name, home city, role, teacher badge, and visible social link icons.
2. **Given** a user has `directory_visible = false`, **When** any other member browses the directory, **Then** that user does not appear in the listing results.
3. **Given** the directory has more members than fit on one page, **When** the user scrolls to the end or clicks "load more", **Then** the next page of results loads via cursor-based pagination without reloading the page.
4. **Given** a member has a verified teacher badge (from Spec 005), **When** their card appears in the directory, **Then** a visible teacher badge indicator is shown on their card.
5. **Given** a member has social links with visibility set to "public", **When** any logged-in user views their directory card, **Then** the corresponding platform icons are displayed.
6. **Given** a member has social links with visibility set to "friends only", **When** a non-friend views their directory card, **Then** those social link icons are hidden.

---

### User Story 2 - Search and Filter Directory Members (Priority: P1)

A community member wants to find specific people or narrow the directory to a relevant subset. They use filters for role (Base, Flyer, Hybrid), location (city, country, continent), teacher status (verified teachers only), and a text search box for display name partial matching. They can also sort results by alphabetical order, recently joined, or proximity (same city → country → continent → global). Filters combine with AND logic.

**Why this priority**: Search and filtering transform the directory from a simple list into a useful discovery tool. Without these, users cannot find who they're looking for in a large community. This is equally critical to the listing itself.

**Independent Test**: Open the directory. Apply a role filter for "Flyer" — only Flyers appear. Add a location filter for "Bristol" — only Flyers in Bristol appear. Type a partial name in search — results narrow further. Change sort to "proximity" — members in the viewer's city appear first.

**Acceptance Scenarios**:

1. **Given** a user selects role filter "Base", **When** the directory refreshes, **Then** only members whose default role is Base are shown.
2. **Given** a user selects location filter "United Kingdom", **When** the directory refreshes, **Then** only members whose home city is in the United Kingdom are shown.
3. **Given** a user types "Mar" in the text search box, **When** results update, **Then** only members whose display name starts with "Mar" (case-insensitive prefix match) are shown.
4. **Given** a user enables "Verified teachers only", **When** the directory refreshes, **Then** only members with `is_verified = true` on their teacher profile are shown.
5. **Given** a user applies role "Flyer" AND location "Bristol", **When** the directory refreshes, **Then** only Flyers in Bristol appear (AND combination).
6. **Given** a user sorts by "proximity" and their home city is Bristol, **When** the results load, **Then** members in Bristol appear first, then UK, then Europe, then globally.
7. **Given** a user sorts by "recently joined", **When** the results load, **Then** the most recently created accounts appear first.
8. **Given** filters are applied, **When** the user clears all filters, **Then** the full unfiltered directory is shown again.

---

### User Story 3 - Directory Visibility Opt-In (Priority: P1)

A user who wants to appear in the directory goes to their profile settings and enables the "Show me in the community directory" toggle. By default, new users have this disabled (privacy-first). Once enabled, they appear in other members' directory searches. They can disable it at any time to remove themselves from directory results.

**Why this priority**: Without the opt-in mechanism, either all users are forcibly visible (privacy violation) or no users are visible (empty directory). The opt-in toggle is a prerequisite for the directory to have any content while respecting user autonomy.

**Independent Test**: As a new user, verify `directory_visible` defaults to false. Enable the toggle in profile settings. Open the directory as another user — the first user now appears. Disable the toggle — the user vanishes from directory results again.

**Acceptance Scenarios**:

1. **Given** a newly registered user, **When** their profile is created, **Then** `directory_visible` is `false` by default.
2. **Given** a user enables "Show me in the community directory", **When** another member searches the directory, **Then** the user appears in results.
3. **Given** a user disables "Show me in the community directory", **When** another member searches the directory, **Then** the user no longer appears in results.
4. **Given** a user has `directory_visible = false`, **When** another member navigates directly to their profile URL, **Then** the profile is still accessible (direct link still works).

---

### User Story 4 - View and Manage Relationships from Directory (Priority: P2)

While browsing the directory, a member can see their relationship status with each listed user — Friend, I Follow, Follows Me, None, or Blocked. They can quickly follow or unfollow a user, or block/unblock them, directly from the directory card without navigating to that user's full profile. Visual indicators clearly distinguish relationship states.

**Why this priority**: Relationship management directly from the directory eliminates friction in building community connections. It depends on the core listing (P1) being in place but significantly increases the directory's utility.

**Independent Test**: Browse the directory as a user who follows some members and has blocked one. Verify each card shows the correct relationship status. Click "Follow" on a user with no relationship — status changes to "I Follow". Click "Unfollow" — status reverts. Verify blocked users show "Blocked" with an "Unblock" action.

**Acceptance Scenarios**:

1. **Given** a user browses the directory, **When** they view a member they follow, **Then** the card shows "Following" status with an "Unfollow" action.
2. **Given** a user browses the directory, **When** they view a member who follows them (but they don't follow back), **Then** the card shows "Follows you" status with a "Follow back" action.
3. **Given** a user browses the directory, **When** they view a member with no relationship, **Then** the card shows a "Follow" action.
4. **Given** a user clicks "Follow" on a directory card, **When** the action completes, **Then** the card immediately updates to show "Following" status without a full page reload.
5. **Given** a user clicks "Block" on a directory card, **When** the action completes, **Then** the blocked user disappears from the directory results (symmetric hiding).
6. **Given** User A has blocked User B, **When** User B browses the directory, **Then** User A does not appear in User B's results.

---

### User Story 5 - Social Link Icons with Platform Branding (Priority: P2)

Each user's directory card shows small icons representing their visible social links. The platform enum is expanded to include: facebook, instagram, youtube, website, tiktok, twitter_x, linkedin, threads. Each icon uses the platform's recognizable brand icon. Clicking an icon opens the link in a new tab. Only links the viewer is permitted to see (based on the link's visibility setting and the viewer's relationship) are shown.

**Why this priority**: Social link icons make the directory cards informative at a glance and help members connect outside the platform. Depends on the core listing but adds significant value to each card.

**Independent Test**: View a directory card for a user who has instagram (public), linkedin (friends only), and tiktok (public). As a non-friend, see instagram and tiktok icons but not linkedin. Click the instagram icon — it opens the user's instagram profile in a new tab. Become friends — linkedin icon now appears.

**Acceptance Scenarios**:

1. **Given** a user has social links with platform types facebook, instagram, youtube, website, tiktok, twitter_x, linkedin, or threads, **When** their directory card is displayed, **Then** each visible link's platform icon is shown.
2. **Given** a social link has visibility "public", **When** any logged-in user views the card, **Then** the icon is displayed.
3. **Given** a social link has visibility "friends_only", **When** a non-friend views the card, **Then** the icon is hidden.
4. **Given** a user clicks a social link icon, **When** the click is processed, **Then** the social link URL opens in a new browser tab.
5. **Given** a user has no visible social links (all are hidden or none exist), **When** their card appears, **Then** no social link icon area is shown (clean card layout).

---

### User Story 6 - Filter by Relationship Type (Priority: P2)

A member wants to see only people they follow, their followers, their friends (mutual follows), or their blocked list. They select a relationship filter from the directory. The "Blocked" filter serves as a management view where they can review and unblock users.

**Why this priority**: Lets members manage their social connections from a single interface. Depends on relationship data and the core directory listing.

**Independent Test**: As a user with 5 follows, 3 followers (2 mutual), and 1 blocked user — filter by "Friends" and see 2 results. Filter by "Following" and see 5 results. Filter by "Blocked" and see 1 result with an "Unblock" action.

**Acceptance Scenarios**:

1. **Given** a user selects relationship filter "Friends", **When** the directory refreshes, **Then** only mutual follows (users who both follow each other) are shown.
2. **Given** a user selects relationship filter "Following", **When** the directory refreshes, **Then** only users the current member follows are shown.
3. **Given** a user selects relationship filter "Followers", **When** the directory refreshes, **Then** only users who follow the current member are shown.
4. **Given** a user selects relationship filter "Blocked", **When** the directory refreshes, **Then** only users the current member has blocked are shown, each with an "Unblock" action.
5. **Given** the relationship filter is combined with other filters (e.g., role = "Flyer"), **When** the directory refreshes, **Then** both filters are applied with AND logic.

---

### User Story 7 - Profile Completeness Indicator (Priority: P3)

A member views their own profile and sees a completeness percentage calculated from: avatar (20%), display name (20%), bio (20%), home city (20%), and at least one social link (20%). This is a display-only calculation (not stored in the database) that encourages members to fill out their profile fully before opting into the directory.

**Why this priority**: A helpful nudge toward complete profiles improves directory quality but is not required for directory functionality. It is display-only and cannot block other features.

**Independent Test**: View own profile with only display name set — see 20% completeness. Add avatar and bio — see 60%. Add home city and a social link — see 100%.

**Acceptance Scenarios**:

1. **Given** a user has only a display name set, **When** they view their own profile, **Then** the completeness indicator shows 20%.
2. **Given** a user has avatar, display name, bio, home city, and one social link, **When** they view their own profile, **Then** the completeness indicator shows 100%.
3. **Given** a user views another member's profile, **When** the profile loads, **Then** no completeness indicator is shown (own profile only).
4. **Given** the completeness value is displayed, **When** the user checks the database, **Then** no completeness column exists — it is computed on render.

---

### User Story 8 - Proximity-Based Browsing ("People Near Me") (Priority: P3)

A member selects the "People near me" sort/filter option. Results are grouped by geographic proximity using the geography hierarchy: same city first, then same country, then same continent, then global. This uses the existing geography table from Spec 004.

**Why this priority**: Proximity browsing adds significant discovery value for local communities, but it depends on the geography data and core directory infrastructure already being in place.

**Independent Test**: As a user with home city "Bristol, UK", sort by proximity. Verify Bristol members appear first, then other UK members, then European members, then global.

**Acceptance Scenarios**:

1. **Given** a user's home city is Bristol (UK, Europe), **When** they sort by proximity, **Then** Bristol members appear first, followed by UK members, then Europe, then rest of world.
2. **Given** a user has no home city set, **When** they sort by proximity, **Then** results are sorted alphabetically as a fallback.
3. **Given** two members in the same proximity tier, **When** they appear in results, **Then** they are sub-sorted alphabetically within that tier.

---

### Edge Cases

- What happens when a user has no avatar set? — A default placeholder avatar is shown on their directory card.
- What happens when a user has no home city set? — The city area on their card is blank; they do not appear in location-filtered results but appear in unfiltered results; proximity sorting places them in the "global" tier.
- What happens when someone searches for a string that matches zero users? — An empty state message is shown: "No members found matching your search."
- What happens when a blocked user's `directory_visible` is true? — They still do not appear in the blocker's results (block overrides visibility).
- What happens when a muted user appears in the directory? — They appear normally; mute only affects content feeds, not directory presence. Relationship status shows appropriately.
- What happens when a user deletes their account? — Their `directory_visible` is cleared and they are removed from all directory results.
- What happens when all filters combined return zero results? — An empty state with a prompt to broaden filters is shown.
- What happens if the viewer is not logged in? — The directory requires authentication; unauthenticated visitors are redirected to sign in.

## Requirements *(mandatory)*

### Functional Requirements

#### Directory Listing
- **FR-001**: System MUST display a paginated list of community members who have `directory_visible = true`.
- **FR-002**: Each directory card MUST show: avatar (or placeholder), display name, home city (if set), default role (Base/Flyer/Hybrid), verified teacher badge (if applicable), and visible social link icons.
- **FR-003**: System MUST use cursor-based pagination for the directory listing.
- **FR-004**: System MUST NOT display users who have `directory_visible = false` in any search or browse results.

#### Search & Filtering
- **FR-005**: System MUST support filtering by role: Base, Flyer, Hybrid.
- **FR-006**: System MUST support filtering by location at three levels: city, country, continent — using the geography table from Spec 004.
- **FR-007**: System MUST support filtering by relationship type: Friends, Following, Followers, Blocked.
- **FR-008**: System MUST support filtering to verified teachers only (using `badge_status = 'verified'` from Spec 005 teacher_profiles).
- **FR-009**: System MUST support text search by display name with case-insensitive prefix matching (index-friendly `text_pattern_ops`).
- **FR-010**: System MUST support sorting by: alphabetical (display name), recently joined, and proximity.
- **FR-011**: All filters MUST combine with AND logic when multiple are active.
- **FR-012**: System MUST allow clearing all active filters to return to the unfiltered directory view.

#### Visibility & Privacy
- **FR-013**: New user profiles MUST default to `directory_visible = false` (opt-in, privacy-first).
- **FR-014**: Users MUST be able to toggle `directory_visible` on/off from their profile settings.
- **FR-015**: Users with `directory_visible = false` MUST still be accessible via direct profile URL.
- **FR-016**: Blocked users MUST NOT appear in each other's directory results (symmetric hiding).
- **FR-017**: Muted users MUST still appear in the directory; mute does not affect directory presence.
- **FR-018**: Social link icons MUST respect the visibility setting on each link (public, friends_only, etc.) and the viewer's relationship to the user, per Spec 002 rules.

#### Relationship Management
- **FR-019**: Each directory card MUST show the viewer's relationship status with that member: Friend, Following, Follows Me, None, or Blocked.
- **FR-020**: Users MUST be able to Follow/Unfollow directly from a directory card without navigating to the full profile.
- **FR-021**: Users MUST be able to Block/Unblock directly from a directory card.
- **FR-022**: Relationship actions MUST update the card's visual state immediately without a full page reload.

#### Social Links
- **FR-023**: The social link platform enum MUST include: facebook, instagram, youtube, website, tiktok, twitter_x, linkedin, threads.
- **FR-024**: Each platform MUST be represented by its official brand icon in the directory card.
- **FR-025**: Clicking a social link icon MUST open the URL in a new browser tab.

#### Profile Completeness
- **FR-026**: System MUST display a profile completeness percentage on the user's own profile view, calculated as: avatar (20%) + display name (20%) + bio (20%) + home city (20%) + at least one social link (20%).
- **FR-027**: Profile completeness MUST be computed at render time and NOT stored in the database.
- **FR-028**: Profile completeness MUST NOT be visible on other users' profile views.

#### Proximity Browsing
- **FR-029**: System MUST support proximity sorting using the geography hierarchy: same city → same country → same continent → global.
- **FR-030**: When a user has no home city set, proximity sorting MUST fall back to alphabetical order for that user.

#### GDPR & Data
- **FR-031**: The `directory_visible` preference MUST be included in user data exports.
- **FR-032**: On account deletion, `directory_visible` MUST be cleared and the user removed from all directory results.

#### Performance
- **FR-033**: Loading a page of directory results MUST NOT degrade in performance as the number of visible members per card increases; data retrieval MUST be bounded regardless of result count.
- **FR-034**: Filtering by role, location, and teacher status MUST return results without noticeable delay as the total member count grows.

#### Internationalization
- **FR-035**: All user-facing strings in the directory (labels, filters, empty states, relationship statuses) MUST be extractable for internationalization.

### Key Entities

- **User Profile** (existing, Spec 002): Extended with `directory_visible` boolean (default false). Contains avatar, display name, bio, home city, default role.
- **Social Link** (existing, Spec 002): Platform enum expanded to include facebook, instagram, youtube, website, tiktok, twitter_x, linkedin, threads. Has visibility setting (public, friends_only, etc.) and URL.
- **Geography** (existing, Spec 004): City → Country → Continent hierarchy used for location filtering and proximity sorting.
- **Follow** (existing, Spec 002): Represents a directional follow relationship between two users. Mutual follows = Friends.
- **Block** (existing, Spec 002): Represents a block relationship. Causes symmetric hiding in directory.
- **Mute** (existing, Spec 002): Represents a mute relationship. Does not affect directory visibility.
- **Teacher Profile** (existing, Spec 005): Contains `badge_status` column (values: pending/verified/expired/revoked); directory uses `badge_status = 'verified'` for teacher badge and filter.

## Dependencies

- **Spec 002** (Community & Social): Provides user_profiles, social_links, follows, blocks, mutes tables — all reused, not duplicated.
- **Spec 004** (Permissions & Creator Accounts): Provides users table, geography table (city/country/continent hierarchy), permission_grants for admin features.
- **Spec 005** (Teacher Profiles & Reviews): Provides teacher_profiles with `is_verified` flag for teacher badge and filter.

## Assumptions

- The geography table from Spec 004 is populated and the city → country → continent hierarchy is available for queries.
- Social link visibility logic from Spec 002 is implemented and can be reused by the directory.
- The follow/block/mute relationship data from Spec 002 is available and queryable for relationship status display.
- Teacher verification status from Spec 005 is a boolean flag that can be joined without complex logic.
- Standard session-based authentication is in place; the directory is only accessible to authenticated users.
- "Friends" is defined as mutual follows (User A follows User B AND User B follows User A).
- The directory does not need real-time updates — a page refresh or re-query picks up changes.
- Platform brand icons will use standard icon sets or SVGs shipped with the application (not fetched from external CDNs at runtime).

## Constitution Alignment

- **I (API-First)**: REST API for directory search, filter, and relationship actions before any UI.
- **II (Test-First)**: Integration tests with PGlite for all directory queries, visibility rules, and relationship logic.
- **III (Privacy)**: Opt-in visibility (`directory_visible` defaults false), respect blocks, social link visibility rules.
- **IV (Server-Side Authority)**: All filtering, visibility checks, block enforcement, and social link visibility computed server-side.
- **V (UX Consistency)**: Design tokens for cards, badges, and icons; accessible; mobile-first responsive layout.
- **VI (Performance)**: Cursor-based pagination, no N+1 queries, database indexes on filter columns.
- **VIII (i18n)**: All user-facing strings extractable for translation.
- **IX (Scoped Permissions)**: Directory is read-only for members; admin visibility override scoped out for v1 (members self-manage via opt-in toggle).
- **XIII (Dev Environment)**: All build/test commands via Codespaces.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find a specific community member by name in under 5 seconds using the text search.
- **SC-002**: Directory page loads the first page of results in under 2 seconds on a standard connection.
- **SC-003**: 90% of users who enable directory visibility complete at least 3 of 5 profile fields (avatar, display name, bio, home city, social link).
- **SC-004**: Blocked users never appear in each other's directory results — 100% enforcement verified by automated tests.
- **SC-005**: Users can follow/unfollow another member from the directory in a single action without page navigation.
- **SC-006**: All directory filters (role, location, teacher status, relationship, text search) can be combined and return correct results within 1 second.
- **SC-007**: Social link visibility rules are enforced with zero leakage — friends-only links never shown to non-friends, verified by integration tests.
- **SC-008**: The directory supports 10,000+ opted-in members with pagination performing consistently (no degradation with scale).
