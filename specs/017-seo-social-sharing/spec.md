# Feature Specification: SEO & Social Sharing

**Feature Branch**: `017-seo-social-sharing`  
**Created**: 2026-04-29  
**Status**: Draft  
**Priority**: P1  
**Constitution Check**: Principles I, II, IV, V, VI, VII, VIII  
**Deferred From**: Spec 001 (T033 — dynamic metadata, T058/T059 — share buttons), README roadmap

## Summary

Deliver full SEO and social-sharing capabilities across all public pages of the AcroYoga Community platform. The work covers six complementary areas: dynamic Open Graph metadata on every public route; server-generated branded sharing images for event pages; structured data (Schema.org) to unlock Google rich results for events and teacher profiles; a machine-readable sitemap that indexes only publicly discoverable content; canonical URL tags to prevent duplicate-content penalties from locale variants; and share buttons on event detail pages with UTM attribution. Together these features improve organic discoverability, drive referral traffic from social networks, and complete deferred deliverables from Spec 001.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Rich Preview When Sharing an Event Link (Priority: P1)

A community member copies an event URL and pastes it into WhatsApp, iMessage, Twitter/X, Slack, or Facebook. The messaging app fetches the URL and renders a rich preview card showing the event's cover image, title, date, location, and price. The preview is visually branded and immediately communicates the event's essence without the recipient needing to click through.

**Why this priority**: This is the highest-leverage discoverability mechanism — every share of an event URL is a free advertisement. Broken or missing previews degrade trust and reduce click-through rates. Completes Spec 001 T033 and the README roadmap.

**Independent Test**: Paste an event URL into the Facebook Sharing Debugger, Twitter Card Validator, and the WhatsApp link preview. Verify the image, title, date, location, and price appear correctly on all three platforms.

**Acceptance Scenarios**:

1. **Given** a public event page URL, **When** shared in any Open Graph-aware platform, **Then** a preview card appears showing: event title, cover image (or branded fallback), start date/time, city, and price (or "Free").
2. **Given** an event with a cover image, **When** the OG image is fetched, **Then** the served image is 1200 × 630 px, includes the event title and date overlaid on a branded template, and loads within 2 seconds.
3. **Given** an event without a cover image, **When** shared, **Then** a branded fallback image with the AcroYoga Community logo and event title is generated and served.
4. **Given** an event whose details have changed (title, date, cover image), **When** the sharing card is fetched, **Then** the updated metadata is reflected within 24 hours.
5. **Given** a draft or private event URL, **When** fetched by a social crawler, **Then** no OG metadata is returned and the crawler cannot index the content.

---

### User Story 2 — Rich Preview When Sharing a Teacher Profile (Priority: P1)

A community member shares a teacher profile link. The preview card shows the teacher's full name, a one-line bio, and their avatar photo. It clearly identifies the page as a person profile on the AcroYoga Community platform.

**Why this priority**: Teacher profiles are a primary growth surface — teachers share their own profiles when promoting themselves. Missing previews make these shares look like plain blue links.

**Independent Test**: Share a teacher profile URL in a link-preview debugger. Verify name, bio excerpt, and avatar appear correctly.

**Acceptance Scenarios**:

1. **Given** a teacher profile URL, **When** shared on any OG-aware platform, **Then** the preview shows the teacher's name, a truncated bio (≤ 160 characters), and their avatar image.
2. **Given** a teacher with no avatar, **When** their profile is shared, **Then** a branded platform avatar placeholder is used.
3. **Given** a teacher profile marked as unlisted or inactive, **When** the URL is shared, **Then** OG metadata is suppressed and the page is not indexable.

---

### User Story 3 — Google Rich Results for Events (Priority: P1)

A person searches Google for "AcroYoga workshop London". Events from the platform appear as rich result cards beneath the search listing, showing date, location, and price directly in the search engine results page (SERP). This drives click-through rates significantly above plain blue links.

**Why this priority**: Rich results are a high-impact SEO win with no ongoing cost. Once the structured data is correct, Google automatically enhances search listings. Teachers appearing as Person knowledge-panel entries also improves brand trust.

**Independent Test**: Submit an event page URL to Google's Rich Results Test tool. Verify it passes the Event schema validation with no errors. Verify the same for a teacher profile with the Person schema.

**Acceptance Scenarios**:

1. **Given** any published event page, **When** validated by a structured-data testing tool, **Then** a valid Schema.org `Event` block is present containing: name, startDate, endDate (if known), location (name, address), organiser, description, eventStatus, and offers (price, currency, availability).
2. **Given** any teacher profile page, **When** validated by a structured-data testing tool, **Then** a valid Schema.org `Person` block is present containing: name, description, image, and url.
3. **Given** a cancelled event, **When** validated, **Then** the `eventStatus` field is set to `EventCancelled`.
4. **Given** a free event, **When** validated, **Then** the `offers.price` is `0` and `offers.priceCurrency` reflects the platform default currency.
5. **Given** a draft or private event, **When** the page is crawled, **Then** no structured data is emitted and the page carries a `noindex` directive.

---

### User Story 4 — Platform Pages Are Discoverable via Search Engines (Priority: P1)

A search engine crawler visits the platform and can discover all public events and teacher profiles via a machine-readable sitemap. Pages are crawled with correct indexing signals — public content is indexed, private/draft content is excluded.

**Why this priority**: Without a sitemap and correct indexing signals, search engines may miss newly created events entirely. A sitemap is a prerequisite for all other SEO features to have any effect.

**Independent Test**: Fetch `/sitemap.xml`. Verify it is valid XML, contains URLs for all published events and teacher profiles, excludes draft/private content, and includes `<lastmod>` timestamps. Validate using Google Search Console's sitemap report.

**Acceptance Scenarios**:

1. **Given** the sitemap URL (`/sitemap.xml`), **When** fetched by any HTTP client, **Then** a valid XML sitemap is returned listing all public events, all teacher profiles, and all static pages.
2. **Given** a newly published event, **When** the sitemap is regenerated, **Then** the new event's URL appears with a `<lastmod>` value matching its publication date.
3. **Given** a draft or private event, **When** the sitemap is generated, **Then** that event's URL is excluded.
4. **Given** multiple locale variants of a page (e.g., `/en/events/123`, `/es/events/123`), **When** the sitemap is generated, **Then** each locale variant is listed with the correct `hreflang` relationship.
5. **Given** the sitemap, **When** the total number of public events and profiles exceeds 50,000 URLs, **Then** the sitemap is automatically split into indexed sub-sitemaps.

---

### User Story 5 — No Duplicate Content Penalty from Locale Variants (Priority: P2)

A search engine sees multiple URLs for logically the same content (English and Spanish variants of the same event page). Canonical tags on every page unambiguously declare the preferred URL, preventing duplicate-content penalties that would otherwise suppress rankings for all variants.

**Why this priority**: Locale routing (Spec 014) creates multiple URLs per page. Without canonicals, search engines may split page authority across variants or penalise the domain. This is low-effort, high-protection work.

**Independent Test**: Inspect the `<head>` of any event page in both the English and Spanish locale routes. Verify both contain a `<link rel="canonical">` pointing to the same designated canonical URL (typically the default-locale variant).

**Acceptance Scenarios**:

1. **Given** any public page, **When** the HTML `<head>` is inspected, **Then** exactly one `<link rel="canonical" href="...">` tag is present.
2. **Given** a locale variant of a page (e.g., `/es/events/123`), **When** the canonical tag is inspected, **Then** it points to the default-locale URL (e.g., `/en/events/123` or `/events/123`).
3. **Given** the canonical URL itself (e.g., `/events/123`), **When** inspected, **Then** its canonical tag is self-referencing.
4. **Given** a paginated list (e.g., `/events?page=2`), **When** inspected, **Then** the canonical tag points to the first page (`/events`) rather than the paginated URL.

---

### User Story 6 — Share an Event Directly from the Detail Page (Priority: P2)

A user viewing an event detail page taps a "Share" button and sees options to: copy the link to clipboard, use the device's native share sheet, post to Twitter/X, or send via WhatsApp. The shared link includes UTM parameters so the event creator and platform administrators can track referral traffic source in analytics.

**Why this priority**: Completes Spec 001 T058/T059. Share buttons lower the friction of spreading event links, especially on mobile where copy-pasting URLs is cumbersome. UTM attribution closes the analytics loop.

**Independent Test**: On a mobile device, tap "Share" on an event detail page. Verify the native share sheet opens. Verify the copied link includes UTM parameters. Verify the WhatsApp and Twitter/X buttons open the correct pre-composed share URLs with proper UTM parameters.

**Acceptance Scenarios**:

1. **Given** an event detail page, **When** the user taps "Share", **Then** a share panel appears with options: Copy Link, Share (native share sheet), Twitter/X, and WhatsApp.
2. **Given** the user taps "Copy Link", **When** the action completes, **Then** the event URL (with UTM parameters) is copied to the clipboard and a confirmation toast is shown.
3. **Given** a browser that supports the Web Share API, **When** the user taps the "Share" button, **Then** the device's native share sheet opens with the event title and URL pre-filled.
4. **Given** a browser that does not support the Web Share API, **When** the share panel is shown, **Then** the native share sheet option is hidden; Copy Link, Twitter/X, and WhatsApp options remain.
5. **Given** any share action, **When** the URL is constructed, **Then** it includes UTM parameters: `utm_source` (channel name, e.g., `twitter`, `whatsapp`, `clipboard`), `utm_medium` (`social` or `referral`), and `utm_campaign` (`event-share`).
6. **Given** a user who is not logged in, **When** viewing an event detail page, **Then** the share panel is still accessible and functional (sharing does not require authentication).

---

### Edge Cases

- **Event with no cover image**: Fallback branded OG image is generated using the event title and platform logo; no broken image placeholder.
- **Very long event title (> 70 characters)**: OG image generator truncates the title with an ellipsis to fit within the image bounds; the full title still appears in the `og:title` meta tag.
- **Event in a non-English locale**: OG metadata, structured data, and share text are generated in the page's active locale.
- **Teacher with no bio**: Structured data and OG description fall back to a platform-generated description ("AcroYoga teacher on the AcroYoga Community platform").
- **Cancelled event shared**: Preview card and structured data reflect `eventStatus: EventCancelled`; share buttons remain functional.
- **Sitemap with > 50,000 URLs**: Sitemap index file at `/sitemap.xml` links to paginated sub-sitemaps (`/sitemap/events-1.xml`, etc.).
- **Web Share API unavailable (desktop browsers)**: Share panel degrades gracefully to showing only Copy Link, Twitter/X, and WhatsApp buttons.
- **Clipboard API unavailable**: "Copy Link" button falls back to selecting the text in an input field the user can manually copy; a tooltip guides the user.
- **UTM parameters on an already-parameterised URL**: UTM parameters are appended without duplicating or overwriting any existing query parameters.
- **Draft event URL accessed by crawler**: Page returns HTTP 200 with `<meta name="robots" content="noindex, nofollow">` — the event is not surfaced in search or previews.
- **Sitemap freshness**: Sitemap is regenerated on each request (or on a short cache window) to ensure newly published events appear within hours, not days.
- **Locale not yet translated**: OG metadata falls back to the `en` locale values rather than displaying raw translation keys.

---

## Requirements *(mandatory)*

### Functional Requirements

| ID     | Requirement                                                                                                                                                                                               | Priority |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-001 | Every public page (events list, event detail, teacher profile, community pages, static pages) MUST emit dynamically generated Open Graph metadata including `og:title`, `og:description`, `og:image`, `og:url`, and `og:type` | P1       |
| FR-002 | Event detail pages MUST generate OG metadata containing: event title, start date/time, city, and price (or "Free")                                                                                       | P1       |
| FR-003 | Teacher profile pages MUST generate OG metadata containing: teacher name, bio excerpt (≤ 160 characters), and avatar URL                                                                                  | P1       |
| FR-004 | The platform MUST serve dynamically generated sharing images (1200 × 630 px) for event pages, rendered server-side, using a branded template showing: event title, date, city, and price                  | P1       |
| FR-005 | Events without a cover image MUST use a branded fallback sharing image that includes the event title and the platform logo                                                                                 | P1       |
| FR-006 | All published event pages MUST include a valid Schema.org `Event` structured data block with: `name`, `startDate`, `endDate`, `location` (name + address), `organizer`, `description`, `eventStatus`, and `offers` | P1       |
| FR-007 | All teacher profile pages MUST include a valid Schema.org `Person` structured data block with: `name`, `description`, `image`, and `url`                                                                   | P1       |
| FR-008 | Cancelled events MUST set `eventStatus` to `EventCancelled` in their structured data                                                                                                                      | P1       |
| FR-009 | Draft and private events MUST NOT emit OG metadata or structured data, and MUST carry a `noindex, nofollow` robots directive                                                                               | P1       |
| FR-010 | The platform MUST serve a dynamic XML sitemap at `/sitemap.xml` listing all public events, teacher profiles, and static pages with `<loc>` and `<lastmod>` elements                                       | P1       |
| FR-011 | Draft and private events MUST be excluded from the sitemap                                                                                                                                                | P1       |
| FR-012 | The sitemap MUST include `hreflang` relationships for all locale variants of each page                                                                                                                    | P1       |
| FR-013 | When the total URL count exceeds 50,000, the sitemap MUST automatically split into indexed sub-sitemaps                                                                                                   | P2       |
| FR-014 | Every public page MUST include exactly one `<link rel="canonical">` tag in the HTML `<head>` pointing to the preferred (default-locale) URL                                                               | P2       |
| FR-015 | Locale variant pages MUST have a canonical tag pointing to the default-locale URL; paginated pages MUST canonical to the first page                                                                       | P2       |
| FR-016 | Event detail pages MUST display a "Share" button visible to all visitors (authenticated or not)                                                                                                           | P2       |
| FR-017 | The share panel MUST offer at minimum: Copy Link, Twitter/X, and WhatsApp options                                                                                                                         | P2       |
| FR-018 | On devices/browsers supporting the Web Share API, the share panel MUST also offer a native share option                                                                                                   | P2       |
| FR-019 | All shared URLs MUST include UTM parameters: `utm_source` (channel), `utm_medium` (`social` or `referral`), and `utm_campaign` (`event-share`)                                                           | P2       |
| FR-020 | OG metadata and sharing images MUST be generated in the page's active locale                                                                                                                              | P2       |
| FR-021 | The `og:image` served for events MUST load within 2 seconds from a cold cache on a standard broadband connection                                                                                          | P1       |
| FR-022 | All share buttons and share panel interactions MUST be keyboard navigable and meet WCAG 2.1 AA colour contrast requirements                                                                                | P2       |

### Key Entities

- **OG Metadata Record** (per page): page type (event/teacher/static), canonical URL, title, description (≤ 160 chars), image URL (1200×630), locale. Not persisted — computed at render time from the underlying resource.
- **Sharing Image** (per event): generated image asset representing the event in 1200×630 px format. Cached at the CDN layer; cache-busted when the event is updated.
- **Structured Data Block** (per page): JSON-LD payload embedded in the page `<head>`. Not persisted — generated from the event or teacher record at render time.
- **Sitemap Entry**: URL, last-modified timestamp, and locale variants (`hreflang`). Generated dynamically from the events and teacher profiles tables.
- **Share URL**: event canonical URL augmented with UTM parameters. Constructed client-side at share time; not persisted.

---

## Assumptions

1. **Locale routing already exists**: Spec 014 (Internationalisation) is implemented. Locale-aware URLs exist and the `hreflang` mapping is driven by that routing configuration.
2. **Events and teacher profiles have canonical IDs**: Stable, slug-based or ID-based URL patterns already exist for both resource types (from Specs 001 and 005).
3. **Default locale is English (`en`)**: Canonical URLs point to the English-locale variant. This can be adjusted without a spec change.
4. **UTM analytics reception**: The platform's analytics provider (e.g., Google Analytics, Plausible) is already configured to receive UTM parameters. This spec only ensures the parameters are appended; it does not configure the analytics provider.
5. **Sharing image cache duration**: Generated sharing images are cached at the CDN layer for 24 hours after the event's last modification. The cache is invalidated on every event update.
6. **Sitemap regeneration frequency**: The sitemap is regenerated server-side on each request with a short cache (e.g., 1 hour) so newly published events appear in the sitemap within hours.
7. **OG image font assets**: Platform fonts used in the branded sharing image template are available server-side for image generation.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

| ID     | Criterion                                                                                                                                                                              | Measurement                                                       |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| SC-001 | Every public event and teacher profile page emits valid OG metadata with no missing required tags                                                                                      | Automated crawl with an OG-tag validation tool; zero errors       |
| SC-002 | Sharing images for event pages load within 2 seconds from a cold cache over standard broadband                                                                                         | Synthetic performance test; p95 load time ≤ 2,000 ms             |
| SC-003 | 100% of published event pages pass Google Rich Results Test with no structured data errors                                                                                             | Manual + CI validation using the Rich Results Test API            |
| SC-004 | 100% of published teacher profile pages pass structured data validation with no errors                                                                                                 | Manual + CI validation                                            |
| SC-005 | `/sitemap.xml` is valid XML, contains all public events and teacher profiles, and is accepted without errors by Google Search Console                                                   | Google Search Console sitemap submission report                   |
| SC-006 | Draft and private events are not present in the sitemap and return `noindex` directives — verified by automated test                                                                   | Integration test: create a draft event, fetch sitemap, assert absent |
| SC-007 | Every public page has exactly one canonical tag; locale variants point to the default-locale canonical — verified by automated crawl                                                    | Automated HTML audit; zero pages with missing or duplicate canonicals |
| SC-008 | Share buttons on event detail pages are functional across mobile and desktop; copy-to-clipboard works; UTM parameters are present in all shared URLs                                    | E2E test on Chrome (desktop) and a mobile viewport                |
| SC-009 | Share panel is fully keyboard accessible and meets WCAG 2.1 AA contrast requirements — no axe-core violations                                                                          | axe-core accessibility scan on the share panel component          |
| SC-010 | Organic search impressions for event pages increase by a measurable amount within 90 days of deployment, as reported by Google Search Console                                           | Google Search Console: impressions report, 90-day comparison      |
