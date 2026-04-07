# Implementation Plan: SEO & Social Sharing

**Branch**: `017-seo-social-sharing` | **Date**: 2026-04-29 | **Spec**: [specs/017-seo-social-sharing/spec.md](spec.md)
**Input**: Feature specification from `/specs/017-seo-social-sharing/spec.md`
**Status**: Draft

## Summary

Add full SEO and social-sharing capabilities to the AcroYoga Community platform across all public
pages. The implementation uses exclusively built-in Next.js 16 App Router primitives — zero new
dependencies. Six complementary areas are addressed:

1. **Dynamic OG metadata** via `generateMetadata()` on every public server component page
2. **Branded sharing images** (1200 × 630 px) via `next/og` `ImageResponse` route handlers
3. **JSON-LD structured data** (Schema.org `Event` + `Person`) embedded in page `<head>` via inline `<script>`
4. **XML sitemap** and **robots.txt** via App Router `sitemap.ts` / `robots.ts` conventions
5. **Canonical tags** emitted through `generateMetadata()` (self-referential — locale is non-prefixed)
6. **Share panel** client component with copy-link, Web Share API, Twitter/X, WhatsApp, UTM attribution

Two existing files are extended: `apps/web/src/lib/events/share.ts` (add teacher and list-page variants)
and `apps/web/src/app/api/events/[id]/share/route.ts` (add structured data and locale to response).
The teacher page (`/teachers/[id]/page.tsx`) is refactored from a single "use client" component into
a server-component wrapper + extracted client component, enabling `generateMetadata()`.

---

## Technical Context

**Language/Version**: TypeScript 5.9 strict mode, React 19, Next.js 16 (App Router)
**Primary Dependencies**: `next/og` (built-in), `generateMetadata` (built-in), App Router `sitemap.ts` / `robots.ts` conventions (built-in) — **no new npm packages**
**Storage**: PostgreSQL — no new tables; all OG/JSON-LD/sitemap data is computed at render time from existing `events` and `teacher_profiles` tables
**Testing**: Vitest + PGlite; integration tests for sitemap content and noindex enforcement; E2E tests for share panel interactions
**Target Platform**: Web (Next.js server components + edge-compatible route handlers)
**Project Type**: Web application feature (SEO + client component)
**Performance Goals**: OG image served ≤ 2 s from cold cache; `generateMetadata()` adds ≤ 10 ms to TTFB (single DB read); share panel JS ≤ 5 KB gzip
**Constraints**: Initial JS bundle MUST remain ≤ 200 KB compressed; `SharePanel` must be lazy-loaded (`next/dynamic`) to avoid adding to initial bundle; `next/og` route handlers are server-only and add zero client bytes
**Scale/Scope**: ~500 public events, ~200 teacher profiles at launch; sitemap splits at 50,000 URLs (FR-013)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked post-design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. API-First Design | ✅ PASS | New routes: `GET /api/og/events/[id]` and `GET /api/og/teachers/[id]` (image generation); extended `GET /api/events/[id]/share` response shape; sitemap served at `/sitemap.xml` via Next.js convention. Types defined in `contracts/seo-meta.ts` |
| II. Test-First Development | ✅ PASS | Integration tests: sitemap excludes draft events; noindex on private pages; OG metadata rendered correctly; share URL UTM params. E2E: share panel copy + native share + fallback |
| III. Privacy & Data Protection | ✅ PASS | Draft/private events: `noindex, nofollow` + excluded from sitemap. OG metadata only for public resources. No PII beyond what already exists on public profiles |
| IV. Server-Side Authority | ✅ PASS | All OG/JSON-LD generated server-side in `generateMetadata()`. Privacy enforcement (noindex, sitemap exclusion) is server-side only. Share URL constructed client-side only for UTM convenience (not a security boundary) |
| V. UX Consistency | ✅ PASS | `SharePanel` follows design-system tokens; keyboard-navigable (focusable buttons, Escape to dismiss); WCAG 2.1 AA contrast; minimum 44 × 44 px touch targets |
| VI. Performance Budget | ✅ PASS | `next/og` is server-side — zero client bundle impact. `SharePanel` is lazy-loaded with `next/dynamic`. OG image served with `Cache-Control: public, max-age=86400, stale-while-revalidate`. Sitemap cached 1 hour via `revalidate = 3600` |
| VII. Simplicity | ✅ PASS | No new npm dependencies. All functionality uses Next.js 16 built-ins. `getShareMeta()` extended in-place. Teacher page split is minimal — server wrapper + export of existing JSX as named export |
| VIII. Internationalisation | ✅ PASS | `generateMetadata()` reads active locale via `getLocale()`. OG description falls back to `en` values when a translation key is missing. Sitemap includes `hreflang` entries for all three locales pointing to the same non-prefixed URL (locale is cookie/header negotiated, not path-prefixed — confirmed in research.md) |
| IX. Scoped Permissions | N/A | No auth-gated mutations. Visibility logic (draft → noindex/sitemap-excluded) is read-side only |
| X. Notification Architecture | N/A | No notifications involved |
| XI. Resource Ownership | N/A | No mutations to resources |
| XII. Financial Integrity | N/A | No financial operations |
| QG-5: Bundle ≤ 200 KB | ✅ PASS | `next/og` is server-only. `SharePanel` is dynamically imported. No new heavy client libraries |
| QG-10: Permission Smoke Test | N/A | No new mutation endpoints requiring auth |

**Gate result: PASS — no violations.**

---

## Project Structure

### Documentation

```text
specs/017-seo-social-sharing/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 — locale routing strategy, next/og patterns, JSON-LD schema
├── data-model.md        # Phase 1 — computed entity shapes (OGMetadata, StructuredData, SitemapEntry)
├── quickstart.md        # Phase 1 — local validation guide (Rich Results Test, OG debugger)
└── contracts/
    └── seo-meta.ts      # Phase 1 — TypeScript types for all SEO/OG/sitemap API contracts
```

### Source Code

```text
apps/web/src/
├── app/
│   ├── sitemap.ts                                   # NEW — /sitemap.xml via App Router convention
│   ├── robots.ts                                    # NEW — /robots.txt via App Router convention
│   ├── events/
│   │   └── [id]/
│   │       └── page.tsx                             # MODIFY — add generateMetadata() export
│   ├── teachers/
│   │   └── [id]/
│   │       ├── page.tsx                             # MODIFY — convert to server wrapper, add generateMetadata()
│   │       └── TeacherProfileClient.tsx             # NEW — extracted client component (existing JSX)
│   └── api/
│       ├── og/
│       │   ├── events/
│       │   │   └── [id]/
│       │   │       └── route.tsx                    # NEW — GET /api/og/events/[id] → 1200×630 image
│       │   └── teachers/
│       │       └── [id]/
│       │           └── route.tsx                    # NEW — GET /api/og/teachers/[id] → 1200×630 image
│       └── events/
│           └── [id]/
│               └── share/
│                   └── route.ts                     # MODIFY — add locale, structuredData fields to response
├── components/
│   ├── SharePanel.tsx                               # NEW — share buttons with UTM, Web Share API
│   └── SharePanelLoader.tsx                         # NEW — next/dynamic wrapper for lazy loading
├── lib/
│   ├── events/
│   │   └── share.ts                                 # MODIFY — extend getShareMeta() with teacher variant
│   └── seo/
│       ├── metadata.ts                              # NEW — buildEventMetadata(), buildTeacherMetadata()
│       ├── structured-data.ts                       # NEW — buildEventJsonLd(), buildTeacherJsonLd()
│       └── sitemap.ts                               # NEW — getSitemapEvents(), getSitemapTeachers()
└── app/
    └── events/
        └── [id]/
            └── EventJsonLd.tsx                      # NEW — server component that renders <script ld+json>

packages/shared/src/types/
└── seo.ts                                           # NEW — OGMetadata, ShareMeta (extended), SitemapEntry types
```

---

## Complexity Tracking

> No constitution violations requiring justification.

---

## Phase Breakdown

### Phase 1: OG Metadata & `generateMetadata()`

Extend `lib/events/share.ts` with a `getTeacherShareMeta()` function mirroring `getShareMeta()`.
Create `lib/seo/metadata.ts` with `buildEventMetadata()` and `buildTeacherMetadata()` helpers that
return Next.js `Metadata` objects. Add `export async function generateMetadata()` to both page files.
The event page is already a server component — metadata added directly. The teacher page is converted
from a single "use client" file into a server wrapper (`page.tsx`) + named client export
(`TeacherProfileClient.tsx`).

**Output**: All public event and teacher pages emit correct `og:*`, `twitter:*`, and `<title>` tags.

### Phase 2: OG Image Generation

Create `app/api/og/events/[id]/route.tsx` and `app/api/og/teachers/[id]/route.tsx` using
`ImageResponse` from `next/og`. Event template: branded background, AcroYoga logo (SVG inlined),
event title (truncated at 70 chars), date, city, price/free badge. Teacher template: avatar (or
placeholder), name, "AcroYoga Teacher" label. Both routes: set `Cache-Control: public, max-age=86400,
stale-while-revalidate=3600`. Draft/private events return HTTP 404.

**Output**: `og:image` URLs resolve to correctly sized (1200 × 630) branded images.

### Phase 3: JSON-LD Structured Data

Create `lib/seo/structured-data.ts` with `buildEventJsonLd()` (Schema.org `Event`) and
`buildTeacherJsonLd()` (Schema.org `Person`). Add a `EventJsonLd` server component that renders
`<script type="application/ld+json">` into the event page `<head>` via `layout.tsx` or direct
inclusion. Same pattern for teacher profiles. Draft/private events: emit no structured data.

**Output**: All published event and teacher pages pass Google Rich Results Test with zero errors.

### Phase 4: Sitemap & robots.txt

Create `app/sitemap.ts` using the App Router `MetadataRoute.Sitemap` return type. Query
`getSitemapEvents()` and `getSitemapTeachers()` from `lib/seo/sitemap.ts`. Each entry includes `url`,
`lastModified`, and `alternates.languages` (hreflang for `en`, `es`, `ar` and `x-default`, all
pointing to the same non-prefixed URL). Add `export const revalidate = 3600` for 1-hour caching.
Create `app/robots.ts` returning `allow: '/'` with sitemap pointer. Draft events filtered server-side.
Automatic sub-sitemap splitting when count > 50,000 (FR-013).

**Output**: `/sitemap.xml` valid, accepted by Google Search Console. `/robots.txt` correct.

### Phase 5: Canonical Tags

Add `alternates.canonical` to every `generateMetadata()` call, pointing to the absolute default-locale
URL (e.g., `${BASE_URL}/events/${id}`). For the root `/events` list, canonical = `/events` (no
pagination variant). This is self-referential since locale routing is non-prefixed. Add
`alternates.languages` to `generateMetadata()` output (same values as sitemap hreflang).

**Output**: Every public page has exactly one canonical tag; audit passes with zero missing/duplicate
canonicals.

### Phase 6: Share Panel (US6)

Create `components/SharePanel.tsx` as a client component:
- "Copy Link" button: uses `navigator.clipboard.writeText()` with `document.execCommand('copy')`
  fallback; shows a toast on success
- "Share" button: shown only when `navigator.share` is available; calls `navigator.share({ title, url })`
- "Twitter/X" button: opens `https://x.com/intent/tweet?text=...&url=...` with UTM params
- "WhatsApp" button: opens `https://wa.me/?text=...` with UTM params
- All UTM params: `utm_source`, `utm_medium=social`, `utm_campaign=event-share`
- Keyboard navigable; Escape closes the panel; ARIA roles; WCAG AA contrast

Create `SharePanelLoader.tsx` using `next/dynamic(() => import('./SharePanel'), { ssr: false })` and
drop it into the event detail page (after the server component renders).

Extend the existing `GET /api/events/[id]/share` response to include `shareUrl` (canonical URL,
no UTM — UTM appended client-side) for the panel to use.

**Output**: Share panel works on mobile and desktop; all buttons functional; UTM params present in
all shared URLs; axe-core reports zero violations.

### Phase 7: Integration, Tests & Polish

- **Integration tests** (`apps/web/tests/integration/`):
  - `sitemap.test.ts`: published event appears; draft event absent; teacher profile appears
  - `seo-noindex.test.ts`: draft event page returns `noindex` directive; not in sitemap
  - `share-meta.test.ts`: `getShareMeta()` and `getTeacherShareMeta()` return correct fields
  - `og-image.test.ts`: OG image routes return 200 for published, 404 for draft
- **E2E tests** (Playwright):
  - Share panel: copy link copies to clipboard with UTM; Web Share API called on mobile viewport;
    Twitter/X and WhatsApp links include UTM; panel keyboard navigable (Tab, Escape)
  - Canonical tag present in event page head
  - JSON-LD present and parseable in event page head
- **Update `packages/shared/src/types/seo.ts`** with canonical types
- **Update `packages/shared/src/types/index.ts`** to export new SEO types
- Final axe-core scan on SharePanel; confirm zero violations
