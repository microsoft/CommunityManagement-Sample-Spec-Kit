# Feature Specification: Performance Optimization

**Feature Branch**: `018-performance-optimization`
**Created**: 2026-04-29
**Status**: Draft
**Priority**: P1
**Constitution Check**: Principles II, V, VI, VII
**Deferred From**: README roadmap ("Performance Optimization — Image optimization, lazy loading, skeleton loaders"); Spec 001 T064 (skeleton cards), T065 (error boundaries)

## Summary

Deliver a comprehensive set of performance improvements across the AcroYoga Community platform so that users — particularly those on mobile devices and slower connections — experience fast, polished, and responsive interfaces. The work covers six complementary areas: efficient image delivery for event covers, teacher avatars, and user photos; skeleton loading placeholders that immediately signal progress on every listing and detail page; on-demand loading of heavy interactive components so they never block the critical path; automated enforcement of the 200 KB initial bundle limit; database-level optimisations that eliminate redundant queries and add result caching; and static or incrementally-regenerated pages for high-traffic, infrequently-changing content. Together these improvements fulfil the platform's constitutionally-mandated performance thresholds and complete deferred deliverables from Spec 001 and the README roadmap.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Instant Visual Feedback on Any Listing Page (Priority: P1)

A community member navigates to the events listing, teacher directory, or any community page. Rather than staring at a blank or partially-rendered screen while data loads, they immediately see a set of placeholder cards in the exact shape and layout of the real content. The placeholders animate with a gentle shimmer to signal that the system is actively fetching data. Within moments the real content fades in, replacing the placeholders seamlessly.

**Why this priority**: Blank-screen delays are the leading cause of perceived slowness and user abandonment on data-driven pages. Skeleton placeholders are a direct, user-visible improvement that also completes Spec 001 T064 — a tracked deferred deliverable. Addresses Constitution Principle V (every async operation MUST have a loading state).

**Independent Test**: Navigate to the events listing, teacher directory, and a community page with network throttled to "Fast 3G". Verify that skeleton cards appear within 100 ms of navigation and the shimmer animation plays. Verify that real content replaces the skeletons smoothly when data arrives. Verify the skeleton layout matches the real card layout pixel-for-pixel.

**Acceptance Scenarios**:

1. **Given** any listing page (events, teachers, directory), **When** the page is loading data, **Then** skeleton placeholder cards that match the shape of the real content cards are displayed immediately, before the network response arrives.
2. **Given** a skeleton placeholder is visible, **When** viewed by a user, **Then** the placeholder animates with a shimmer effect to indicate active loading.
3. **Given** data has loaded, **When** the placeholders are replaced, **Then** the transition is smooth — no flicker, no layout shift.
4. **Given** an event detail page is loading, **When** the page renders, **Then** skeletons appear for the event header, description, and related information sections.
5. **Given** the platform's shared component library, **When** a developer adds a new listing surface (web or mobile), **Then** skeleton components are available for import and use without duplicating code.

---

### User Story 2 — Images Load Progressively on Slow Connections (Priority: P1)

A teacher in a rural area browses the platform on a mobile device with a slow data connection. When they navigate to the events listing, they see a blurred low-quality version of each event's cover image appear instantly while the full-resolution image downloads in the background. The blur sharpens smoothly into the crisp final image as bandwidth allows. The experience feels polished and intentional — not broken.

**Why this priority**: Images are the largest contributor to slow page loads on mobile. Efficient delivery (modern formats, correct sizes for each device, progressive loading) directly reduces the single most impactful source of user-perceived latency. Supports Constitution Principle VI (LCP < 2.5 s on simulated 3G).

**Independent Test**: Load the events listing on a device or browser profile simulating a slow mobile connection. Verify that: (a) a low-quality blurred placeholder appears for each event cover immediately; (b) the page's Largest Contentful Paint is measured at or below 2.5 s; (c) images served to a mobile viewport are smaller in file size than images served to a desktop viewport for the same event.

**Acceptance Scenarios**:

1. **Given** an event cover image, **When** the page loads on any device, **Then** a low-resolution blurred version of the image is displayed immediately as a placeholder while the full image downloads.
2. **Given** any event cover, teacher avatar, or user photo, **When** the image is requested, **Then** the format delivered is the most efficient one the requesting browser supports (preferring modern compressed formats over legacy ones).
3. **Given** a mobile-sized viewport, **When** an image is requested, **Then** a smaller image variant is served compared to a desktop-sized viewport — reducing unnecessary data transfer.
4. **Given** a teacher avatar displayed at thumbnail size, **When** rendered on screen, **Then** a thumbnail-sized image variant is fetched, not the full-resolution original.
5. **Given** any public page with images, **When** the page's Largest Contentful Paint is measured on a simulated slow mobile connection, **Then** LCP is at or below 2.5 seconds.

---

### User Story 3 — Map and Calendar Views Load Without Blocking the Page (Priority: P1)

A user navigates to the events page and selects the map or calendar view. The rest of the page — the header, filters, and navigation — is already fully interactive. The map or calendar renders progressively into its designated area as it finishes loading, without freezing the browser or blocking the user from interacting with other controls. A loading indicator within the map/calendar region keeps the user informed.

**Why this priority**: Map and calendar libraries are among the heaviest UI components in the platform. Loading them as part of the initial page bundle would push the bundle well beyond the 200 KB constitutional limit and delay interactivity for all users, including those who never visit the map or calendar view. Addresses Constitution Principle VI (map library must be loaded on demand, not in the initial bundle).

**Independent Test**: Open the network panel and load the events page. Verify that no map or calendar library code is present in the initial page load. Switch to the map view and verify that the map library downloads only at that moment. Verify that the main page controls remain interactive while the map is loading.

**Acceptance Scenarios**:

1. **Given** a user loads the events listing in list view, **When** the page load is inspected, **Then** no map library or calendar library code is included in the resources fetched during initial load.
2. **Given** a user clicks to switch to the map view, **When** the view begins to load, **Then** a loading indicator appears within the map area while the map library downloads.
3. **Given** the map is loading, **When** a user interacts with the page header, filters, or navigation, **Then** those controls remain fully responsive — the map load does not block the UI.
4. **Given** the map library has loaded once in a session, **When** the user switches back to map view, **Then** the map renders immediately without re-fetching the library.
5. **Given** a user is on a very slow connection, **When** the map library is loading, **Then** an appropriate fallback message is shown within the map area if loading takes more than 5 seconds.

---

### User Story 4 — Search and Filter Results Return Quickly (Priority: P1)

A user searches the event directory by location and filters by date range. Results appear within half a second. When they refine the filter slightly, results update quickly again — the second request is served from a cache rather than triggering a full database query. The experience feels near-instant.

**Why this priority**: Event discovery is the platform's primary use case. Slow query responses or visible latency on filter interactions undermine the core user journey. Database-level optimisations (indexes, result caching, elimination of N+1 queries) directly reduce query response times. Supports Constitution Principle VI (API mutations < 1 s at p95).

**Independent Test**: Using the event listing search and filter controls, perform a location-based event search. Measure the API response time. Perform the same search again and verify it is served faster (from cache). Navigate to a teacher profile that has associated events, verify the page does not issue one query per event — all related data is loaded in a single batched query.

**Acceptance Scenarios**:

1. **Given** a user performs a location-based event search, **When** the results are returned, **Then** the API responds within 500 ms for 95% of queries.
2. **Given** an identical or equivalent query has recently been performed, **When** the same query is issued again within the cache window, **Then** the result is returned significantly faster from cache without querying the database.
3. **Given** a teacher profile page that lists associated events, **When** the page data is fetched, **Then** all events are loaded in a single batched operation, not one query per event.
4. **Given** the event listing is filtered by date range and location, **When** the query executes, **Then** the database uses appropriate indexes and does not perform a full-table scan.
5. **Given** a cache entry expires, **When** the next request arrives for that data, **Then** fresh data is fetched from the database transparently — the user sees no error.

---

### User Story 5 — Popular Pages Load Instantly from Static Cache (Priority: P2)

A user clicks a shared link to a popular recurring workshop that has been viewed hundreds of times this week. The page loads almost instantly — it is served from a pre-generated static cache rather than being computed on-demand. If the event details were updated recently, the cached version is automatically refreshed so the user always sees accurate information within a predictable time window.

**Why this priority**: High-traffic event pages and teacher profiles account for a disproportionate share of page load requests. Pre-generating them eliminates database round-trips and server computation for the most-visited pages, directly improving both response times and server capacity.

**Independent Test**: Identify three frequently-accessed event pages and two teacher profiles. Verify they are served from a pre-generated static cache by checking response headers. Update an event's title and verify the cached version is refreshed within the defined revalidation window (no longer than 10 minutes). Verify the data shown to users is accurate after the revalidation window.

**Acceptance Scenarios**:

1. **Given** a high-traffic event page, **When** it is accessed by any user, **Then** the page is served from a pre-generated static cache and responds within 100 ms.
2. **Given** a teacher profile page, **When** it is accessed, **Then** the page is served from a pre-generated static cache.
3. **Given** an event's details have been updated, **When** the cache revalidation window elapses, **Then** the next request triggers a background refresh and subsequent visitors see the updated content.
4. **Given** the platform's most-visited event pages are known at build time, **When** a new build is deployed, **Then** those pages are pre-generated proactively rather than waiting for the first user visit.
5. **Given** a community page (e.g., regional community hub), **When** accessed, **Then** it is served from a static or incrementally-refreshed cache rather than being computed on every request.

---

### User Story 6 — Bundle Size Regressions Are Caught Before They Reach Users (Priority: P2)

A developer adds a new feature that accidentally pulls in a large third-party dependency. Before the code reaches production — in fact, before the pull request can be merged — an automated check flags that the initial bundle would exceed the 200 KB limit. The developer is prompted to investigate and optimise before the change ships.

**Why this priority**: Bundle size is a platform-wide constitutional quality gate. Without automated enforcement in the build pipeline, regressions accumulate silently until performance degrades noticeably. Automated gating makes the constraint self-enforcing without relying on manual review vigilance.

**Independent Test**: Submit a pull request that deliberately adds a large dependency to a page component (without code-splitting). Verify that the CI pipeline flags the bundle size violation and blocks the PR from being merged. Then apply code-splitting to the same dependency and verify the CI pipeline passes.

**Acceptance Scenarios**:

1. **Given** every code change, **When** a CI pipeline runs, **Then** an automated bundle size analysis is executed and the results are reported.
2. **Given** a code change that would push the initial compressed JavaScript bundle above 200 KB, **When** the CI check runs, **Then** the check fails and the change is blocked from merging.
3. **Given** a code change where the initial bundle remains at or below 200 KB, **When** the CI check runs, **Then** the check passes and the change is not blocked.
4. **Given** the CI bundle analysis report, **When** a developer reviews it, **Then** they can see a breakdown of which modules contribute most to the bundle size.

---

### Edge Cases

- **Image not found or load failure**: The image placeholder (blur) remains visible and the page does not display a broken image icon. A graceful fallback (platform logo or category-specific illustration) is shown instead.
- **User disables JavaScript**: Skeleton placeholders do not appear (they are rendered client-side); the page falls back to server-rendered content directly. The page remains usable.
- **Map view on a device with no location permission**: The map loads but defaults to a world or country-level view; no error is thrown and the user is not prompted repeatedly.
- **Cache invalidation during high traffic**: If a popular cached event page is being refreshed while a traffic spike occurs, the previous cached version continues to be served — users do not see errors or timeouts during revalidation.
- **Very large image uploaded by a user**: The platform processes and resizes the image server-side before storing it; users are never served the raw original at full resolution.
- **Skeleton count mismatch**: If the actual number of results is unknown before data loads (e.g., first page visit), a reasonable default number of skeleton cards is shown (e.g., 6–12) — no skeleton count of 0 or an obviously wrong number.
- **Calendar view on a slow connection**: If the calendar library is still downloading when the user attempts to interact with the calendar area, their interaction is queued or a clear loading state is shown — no silent failure.
- **Database cache TTL expiry under load**: When a cached query expires and many concurrent requests arrive simultaneously, only one database query is issued to refresh the cache; other requests wait and receive the fresh result — "thundering herd" is prevented.
- **Static page revalidation failure**: If the background revalidation of a static page fails (e.g., transient database error), the previously-cached version continues to be served until revalidation succeeds.

---

## Requirements *(mandatory)*

### Functional Requirements

| ID     | Requirement                                                                                                                                                                                                          | Priority |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-001 | Every event cover image, teacher avatar, and user profile photo MUST be served in the most efficient image format supported by the requesting browser, with distinct size variants for different viewport widths       | P1       |
| FR-002 | Every image on the platform MUST display a low-resolution blurred placeholder while the full image is downloading                                                                                                    | P1       |
| FR-003 | Every listing page (events, teachers, directory) MUST display skeleton placeholder cards matching the layout of the real content cards while data is loading                                                          | P1       |
| FR-004 | Skeleton placeholders MUST animate with a shimmer effect to communicate that data loading is in progress                                                                                                              | P1       |
| FR-005 | Skeleton placeholder components MUST be published to the platform's shared UI component library so all application surfaces (web, mobile) can use them without duplicating implementations                            | P1       |
| FR-006 | The event detail page MUST display skeleton placeholders for the event header, description, and related information sections while data loads                                                                          | P1       |
| FR-007 | The map view component MUST NOT be included in the initial page bundle; it MUST be loaded on demand only when a user navigates to the map view                                                                       | P1       |
| FR-008 | The calendar view component MUST NOT be included in the initial page bundle; it MUST be loaded on demand only when a user navigates to the calendar view                                                             | P1       |
| FR-009 | Every on-demand-loaded component MUST display an appropriate loading fallback in its designated area while it is downloading                                                                                           | P1       |
| FR-010 | The platform's initial compressed JavaScript bundle MUST NOT exceed 200 KB, in accordance with the project quality gates                                                                                             | P1       |
| FR-011 | An automated bundle size analysis MUST run as part of the CI pipeline on every code change and report the bundle size breakdown                                                                                       | P1       |
| FR-012 | The CI pipeline MUST block any code change that would cause the initial compressed JavaScript bundle to exceed 200 KB                                                                                                 | P1       |
| FR-013 | Database queries for event listings and teacher directory MUST NOT exhibit N+1 query patterns; all related data for a listing MUST be fetched in a fixed number of queries regardless of result set size              | P1       |
| FR-014 | Frequently-queried data (event listings, teacher profiles, directory results) MUST be cached with clearly defined expiry windows to reduce repeated database load                                                     | P1       |
| FR-015 | Cached results MUST be invalidated or refreshed when the underlying data changes, ensuring users do not see stale data beyond the defined cache window                                                                | P1       |
| FR-016 | The platform MUST prevent "thundering herd" scenarios where a cache expiry under concurrent load triggers multiple simultaneous database queries for the same data                                                    | P1       |
| FR-017 | The most frequently-accessed event pages MUST be pre-generated at build time so they are served from static cache without a database round-trip on first access                                                      | P2       |
| FR-018 | Teacher profile pages and community pages MUST be statically cached and automatically refreshed at defined revalidation intervals rather than computed on every request                                               | P2       |
| FR-019 | When a cached page is being revalidated in the background, the previously-cached version MUST continue to be served to users — no user should see an error or timeout during revalidation                             | P2       |
| FR-020 | If a full-resolution image is uploaded by a user, the platform MUST process and resize it server-side before storage; users MUST NOT be served the raw original at its original resolution                            | P2       |

### Key Entities

- **Image variant**: A resized and format-optimised copy of a source image, associated with a specific maximum width and output format. An image may have multiple variants for different viewport sizes and browser capabilities.
- **Skeleton component**: A reusable UI element that mirrors the shape and layout of a real content card or section, displayed during the loading state. Lives in the shared UI library. Has no data dependency.
- **On-demand component**: A UI component that is excluded from the initial page bundle and downloaded only when the user navigates to a view that requires it. Paired with a loading fallback.
- **Cached query result**: The stored output of a frequently-executed database query, keyed by query parameters, with a defined time-to-live (TTL) after which the cached value is considered stale.
- **Static page**: A fully-rendered page generated ahead of time and stored so it can be served directly from a cache without database queries. May be pre-generated at build time or regenerated automatically in the background at defined intervals (incremental static regeneration).
- **Bundle size report**: An automatically-generated artefact produced by the CI pipeline documenting the compressed size of the initial JavaScript bundle and the contribution of each module or package.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

| ID     | Criterion                                                                                                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SC-001 | Users on a simulated slow mobile connection see meaningful content on event listings (Largest Contentful Paint) within **2.5 seconds** — matching the constitutional performance threshold |
| SC-002 | The platform becomes fully interactive within **3.5 seconds** of navigation for first-time page visits, measured on a simulated slow mobile connection                              |
| SC-003 | Skeleton placeholders appear within **100 milliseconds** of navigation to any listing or detail page, ensuring zero blank-screen moments for users                                  |
| SC-004 | Event search and filter results are returned to users within **500 milliseconds** for 95% of queries after database and caching optimisations are applied                            |
| SC-005 | Pre-generated static event and teacher profile pages respond within **100 milliseconds**, regardless of concurrent user load                                                         |
| SC-006 | The initial compressed JavaScript bundle remains at or below **200 KB** as enforced automatically by CI — no manual bundle audits required                                          |
| SC-007 | Map and calendar views do not delay interactivity of any other page element; the page reaches fully interactive state **before** those components finish loading                     |
| SC-008 | Image file sizes served to mobile viewports are reduced by at least **40%** compared to serving unoptimised full-resolution originals to the same viewports                         |
| SC-009 | No event listing or teacher directory page issues more than a fixed number of database queries regardless of result set size — **N+1 query patterns are eliminated entirely**       |
| SC-010 | Any code change that would push the initial bundle above 200 KB is **blocked automatically** by the CI pipeline before it can reach production                                      |

---

## Assumptions

- The platform already has event cover images, teacher avatars, and user photos stored centrally; this feature optimises their delivery rather than changing the upload workflow (except for server-side resizing of oversized uploads, FR-020).
- "Frequently-accessed" event pages for static pre-generation are defined as events that have received the most page views in the past 30 days; the set is refreshed on each build.
- Cache revalidation windows: event listings — 5 minutes; teacher profiles — 10 minutes; community pages — 30 minutes. These are starting defaults and may be adjusted by the team without a spec revision.
- The shared UI component library (`shared-ui` package) already exists and supports both web and mobile targets; skeleton components will be added to it following existing patterns.
- Bundle size enforcement is added to the existing CI pipeline; no new CI infrastructure is required beyond the analyser tool itself.
- The map view and calendar view components already exist; this feature changes how and when they are loaded, not their functionality.
- "Simulated slow mobile connection" for performance measurement refers to Chrome DevTools "Fast 3G" throttle preset (40 Mbps download, 10 Mbps upload, 20 ms RTT), consistent with the constitutional definition.

---

## Dependencies

- **Spec 001** — Deferred tasks T064 (skeleton cards) and T065 (error boundaries) are completed by this spec. No blocking dependency; Spec 001 is already shipped.
- **Spec 008 (Cross-Platform UI)** — The `shared-ui` package targeted for skeleton components is established in Spec 008. Skeleton components must follow the design token and accessibility conventions set there.
- **Spec 014 (Internationalisation)** — Static page generation must account for locale variants; pre-generated pages must be generated per locale.
- **Spec 015 (Background Jobs & Notifications)** — If cache invalidation is triggered by data-change events, the background job infrastructure from Spec 015 may be leveraged.
- **Spec 016 (Mobile App)** — Skeleton components extracted to `shared-ui` are available for use in the mobile app surfaces, ensuring visual consistency during loading.

---

## Out of Scope

- **Video optimisation** — No video assets currently exist on the platform. Video delivery optimisation is deferred.
- **Service worker / offline support** — Progressive Web App (PWA) features including offline caching and service workers are not included in this spec.
- **Server-side rendering performance profiling** — This spec does not address server CPU or memory optimisation beyond the database query changes. Infrastructure scaling is out of scope.
- **Payment and booking API response time** — The constitutional target of < 1 s at p95 for mutation APIs is already in scope for Spec 001 and Spec 003. This spec does not revisit those endpoints.
- **Third-party analytics or tag manager performance** — Impact of analytics scripts on page load is not addressed here.
- **CDN configuration** — This spec defines what the platform serves; CDN topology and edge configuration are infrastructure concerns outside the feature specification.
