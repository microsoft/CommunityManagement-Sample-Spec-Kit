# Tasks: Simple UI Pages — Cohesive Platform User Experience

**Input**: Design documents from `/specs/007-simple-ui-pages/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/page-routes.md, quickstart.md

**Tests**: Not requested for this feature. Existing API integration tests provide backend coverage. Verification is visual + nav smoke testing per quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. All work is purely presentational — no new API routes or DB tables.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Tailwind CSS & Build Config)

**Purpose**: Install Tailwind CSS v4, create PostCSS config, and globals.css so utility classes work across all pages.

- [X] T001 Install Tailwind CSS v4 dependencies: `npm install tailwindcss @tailwindcss/postcss postcss`
- [X] T002 Create PostCSS config file at postcss.config.mjs with `@tailwindcss/postcss` plugin
- [X] T003 Create Tailwind CSS entry point at src/app/globals.css with `@import "tailwindcss"` directive

---

## Phase 2: Foundational — Shared Layout Shell (Blocking)

**Purpose**: Create the NavHeader component and integrate it into the root layout. Every subsequent page task depends on this shell being in place.

**⚠️ CRITICAL**: No page polish work can begin until this phase is complete.

- [X] T004 Create NavHeader client component at src/components/NavHeader.tsx with platform name "AcroYoga Community", nav links (Home, Events, Teachers, Profile, Settings), auth state display via `useSession()`, and mobile hamburger menu toggle using `useState`
- [X] T005 Update root layout at src/app/layout.tsx to import globals.css, wrap children with `<SessionProvider>`, add `<NavHeader />` above `{children}`, and apply Tailwind body classes (font, background, min-height)

**Checkpoint**: Every page now renders inside the shared nav shell. Verify by navigating to any route and confirming the header is present.

---

## Phase 3: User Story 1 — Shared Navigation & Layout Shell (Priority: P0) 🎯 MVP

**Goal**: Visitors and logged-in users see a consistent header on every page with working navigation links and responsive mobile menu.

**Independent Test**: Navigate to any page and verify the header renders with links to Events, Teachers, Profile, Settings. Click each link and verify routing. Resize to < 768px and verify mobile menu toggle.

- [X] T006 [US1] Add responsive mobile menu styles to NavHeader in src/components/NavHeader.tsx: desktop horizontal flex nav with `hidden md:flex`, mobile hamburger button with `md:hidden`, and dropdown overlay for mobile links
- [X] T007 [US1] Add active link highlighting in NavHeader in src/components/NavHeader.tsx using `usePathname()` to apply visual indicator (underline or bold) to the current section's nav link
- [X] T008 [US1] Add auth-aware display in NavHeader in src/components/NavHeader.tsx: show user display name + link to /profile when authenticated, show "Sign In" link when unauthenticated, using `useSession()` status

**Checkpoint**: Navigation shell is fully functional. All links route correctly. Mobile menu works. Auth state is displayed.

---

## Phase 4: User Story 2 — Home/Landing Page (Priority: P0)

**Goal**: Root URL shows a welcoming hero section, featured upcoming events, and CTAs to browse events and teachers.

**Independent Test**: Navigate to `/` and verify hero section, featured events cards, and CTA buttons are visible and link to correct destinations. Verify empty state when no events exist.

- [X] T009 [US2] Replace landing page content in src/app/page.tsx with hero section containing headline ("Find Your AcroYoga Community"), tagline, and two CTA buttons linking to /events and /teachers
- [X] T010 [US2] Add featured events section to src/app/page.tsx that fetches from `/api/events?limit=6&sort=startDatetime` and renders up to 6 EventCard components in a responsive grid
- [X] T011 [US2] Add loading skeleton and empty state to the featured events section in src/app/page.tsx: animated pulse placeholders while fetching, and friendly "No upcoming events yet" message when API returns empty array

**Checkpoint**: Landing page delivers a strong first impression with hero + events. Users can navigate into the platform from here.

---

## Phase 5: User Story 3 — Events List Page (Priority: P1)

**Goal**: Events page integrates the existing `EventsListPage` component within the shared layout with page heading and consistent spacing.

**Independent Test**: Navigate to `/events`, verify page renders within the shared layout with heading "Events", event cards display, and filter controls work.

- [X] T012 [US3] Polish events list page at src/app/events/page.tsx: add page heading "Events" with consistent typography, wrap existing `EventsListPage` component with proper spacing and max-width container within the shared layout

**Checkpoint**: Events list is visually integrated into the platform shell.

---

## Phase 6: User Story 4 — Event Detail Page (Priority: P1)

**Goal**: Event detail page shows full event info within the shared layout with breadcrumb navigation back to events list.

**Independent Test**: Navigate to `/events/[id]` and verify event details render within layout with a working "← Events" breadcrumb link.

- [X] T013 [US4] Add breadcrumb navigation to event detail page at src/app/events/[id]/page.tsx: render a "← Back to Events" link to /events above the existing EventDetailPage component, with consistent container width and spacing

**Checkpoint**: Event detail page completes the events browsing flow with clear back-navigation.

---

## Phase 7: User Story 5 — Teacher Directory Page (Priority: P1)

**Goal**: Teacher directory shows a searchable, filterable grid of teacher cards within the shared layout.

**Independent Test**: Navigate to `/teachers`, verify teacher cards render in a grid, search by name filters results, and specialty filter works.

- [X] T014 [US5] Polish teacher directory page at src/app/teachers/page.tsx: ensure page heading "Teachers", search input and specialty filter controls have consistent Tailwind styling, and teacher cards render in a responsive grid (1 col mobile, 2 col tablet, 3 col desktop)
- [X] T015 [P] [US5] Add empty state to teacher directory in src/app/teachers/page.tsx: show "No teachers found" message when search/filter produces no results, with suggestion to adjust filters

**Checkpoint**: Teacher directory is visually polished and fully navigable within the shared shell.

---

## Phase 8: User Story 6 — Teacher Profile Page (Priority: P2)

**Goal**: Teacher profile page displays full profile with bio, specialties, reviews, and upcoming events within the shared layout.

**Independent Test**: Navigate to `/teachers/[id]` and verify all profile sections render: name, bio, specialties, reviews summary, individual reviews, and upcoming events as links to event detail pages.

- [X] T016 [US6] Polish teacher profile page at src/app/teachers/[id]/page.tsx: ensure profile header (name, bio, specialties, badge status), aggregate rating display, and consistent section headings for Reviews and Upcoming Events
- [X] T017 [P] [US6] Add review cards section to teacher profile at src/app/teachers/[id]/page.tsx: render individual review cards with reviewer name, star rating, review text, and date, with empty state "No reviews yet"
- [X] T018 [P] [US6] Add upcoming events section to teacher profile at src/app/teachers/[id]/page.tsx: fetch events for this teacher and render as linked event cards, with empty state "No upcoming events"

**Checkpoint**: Teacher profile page completes the teacher discovery flow.

---

## Phase 9: User Story 7 — User Profile Page (Priority: P2)

**Goal**: Logged-in user can view and edit their profile with polished form layout, validation feedback, and save confirmation.

**Independent Test**: Navigate to `/profile`, verify form fields pre-populate with current data, edit display name, save, and confirm change persists on reload.

- [X] T019 [US7] Polish profile page form layout in src/app/profile/page.tsx: organize fields (display name, bio, default role, avatar URL, home city, social links) with consistent Tailwind form styling, labels, and spacing
- [X] T020 [US7] Add success/error feedback to profile page in src/app/profile/page.tsx: show green success banner on save, red error banner on failure, and inline validation message for empty display name
- [X] T021 [US7] Add auth guard to profile page in src/app/profile/page.tsx: check session and show "Please sign in to view your profile" message with sign-in link when unauthenticated

**Checkpoint**: Profile page is fully functional with clear user feedback.

---

## Phase 10: User Story 8 — Settings Pages (Priority: P2)

**Goal**: Settings area has sidebar navigation linking Account, Privacy, Teacher Application, and Payment sub-sections, with consistent layout across all sub-pages.

**Independent Test**: Navigate to `/settings`, verify sidebar nav renders, click each section link and verify the correct sub-page loads.

- [X] T022 [US8] Create settings layout at src/app/settings/layout.tsx with sidebar navigation containing links to /settings/account, /settings/privacy, /settings/teacher, and a "Payment Setup" placeholder, with active link highlighting using `usePathname()`
- [X] T023 [P] [US8] Polish settings landing page at src/app/settings/page.tsx: replace bare content with a welcome message and summary cards linking to each settings section
- [X] T024 [P] [US8] Polish account settings page at src/app/settings/account/page.tsx: ensure form fields have consistent Tailwind styling within the settings layout
- [X] T025 [P] [US8] Polish privacy settings page at src/app/settings/privacy/page.tsx: ensure privacy toggles/preferences have consistent Tailwind styling within the settings layout
- [X] T026 [P] [US8] Polish teacher application page at src/app/settings/teacher/page.tsx: ensure application form or status display has consistent Tailwind styling within the settings layout
- [X] T027 [US8] Add auth guard to settings layout in src/app/settings/layout.tsx: check session and show "Please sign in to access settings" when unauthenticated

**Checkpoint**: Settings area is unified under a consistent sidebar layout.

---

## Phase 11: User Story 9 — Admin Dashboard (Priority: P2)

**Goal**: Admin area shows a dashboard with summary counts and navigation to teacher requests, concessions, and permissions. Non-admins see access denied.

**Independent Test**: Navigate to `/admin` as admin and verify dashboard renders with summary cards and links to sub-sections. Navigate as non-admin and verify access denied message.

- [X] T028 [US9] Add dashboard landing content to admin area in src/app/admin/page.tsx (create if not exists): render summary cards showing counts of pending teacher requests, pending concession reviews, and total managed permissions, with links to each sub-section
- [X] T029 [US9] Extend admin layout navigation in src/app/admin/layout.tsx: add nav links for Teacher Requests (/admin/teachers), Concessions (/admin/concessions), Permissions (/admin/permissions), and Requests (/admin/requests) with active link highlighting
- [X] T030 [P] [US9] Polish admin teacher requests page at src/app/admin/teachers/page.tsx: ensure each request card shows applicant name, credentials, and approve/reject action buttons with consistent styling
- [X] T031 [P] [US9] Polish admin concessions page at src/app/admin/concessions/page.tsx: ensure each request card shows user, concession type, and approve/reject actions with consistent styling

**Checkpoint**: Admin dashboard is functional with complete sub-navigation.

---

## Phase 12: User Story 10 — Bookings Page (Priority: P2)

**Goal**: Logged-in user sees a well-formatted list of their bookings with event links and payment status.

**Independent Test**: Navigate to `/bookings` and verify bookings render in a table/card list with event name, date, ticket type, amount, and payment status. Verify empty state links to `/events`.

- [X] T032 [US10] Polish bookings page at src/app/bookings/page.tsx: ensure bookings render as a formatted table or card list with event name (as link to event detail), date, ticket type, amount paid, and payment status badge, all with consistent Tailwind styling
- [X] T033 [US10] Add empty state to bookings page at src/app/bookings/page.tsx: show "No bookings yet" message with a "Browse Events" link to /events
- [X] T034 [US10] Add auth guard to bookings page in src/app/bookings/page.tsx: check session and show "Please sign in to view your bookings" when unauthenticated

**Checkpoint**: Bookings page completes the user's post-booking experience.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency pass and build validation across all pages.

- [X] T035 [P] Add consistent loading skeleton states to all data-fetching pages (events, teachers, profile, bookings, admin): use Tailwind `animate-pulse` placeholder divs matching the content layout
- [X] T036 [P] Add consistent error states with retry button to all data-fetching pages: red alert box with error message and "Try Again" button that re-triggers the fetch
- [X] T037 [P] Ensure all pages are responsive from 320px to 1920px: verify single-column layouts on mobile, multi-column on desktop, readable font sizes, and no horizontal overflow
- [X] T038 Run `npm run build` to verify no TypeScript or build errors across all modified files
- [X] T039 Run quickstart.md verification checklist: confirm nav header on every page, mobile menu, landing hero + events, loading/error/empty states, and successful build

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all page work
- **US1 Navigation (Phase 3)**: Depends on Phase 2 — refines the nav component
- **US2 Landing (Phase 4)**: Depends on Phase 2 — can run in parallel with US1
- **US3–US5 (Phases 5–7)**: Depend on Phase 2 — can run in parallel with each other
- **US6–US10 (Phases 8–12)**: Depend on Phase 2 — can run in parallel with each other
- **Polish (Phase 13)**: Depends on all page phases being complete

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|-----------|-------------------|
| US1 (Nav Shell) | Phase 2 | US2 |
| US2 (Landing) | Phase 2 | US1, US3–US5 |
| US3 (Events List) | Phase 2 | US1, US2, US4, US5 |
| US4 (Event Detail) | Phase 2 | US1, US2, US3, US5 |
| US5 (Teacher Directory) | Phase 2 | US1–US4 |
| US6 (Teacher Profile) | Phase 2 | All other stories |
| US7 (User Profile) | Phase 2 | All other stories |
| US8 (Settings) | Phase 2 | All other stories |
| US9 (Admin Dashboard) | Phase 2 | All other stories |
| US10 (Bookings) | Phase 2 | All other stories |

### Within Each User Story

- Container/layout tasks before content tasks
- Content tasks before polish tasks
- Auth guards can be done in parallel with content

### Parallel Execution Example: After Phase 2 Completes

```
Worker A: T006 → T007 → T008 (US1 Nav)
Worker B: T009 → T010 → T011 (US2 Landing)
Worker C: T012 (US3 Events) → T013 (US4 Detail) → T014, T015 (US5 Teachers)
```

---

## Implementation Strategy

- **MVP (Phase 1–4)**: Setup + Nav Shell + Landing Page — gives a functional entry point into the platform
- **Core Pages (Phase 5–7)**: Events + Teachers — the primary user flows
- **Account Pages (Phase 8–12)**: Profile, Settings, Admin, Bookings — secondary but essential flows
- **Polish (Phase 13)**: Cross-cutting consistency pass

**Total tasks**: 39
