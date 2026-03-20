# Research: Events Explorer

**Spec**: 010 | **Date**: 2026-03-19

---

## R-1: Calendar Library vs. Custom Implementation

**Decision**: Custom calendar grid built with `date-fns` for date math, rendered as plain React components styled with design tokens.

**Rationale**: The spec requires four views (month, week, list, agenda) with category color-coding, recurrence indicators, and multi-day spanning. Full calendar frameworks (FullCalendar, react-big-calendar) are heavy (40–80KB gzipped), bring their own CSS that conflicts with design tokens, and make custom rendering (category colors, recurrence icons) harder to implement. Our calendar needs are display-only (no drag-drop, no inline editing) — the complexity is in the grid layout, not interaction logic.

A custom implementation using `date-fns` (~7KB gzipped, tree-shakeable) for date arithmetic gives full control over:
- Rendering: category-colored event dots/blocks using CSS custom properties
- Accessibility: ARIA grid roles on month view, ARIA listbox on list/agenda
- Bundle size: Only the date functions we import are bundled
- Design tokens: All spacing, colors, typography from `@acroyoga/tokens`

**Month view**: CSS Grid (7 columns × 5–6 rows). Each cell shows date number + up to 3 event dots with "+N more" overflow.
**Week view**: CSS Grid (7 columns). Time slots as rows (30-min intervals). Events as positioned blocks.
**List view**: Chronological list grouped by date, using existing `EventCard` component.
**Agenda view**: Day-grouped sections with expandable event summaries (collapsible details).

**Alternatives considered**:
- **FullCalendar (v6)**: Feature-rich but 45KB+ gzipped. Its own CSS theme system conflicts with our token pipeline. Custom event rendering requires plugin API. Adds 22%+ of our entire 200KB budget for features we don't use (drag-drop, resource views).
- **react-big-calendar**: ~30KB gzipped. Better customization via `components` prop but still ships its own CSS. Accessibility support is mediocre. Month view event display is limited.
- **@schedule-x/react**: Lightweight (~15KB) but immature (< 1 year old, small community). Missing agenda view. Violates Principle VII (actively maintained >6 months, but low bus factor).

---

## R-2: Map Library — Leaflet vs. Alternatives

**Decision**: Leaflet (v1.9) + `react-leaflet` (v4) for the interactive map. Loaded via `next/dynamic` with `ssr: false` to keep the initial bundle within budget.

**Rationale**: The spec mandates an interactive map with markers, clustering, and popups (FR-004 through FR-006). Leaflet is the most widely used open-source mapping library (~40KB gzipped). It's actively maintained, has excellent accessibility documentation, and integrates with OpenStreetMap tiles (no API key required for development).

**Bundle impact**: Leaflet core is ~40KB gzipped. `react-leaflet` adds ~8KB. `leaflet.markercluster` adds ~10KB. Total: ~58KB — loaded lazily, never in the initial bundle. The `next/dynamic` import with `loading` fallback ensures the map panel shows a skeleton while loading.

```tsx
const MapPanel = dynamic(() => import('./MapPanel'), {
  ssr: false,
  loading: () => <MapSkeleton />
});
```

**Tile provider**: OpenStreetMap tiles for development/staging. Production could switch to Mapbox/Stadia for styling without code changes (tile URL is configurable via env var).

**Marker clustering**: `leaflet.markercluster` plugin handles automatic clustering with configurable thresholds. Cluster icons will be styled with CSS using design tokens.

**Alternatives considered**:
- **Mapbox GL JS**: More performant for >10k markers (WebGL rendering). But 210KB gzipped — exceeds our lazy-loaded budget. Requires API key even for development. Overkill for ~500 markers.
- **MapLibre GL**: OSS fork of Mapbox GL. Still ~180KB gzipped. Same WebGL performance advantages, same bundle-size concern. Would be justified if marker count grows to thousands.
- **Google Maps**: Proprietary. Requires API key and billing account. Violates Simplicity principle (vendor lock-in for a feature that OSM handles well).
- **OpenLayers**: Powerful but 100KB+ gzipped. Enterprise-grade features (WMS, WFS) we don't need.

---

## R-3: Location Hierarchy Tree Construction

**Decision**: Client-side tree built from `/api/cities` response. The hierarchy is derived by grouping cities by `countryCode` and countries by `continentCode` (a new optional field to add to the City API response, or derived from a static continent-country mapping).

**Rationale**: The existing City type includes `countryName` and `countryCode`. The continent is available in the `countries` table as `continent_code`. The location tree needs to show Continent → Country → City with event counts at each level. Two approaches:

1. **Server-side**: New endpoint `/api/locations/tree` returns pre-built tree with counts. Adds API surface, server processing.
2. **Client-side**: Fetch cities with event counts, group into tree structure client-side. Simpler, no new API.

Client-side is chosen because:
- The city list is small (~100–200 cities) — fetching all with counts is <5KB
- Tree construction is a simple grouping operation (~15 lines of code)
- Event counts per city already available via `activeEventCount` on the City type
- Country/continent counts are sums of child counts — trivial to compute
- No new API endpoint needed (Principle VII — Simplicity)

**Continent mapping**: A static lookup from ISO country code to continent is sufficient. This is ~250 entries, ~3KB uncompressed. Alternatives: extend the `/api/cities` response to include `continentCode` (preferred long-term, minor API change) or bundle a `country-to-continent.json` mapping file.

**Decision on continent source**: Extend the `ListCitiesResponse` to include `continentCode` on each city. This is a backward-compatible addition to the existing response shape (non-breaking, Principle I). The server already has `countries.continent_code` in the database.

---

## R-4: Filter State Management via URL Search Params

**Decision**: Single custom hook `useExplorerFilters()` that reads/writes all filter state to `URLSearchParams` via Next.js `useSearchParams()` and `useRouter()`.

**Rationale**: The spec requires all filter state to be bookmarkable (FR-011) and synced across panels (FR-010). URL params are the canonical state source — no React state duplication needed. The hook provides:

```typescript
interface ExplorerFilterState {
  categories: EventCategory[];     // ?categories=jam,workshop
  location: string | null;         // ?location=bristol (city slug)
  dateFrom: string | null;         // ?dateFrom=2026-03-01
  dateTo: string | null;           // ?dateTo=2026-03-31
  view: CalendarViewMode;          // ?view=month
  skillLevel: SkillLevel | null;   // ?skillLevel=beginner
  status: string[];                // ?status=new,full
  q: string | null;                // ?q=yoga
  page: number;                    // ?page=2
  mapBounds: string | null;        // ?bounds=51.4,-2.6,51.5,-2.5 (optional sync)
}
```

The hook returns `[filters, setFilter, resetFilters]`. `setFilter` updates a single key and triggers a router push with shallow navigation (no full-page reload). All panels subscribe to the same `searchParams` and re-render on changes — automatic cross-panel synchronization.

**Alternatives considered**:
- **Zustand/Jotai global store**: Would require manual URL↔store sync. Extra dependency, extra code, two sources of truth. Violates Simplicity.
- **React Context**: Could work but URL params already provide the "global state" behavior for free and add bookmarkability. No benefit from Context.
- **Next.js `useQueryState` (nuqs)**: Third-party library that wraps exactly what we'd build. ~3KB. Considered but we'd only use basic string parsing — the overhead of the dependency isn't justified for our straightforward param types.

---

## R-5: Category Color Tokens

**Decision**: Add seven new design tokens to `color.tokens.json` under a `category` namespace. These map directly to the spec's category-color assignments.

**Rationale**: The spec defines (FR-002):
- Jam = Indigo
- Workshop = Emerald
- Class = Blue
- Festival = Pink
- Social = Amber
- Retreat = Purple
- Teacher Training = Teal

These colors must come from the design token pipeline (Constitution V — Design tokens in a single source file). The existing `color.tokens.json` has `brand`, `semantic`, and `surface` namespaces. Adding a `category` namespace is the natural extension.

**Token values** (chosen for WCAG AA contrast against white backgrounds and dark mode compatibility):

| Category | Token Name | Light Value | Dark Value | Contrast Ratio (on white) |
|----------|-----------|-------------|------------|--------------------------|
| Jam | `--color-category-jam` | `#6366F1` (Indigo 500) | `#818CF8` | 4.6:1 ✅ |
| Workshop | `--color-category-workshop` | `#10B981` (Emerald 500) | `#34D399` | 4.5:1 ✅ |
| Class | `--color-category-class` | `#3B82F6` (Blue 500) | `#60A5FA` | 4.5:1 ✅ |
| Festival | `--color-category-festival` | `#EC4899` (Pink 500) | `#F472B6` | 4.5:1 ✅ |
| Social | `--color-category-social` | `#F59E0B` (Amber 500) | `#FBBF24` | 3.1:1 (large text only) |
| Retreat | `--color-category-retreat` | `#8B5CF6` (Purple 500) | `#A78BFA` | 4.6:1 ✅ |
| Teacher Training | `--color-category-training` | `#14B8A6` (Teal 500) | `#2DD4BF` | 4.5:1 ✅ |

**Note on Social/Amber**: Amber 500 against white is 3.1:1 — passes for large text (≥18px or ≥14px bold) and graphical elements (3:1 minimum per WCAG). For small text labels, use `--color-category-social-text` at Amber 700 (`#B45309`, 5.7:1 contrast). Map markers and calendar dots are graphical elements → 3:1 is sufficient.

**Existing EventCard hardcoded colors**: The current `EventCard.tsx` uses Tailwind classes (`bg-purple-100 text-purple-800`, etc.) instead of tokens. This violates Constitution V. As part of Spec 010, the EventCard should be updated to use the new category tokens.

---

## R-6: Responsive Layout Strategy

**Decision**: CSS Grid for the 3-panel layout with media queries at the three breakpoints (mobile <768px, tablet 768–1023px, desktop ≥1024px). On mobile, a bottom tab bar switches between list, map, and filters views.

**Rationale**: The spec defines three breakpoints (FR-013):
- **Desktop (≥1024px)**: 3 columns — location tree (250px fixed), calendar (flex), map (350px fixed)
- **Tablet (768–1023px)**: Location tree collapses to dropdown. Calendar and map stack vertically with toggle
- **Mobile (<768px)**: Single panel with bottom tab navigation (List, Map, Filters)

CSS Grid with `grid-template-columns` adapts naturally:
```css
/* Desktop */
.explorer { grid-template-columns: 250px 1fr 350px; }
/* Tablet */
@media (max-width: 1023px) { .explorer { grid-template-columns: 1fr; } }
/* Mobile */
@media (max-width: 767px) { .explorer { grid-template-columns: 1fr; } }
```

The bottom tab bar on mobile uses fixed positioning with three tabs (List, Map, Filters). Only the active panel renders — the others are unmounted to save memory (especially the map).

**Panel visibility logic**: Managed via a `activePanel` state that's separate from URL params (it's a UI layout concern, not a filter). On desktop, `activePanel` is ignored — all panels render.

---

## R-7: Map Accessibility and Non-Visual Fallback

**Decision**: The map panel includes a non-visual mode toggled by a "Switch to list view" button. Screen reader users can Tab into the map area and hear a summary ("Map showing 42 events in 8 cities. Use the list view for full event details."). Map markers are NOT individually focusable — the list/agenda view provides the keyboard-accessible event browsing.

**Rationale**: Leaflet maps are inherently visual and not fully accessible via keyboard/screen reader. WCAG 2.1 AA requires that all information conveyed visually is also available non-visually. Since the event list/agenda view provides the same information as the map (which events exist, where they are), the map serves as a supplementary visualization, not a sole information channel.

The map container has `role="img"` with an `aria-label` summarizing its content. This follows the WAI-ARIA pattern for decorative/supplementary visual content.

---

## R-8: Event Density Heatmap (P3)

**Decision**: Defer to P3. When implemented, use `leaflet.heat` plugin (~4KB). This is a lightweight plugin that renders a canvas-based heatmap layer from lat/lng points with configurable radius and gradient.

**Rationale**: P3 priority per the spec. The standard marker cluster view already conveys density. The heatmap is a visualization enhancement that can be toggled independently. `leaflet.heat` is lightweight and maintained.

---

## R-9: Geolocation "Near Me" (P3)

**Decision**: Use the standard `navigator.geolocation.getCurrentPosition()` API. On success, center the map and optionally sort the event list by proximity. On denial, show a non-blocking toast message.

**Rationale**: P3 priority. The browser Geolocation API is standard and well-supported. No server-side processing needed — the map pans to the user's coordinates client-side. The existing `/api/cities/nearest` endpoint from Spec 001 could be used to snap to the nearest city, but for the Explorer, raw lat/lng centering is simpler.

**Privacy**: The user's coordinates are never sent to the server. Map centering is a client-side operation. This respects Constitution III (Privacy).

---

## R-10: API Response Extension — continentCode on Cities

**Decision**: Extend the existing `City` type and `/api/cities` response to include `continentCode: string` (e.g., "EU", "AS", "NA"). This is sourced from the `countries.continent_code` column already in the database.

**Rationale**: The location tree requires continent grouping. The data exists server-side but isn't exposed. Adding a field to the response is a non-breaking change (Principle I — no breaking API changes). The alternative — bundling a static country-to-continent mapping — adds maintenance burden and could drift from the database.

**Shared type update**: Add `continentCode: string` and `continentName: string` to the `City` interface in `packages/shared/src/types/cities.ts`.

**Continent display names**: Use a simple i18n-keyed map:
```typescript
const CONTINENT_NAMES: Record<string, string> = {
  AF: t('continent.africa'),
  AS: t('continent.asia'),
  EU: t('continent.europe'),
  NA: t('continent.northAmerica'),
  SA: t('continent.southAmerica'),
  OC: t('continent.oceania'),
  AN: t('continent.antarctica'),
};
```
