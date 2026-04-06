# Quickstart: SEO & Social Sharing — Developer Guide

**Spec**: 017 | **Date**: 2026-04-29

This guide explains how to validate, test, and extend the SEO & Social Sharing implementation
locally. No new tools need to be installed — all validation uses built-in Next.js conventions
and free online tools.

---

## Local Development Setup

No additional environment variables are required beyond what already exists. Confirm these are
set in your `.env.local` or root `.env`:

```bash
NEXT_PUBLIC_BASE_URL=http://localhost:3000   # used for og:image and canonical URL construction
```

Start the dev server as normal:

```bash
cd apps/web
npm run dev
```

---

## 1. Validating OG Metadata Locally

### Inspect raw HTML

```bash
curl -s http://localhost:3000/events/<EVENT_ID> | grep -A1 'og:'
```

You should see tags like:

```html
<meta property="og:title" content="AcroYoga Flow Workshop" />
<meta property="og:description" content="..." />
<meta property="og:image" content="http://localhost:3000/api/og/events/<EVENT_ID>?v=..." />
<meta property="og:url" content="http://localhost:3000/events/<EVENT_ID>" />
<meta property="og:type" content="event" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="canonical" href="http://localhost:3000/events/<EVENT_ID>" />
```

### View the OG image

Open in your browser:

```
http://localhost:3000/api/og/events/<EVENT_ID>
http://localhost:3000/api/og/teachers/<TEACHER_ID>
```

The image should render at 1200 × 630 px with the branded template.

### Verify draft events are excluded

```bash
# Create a draft event via admin UI, then:
curl -s http://localhost:3000/events/<DRAFT_EVENT_ID> | grep 'robots'
# Expected: <meta name="robots" content="noindex, nofollow" />

curl -s http://localhost:3000/api/og/events/<DRAFT_EVENT_ID> -o /dev/null -w "%{http_code}"
# Expected: 404
```

---

## 2. Validating JSON-LD Structured Data

### Inspect in browser

Open DevTools → Elements → search for `application/ld+json`:

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "AcroYoga Flow Workshop",
  "startDate": "2026-05-15T19:00:00Z",
  "location": { "@type": "Place", "name": "The Yoga Studio", ... },
  ...
}
```

### Validate with Google Rich Results Test

1. Start a localhost tunnel (e.g., `npx localtunnel --port 3000`)
2. Submit your tunnel URL to https://search.google.com/test/rich-results
3. Confirm: ✅ "Event" rich result detected, no errors

### Validate with Schema.org Validator

Paste the JSON-LD output into https://validator.schema.org/ — confirm no errors.

### Run the automated test

```bash
cd apps/web
npx vitest run tests/integration/seo-structured-data.test.ts
```

---

## 3. Validating the Sitemap

### Fetch locally

```bash
curl http://localhost:3000/sitemap.xml | head -80
```

Expected response: valid XML with `<urlset>` root, `<url>` entries containing `<loc>`,
`<lastmod>`, and `<xhtml:link rel="alternate" hreflang="...">`.

### Verify draft events absent

```bash
DRAFT_ID="<your-draft-event-id>"
curl http://localhost:3000/sitemap.xml | grep "$DRAFT_ID"
# Expected: no output
```

### Run the integration test

```bash
cd apps/web
npx vitest run tests/integration/sitemap.test.ts
```

---

## 4. Validating robots.txt

```bash
curl http://localhost:3000/robots.txt
```

Expected output:

```
User-Agent: *
Allow: /

Sitemap: http://localhost:3000/sitemap.xml
```

---

## 5. Testing the Share Panel

### Manual browser test (desktop)

1. Navigate to any published event detail page
2. Click the "Share" button
3. Verify the panel opens with: Copy Link, Twitter/X, WhatsApp options
4. Verify "Share" (native) button is hidden on desktop Chrome
5. Click "Copy Link" — confirm clipboard contains the URL with UTM params:
   `?utm_source=clipboard&utm_medium=referral&utm_campaign=event-share`

### Manual browser test (mobile)

1. In Chrome DevTools, switch to a mobile device profile
2. Reload the event detail page
3. Click "Share" — verify the native device share sheet opens

### Keyboard accessibility test

1. Tab to the "Share" button
2. Press Enter — panel opens
3. Tab through all panel options
4. Press Escape — panel closes and focus returns to the trigger button

### Run E2E tests

```bash
cd apps/web
npx playwright test tests/e2e/share-panel.spec.ts
```

### axe-core accessibility check

```bash
npx playwright test tests/e2e/accessibility/share-panel-a11y.spec.ts
```

---

## 6. Running All SEO Tests

```bash
cd apps/web

# Unit tests for metadata and structured-data builders
npx vitest run tests/unit/seo/

# Integration tests for sitemap, noindex, share-meta
npx vitest run tests/integration/seo-*.test.ts

# E2E tests for share panel
npx playwright test tests/e2e/share-panel.spec.ts
```

---

## 7. Adding OG Metadata to a New Page

When a new public page is added (e.g., `/venues/[id]`), follow this pattern:

### Step 1: Add a `getShareMeta` function in the relevant service

```typescript
// lib/seo/metadata.ts — add a new builder
export function buildVenueMetadata(venue: VenueDetail, locale: string): Metadata {
  return {
    title: `${venue.name} | AcroYoga Community`,
    description: venue.description?.slice(0, 160) ?? `AcroYoga events at ${venue.name}`,
    openGraph: {
      title: venue.name,
      description: ...,
      url: `${BASE_URL}/venues/${venue.id}`,
      type: 'website',
    },
    alternates: {
      canonical: `${BASE_URL}/venues/${venue.id}`,
      languages: buildHreflang(`${BASE_URL}/venues/${venue.id}`),
    },
  };
}
```

### Step 2: Add `generateMetadata()` to the page

```typescript
// app/venues/[id]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const locale = await getLocale();
  const venue = await getVenueById(id);
  if (!venue) return {};
  return buildVenueMetadata(venue, locale);
}
```

### Step 3: Add to the sitemap

In `lib/seo/sitemap.ts`, add a `getSitemapVenues()` query function and include its results
in `app/sitemap.ts`.

### Step 4: Write tests

Add integration tests for the new metadata builder and update the sitemap test to include venues.

---

## 8. Extending the Branded OG Image Template

The OG image templates are in:

- `app/api/og/events/[id]/route.tsx` — event template
- `app/api/og/teachers/[id]/route.tsx` — teacher template

To modify the design:

1. Edit the JSX inside `ImageResponse(...)` — use only flex/absolute positioning (no CSS grid).
2. Test the visual output: open `http://localhost:3000/api/og/events/<ID>` in a browser.
3. Keep the image within 1200 × 630 px — these are the dimensions set in `ImageResponse`.
4. Confirm long event titles are truncated (test with a title > 70 characters).

**Adding a custom font**:

```typescript
// In the route handler:
const fontData = await fetch(
  new URL('/fonts/Inter-Bold.ttf', process.env.NEXT_PUBLIC_BASE_URL)
).then(r => r.arrayBuffer());

return new ImageResponse(jsx, {
  width: 1200,
  height: 630,
  fonts: [{ name: 'Inter', data: fontData, weight: 700 }],
});
```

---

## Architecture Summary

```
Request: GET /events/abc
  ↓
page.tsx (server component)
  ├── generateMetadata()
  │     └── getEventById(id) → buildEventMetadata() → Metadata object
  │         includes: og:*, twitter:*, canonical, hreflang
  ├── <script ld+json> (inline, from buildEventJsonLd())
  └── <EventDetailPage /> (client component, existing)

Request: GET /api/og/events/abc
  ↓
route.tsx (Edge runtime, server-only)
  └── getEventById(id) → ImageResponse (1200×630 PNG)
      Cache-Control: public, max-age=86400

Request: GET /sitemap.xml
  ↓
sitemap.ts (revalidate = 3600)
  ├── getSitemapEvents()   — published events only
  └── getSitemapTeachers() — non-deleted profiles only

Client: Share button click
  ↓
SharePanel.tsx (lazy-loaded, "use client")
  ├── buildShareUrl(canonicalUrl, source)  — UTM appended via URL API
  ├── navigator.clipboard.writeText(url)   — or execCommand fallback
  └── navigator.share({ title, url })      — feature-detected, mobile
```
