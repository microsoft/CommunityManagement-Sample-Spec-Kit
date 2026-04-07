---

description: "Task list for Spec 017: SEO & Social Sharing"
---

# Tasks: SEO & Social Sharing

**Spec**: 017 | **Branch**: `017-seo-social-sharing` | **Generated**: 2026-04-29  
**Input**: `specs/017-seo-social-sharing/` — spec.md, data-model.md, contracts/seo-meta.ts, research.md, quickstart.md  
**Prerequisites**: Spec 001 (events + share route), Spec 005 (teacher profiles), Spec 014 (next-intl i18n)

**Tests**: Constitution Principle II requires test-first development. Integration tests are included for all service functions. No E2E tests are generated unless the CI pipeline explicitly requests them (E2E scope is defined separately per the constitution).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies on in-progress tasks)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Exact file paths are included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the `lib/seo/` module, shared contract types, and the `BASE_URL` constant that every subsequent task depends on.

- [x] T001 Add `EventOGMetadata`, `TeacherOGMetadata`, `EventStructuredData`, `TeacherStructuredData`, `SitemapEntry`, `ShareMetaResponse`, `ShareURL`, `SchemaEventStatus`, `SchemaAvailability`, `ShareSource`, `ShareMedium` types to `packages/shared/src/types/seo.ts` (mirror `specs/017-seo-social-sharing/contracts/seo-meta.ts`)
- [x] T002 [P] Export new types from `packages/shared/src/types/index.ts`
- [x] T003 [P] Create `apps/web/src/lib/seo/` directory with an empty `index.ts` barrel re-exporting all SEO helpers (populated in subsequent tasks)
- [x] T004 [P] Confirm `NEXT_PUBLIC_BASE_URL` is documented in `apps/web/.env.example` and `apps/web/src/lib/config.ts` exports a `BASE_URL` constant (`process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'`) — add if missing

**Checkpoint**: Shared types compile; `BASE_URL` is importable from `@/lib/config`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core SEO helper functions shared across multiple user stories. ALL subsequent phases depend on these utilities.

**⚠️ CRITICAL**: Phases 3–8 MUST NOT begin until this phase is complete.

- [x] T005 Create `apps/web/src/lib/seo/metadata.ts` exporting `buildEventMetadata(event: EventDetail, locale: Locale): Metadata` — builds `EventOGMetadata`-shaped Next.js `Metadata` object with `title`, `description`, `openGraph`, `twitter`, `robots`, and `alternates` per the `EventOGMetadata` contract; `og:image` URL includes `?v={event.updatedAt}` cache-busting param; non-published events get `robots: { index: false, follow: false }`
- [x] T006 [P] Add `buildTeacherMetadata(profile: TeacherProfileDetail, locale: Locale): Metadata` to `apps/web/src/lib/seo/metadata.ts` — same structure for teacher profiles; `twitterCard: 'summary'`; inactive/deleted profiles get `robots: { index: false, follow: false }`
- [x] T007 [P] Create `apps/web/src/lib/seo/structured-data.ts` exporting `buildEventJsonLd(event: EventDetail): EventStructuredData` — maps `EventDetail` to Schema.org `Event`; applies status→`eventStatus` mapping; applies capacity→`availability` mapping; omits output entirely for draft/private events
- [x] T008 [P] Add `buildTeacherJsonLd(profile: TeacherProfileDetail): TeacherStructuredData` to `apps/web/src/lib/seo/structured-data.ts` — maps `TeacherProfileDetail` to Schema.org `Person`; uses first photo URL or `undefined` for image
- [x] T009 [P] Create `apps/web/src/lib/seo/sitemap.ts` exporting `getSitemapEvents(): Promise<SitemapEntry[]>` — queries `events` table for `status = 'published'` only, maps to `SitemapEntry` with `priority: 0.9` for future events, `0.5` for past; and `getSitemapTeachers(): Promise<SitemapEntry[]>` — queries `teacher_profiles` where `is_deleted = false`, priority `0.8`
- [x] T010 [P] Create `apps/web/src/lib/seo/canonical.ts` exporting `buildCanonicalUrl(path: string): string` — prepends `BASE_URL`, strips locale prefixes if present; and `buildAlternateLanguages(path: string): Record<HreflangLocale, string>` — all four keys (`en`, `es`, `ar`, `x-default`) map to the same non-prefixed URL (per research.md locale routing decision)
- [x] T011 [P] Create `apps/web/src/components/seo/JsonLd.tsx` — a server component that accepts `data: Record<string, unknown>` and renders `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />`; sanitises output to prevent XSS (use `JSON.stringify` only, no raw interpolation)
- [x] T012 [P] Write integration tests for foundational helpers in `apps/web/tests/integration/seo/metadata.test.ts` — cover: published event builds correct `og:image` URL with `?v=` param; draft event returns `robots: noindex`; teacher with no bio uses fallback description; deleted teacher returns `robots: noindex`
- [x] T013 [P] Write integration tests for `buildEventJsonLd` and `buildTeacherJsonLd` in `apps/web/tests/integration/seo/structured-data.test.ts` — cover: published event has all required Schema.org fields; cancelled event has `EventCancelled` status; free event has `price: 0`; draft event returns `null`/is not emitted
- [x] T014 [P] Write integration tests for `getSitemapEvents` and `getSitemapTeachers` in `apps/web/tests/integration/seo/sitemap.test.ts` — cover: published event appears; draft event excluded; cancelled event excluded; `lastModified` matches DB `updated_at`

**Checkpoint**: All helper functions pass their integration tests. Foundation is ready for story phases.

---

## Phase 3: User Story 1 — Rich Preview When Sharing an Event Link (Priority: P1) 🎯 MVP

**Goal**: Pasting any public event URL into WhatsApp, iMessage, Twitter/X, Slack, or Facebook renders a rich preview card with branded OG image, event title, date, city, and price.

**Independent Test**: Paste an event URL into the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and [Twitter Card Validator](https://cards-dev.twitter.com/validator). Verify image, title, date, location, and price all appear correctly. Verify `/api/og/events/[id]` responds with a 1200×630 PNG within 2 s. Verify a draft event URL returns no OG tags and the OG image route returns 404.

### Implementation for User Story 1

- [x] T015 [US1] Convert `apps/web/src/app/events/[id]/page.tsx` from a simple wrapper to a proper server component: add `export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata>` that calls `getEventById`, falls back to `{}` if not found, calls `buildEventMetadata(event, await getLocale())`, and returns the result; import `getLocale` from `next-intl/server`
- [x] T016 [US1] Create OG image route handler at `apps/web/src/app/api/og/events/[id]/route.ts` using `ImageResponse` from `next/og`; fetch event via `getEventById`; return 404 if not found or not published; render a 1200×630 branded flex template with event title (truncated to 70 chars with ellipsis), formatted start date, city name, and price badge (or "Free"); set `Cache-Control: public, max-age=86400, stale-while-revalidate=3600`
- [x] T017 [P] [US1] Load platform font(s) from `apps/web/public/fonts/` in `apps/web/src/app/api/og/events/[id]/route.ts` — fetch as `ArrayBuffer` at module scope (cached) and pass to `ImageResponse` `fonts` option; fall back to system sans-serif if font file is absent so the route never errors
- [x] T018 [US1] Update `apps/web/src/lib/events/share.ts` `getShareMeta` to extend the response with `updatedAt` (ISO 8601 string from `event.updatedAt`) and `locale` (from `await getLocale()`) per the `ShareMetaResponse` contract in `contracts/seo-meta.ts`; existing `ShareMeta` fields remain unchanged (backward-compatible)
- [x] T019 [P] [US1] Update `apps/web/src/app/api/events/[id]/share/route.ts` to use the updated `getShareMeta` and return a proper error envelope `{ error, code }` using `@/lib/errors` helpers when the event is not found (replaces the ad-hoc `{ error: "Event not found" }` pattern)
- [x] T020 [P] [US1] Write integration tests for the OG image route in `apps/web/tests/integration/seo/og-events.test.ts` — cover: published event returns 200 with `Content-Type: image/png`; draft event returns 404; non-existent ID returns 404; `Cache-Control` header is present
- [x] T021 [P] [US1] Write integration tests for the updated share route in `apps/web/tests/integration/seo/share-route.test.ts` — cover: response includes `updatedAt` and `locale`; unknown event returns `{ error, code }` envelope

**Checkpoint**: `generateMetadata` is live on event pages; `/api/og/events/[id]` serves branded PNG; share route returns extended `ShareMetaResponse`. US1 is fully functional and testable independently.

---

## Phase 4: User Story 2 — Rich Preview When Sharing a Teacher Profile (Priority: P1)

**Goal**: Sharing a teacher profile URL renders a rich preview card with teacher name, bio excerpt, and avatar image.

**Independent Test**: Share a teacher profile URL in a link-preview debugger. Verify name, bio excerpt (≤ 160 chars), and avatar appear. Verify `/api/og/teachers/[id]` returns a 1200×630 PNG. Verify an inactive teacher profile URL returns no OG tags and the OG route returns 404.

### Implementation for User Story 2

- [x] T022 [US2] Convert `apps/web/src/app/teachers/[id]/page.tsx` from a `"use client"` component to a server component: remove `"use client"` directive; extract client-interactive logic (tabs, state) into a new child `apps/web/src/components/teachers/TeacherDetailClient.tsx` (marked `"use client"`); add `export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata>` that calls `getTeacherById`, falls back to `{}` if not found, calls `buildTeacherMetadata(profile, await getLocale())`
- [x] T023 [P] [US2] Create OG image route handler at `apps/web/src/app/api/og/teachers/[id]/route.ts` using `ImageResponse`; fetch teacher via `getTeacherById`; return 404 if not found, deleted, or inactive; render 1200×630 branded flex template with teacher name, "AcroYoga Teacher" subtitle, and avatar (or branded placeholder when no photos); reuse same font loading pattern as T017; set `Cache-Control: public, max-age=86400, stale-while-revalidate=3600`
- [x] T024 [P] [US2] Write integration tests for the teacher OG image route in `apps/web/tests/integration/seo/og-teachers.test.ts` — cover: active teacher returns 200 PNG; deleted teacher returns 404; no-photo teacher renders placeholder without erroring
- [x] T025 [P] [US2] Write integration tests for `buildTeacherMetadata` edge cases in `apps/web/tests/integration/seo/metadata.test.ts` (extend existing file) — cover: teacher with no bio uses platform fallback; `twitterCard` is `'summary'`; `og:image` URL includes `?v=` param

**Checkpoint**: Teacher profile `generateMetadata` is live; `/api/og/teachers/[id]` serves branded PNG; US2 is independently testable without US1.

---

## Phase 5: User Story 3 — Google Rich Results for Events & Teachers (Priority: P1)

**Goal**: Published event pages and teacher profile pages embed valid Schema.org `Event` and `Person` JSON-LD blocks; pages pass Google's Rich Results Test with zero errors.

**Independent Test**: Submit a published event URL to [Google Rich Results Test](https://search.google.com/test/rich-results). Verify `Event` schema passes with all required fields. Submit a teacher profile URL and verify `Person` schema passes.

### Implementation for User Story 3

- [x] T026 [US3] Update `apps/web/src/app/events/[id]/page.tsx` to import `buildEventJsonLd` and `JsonLd`; call `buildEventJsonLd(event)` server-side; conditionally render `<JsonLd data={jsonLd} />` only when `jsonLd` is non-null (i.e., published/non-draft events only)
- [x] T027 [P] [US3] Update `apps/web/src/components/teachers/TeacherDetailClient.tsx` (or the server wrapper `apps/web/src/app/teachers/[id]/page.tsx`) to call `buildTeacherJsonLd(profile)` and render `<JsonLd data={jsonLd} />` for active teacher profiles; omit for deleted/inactive profiles
- [x] T028 [P] [US3] Write integration tests for JSON-LD rendering in `apps/web/tests/integration/seo/jsonld.test.ts` — cover: published event page HTML contains valid `application/ld+json` script with all required Schema.org fields; cancelled event has `eventStatus: EventCancelled`; draft event page HTML contains NO `application/ld+json` script; teacher page HTML contains `Person` schema block
- [x] T029 [P] [US3] Verify `EventStatusSchema` mapping in `buildEventJsonLd` (unit test in `apps/web/tests/integration/seo/structured-data.test.ts` — extend existing file): `published` → `EventScheduled`; `cancelled` → `EventCancelled`; `draft` → function returns `null`; `private` → function returns `null`

**Checkpoint**: Both event and teacher pages emit valid JSON-LD in their HTML. US3 is independently testable with the Rich Results Test tool.

---

## Phase 6: User Story 4 — Platform Pages Discoverable via Search Engines (Priority: P1)

**Goal**: `/sitemap.xml` lists all published events and active teacher profiles with `<lastmod>` timestamps; `/robots.txt` allows crawling of public pages.

**Independent Test**: `curl https://{domain}/sitemap.xml` returns valid XML. Validate via [Google Search Console](https://search.google.com/search-console/). Confirm draft/cancelled events are absent. Confirm `<lastmod>` values match DB `updated_at`.

### Implementation for User Story 4

- [x] T030 [US4] Create `apps/web/src/app/sitemap.ts` — Next.js App Router `sitemap()` export; call `getSitemapEvents()` and `getSitemapTeachers()`; include static pages (`/`, `/events`, `/teachers`) with `priority: 0.7` and `changeFrequency: 'weekly'`; set revalidation to 3600 s (`export const revalidate = 3600`); return `MetadataRoute.Sitemap` array; include `alternates.languages` for `en`, `es`, `ar`, `x-default` all pointing to the same non-prefixed URL (per research.md decision)
- [x] T031 [P] [US4] Create `apps/web/src/app/robots.ts` — Next.js App Router `robots()` export; allow all public routes; disallow `/admin/`, `/api/`, `/login`; include sitemap URL reference pointing to `${BASE_URL}/sitemap.xml`
- [x] T032 [P] [US4] Handle sitemap splitting in `apps/web/src/lib/seo/sitemap.ts`: if total event or teacher count exceeds 50,000 add a `generateSitemapIndex()` helper that produces paginated sub-sitemap URLs (`/sitemap/events-1.xml`, etc.); wire into `apps/web/src/app/sitemap.ts` conditionally when count > 50,000
- [x] T033 [P] [US4] Write integration tests for sitemap generation in `apps/web/tests/integration/seo/sitemap.test.ts` (extend existing file) — cover: sitemap output is valid `MetadataRoute.Sitemap` array; published event appears with `lastModified` matching DB `updated_at`; draft event is absent; `alternates.languages` contains all four locale keys pointing to the same URL; static pages are present

**Checkpoint**: `/sitemap.xml` and `/robots.txt` are live; crawlers can discover all public content. US4 is independently testable.

---

## Phase 7: User Story 5 — No Duplicate Content Penalty from Locale Variants (Priority: P2)

**Goal**: Every public page has exactly one `<link rel="canonical">` tag; locale variant pages all point to the same self-referential canonical URL (non-prefixed routing means canonical = current URL).

**Independent Test**: `curl -s https://{domain}/events/{id} | grep canonical` → one tag, self-referencing. Verify same on teacher profile pages, events list, and teachers list.

### Implementation for User Story 5

- [x] T034 [US5] Add `canonical` URL to `buildEventMetadata` in `apps/web/src/lib/seo/metadata.ts` — set `alternates.canonical` to `buildCanonicalUrl('/events/' + event.id)` (self-referential per research.md routing decision); hreflang alternates via `buildAlternateLanguages('/events/' + event.id)` already set in T005 — verify they are wired into the returned `Metadata` object
- [x] T035 [P] [US5] Add `canonical` URL to `buildTeacherMetadata` in `apps/web/src/lib/seo/metadata.ts` — set `alternates.canonical` to `buildCanonicalUrl('/teachers/' + profile.id)`; hreflang alternates via `buildAlternateLanguages('/teachers/' + profile.id)` — verify they are wired into the returned `Metadata` object
- [x] T036 [P] [US5] Add `generateMetadata` to `apps/web/src/app/events/page.tsx` (events list page) — static metadata with canonical `/events` and hreflang alternates all pointing to `/events`; paginated URLs use canonical pointing to `/events` (first page)
- [x] T037 [P] [US5] Add `generateMetadata` to `apps/web/src/app/teachers/page.tsx` (teachers list page) — static metadata with canonical `/teachers` and hreflang alternates all pointing to `/teachers`
- [x] T038 [P] [US5] Write integration tests for canonical and hreflang in `apps/web/tests/integration/seo/canonical.test.ts` — cover: event page HTML contains exactly one `<link rel="canonical">`; canonical href matches the event's own non-prefixed URL; teacher page canonical is self-referential; events list canonical is `/events`; `buildAlternateLanguages` returns identical URL for all four locale keys

**Checkpoint**: All public pages emit a single correct canonical tag. Locale variants do not create duplicate-content risk. US5 is independently testable.

---

## Phase 8: User Story 6 — Share an Event Directly from the Detail Page (Priority: P2)

**Goal**: A "Share" button on the event detail page opens a share panel with Copy Link, native Web Share, Twitter/X, and WhatsApp options; all shared URLs include UTM parameters; the panel is keyboard navigable and WCAG 2.1 AA compliant.

**Independent Test**: On mobile Chrome, tap "Share" on an event detail page → native share sheet appears with event title and URL. Tap "Copy Link" → URL in clipboard includes `utm_source=clipboard&utm_medium=referral&utm_campaign=event-share`. WhatsApp button opens `https://wa.me/?text={encoded-url}`. Twitter/X button opens `https://twitter.com/intent/tweet?url={encoded-url}`. Tab through share panel → all controls are reachable. Run axe-core → zero violations.

### Implementation for User Story 6

- [x] T039 [US6] Create `apps/web/src/components/events/SharePanel.tsx` (client component, `"use client"`) — accepts `meta: ShareMetaResponse`; implements `buildShareUrl(source: ShareSource): string` using `new URL(meta.url)` + `searchParams.set` for `utm_source`, `utm_medium`, `utm_campaign`; renders four share options: Copy Link (uses `navigator.clipboard.writeText`, falls back to `<input>` select on Clipboard API absence), native share (`navigator.share` when `'share' in navigator`), Twitter/X (`https://twitter.com/intent/tweet?url=…&text=…`), WhatsApp (`https://wa.me/?text=…`); hides native share option when Web Share API is unavailable; shows confirmation toast on successful copy
- [x] T040 [P] [US6] Add `<SharePanel />` to `apps/web/src/app/events/[id]/page.tsx` — fetch `ShareMetaResponse` from `getShareMeta(id)` server-side; pass as `meta` prop to `<SharePanel />`; "Share" trigger button is visible to all visitors regardless of auth state
- [x] T041 [P] [US6] Ensure `SharePanel.tsx` is keyboard navigable — all buttons are focusable and activatable with Enter/Space; panel opens/closes with Escape; uses `role="dialog"` and `aria-modal="true"` when displayed as an overlay; focus is trapped within panel when open; focus returns to trigger button on close
- [x] T042 [P] [US6] Verify WCAG 2.1 AA compliance for `SharePanel.tsx` — all interactive elements meet 4.5:1 contrast ratio; touch targets are ≥ 44 × 44 px; loading/error states are handled; annotate with `aria-label` for icon-only buttons
- [x] T043 [P] [US6] Write integration tests for share URL construction in `apps/web/tests/integration/seo/share-panel.test.ts` — cover: `buildShareUrl('twitter')` produces URL with `utm_source=twitter&utm_medium=social&utm_campaign=event-share`; `buildShareUrl('clipboard')` uses `utm_medium=referral`; UTM params are appended without duplicating pre-existing query params; base URL matches `meta.url` without modification

**Checkpoint**: Share panel is live on event detail pages; all four share options work; UTM params are verified; keyboard accessibility is confirmed. US6 is independently testable.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Edge-case hardening, performance validation, and wiring all pieces together end-to-end.

- [x] T044 [P] Audit `apps/web/src/lib/seo/metadata.ts` for the long-title edge case: event titles > 70 chars must be truncated with `…` in `imageUrl` construction (already handled in OG image template T016) and the `description` fallback must always be ≤ 160 chars — add guard in `buildEventMetadata` and `buildTeacherMetadata`
- [x] T045 [P] Harden OG image routes (T016, T023) against missing/slow upstream data — add a 5 s timeout on the `getEventById`/`getTeacherById` calls; if the timeout fires, return a branded fallback image rather than a 500 error; log the timeout server-side using `@/lib/errors`
- [x] T046 [P] Validate `og:image` load-time requirement (FR-021, SC-002) — add a basic performance note in `apps/web/src/app/api/og/events/[id]/route.ts` confirming `Cache-Control: public, max-age=86400` is set (CDN will serve subsequent requests from cache within 2 s); document in `specs/017-seo-social-sharing/quickstart.md`
- [x] T047 [P] Add `robots.ts` and `sitemap.ts` exports to `apps/web/src/lib/seo/index.ts` barrel so consumers import from `@/lib/seo` consistently
- [x] T048 [P] Run a final integration test suite sweep in `apps/web/tests/integration/seo/` — confirm all test files pass (`npm run test -- tests/integration/seo`); fix any regressions introduced during wiring
- [x] T049 [P] Update `apps/web/src/components/events/EventDetailPage.tsx` — if `SharePanel` is embedded in the full detail view (not just the page shell), ensure no duplicate "Share" button exists after T040 wires the panel into `page.tsx`; remove any legacy share stub from Spec 001 (T058/T059)

**Checkpoint**: All phases complete, all integration tests green, edge cases handled, no duplicate share UI.

---

## Dependencies

```
Phase 1 (Setup)
  └── Phase 2 (Foundational helpers)
        ├── Phase 3 (US1: Event OG metadata + OG image + share route)   [P1]
        ├── Phase 4 (US2: Teacher OG metadata + OG image)               [P1] — independent of US1
        ├── Phase 5 (US3: JSON-LD structured data)                      [P1] — depends on US1 + US2 pages existing
        ├── Phase 6 (US4: Sitemap + robots.txt)                         [P1] — independent of US1–US3
        ├── Phase 7 (US5: Canonical tags)                               [P2] — depends on US1 + US2 metadata builders
        └── Phase 8 (US6: Share panel)                                  [P2] — depends on US1 share route (T018, T019)
              └── Phase 9 (Polish)
```

**Story completion order (suggested)**:  
US1 → US2 (parallel after Phase 2) → US3 → US4 (parallel after Phase 2) → US5 → US6 → Polish

---

## Parallel Execution Examples

**After Phase 2 is complete, the following can run simultaneously:**

| Stream A (US1) | Stream B (US2) | Stream C (US4) |
|---|---|---|
| T015 Event `generateMetadata` | T022 Teacher page → server component | T030 `sitemap.ts` |
| T016 `/api/og/events/[id]` route | T023 `/api/og/teachers/[id]` route | T031 `robots.ts` |
| T018 Extend `getShareMeta` | T024 OG teacher integration tests | T032 Sitemap splitting |
| T020 OG event integration tests | T025 Teacher metadata edge cases | T033 Sitemap integration tests |

**After US1 + US2 pages exist, US3 tasks can run:**

| Stream A (US3 Events) | Stream B (US3 Teachers) |
|---|---|
| T026 `<JsonLd />` on event page | T027 `<JsonLd />` on teacher page |
| T028 JSON-LD rendering tests | T029 Status mapping unit tests |

**After US1 metadata builder exists, US5 canonical tasks can run in parallel:**

| Stream A | Stream B | Stream C | Stream D |
|---|---|---|---|
| T034 Event canonical | T035 Teacher canonical | T036 Events list metadata | T037 Teachers list metadata |

---

## Implementation Strategy

### MVP Scope (Phase 1 + 2 + 3 only)

Deliver **User Story 1** first. This is the single highest-ROI increment:
- Every shared event link becomes a rich preview card on all major platforms
- Completes the deferred Spec 001 T033
- Validates the OG image pipeline and `generateMetadata` pattern before scaling to teachers

**MVP Definition of Done**:
- `generateMetadata` on `apps/web/src/app/events/[id]/page.tsx` emits correct OG tags
- `/api/og/events/[id]` serves a 1200×630 PNG within 2 s from a cold cache
- `/api/events/[id]/share` returns extended `ShareMetaResponse` with `updatedAt` and `locale`
- Integration tests pass for all three

### Incremental Delivery Order

1. **MVP** (Phases 1–3): Event rich previews — highest impact, lowest complexity
2. **Sprint 2** (Phase 4): Teacher rich previews — reuses all patterns from MVP
3. **Sprint 3** (Phases 5–6): JSON-LD + sitemap — search engine discoverability
4. **Sprint 4** (Phases 7–8): Canonical tags + share panel — polish and P2 stories
5. **Sprint 5** (Phase 9): Cross-cutting hardening and performance validation

---

## Task Summary

| Phase | User Story | Priority | Task Count | Parallelisable |
|---|---|---|---|---|
| Phase 1 | Setup | — | 4 | T002, T003, T004 |
| Phase 2 | Foundational | — | 10 | T006–T014 (all parallel after T005) |
| Phase 3 | US1 — Event OG + Share | P1 🎯 | 7 | T017, T019, T020, T021 |
| Phase 4 | US2 — Teacher OG | P1 | 4 | T023, T024, T025 |
| Phase 5 | US3 — JSON-LD | P1 | 4 | T027, T028, T029 |
| Phase 6 | US4 — Sitemap | P1 | 4 | T031, T032, T033 |
| Phase 7 | US5 — Canonical | P2 | 5 | T035, T036, T037, T038 |
| Phase 8 | US6 — Share Panel | P2 | 5 | T040, T041, T042, T043 |
| Phase 9 | Polish | — | 6 | T044–T049 (all parallel) |
| **Total** | | | **49** | |

**Format validation**: All 49 tasks follow `- [ ] [TaskID] [P?] [Story?] Description with file path` format. ✅
