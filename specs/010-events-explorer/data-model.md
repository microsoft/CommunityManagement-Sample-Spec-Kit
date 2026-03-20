# Data Model: Events Explorer

**Spec**: 010 | **Date**: 2026-03-19

---

## Overview

The Events Explorer is a **read-only frontend feature** — it introduces no new database tables. All data is consumed from existing API endpoints (`/api/events`, `/api/cities`). This document defines the **client-side data structures** used to power the Explorer's panels and synchronization.

## Entity Relationship Overview (Client-Side)

```
                    ┌──────────────────────────┐
                    │   ExplorerFilterState     │
                    │   (URL search params)     │
                    └────────┬─────────────────┘
                             │
              ┌──────────────┼──────────────────┐
              ▼              ▼                   ▼
     ┌────────────┐  ┌──────────────┐  ┌────────────────┐
     │ CalendarData│  │  MapMarkers  │  │  LocationTree  │
     │ (derived)   │  │  (derived)   │  │  (derived)     │
     └──────┬─────┘  └──────┬───────┘  └───────┬────────┘
            │               │                   │
            ▼               ▼                   ▼
     ┌────────────┐  ┌──────────────┐  ┌────────────────┐
     │EventSummary│  │EventSummary  │  │ City + counts  │
     │(from API)  │  │+ Venue coords│  │ (from API)     │
     └────────────┘  └──────────────┘  └────────────────┘
```

**Data flow**: URL params → API call → EventSummary[] + City[] → derived views for each panel.

---

## Client-Side Entities

### 1. ExplorerFilterState

Canonical filter state. Stored in URL search parameters. All panels read from this.

| Field | Type | URL Param | Default | Notes |
|-------|------|-----------|---------|-------|
| categories | EventCategory[] | `categories` (comma-separated) | all categories | Empty = all enabled |
| location | string \| null | `location` | null | City slug |
| dateFrom | string \| null | `dateFrom` | Current month start | ISO 8601 date |
| dateTo | string \| null | `dateTo` | Current month end | ISO 8601 date |
| view | CalendarViewMode | `view` | `"month"` | `"month" \| "week" \| "list" \| "agenda"` |
| skillLevel | SkillLevel \| null | `skillLevel` | null | Optional filter |
| status | string[] | `status` (comma-separated) | [] | e.g., "new", "full" |
| q | string \| null | `q` | null | Search query |
| page | number | `page` | 1 | Pagination |

**Validation rules**:
- Invalid `view` values → fall back to `"month"`
- Invalid `categories` entries → silently ignored
- Invalid dates → silently ignored (use defaults)
- Unknown parameters → preserved but ignored

---

### 2. CalendarViewMode

Enum for the four calendar views.

```typescript
type CalendarViewMode = "month" | "week" | "list" | "agenda";
```

---

### 3. LocationNode

Node in the hierarchical location tree. Used by the LocationTree component.

| Field | Type | Notes |
|-------|------|-------|
| id | string | Unique key (e.g., "EU", "EU/GB", "EU/GB/bristol") |
| type | `"continent" \| "country" \| "city"` | Level in hierarchy |
| name | string | Display name (i18n for continents, API-provided for countries/cities) |
| slug | string \| null | City slug (null for continent/country nodes) |
| code | string | Continent code, country code, or city slug |
| eventCount | number | Sum of events at this level and below |
| latitude | number \| null | Center coordinates (for map zoom) |
| longitude | number \| null | |
| children | LocationNode[] | Sorted alphabetically by name |

**Derivation**: Built client-side from the `City[]` API response. Cities are grouped by `countryCode` → countries by `continentCode`. Event counts roll up from city → country → continent.

---

### 4. CalendarDay

Represents a single day cell in the month/week grid.

| Field | Type | Notes |
|-------|------|-------|
| date | Date | The calendar date |
| isCurrentMonth | boolean | For month view — grey out off-month days |
| isToday | boolean | Highlight today |
| events | EventSummary[] | Events on this day |
| overflowCount | number | Events beyond display limit ("+N more") |

---

### 5. CalendarWeekSlot

Represents a time slot in the week view.

| Field | Type | Notes |
|-------|------|-------|
| startTime | string | "09:00", "09:30", etc. |
| endTime | string | Next slot start |
| events | EventSummary[] | Events overlapping this slot |

---

### 6. MapMarkerData

Derived marker data for the map panel.

| Field | Type | Notes |
|-------|------|-------|
| eventId | string | Links back to EventSummary |
| latitude | number | From event's venue |
| longitude | number | |
| category | EventCategory | For marker color |
| title | string | For popup |
| date | string | For popup |
| venueName | string | For popup |
| cityName | string | For popup |

**Note**: Events without coordinates (`latitude`/`longitude` = 0 or null on venue) are excluded from map markers but included in calendar/list views. This handles edge case from spec.

---

### 7. CategoryColorConfig

Static mapping from category to design token CSS custom property name.

| Field | Type | Notes |
|-------|------|-------|
| category | EventCategory | One of 7 categories |
| tokenName | string | CSS custom property (e.g., `--color-category-jam`) |
| label | string | i18n key (e.g., `category.jam`) |
| enabled | boolean | Current filter state |

---

## Existing Entities Referenced (No Changes)

### EventSummary (from `@acroyoga/shared/types/events`)

Used as-is. Key fields consumed by Explorer:
- `id`, `title`, `startDatetime`, `endDatetime` — calendar positioning
- `category` — color coding
- `venueName`, `cityName`, `citySlug` — location display
- `cost`, `capacity`, `confirmedCount` — event summary
- `posterImageUrl` — optional thumbnail in agenda view

### City (from `@acroyoga/shared/types/cities`)

Extended with two new fields (backward-compatible addition):

| New Field | Type | Notes |
|-----------|------|-------|
| continentCode | string | ISO continent code (e.g., "EU") — from `countries.continent_code` |
| continentName | string | Display name (e.g., "Europe") — from server-side i18n or static map |

### ListEventsQuery (from `@acroyoga/shared/types/events`)

Used as-is. The Explorer hook maps `ExplorerFilterState` → `ListEventsQuery` params for the API call. Category filtering may need extension if the API currently only accepts a single `category` value (extend to accept comma-separated list).

---

## Database Changes

### Minimal API Extension

The only server-side change is adding `continentCode` and `continentName` to the `/api/cities` response. This data is already in the `countries` table (`continent_code` column). The API route needs a JOIN:

```sql
-- Current (simplified)
SELECT c.*, co.name as country_name, co.code as country_code
FROM cities c JOIN countries co ON c.country_id = co.id;

-- Extended
SELECT c.*, co.name as country_name, co.code as country_code,
       co.continent_code
FROM cities c JOIN countries co ON c.country_id = co.id;
```

No new migrations. No schema changes.

---

## State Transitions

### Filter State Flow

```
URL Params (source of truth)
    │
    ├──► useExplorerFilters() hook parses params
    │         │
    │         ├──► API call: GET /api/events?{mapped params}
    │         │         └──► EventSummary[] → CalendarPanel, MapPanel
    │         │
    │         ├──► API call: GET /api/cities?activeOnly=true
    │         │         └──► City[] → LocationTree (built once, counts recomputed)
    │         │
    │         └──► Derived: LocationNode[] (tree), MapMarkerData[], CalendarDay[]
    │
    └──◄ User interaction (click category, select city, change date, switch view)
              └──► setFilter() → router.push() → URL updates → cycle repeats
```

### Panel Synchronization Rules

| Action | Calendar | Map | Location Tree |
|--------|----------|-----|---------------|
| Category toggled | Re-filters events | Re-filters markers | Recomputes counts |
| City selected in tree | Filters to city events | Zooms to city | Highlights node |
| Date range changed | Changes visible range | Re-filters markers to range | Recomputes counts |
| Map panned (sync enabled) | Filters to visible events | — | Recomputes counts |
| View mode changed | Switches layout | No change | No change |
