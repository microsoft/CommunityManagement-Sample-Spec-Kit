# Quickstart: Events Explorer

**Spec**: 010 | **Date**: 2026-03-19

---

## Prerequisites

- Node.js 20+
- Spec 001 migrations applied (events, venues, cities tables)
- Spec 004 migrations applied (permissions, users)
- Seed data with events across multiple cities/categories

## Setup

```bash
# 1. Install dependencies (from repo root)
npm install

# 2. Install new dependencies for this feature
npm install date-fns leaflet react-leaflet leaflet.markercluster
npm install -D @types/leaflet @types/leaflet.markercluster

# 3. Build design tokens (after adding category color tokens)
cd packages/tokens && npm run build && cd ../..

# 4. Seed events if not already done
npm run db:seed

# 5. Start development server
npm run dev
```

## Running Tests

```bash
# Unit tests — calendar utilities, location tree builder, filter hook
npm run test -- apps/web/tests/unit/calendar-utils.test.ts
npm run test -- apps/web/tests/unit/location-hierarchy.test.ts
npm run test -- apps/web/tests/unit/useExplorerFilters.test.ts

# Integration tests — panel synchronization, category filtering
npm run test -- apps/web/tests/integration/explorer-sync.test.tsx
npm run test -- apps/web/tests/integration/category-filter.test.tsx

# E2E tests (requires running dev server)
npm run dev &
npm run test:e2e -- apps/web/tests/e2e/explorer-calendar.spec.ts
npm run test:e2e -- apps/web/tests/e2e/explorer-map.spec.ts
npm run test:e2e -- apps/web/tests/e2e/explorer-location-tree.spec.ts
```

## Key Concepts

### Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                   ExplorerShell                       │
│         (CSS Grid — responsive 3-panel layout)       │
│                                                       │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │Location  │  │ Calendar     │  │ Map          │   │
│  │TreePanel │  │ Panel        │  │ Panel        │   │
│  │          │  │              │  │ (lazy-loaded)│   │
│  │Continent │  │ Month/Week/  │  │              │   │
│  │ Country  │  │ List/Agenda  │  │ Markers +    │   │
│  │  City    │  │              │  │ Clusters     │   │
│  └──────────┘  └──────────────┘  └──────────────┘   │
│                                                       │
│  ┌──────────────────────────────────────────────────┐ │
│  │        CategoryLegendBar (filter toggles)        │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
            ▲                    ▲
            │                    │
     useExplorerFilters()  URL Search Params
     (single source of truth)
```

### Filter Flow

```
1. User clicks category "Workshop" in legend bar
2. useExplorerFilters().toggleCategory('workshop')
3. URL updates: ?categories=jam,class,festival,social,retreat,teacher_training
4. All panels re-render with filtered data:
   - CalendarPanel: hides Workshop events
   - MapPanel: removes Workshop markers
   - LocationTreePanel: recomputes event counts
```

### Responsive Breakpoints

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Desktop | ≥1024px | 3-column grid: tree (250px) + calendar (flex) + map (350px) |
| Tablet | 768–1023px | Tree → dropdown. Calendar + map stack vertically with toggle |
| Mobile | <768px | Single panel with bottom tab bar: List / Map / Filters |

### New Design Tokens

Category colors are defined in `packages/tokens/src/color.tokens.json` under the `category` namespace:

| Token | Category | Value |
|-------|----------|-------|
| `--color-category-jam` | Jam | `#6366F1` (Indigo) |
| `--color-category-workshop` | Workshop | `#10B981` (Emerald) |
| `--color-category-class` | Class | `#3B82F6` (Blue) |
| `--color-category-festival` | Festival | `#EC4899` (Pink) |
| `--color-category-social` | Social | `#F59E0B` (Amber) |
| `--color-category-retreat` | Retreat | `#8B5CF6` (Purple) |
| `--color-category-training` | Teacher Training | `#14B8A6` (Teal) |

Use via CSS: `background-color: var(--color-category-jam);`

### Map Lazy Loading

The map is loaded via `next/dynamic` to stay within the 200KB JS budget:

```tsx
import dynamic from 'next/dynamic';

const MapPanel = dynamic(() => import('./MapPanel'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
```

Leaflet CSS is imported only inside the MapPanel component (not in the global stylesheet).

### API Dependencies

| Endpoint | Purpose | Notes |
|----------|---------|-------|
| `GET /api/events` | Fetch filtered events | Existing. Needs `venueLatitude`/`venueLongitude` added to response |
| `GET /api/cities?activeOnly=true` | Fetch cities for location tree | Existing. Needs `continentCode`/`continentName` added to response |

### File Locations

| What | Where |
|------|-------|
| Explorer page | `apps/web/src/app/events/explorer/page.tsx` |
| Filter state hook | `apps/web/src/hooks/useExplorerFilters.ts` |
| Calendar utilities | `apps/web/src/lib/calendar-utils.ts` |
| Location hierarchy | `apps/web/src/lib/location-hierarchy.ts` |
| Category color map | `apps/web/src/lib/category-colors.ts` |
| Design tokens | `packages/tokens/src/color.tokens.json` |
| Shared types | `packages/shared/src/types/explorer.ts` |
| Shared UI tree | `packages/shared-ui/src/LocationTree/` |
| Shared UI legend | `packages/shared-ui/src/CategoryLegend/` |
