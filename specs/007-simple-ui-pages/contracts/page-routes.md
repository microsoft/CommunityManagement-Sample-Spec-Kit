# Page Route Contracts: 007 — Simple UI Pages

**Feature Branch**: `007-simple-ui-pages`  
**Date**: 2026-03-16

This feature exposes **no new APIs**. All pages are Next.js App Router pages that consume existing REST API routes via client-side `fetch()`. This document defines the page route contracts — what each URL renders and what API endpoints it calls.

## Page Routes

### `GET /` — Landing Page

**Component**: `src/app/page.tsx`  
**Auth required**: No  
**API calls**:
- `GET /api/events?limit=6&sort=startDatetime` → Featured events section

**Renders**: Hero section, featured event cards (reusing `EventCard`), CTAs to `/events` and `/teachers`

---

### `GET /events` — Events List

**Component**: `src/app/events/page.tsx` → `EventsListPage`  
**Auth required**: No  
**API calls**:
- `GET /api/events?{filters}` → Event list with filtering

**Renders**: Page heading, `EventFilters`, list of `EventCard` components, empty state

---

### `GET /events/:id` — Event Detail

**Component**: `src/app/events/[id]/page.tsx` → `EventDetailPage`  
**Auth required**: No  
**API calls**:
- `GET /api/events/:id` → Full event detail

**Renders**: Breadcrumb (← Events), full event detail with venue, teachers, tickets, RSVP actions

---

### `GET /teachers` — Teacher Directory

**Component**: `src/app/teachers/page.tsx`  
**Auth required**: No  
**API calls**:
- `GET /api/teachers?{query,specialty,badge}` → Teacher list with search/filter

**Renders**: Search input, filter controls, grid of teacher cards

---

### `GET /teachers/:id` — Teacher Profile

**Component**: `src/app/teachers/[id]/page.tsx`  
**Auth required**: No  
**API calls**:
- `GET /api/teachers/:id` → Teacher profile detail
- `GET /api/teachers/:id/reviews` → Teacher reviews
- `GET /api/events?teacherId=:id` → Teacher's upcoming events

**Renders**: Teacher name/bio/specialties, review summary + individual reviews, upcoming events list

---

### `GET /profile` — User Profile

**Component**: `src/app/profile/page.tsx`  
**Auth required**: Yes  
**API calls**:
- `GET /api/profiles/me` → Current user profile
- `PUT /api/profiles/me` → Save profile changes
- `PUT /api/profiles/me/social-links` → Save social links
- `POST /api/profiles/me/detect-city` → Auto-detect city

**Renders**: Profile edit form (display name, bio, role, avatar, city, social links), save button

---

### `GET /settings` — Settings Landing

**Component**: `src/app/settings/page.tsx`  
**Auth required**: Yes  
**API calls**: None (navigation page only)

**Renders**: Sidebar navigation to: Account, Privacy, Teacher Application, Payment Setup

---

### `GET /settings/account` — Account Settings

**Component**: `src/app/settings/account/page.tsx`  
**Auth required**: Yes  
**API calls**: Account-specific APIs (existing)

**Renders**: Account settings form within settings layout

---

### `GET /settings/privacy` — Privacy Settings

**Component**: `src/app/settings/privacy/page.tsx`  
**Auth required**: Yes  
**API calls**: Privacy-specific APIs (existing)

**Renders**: Privacy preferences form within settings layout

---

### `GET /settings/teacher` — Teacher Application

**Component**: `src/app/settings/teacher/page.tsx`  
**Auth required**: Yes  
**API calls**: Teacher application APIs (existing)

**Renders**: Teacher application form or status within settings layout

---

### `GET /admin` — Admin Dashboard

**Component**: `src/app/admin/` (uses `layout.tsx`)  
**Auth required**: Yes (admin role)  
**API calls**:
- Various admin endpoints for summary counts

**Renders**: Dashboard with counts + links to sub-sections. Access denied message for non-admins.

---

### `GET /bookings` — My Bookings

**Component**: `src/app/bookings/page.tsx`  
**Auth required**: Yes  
**API calls**:
- `GET /api/bookings` → User's booking list

**Renders**: Booking cards/table with event name, date, ticket type, amount, payment status. Empty state with browse events link.
