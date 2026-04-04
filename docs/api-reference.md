# API Reference

> **Base URL**: `http://localhost:3000/api` (development) or your deployed domain  
> **Authentication**: Session-based via NextAuth.js v5. Protected endpoints require a valid session cookie.  
> **Error Format**: All errors return `{ error: string, code: string, details?: unknown }`

## Table of Contents

- [Events](#events)
- [Event Groups & Bookings](#event-groups--bookings)
- [Teachers](#teachers)
- [Payments & Stripe](#payments--stripe)
- [Permissions & Grants](#permissions--grants)
- [Directory & Profiles](#directory--profiles)
- [Community & Social](#community--social)
- [Threads & Messaging](#threads--messaging)
- [Reports & Moderation](#reports--moderation)
- [Concessions](#concessions)
- [Venues & Locations](#venues--locations)
- [Account & GDPR](#account--gdpr)
- [Authentication](#authentication)
- [Admin](#admin)
- [Health & Infrastructure](#health--infrastructure)
- [Development](#development)

---

## Events

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/events` | None | List events with search/filter options (category, skill level, date range, location) |
| POST | `/events` | Auth | Create a new event |
| GET | `/events/[id]` | None | Get event details by ID |
| PATCH | `/events/[id]` | Owner | Update event (owner only) |
| DELETE | `/events/[id]` | Owner | Delete or cancel event (owner only) |
| GET | `/events/[id]/capacity` | None | Check event capacity for a specific date |
| GET | `/events/[id]/occurrences` | None | List recurrence occurrences for a recurring event |
| GET | `/events/[id]/ical` | None | Export event as iCalendar (.ics) file |
| GET | `/events/[id]/share` | None | Get event sharing metadata |
| GET | `/events/[id]/reviews` | None | List reviews for an event |
| POST | `/events/[id]/reviews` | Auth | Submit a review for an event |
| GET | `/events/[id]/teachers` | None | List teachers assigned to an event |
| POST | `/events/[id]/teachers` | Auth | Assign a teacher to an event |
| DELETE | `/events/[id]/teachers` | Auth | Remove a teacher from an event |
| GET | `/events/[id]/rsvp` | None | Get RSVPs for an event |
| POST | `/events/[id]/rsvp` | Auth | RSVP to an event (with role selection: base, flyer, hybrid) |
| POST | `/events/[id]/rsvp/cancel` | Auth | Cancel an RSVP |
| GET | `/events/[id]/waitlist` | None | Get waitlist entries for an event |
| POST | `/events/[id]/waitlist` | Auth | Join event waitlist |
| DELETE | `/events/[id]/waitlist` | Auth | Leave event waitlist |
| POST | `/events/[id]/interest` | Auth | Toggle interest in an event |
| GET | `/events/[id]/overrides` | None | Get occurrence overrides for a recurring event |
| POST | `/events/[id]/overrides` | Auth | Create an occurrence override |
| GET | `/events/[id]/overrides/[date]` | None | Get a specific override by date |
| PATCH | `/events/[id]/overrides/[date]` | Auth | Update an occurrence override |
| DELETE | `/events/[id]/overrides/[date]` | Auth | Delete an occurrence override |
| POST | `/events/[id]/series-edit` | Auth | Apply bulk edits to a recurring event series |

---

## Event Groups & Bookings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/event-groups` | None | List event groups (festivals, combos, series) |
| POST | `/event-groups` | Auth | Create an event group |
| GET | `/event-groups/[groupId]` | None | Get event group details with member events |
| PATCH | `/event-groups/[groupId]` | Owner | Update event group (owner only) |
| DELETE | `/event-groups/[groupId]` | Owner | Delete event group (owner only) |
| GET | `/event-groups/[groupId]/tickets` | None | List ticket types for a group |
| POST | `/event-groups/[groupId]/tickets` | Owner | Create a ticket type |
| GET | `/event-groups/[groupId]/tickets/[ticketId]` | None | Get ticket type with availability |
| PATCH | `/event-groups/[groupId]/tickets/[ticketId]` | Auth | Update a ticket type |
| DELETE | `/event-groups/[groupId]/tickets/[ticketId]` | Auth | Delete a ticket type |
| GET | `/bookings` | Auth | List current user's bookings |
| POST | `/bookings` | Auth | Book a ticket |
| GET | `/bookings/[bookingId]` | Auth | Get booking details (own bookings only) |
| DELETE | `/bookings/[bookingId]` | Auth | Cancel a booking |
| POST | `/bookings/[bookingId]/complete` | Auth | Complete booking payment with Stripe charge |

---

## Teachers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/teachers` | None | Search teacher profiles with filters (specialties, badge status) |
| GET | `/teachers/[id]` | None | Get teacher profile details |
| PATCH | `/teachers/[id]` | Owner/Admin | Update teacher profile |
| DELETE | `/teachers/[id]` | Owner/Admin | Delete teacher profile (soft delete) |
| POST | `/teachers/apply` | Auth | Submit a teacher application |
| GET | `/teachers/requests` | Admin | List pending teacher applications (admin only) |
| GET | `/teachers/requests/[id]` | None | Get teacher application details |
| PATCH | `/teachers/requests/[id]` | Admin | Approve or reject a teacher application |
| GET | `/teachers/[id]/certifications` | None | List certifications for a teacher |
| POST | `/teachers/[id]/certifications` | Auth | Create a certification |
| GET | `/teachers/[id]/certifications/[certId]` | None | Get certification details |
| PATCH | `/teachers/[id]/certifications/[certId]` | Auth | Update a certification |
| DELETE | `/teachers/[id]/certifications/[certId]` | Auth | Delete a certification |
| PATCH | `/teachers/[id]/certifications/[certId]/verify` | Admin | Verify a certification (admin only) |
| GET | `/teachers/[id]/photos` | None | List teacher photos |
| POST | `/teachers/[id]/photos` | Auth | Upload a teacher photo (max 10) |
| DELETE | `/teachers/[id]/photos/[photoId]` | Auth | Delete a teacher photo |
| GET | `/teachers/[id]/reviews` | None | List reviews for a teacher |
| PATCH | `/teachers/[id]/reviews/[reviewId]` | Admin | Hide/unhide a teacher review (admin moderation) |

---

## Payments & Stripe

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/payments/status` | Auth | Get Stripe Connect account status |
| POST | `/payments/connect` | Auth | Initiate Stripe Connect onboarding flow (event creators) |
| GET | `/payments/callback` | None | OAuth callback from Stripe Connect |
| POST | `/payments/webhook` | None | Stripe webhook handler for account updates |

---

## Permissions & Grants

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/permissions/check` | Auth | Check if user has permission for an action and scope |
| GET | `/permissions/grants` | Auth | List permission grants for caller's scope |
| POST | `/permissions/grants` | Admin | Create a permission grant |
| DELETE | `/permissions/grants` | Admin | Revoke a permission grant (protects last global admin) |
| GET | `/permissions/requests` | Auth | List permission requests (own or admin view) |
| POST | `/permissions/requests` | Auth | Submit a permission request for a city |
| PATCH | `/permissions/requests/[id]` | Admin | Approve or reject a permission request |

### Permission Roles

| Role | Scope | Capabilities |
|------|-------|-------------|
| `global_admin` | Global | Full platform management |
| `country_admin` | Country | Manage resources within a country |
| `city_admin` | City | Manage resources within a city |
| `event_creator` | City | Create events and venues within a city |

---

## Directory & Profiles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/directory` | Auth | Search user directory with filters (name, role, city, proximity) |
| GET | `/directory/visibility` | Auth | Get current user's directory visibility setting |
| PATCH | `/directory/visibility` | Auth | Update directory visibility (opt in/out) |
| GET | `/profiles/me` | Auth | Get current user's profile |
| PUT | `/profiles/me` | Auth | Update current user's profile |
| GET | `/profiles/[userId]` | None | Get a user's public profile (respects visibility settings) |
| POST | `/profiles/me/detect-city` | Auth | Detect home city from latitude/longitude coordinates |
| PUT | `/profiles/me/social-links` | Auth | Update social media links |

---

## Community & Social

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/follows` | Auth | Get current user's following list |
| POST | `/follows` | Auth | Follow a user |
| DELETE | `/follows/[followeeId]` | Auth | Unfollow a user |
| GET | `/follows/followers` | Auth | Get current user's followers |
| GET | `/follows/friends` | Auth | Get mutual follows (friends) |
| GET | `/blocks` | Auth | Get current user's block list |
| POST | `/blocks` | Auth | Block a user |
| DELETE | `/blocks/[blockedId]` | Auth | Unblock a user |
| GET | `/mutes` | Auth | Get current user's mute list |
| POST | `/mutes` | Auth | Mute a user |
| DELETE | `/mutes/[mutedId]` | Auth | Unmute a user |

---

## Threads & Messaging

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/threads/by-entity/[entityType]/[entityId]` | Optional | Get or create a discussion thread for an entity (event, city, country) |
| GET | `/threads/[threadId]/messages` | Optional | List messages in a thread with pagination |
| POST | `/threads/[threadId]/messages` | Auth | Post a message to a thread |
| PATCH | `/threads/[threadId]/messages/[messageId]` | Owner | Edit a message (owner only) |
| DELETE | `/threads/[threadId]/messages/[messageId]` | Owner/Admin | Delete a message |
| PATCH | `/threads/[threadId]/messages/[messageId]/pin` | Admin | Pin or unpin a message |
| POST | `/threads/[threadId]/messages/[messageId]/reactions` | Auth | Add or toggle an emoji reaction |
| PATCH | `/threads/[threadId]/lock` | Admin | Lock or unlock a thread |

### Thread Entity Types

- `event` — Discussion thread for a specific event
- `city` — Community thread for a city
- `country` — Community thread for a country

### Supported Reactions

`thumbs_up`, `heart`, `fire`, `laugh`, `sad`, `celebrate`

---

## Reports & Moderation

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/reports` | Auth | Submit a user report |
| GET | `/reports` | Admin | Get the report queue (admin moderation) |
| PATCH | `/reports/[id]` | Admin | Review and action a report |

### Report Reasons

`harassment`, `spam`, `inappropriate`, `other`

---

## Concessions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/concessions` | Auth | Get user's concession status or list pending applications |
| POST | `/concessions` | Auth | Apply for concession pricing |
| POST | `/concessions/[concessionId]/review` | Auth | Review a concession application |
| POST | `/concessions/users/[userId]/revoke` | Auth | Revoke an approved concession |

---

## Venues & Locations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/venues` | None | List venues with filters |
| POST | `/venues` | Auth | Create a venue |
| GET | `/venues/[id]` | None | Get venue details |
| PATCH | `/venues/[id]` | Owner | Update a venue (owner only) |
| DELETE | `/venues/[id]` | Owner | Delete a venue (owner only) |
| GET | `/cities` | None | List cities with filters |
| GET | `/cities/nearest` | None | Find nearest city by latitude/longitude coordinates |

---

## Account & GDPR

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| DELETE | `/account` | Auth | Delete user account and all PII (GDPR right to erasure) |
| POST | `/account/export` | Auth | Request a full data export (GDPR right of access) |
| GET | `/account/exports` | Auth | List user's data export requests |
| GET | `/account/exports/[id]/download` | Auth | Download a completed data export file |
| GET | `/me/export` | Auth | Get GDPR data export as JSON (immediate) |

---

## Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET/POST | `/auth/[...nextauth]` | None | NextAuth.js authentication handler (Google, Facebook, Apple via Entra External ID) |
| GET | `/auth/link/init` | Auth | Get CSRF token for account linking |
| POST | `/auth/link` | Auth | Link a secondary social identity to your account |
| GET | `/auth/link/list` | Auth | List linked social accounts |
| DELETE | `/auth/link/[id]` | Auth | Unlink a social account (prevents lockout if only one remains) |

### Supported Social Providers

- **Google** — via Entra External ID federation
- **Facebook** — via Entra External ID federation
- **Apple** — via Entra External ID federation (supports private relay emails)

---

## Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/certifications/expiring` | Admin | List teacher certifications expiring soon |

---

## Health & Infrastructure

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check — returns status, version, and timestamp |
| GET | `/ready` | None | Readiness check — validates database and storage connectivity |
| GET | `/db/wake` | None | Check if database wake feature is available |
| POST | `/db/wake` | None | Trigger Azure PostgreSQL server start (non-production only) |

### Health Check Response

```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2026-03-25T12:00:00.000Z"
}
```

---

## Development

> These endpoints are only available in non-production environments.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dev/mock-user` | None | Get active mock user and list available users |
| POST | `/dev/mock-user` | None | Switch active mock user for testing |
| GET | `/dev/mock-user/seed` | None | Seed mock users (idempotent) |
| GET | `/dev/mock-user/seed?full=true` | None | Seed full test data (users, events, teachers) |

---

## Authentication Levels

| Level | Description |
|-------|-------------|
| **None** | Public endpoint — no authentication required |
| **Auth** | Requires a valid session (via `requireAuth()` or `getServerSession()`) |
| **Owner** | Requires authentication + resource ownership verification |
| **Owner/Admin** | Requires authentication + resource ownership OR scoped admin permission |
| **Admin** | Requires authentication + scoped admin permission (via `withPermission()`) |
| **Optional** | Works for both authenticated and anonymous users (with different behavior) |

## Error Response Format

All error responses follow a consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Authenticated but not authorized |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 400 | Request body failed Zod validation |
| `CONFLICT` | 409 | Resource already exists or duplicate action |
| `RATE_LIMITED` | 429 | Too many requests |

## Pagination

List endpoints support pagination via query parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (1-based) |
| `limit` | number | Results per page (default varies by endpoint) |
| `cursor` | string | Cursor-based pagination (used by some endpoints) |

---

*This reference covers 92 API endpoints across 16 domains. For implementation details, see the route files in `apps/web/src/app/api/`.*
