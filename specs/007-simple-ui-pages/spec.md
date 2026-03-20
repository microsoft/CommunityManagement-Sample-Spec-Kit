# Feature Specification: Simple UI Pages — Cohesive Platform User Experience

**Feature Branch**: `007-simple-ui-pages`  
**Created**: 2026-03-16  
**Status**: Implemented  
**Input**: User description: "Simple UI Pages - polished functional UI pages providing cohesive user experience across all platform features"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Shared Navigation & Layout Shell (Priority: P0)

A visitor or logged-in user arrives at any page on the platform. They see a consistent header with the platform name, navigation links to main sections (Events, Teachers, Profile, Settings), and a visual indicator of their authentication state. The navigation is present on every page and allows the user to move between sections without confusion.

**Why this priority**: Navigation is the foundational UI element. Without it, no other page is reachable in a user-friendly way. Every subsequent story depends on a working nav shell.

**Independent Test**: Navigate to any page on the platform and verify the shared header renders with working links to Events, Teachers, Profile, and Settings. Verify clicking each link routes to the correct page.

**Acceptance Scenarios**:

1. **Given** a user navigates to any page, **When** the page loads, **Then** a header with the platform name "AcroYoga Community" and navigation links is visible.
2. **Given** a logged-in user, **When** they view the header, **Then** they see their display name or avatar and a link to their profile.
3. **Given** a user on the Events page, **When** they click "Teachers" in the nav, **Then** they are routed to the Teacher Directory page.
4. **Given** any screen width, **When** the page loads on a small screen, **Then** the navigation collapses into a mobile-friendly menu (hamburger or similar).

---

### User Story 2 — Home/Landing Page (Priority: P0)

A visitor lands on the root URL of the platform. They see a welcoming hero section that communicates the platform's purpose, a row of featured/upcoming events, and clear calls-to-action directing them to browse events or explore teachers. The page gives a strong first impression and orients new users.

**Why this priority**: The landing page is the entry point for all new visitors. It sets expectations and funnels users into the platform's core features — events and teachers.

**Independent Test**: Navigate to the root URL and verify the hero section, featured events section, and navigation calls-to-action are visible and link to the correct destinations.

**Acceptance Scenarios**:

1. **Given** a visitor navigates to the root URL, **When** the page loads, **Then** they see a hero section with a headline, tagline, and at least one call-to-action button.
2. **Given** upcoming events exist, **When** the landing page loads, **Then** a "Featured Events" section displays up to 6 upcoming event cards with title, date, and city.
3. **Given** a visitor clicks "Browse Events" on the landing page, **When** the click is processed, **Then** they are navigated to the Events List page.
4. **Given** no upcoming events exist, **When** the landing page loads, **Then** the featured events section displays a friendly empty state message.

---

### User Story 3 — Events List Page (Priority: P1)

A user browses to the Events section. They see a visually organized list of events with filter controls (city, date range, interests) and each event displayed as a card showing title, date, location, and RSVP status. The existing `EventsListPage` component is integrated into the full-page layout with proper spacing, headings, and the shared navigation shell.

**Why this priority**: Events are the core value proposition. The events list is the most-visited page after the landing page and must be usable and visually coherent.

**Independent Test**: Navigate to `/events`, verify the page renders within the shared layout, shows event cards, and filter controls work.

**Acceptance Scenarios**:

1. **Given** a user navigates to `/events`, **When** the page loads, **Then** the shared navigation is visible and the event list renders below a page heading "Events".
2. **Given** events exist in the system, **When** the events page loads, **Then** event cards display title, date/time, city, and a visual RSVP indicator.
3. **Given** a user applies a city filter, **When** results update, **Then** only events in the selected city are shown.
4. **Given** no events match the current filters, **When** the page renders, **Then** a friendly empty state message is shown with a suggestion to adjust filters.

---

### User Story 4 — Event Detail Page (Priority: P1)

A user clicks on an event card. They see the full event details: title, description, date/time, location, teacher(s), available ticket types, and RSVP/booking actions. The existing `EventDetailPage` component is integrated into the shared layout with proper breadcrumb navigation back to the events list.

**Why this priority**: The event detail page is where conversions happen — RSVPs and bookings. It's the action point of the core user journey.

**Independent Test**: Navigate to `/events/[id]` and verify full event details render within the layout, with a working back-link to the events list.

**Acceptance Scenarios**:

1. **Given** a user navigates to `/events/[id]`, **When** the page loads, **Then** the event title, description, date/time, and location are displayed within the shared layout.
2. **Given** an event has teachers assigned, **When** the detail page loads, **Then** teacher names are shown as links to their teacher profile pages.
3. **Given** an event has ticket types, **When** the detail page loads, **Then** ticket options and prices are visible with a booking/RSVP action.
4. **Given** a user clicks the breadcrumb or "Back to Events", **When** the click is processed, **Then** they return to the Events List page.

---

### User Story 5 — Teacher Directory Page (Priority: P1)

A user browses to the Teachers section. They see a searchable, filterable grid of teacher cards showing name, photo/avatar placeholder, specialties, badge status, and aggregate rating. Users can search by name and filter by specialty or badge.

**Why this priority**: Teachers are a key discovery surface and differentiate the platform from generic event boards.

**Independent Test**: Navigate to `/teachers`, verify the directory renders with teacher cards and that search/filter controls produce correct results.

**Acceptance Scenarios**:

1. **Given** a user navigates to `/teachers`, **When** the page loads, **Then** a grid of teacher cards is displayed within the shared layout.
2. **Given** teachers exist, **When** the page renders, **Then** each card shows teacher name, specialties, badge status, and star rating.
3. **Given** a user types a name into the search box, **When** the input changes, **Then** the teacher list filters to show only matching teachers.
4. **Given** a user selects a specialty filter, **When** the filter is applied, **Then** only teachers with that specialty are shown.

---

### User Story 6 — Teacher Profile Page (Priority: P2)

A user clicks on a teacher card or link. They see the teacher's full profile: name, bio, specialties, certifications, photos, review summary, and individual reviews. Links to the teacher's upcoming events are visible.

**Why this priority**: Completing the teacher discovery flow. Users need to evaluate teachers before attending their events.

**Independent Test**: Navigate to `/teachers/[id]` and verify all profile sections render correctly within the shared layout.

**Acceptance Scenarios**:

1. **Given** a user navigates to `/teachers/[id]`, **When** the page loads, **Then** the teacher's name, bio, and specialties are displayed.
2. **Given** a teacher has reviews, **When** the profile loads, **Then** an aggregate rating summary and individual review cards are shown.
3. **Given** a teacher has upcoming events, **When** the profile loads, **Then** a section lists upcoming events as links to event detail pages.
4. **Given** the current user has attended this teacher's event, **When** the profile loads, **Then** a "Write a Review" action is available.

---

### User Story 7 — User Profile Page (Priority: P2)

A logged-in user navigates to their own profile. They can view and edit their display name, bio, default role, avatar URL, home city, and social links. Changes are saved via the existing profile API.

**Why this priority**: Users need to manage their identity on the platform. The existing page has form fields but needs layout polish and integration with the shared shell.

**Independent Test**: Navigate to `/profile`, verify the profile form renders with current data, make an edit, save, and confirm the change persists on reload.

**Acceptance Scenarios**:

1. **Given** a logged-in user navigates to `/profile`, **When** the page loads, **Then** their current display name, bio, and other profile fields are pre-populated.
2. **Given** a user edits their display name and clicks Save, **When** the save completes, **Then** a success message appears and the new name persists on page reload.
3. **Given** a user attempts to save an empty display name, **When** they click Save, **Then** a validation message indicates the field is required.

---

### User Story 8 — Settings Pages (Priority: P2)

A logged-in user navigates to Settings. They see a sidebar or tab navigation with sections: Account, Privacy, Teacher Application, and Payment Setup. Each section renders the appropriate settings form. The existing settings pages are unified under a consistent layout.

**Why this priority**: Settings are essential for account management but visited less frequently. Polish here improves trust and perceived quality.

**Independent Test**: Navigate to `/settings` and verify the settings navigation renders, each sub-section loads its form, and changes can be saved.

**Acceptance Scenarios**:

1. **Given** a logged-in user navigates to `/settings`, **When** the page loads, **Then** a sidebar or tab navigation shows Account, Privacy, Teacher Application, and Payment sections.
2. **Given** a user clicks "Privacy" in settings nav, **When** the section loads, **Then** privacy preferences are displayed and editable.
3. **Given** a user clicks "Teacher Application", **When** the section loads, **Then** the teacher application form or current application status is displayed.
4. **Given** a user clicks "Payment Setup", **When** the section loads, **Then** the payment account connection status and onboarding flow is displayed.

---

### User Story 9 — Admin Dashboard (Priority: P2)

An admin user navigates to the Admin area. They see a dashboard with navigation to: Pending Teacher Requests, Concession Reviews, and Permissions Management. Each sub-section lists actionable items with approve/reject controls. The existing admin layout is extended to cover all admin functions.

**Why this priority**: Admin tools enable platform governance. Without a functional dashboard, admins cannot approve teachers or manage permissions.

**Independent Test**: Navigate to `/admin` as an admin user and verify the dashboard renders with links to each admin sub-section, and that each section loads its content.

**Acceptance Scenarios**:

1. **Given** an admin navigates to `/admin`, **When** the page loads, **Then** a dashboard with summary counts and links to Teacher Requests, Concessions, and Permissions is displayed.
2. **Given** pending teacher requests exist, **When** an admin views the Teacher Requests section, **Then** each request shows applicant name, credentials, and approve/reject actions.
3. **Given** pending concession requests exist, **When** an admin views Concessions, **Then** each request shows user, concession type, and approve/reject actions.
4. **Given** a non-admin user navigates to `/admin`, **When** the page loads, **Then** they see an access denied message or are redirected away.

---

### User Story 10 — Bookings Page (Priority: P2)

A logged-in user navigates to their Bookings. They see a list of their event bookings showing event name, date, ticket type, payment status, and amount paid. The existing bookings page is polished into the shared layout.

**Why this priority**: Users need to track their bookings. The existing page has data but needs layout integration and visual polish.

**Independent Test**: Navigate to `/bookings` as a logged-in user and verify bookings render within the shared layout in a well-formatted table or card list.

**Acceptance Scenarios**:

1. **Given** a logged-in user navigates to `/bookings`, **When** the page loads, **Then** their bookings are displayed as a table or card list within the shared layout.
2. **Given** a user has bookings, **When** the page renders, **Then** each booking shows event name (as a link), date, ticket type, amount paid, and payment status.
3. **Given** a user has no bookings, **When** the page renders, **Then** a friendly empty state with a link to browse events is shown.

---

### Edge Cases

- What happens when a user navigates to a page that requires login while unauthenticated? — Pages that require authentication show a sign-in prompt or redirect to a login flow.
- What happens when an API call fails while loading page data? — A user-friendly error message is shown with a retry option, not a blank page or raw error.
- What happens on extremely slow connections? — Loading skeleton states or spinners are shown while data fetches.
- What happens when a referenced entity (event, teacher) no longer exists? — A 404-style message is shown: "This [event/teacher] could not be found."
- What happens on mobile viewports? — All pages are responsive, with single-column layouts on small screens and readable text sizes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All pages MUST render within a shared layout shell that includes persistent header navigation.
- **FR-002**: The header navigation MUST include links to: Home, Events, Teachers, Profile, and Settings.
- **FR-003**: The navigation MUST be responsive, collapsing to a mobile-friendly format on screen widths below 768px.
- **FR-004**: The landing page MUST display a hero section and a featured events section sourced from the existing events API.
- **FR-005**: The Events List page MUST integrate the existing `EventsListPage` component within the shared layout, preserving all current filter and display functionality.
- **FR-006**: The Event Detail page MUST integrate the existing `EventDetailPage` component within the shared layout with breadcrumb navigation.
- **FR-007**: The Teacher Directory page MUST display a searchable, filterable grid of teacher cards using the existing teachers API.
- **FR-008**: The Teacher Profile page MUST display teacher details, reviews, and upcoming events using existing APIs.
- **FR-009**: The User Profile page MUST allow viewing and editing profile fields using the existing profiles API.
- **FR-010**: The Settings area MUST provide navigation between Account, Privacy, Teacher Application, and Payment sub-sections.
- **FR-011**: The Admin Dashboard MUST show summary information and navigation to teacher requests, concessions, and permissions management.
- **FR-012**: The Admin area MUST deny access to non-admin users with a clear unauthorized message.
- **FR-013**: The Bookings page MUST display the user's booking history in a formatted table or card list.
- **FR-014**: All pages MUST show loading states while data is being fetched.
- **FR-015**: All pages MUST show user-friendly error messages when API calls fail, with a retry option.
- **FR-016**: All pages MUST display a meaningful empty state when no data is available for the current view.
- **FR-017**: All pages MUST be responsive and usable on screen widths from 320px to 1920px.
- **FR-018**: Pages requiring authentication MUST show a sign-in prompt when accessed by unauthenticated users.
- **FR-019**: All styling MUST use Tailwind CSS utility classes — no external component libraries.
- **FR-020**: All data fetching MUST use existing API routes — no new API endpoints are required.

### Assumptions

- All API routes referenced by the pages already exist and return correct data shapes.
- Authentication state is available via an existing session mechanism (the pages need to read it, not implement it).
- Tailwind CSS is already configured or will be added as a minimal setup step.
- No new database tables or API endpoints are needed — this feature is purely presentational.
- The existing event and teacher components (`EventsListPage`, `EventDetailPage`, `EventCard`, `EventFilters`) will be reused where they already exist.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time visitor can navigate from the landing page to an event detail page in under 3 clicks.
- **SC-002**: All 10 page types (Home, Nav, Events List, Event Detail, Teacher Directory, Teacher Profile, User Profile, Settings, Admin, Bookings) render without errors.
- **SC-003**: Every page is accessible via the shared navigation without requiring direct URL entry.
- **SC-004**: All pages render correctly on mobile (375px width) and desktop (1440px width) viewports.
- **SC-005**: Page content loads within 2 seconds on standard connections, with loading indicators visible during fetch.
- **SC-006**: Users can complete a full browse-to-book flow (landing → events → event detail → booking) without encountering broken layouts or missing content.
- **SC-007**: Admin users can access all admin sub-sections from the admin dashboard and perform review actions.
- **SC-008**: 90% of core user tasks (browse events, view teacher, edit profile, check bookings) are completable without confusion or dead-end pages.
