# Data Model: SEO & Social Sharing

**Spec**: 017 | **Date**: 2026-04-29 | **Plan**: [plan.md](plan.md)

## Overview

This spec introduces **no new database tables**. All OG metadata, JSON-LD structured data,
sitemap entries, and share URLs are computed at render/request time from the existing `events`
and `teacher_profiles` (+ `users`) tables. The entities below are TypeScript interfaces — they
represent the computed shapes passed between service functions, route handlers, and page components.

---

## Entity Overview

```
┌────────────────┐      ┌──────────────────────┐
│  events        │─────→│ EventOGMetadata       │ (computed at render, not persisted)
│  (existing)    │─────→│ EventStructuredData   │ (computed at render, not persisted)
│                │─────→│ EventSitemapEntry     │ (computed per request, cached 1 h)
│                │─────→│ ShareMeta (extended)  │ (computed per /api/events/[id]/share request)
└────────────────┘      └──────────────────────┘

┌────────────────┐      ┌──────────────────────┐
│ teacher_profiles│─────→│ TeacherOGMetadata    │ (computed at render, not persisted)
│ + users        │─────→│ TeacherStructuredData │ (computed at render, not persisted)
│  (existing)    │─────→│ TeacherSitemapEntry   │ (computed per request, cached 1 h)
└────────────────┘      └──────────────────────┘

                         ┌──────────────────────┐
                         │ ShareURL              │ (constructed client-side, not persisted)
                         └──────────────────────┘
```

---

## Computed Entities

### 1. `EventOGMetadata`

Returned by `buildEventMetadata()` in `lib/seo/metadata.ts`. Consumed by `generateMetadata()`
in `app/events/[id]/page.tsx`.

```typescript
/** Input source fields from the existing EventDetail type */
interface EventOGMetadata {
  /** <title> tag and og:title */
  title: string;               // e.g., "AcroYoga Flow Workshop"
  /** og:description — max 160 chars */
  description: string;         // trimmed event.description or generated fallback
  /** og:image — absolute URL with cache-busting query param */
  imageUrl: string;            // e.g., https://example.com/api/og/events/abc?v=1714391000000
  /** og:url and <link rel="canonical"> — absolute, non-locale-prefixed */
  canonicalUrl: string;        // e.g., https://example.com/events/abc
  /** og:type */
  type: 'event';
  /** twitter:card */
  twitterCard: 'summary_large_image';
  /** Robots directive — only set for draft/private events */
  robots?: 'noindex, nofollow';
  /** hreflang alternates — all locales point to same URL (non-prefixed routing) */
  alternateLanguages: Record<'en' | 'es' | 'ar' | 'x-default', string>;
}
```

**Source fields from `EventDetail`**:

| Source field | Mapped to | Notes |
|---|---|---|
| `event.title` | `title` | Used verbatim |
| `event.description` | `description` | Trimmed to 160 chars; fallback: `"${category} event in ${cityName}"` |
| `event.posterImageUrl` | OG image `?src=` | Used as background in `next/og` template if present |
| `event.id` | `canonicalUrl`, `imageUrl` | URL construction |
| `event.updatedAt` | `imageUrl` `?v=` param | Cache-busting timestamp |
| `event.status` | `robots` | `status !== 'published'` → `noindex, nofollow` |

---

### 2. `TeacherOGMetadata`

Returned by `buildTeacherMetadata()`. Consumed by `generateMetadata()` in `app/teachers/[id]/page.tsx`.

```typescript
interface TeacherOGMetadata {
  title: string;          // e.g., "Jane Smith | AcroYoga Teacher"
  description: string;    // bio truncated to 160 chars or platform fallback
  imageUrl: string;       // /api/og/teachers/[id]?v=[updatedAt]
  canonicalUrl: string;   // https://example.com/teachers/[id]
  type: 'profile';
  twitterCard: 'summary';
  robots?: 'noindex, nofollow';  // when teacher profile is inactive/deleted
  alternateLanguages: Record<'en' | 'es' | 'ar' | 'x-default', string>;
}
```

**Source fields from `TeacherProfileDetail`**:

| Source field | Mapped to | Notes |
|---|---|---|
| `profile.user_name` (via JOIN) | `title` | Displayed as "Name \| AcroYoga Teacher" |
| `profile.bio` | `description` | Trimmed to 160 chars; fallback: "AcroYoga teacher on the AcroYoga Community platform" |
| `profile.photos[0].url` | OG image background | First photo used; placeholder if none |
| `profile.id` | `canonicalUrl`, `imageUrl` | URL construction |
| `profile.updated_at` | `imageUrl` `?v=` param | Cache-busting |
| `profile.is_deleted` | `robots` | Deleted/inactive → noindex |

---

### 3. `EventStructuredData`

Schema.org `Event` object. Rendered as `<script type="application/ld+json">` in page JSX.

```typescript
interface EventStructuredData {
  '@context': 'https://schema.org';
  '@type': 'Event';
  name: string;
  description: string;
  startDate: string;              // ISO 8601: "2026-05-15T19:00:00Z"
  endDate?: string;               // ISO 8601; omitted if null
  eventStatus: EventStatusSchema;
  location: {
    '@type': 'Place';
    name: string;                 // venue_name
    address: {
      '@type': 'PostalAddress';
      streetAddress: string;      // venue_address
      addressLocality: string;    // city_name
    };
  };
  organizer: {
    '@type': 'Organization';
    name: 'AcroYoga Community';
    url: string;                  // BASE_URL
  };
  offers: {
    '@type': 'Offer';
    price: number;                // 0 for free events
    priceCurrency: string;        // ISO 4217 e.g., "GBP"
    availability: 'https://schema.org/InStock' | 'https://schema.org/SoldOut';
    url: string;                  // canonical event URL
  };
  image?: string;                 // posterImageUrl or OG image URL
  url: string;                    // canonical event URL
}

type EventStatusSchema =
  | 'https://schema.org/EventScheduled'
  | 'https://schema.org/EventCancelled'
  | 'https://schema.org/EventPostponed'
  | 'https://schema.org/EventRescheduled';
```

**Status mapping**:

| `event.status` DB value | `eventStatus` schema value |
|---|---|
| `published` | `EventScheduled` |
| `cancelled` | `EventCancelled` |
| `draft` | Not emitted (noindex page) |
| `private` | Not emitted (noindex page) |

**Availability mapping**:
- `confirmed_count >= capacity` → `SoldOut`
- Otherwise → `InStock`

---

### 4. `TeacherStructuredData`

Schema.org `Person` object.

```typescript
interface TeacherStructuredData {
  '@context': 'https://schema.org';
  '@type': 'Person';
  name: string;               // display_name from users table
  description: string;        // bio or platform fallback
  image?: string;             // first photo URL or undefined
  url: string;                // canonical teacher profile URL
  jobTitle: 'AcroYoga Teacher';
  affiliation: {
    '@type': 'Organization';
    name: 'AcroYoga Community';
    url: string;
  };
}
```

---

### 5. `SitemapEntry`

Represents one URL in the generated XML sitemap. Returned by `getSitemapEvents()` and
`getSitemapTeachers()` in `lib/seo/sitemap.ts`.

```typescript
interface SitemapEntry {
  /** Canonical URL for this resource */
  url: string;
  /** ISO 8601 last-modification timestamp (from DB `updated_at`) */
  lastModified: Date;
  /** Change frequency hint for crawlers */
  changeFrequency: 'daily' | 'weekly' | 'monthly';
  /** Priority relative to other pages (0.0–1.0) */
  priority: number;
}
```

**Priority assignments**:

| Page type | Priority | Rationale |
|---|---|---|
| Event detail (upcoming) | 0.9 | High crawl priority; freshest content |
| Event detail (past) | 0.5 | Lower priority; history value |
| Teacher profile | 0.8 | High-value discoverability surface |
| Static pages (/, /events, /teachers) | 0.7 | Important but stable |

**Query contract** (implemented in `lib/seo/sitemap.ts`):
```sql
-- getSitemapEvents() — excludes draft, private, cancelled
SELECT id, updated_at
FROM events
WHERE status = 'published'
ORDER BY updated_at DESC;

-- getSitemapTeachers() — excludes deleted/inactive profiles
SELECT id, updated_at
FROM teacher_profiles
WHERE is_deleted = false
ORDER BY updated_at DESC;
```

---

### 6. `ShareMeta` (extended)

The existing `ShareMeta` type in `lib/events/share.ts` is extended. The API response from
`GET /api/events/[id]/share` is updated to include the structured data hook.

```typescript
/** Extended ShareMeta — backward-compatible; new fields are optional */
interface ShareMeta {
  url: string;               // canonical URL (no UTM — UTM added client-side)
  title: string;
  description: string;
  ogTags: Record<string, string>;
  /** NEW: ISO 8601 timestamp for OG image cache-busting ?v= param */
  updatedAt?: string;
  /** NEW: locale at time of generation */
  locale?: string;
}
```

---

### 7. `ShareURL`

Constructed client-side in `components/SharePanel.tsx`. Not persisted or sent to the server.

```typescript
/** UTM-decorated share URL, constructed at share time */
interface ShareURL {
  /** Full URL with UTM params */
  href: string;
  /** utm_source value */
  source: 'twitter' | 'whatsapp' | 'clipboard' | 'native';
  /** utm_medium value */
  medium: 'social' | 'referral';
  /** utm_campaign value — always 'event-share' */
  campaign: 'event-share';
}
```

**Construction rule**: Start from `ShareMeta.url` (the clean canonical URL). Append UTM params
using `new URL()` + `url.searchParams.set()` so any pre-existing query parameters are preserved.

---

## No New Migrations

All data accessed is from existing tables:

| Existing table | Fields read | Purpose |
|---|---|---|
| `events` | `id`, `title`, `description`, `start_datetime`, `end_datetime`, `status`, `category`, `cost`, `currency`, `capacity`, `poster_image_url`, `updated_at` | OG, JSON-LD, sitemap |
| `venues` (JOIN) | `name`, `address`, `city_name` | JSON-LD location |
| `teacher_profiles` | `id`, `bio`, `specialties`, `badge_status`, `is_deleted`, `updated_at` | OG, JSON-LD, sitemap |
| `users` (JOIN) | `name` | Teacher display name for OG/JSON-LD |
| `teacher_photos` | `url` (first row) | Teacher OG image background |

No schema changes. No migration files required.
