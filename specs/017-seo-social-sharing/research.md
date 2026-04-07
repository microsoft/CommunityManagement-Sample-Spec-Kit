# Research: SEO & Social Sharing

**Spec**: 017 | **Date**: 2026-04-29 | **Plan**: [plan.md](plan.md)

This document resolves all NEEDS CLARIFICATION items identified during Technical Context analysis
and records best-practice decisions for each technology area.

---

## 1. Locale Routing Strategy (Critical Finding)

**Question**: The spec references locale-prefixed URLs (`/en/events/123`, `/es/events/123`) for
hreflang and canonical tags. What is the actual URL structure after Spec 014?

**Finding**: Spec 014 implemented **non-prefixed locale routing** using `next-intl` with cookie and
`Accept-Language` header negotiation. The routing configuration in
`apps/web/src/i18n/routing.ts` uses `defineRouting({ locales: ['en','es','ar'], defaultLocale: 'en' })`
with no path prefix. All locales share the same URL (e.g., `/events/123` serves English, Spanish,
and Arabic depending on the client's cookie or header).

**Decision**: Canonical tags are **self-referential** — the canonical URL is the page's own URL since
there are no locale-variant URLs to deduplicate. hreflang entries in the sitemap point to the same
non-prefixed URL for all locales (`x-default`, `en`, `es`, `ar` all resolve to the same href).

**Alternatives considered**:
- *Locale-prefixed routing (rejected)*: Would require migrating all existing pages and links; not
  within scope of Spec 017 and not what Spec 014 implemented.
- *Skipping hreflang entirely (rejected)*: FR-012 requires hreflang. Including same-URL hreflang
  is technically valid and signals locale awareness to crawlers even without path distinction.

**Impact on spec requirements**:
- FR-014 / FR-015: Canonical is always self-referential; `<link rel="canonical" href="[SAME_URL]">`.
- FR-012: Sitemap includes `alternates.languages` pointing to the same URL for each locale.
- US4 Scenario 4 ("Given multiple locale variants of a page … each listed with correct hreflang"):
  Fulfilled by same-URL hreflang entries — this is valid per [RFC 5988](https://tools.ietf.org/html/rfc5988)
  and accepted by Google.

---

## 2. Next.js 16 `generateMetadata()` with `next-intl`

**Question**: How does `generateMetadata()` access the active locale in a non-prefixed i18n setup?

**Decision**: Use `getLocale()` from `next-intl/server` inside `generateMetadata()`. This is the
same pattern used by server components throughout the codebase (e.g., `apps/web/src/app/layout.tsx`).

**Pattern** (confirmed working from codebase):
```typescript
import { getLocale } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();           // reads cookie / Accept-Language
  const event = await getEventById(id);
  if (!event) return {};
  return buildEventMetadata(event, locale);
}
```

**Alternatives considered**:
- *Reading locale from params (rejected)*: Only works with prefix-routing; not applicable here.
- *Using `useLocale()` hook (rejected)*: Client-side only; `generateMetadata()` is server-side.

---

## 3. OG Image Generation: `next/og` `ImageResponse`

**Question**: Is `next/og` available in Next.js 16 without adding a dependency? What are the
rendering constraints?

**Decision**: `next/og` ships with Next.js and exports `ImageResponse`. It runs in the Edge
runtime and uses a subset of CSS (flex layout, no grid). The output is a PNG or JPEG served from
a standard route handler.

**Key constraints and mitigations**:
| Constraint | Mitigation |
|---|---|
| Only flex/absolute positioning (no CSS grid) | Use flex column layout for event template |
| Custom fonts must be fetched as ArrayBuffer from `next/dist/compiled/@vercel/og/satori` | Load fonts from `public/fonts/` at startup (cached in module scope) |
| Image URLs must be absolute | Pass `${BASE_URL}/api/og/events/[id]` in og:image |
| Dynamic params must be awaited (Next.js 16 change) | `const { id } = await params;` |
| No `crypto.randomUUID()` in Edge runtime | Not needed for image generation |

**Caching strategy**: Set `Cache-Control: public, max-age=86400, stale-while-revalidate=3600`.
When an event is updated, the old cache entry is naturally invalidated after 24 hours. The spec
allows up to 24-hour staleness (Assumption 5). For immediate invalidation, the OG image URL can
include a cache-busting query parameter (`?v=${updatedAt.getTime()}`), which `generateMetadata()`
sets in `og:image`.

**Alternatives considered**:
- *Puppeteer/Playwright screenshot (rejected)*: Heavy dependency, too slow for cold renders.
- *Pre-generated static images (rejected)*: Events are dynamic; title/date change; not feasible.
- *Sharp for server-side image composition (rejected)*: More complex than `next/og`; native-module
  issues in Edge runtime.

---

## 4. JSON-LD Structured Data Injection

**Question**: What is the correct mechanism to inject JSON-LD into the Next.js 16 App Router `<head>`?

**Decision**: Render a `<script type="application/ld+json">` element directly inside the page
component JSX, placed as a sibling of the main content. Next.js App Router moves elements with
`dangerouslySetInnerHTML` into the document `<head>` when the element is a `<script>` with a
specific type — but for reliability, inject it inside a `<>` fragment at the top of the page's
return, which Next.js renders in `<head>` by [App Router convention](https://nextjs.org/docs/app/building-your-application/optimizing/metadata#json-ld).

**Correct pattern** (Next.js docs recommended):
```tsx
// In the page server component:
export default async function EventPage({ params }) {
  const event = await getEventById((await params).id);
  const jsonLd = buildEventJsonLd(event);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <EventDetailPageClient event={event} />
    </>
  );
}
```

> Note: `dangerouslySetInnerHTML` is safe here because `JSON.stringify` escapes special characters
> (angle brackets, quotes) in string values. The `buildEventJsonLd()` function only accesses
> server-fetched database values — no user-controlled strings are unserialized.

**Alternatives considered**:
- *`generateMetadata()` `other` field with `script:ld+json` key (rejected)*: Undocumented, brittle.
- *Custom `<Head>` component (rejected)*: App Router does not use `next/head`; that's Pages Router.

---

## 5. Sitemap Generation: App Router `sitemap.ts` Convention

**Question**: How does the App Router `sitemap.ts` convention work at scale, and does it support
`hreflang`?

**Decision**: Place `apps/web/src/app/sitemap.ts` exporting a default async function returning
`MetadataRoute.Sitemap`. Next.js serialises this to `/sitemap.xml`. For `hreflang`, include
`alternates.languages` in each entry (supported in Next.js 14.2+, available in Next.js 16).

**Pattern**:
```typescript
import type { MetadataRoute } from 'next';
export const revalidate = 3600;   // 1-hour ISR cache

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await getSitemapEvents();           // only published events
  const teachers = await getSitemapTeachers();

  const locales = ['en', 'es', 'ar'] as const;

  return [
    ...events.map(e => ({
      url: `${BASE_URL}/events/${e.id}`,
      lastModified: e.updatedAt,
      alternates: {
        languages: Object.fromEntries(
          locales.map(lang => [lang, `${BASE_URL}/events/${e.id}`])
        ),
      },
    })),
    // ... teachers, static pages
  ];
}
```

**Scale (FR-013)**: For > 50,000 URLs, Next.js App Router supports [sitemap splitting](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap#generating-multiple-sitemaps)
by creating `app/sitemap/[id]/route.ts`. The implementation detects total URL count and conditionally
switches to the indexed format; the threshold is 49,000 to leave headroom.

**Alternatives considered**:
- *Manual XML string generation (rejected)*: Error-prone escaping; no type safety; more code.
- *`next-sitemap` package (rejected)*: External dependency; Principle VII disallows adding deps for
  functionality achievable in < 200 lines with built-ins.

---

## 6. Share Panel: Web Share API + UTM Construction

**Question**: What is the fallback strategy for the Web Share API, and how should UTM parameters
be appended without duplicating existing query strings?

**Decision**:
- Feature-detect `navigator.share` at click time (not at render time) to avoid hydration mismatches.
- UTM params are appended using `URL` and `URLSearchParams` — this handles existing query params
  correctly (no duplication, no breakage).
- Clipboard fallback: try `navigator.clipboard.writeText()` first; if unavailable (HTTP or old browser),
  select text in a visually hidden `<input>` and call `document.execCommand('copy')`.

**UTM construction**:
```typescript
function buildShareUrl(baseUrl: string, source: 'twitter' | 'whatsapp' | 'clipboard' | 'native') {
  const url = new URL(baseUrl);
  url.searchParams.set('utm_source', source);
  url.searchParams.set('utm_medium', source === 'clipboard' ? 'referral' : 'social');
  url.searchParams.set('utm_campaign', 'event-share');
  return url.toString();
}
```

**Panel lazy loading**: `SharePanel` is imported via `next/dynamic` with `ssr: false` so it is
excluded from the server-rendered HTML and loaded only when the event detail page JavaScript
hydrates. This keeps the initial bundle within the 200 KB limit (Principle VI / QG-5).

**Alternatives considered**:
- *SSR the panel (rejected)*: Web Share API is client-only; SSR would cause hydration errors.
- *Separate bundle chunk (rejected)*: `next/dynamic` achieves this automatically.

---

## 7. Teacher Page Refactoring Strategy

**Question**: The teacher detail page is currently a single `"use client"` component. How should
it be refactored to support `generateMetadata()` with minimal disruption?

**Decision**: Split into two files:
1. `app/teachers/[id]/page.tsx` — server component. Exports `generateMetadata()` and a default
   export that renders `<script ld+json>` + `<TeacherProfileClient id={id} />`.
2. `app/teachers/[id]/TeacherProfileClient.tsx` — the existing JSX renamed and with `"use client"`.

The refactor is mechanical — the client component retains all its existing `useEffect` / `useState`
logic. No business logic changes. The server component only fetches metadata (one DB read via
`getTeacherShareMeta()`); the client component fetches full profile data as before.

**Alternatives considered**:
- *Convert teacher page to full server component (rejected)*: Would require removing all interactive
  state; out of scope for this spec; risks breaking existing functionality.
- *Use route metadata file (`[id]/metadata.ts`) (rejected)*: Not a Next.js convention; `generateMetadata()`
  must be a named export from `page.tsx`.

---

## 8. robots.txt Strategy

**Decision**: Create `apps/web/src/app/robots.ts` using the `MetadataRoute.Robots` return type:

```typescript
import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${process.env.NEXT_PUBLIC_BASE_URL}/sitemap.xml`,
  };
}
```

No rules disallow crawling admin or API routes — those are protected by auth middleware and return
403 to unauthenticated crawlers. Draft event pages return 200 with `noindex` (FR-009) rather than
403/404 to preserve any existing links.

---

## Summary of Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Locale URL strategy | Non-prefixed; canonical = self-referential | Matches Spec 014 implementation |
| hreflang in sitemap | Same URL for all locales, all three listed | Signals locale awareness; valid per spec |
| OG metadata injection | `generateMetadata()` in server component page files | Next.js built-in; zero bundle cost |
| OG image generation | `next/og` `ImageResponse` route handler | Built-in; edge-compatible; zero new deps |
| JSON-LD injection | `<script dangerouslySetInnerHTML>` in server component JSX | Next.js recommended pattern |
| Sitemap | `app/sitemap.ts` with `revalidate = 3600` | Built-in; type-safe; 1-hour cache |
| robots.txt | `app/robots.ts` built-in convention | One file, zero config |
| Share panel loading | `next/dynamic` with `ssr: false` | Prevents Web Share API SSR issues; lazy bundle |
| UTM construction | `new URL()` + `URLSearchParams` | Handles existing params; no custom parsing |
| Teacher page | Split server wrapper + client component | Minimal change; preserves existing UX |
| OG image cache busting | `?v=${updatedAt.getTime()}` in og:image URL | 24-hour CDN cache; immediate on update |
