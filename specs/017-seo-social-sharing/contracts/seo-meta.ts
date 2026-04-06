/**
 * API Contract: SEO & Social Sharing
 * Spec 017 — OG metadata, OG images, JSON-LD, sitemap, share panel
 *
 * Base paths:
 *   GET /api/og/events/[id]           → OG image (PNG, 1200×630)
 *   GET /api/og/teachers/[id]         → OG image (PNG, 1200×630)
 *   GET /api/events/[id]/share        → ShareMeta (extended from Spec 001)
 *   GET /sitemap.xml                  → XML (Next.js App Router sitemap.ts convention)
 *   GET /robots.txt                   → plain text (Next.js App Router robots.ts convention)
 *
 * NOTE: generateMetadata() output, JSON-LD, and canonical tags are NOT exposed as API
 * routes — they are rendered into page HTML server-side by Next.js.
 */

// ─── Shared Utilities ────────────────────────────────────────────────────────

/** ISO 8601 date-time string */
type ISODateTime = string;

/** Absolute URL string (must start with http:// or https://) */
type AbsoluteUrl = string;

/** Supported platform locales */
export type Locale = 'en' | 'es' | 'ar';

/** All supported locale variants, including x-default */
export type HreflangLocale = Locale | 'x-default';

// ─── OG Image Routes ─────────────────────────────────────────────────────────

/**
 * GET /api/og/events/[id]
 *
 * Returns a server-generated PNG image (1200 × 630 px) for use as the og:image
 * on an event detail page. The image displays a branded template with the event
 * title, date, city, and price badge overlaid on a coloured background.
 *
 * Query parameters:
 *   (none — id is the route segment)
 *
 * Cache-Control: public, max-age=86400, stale-while-revalidate=3600
 *
 * Responses:
 *   200 PNG  — successfully generated image
 *   404      — event not found or not published (draft/private events return 404)
 *   500      — image generation failure (logged server-side)
 *
 * No request body. No auth required.
 */
export interface EventOGImageRoute {
  method: 'GET';
  path: '/api/og/events/[id]';
  params: { id: string };
  response: Blob;             // Content-Type: image/png
}

/**
 * GET /api/og/teachers/[id]
 *
 * Returns a server-generated PNG image (1200 × 630 px) for use as the og:image
 * on a teacher profile page. The image displays the teacher's name, "AcroYoga Teacher"
 * label, and avatar (or branded placeholder).
 *
 * Cache-Control: public, max-age=86400, stale-while-revalidate=3600
 *
 * Responses:
 *   200 PNG  — successfully generated image
 *   404      — teacher not found or profile is inactive/deleted
 *   500      — image generation failure
 *
 * No request body. No auth required.
 */
export interface TeacherOGImageRoute {
  method: 'GET';
  path: '/api/og/teachers/[id]';
  params: { id: string };
  response: Blob;             // Content-Type: image/png
}

// ─── Share Meta Route (extended from Spec 001) ───────────────────────────────

/**
 * GET /api/events/[id]/share
 *
 * Returns metadata for constructing share URLs and previews. This route existed
 * in Spec 001; Spec 017 extends the response shape with `updatedAt` and `locale`.
 * All extensions are backward-compatible (new fields are optional additions).
 *
 * The `url` field is the clean canonical URL WITHOUT UTM parameters. UTM parameters
 * are appended client-side by SharePanel.tsx at share time.
 *
 * Responses:
 *   200 ShareMetaResponse  — event found and is public
 *   404 ErrorResponse      — event not found
 */
export interface ShareMetaResponse {
  /** Canonical event URL — no UTM parameters */
  url: AbsoluteUrl;
  /** Event title */
  title: string;
  /** Description truncated to ≤ 160 characters */
  description: string;
  /** Flat map of OG meta tags (property → content) */
  ogTags: {
    'og:title': string;
    'og:description': string;
    'og:url': AbsoluteUrl;
    'og:type': 'website';
    'og:image': AbsoluteUrl;
    'twitter:card': 'summary_large_image';
    'twitter:title': string;
    'twitter:description': string;
  };
  /**
   * NEW (Spec 017): ISO 8601 timestamp of last event update.
   * Used by the client to construct the cache-busting ?v= param for og:image.
   */
  updatedAt?: ISODateTime;
  /**
   * NEW (Spec 017): Active locale at time of generation.
   * Allows the client to display locale-appropriate share text.
   */
  locale?: Locale;
}

// ─── OG Metadata Shapes ──────────────────────────────────────────────────────

/**
 * Shape returned by buildEventMetadata() and consumed by generateMetadata().
 * This is an internal type — not exposed via HTTP. Documented here for
 * implementor reference and test assertion shapes.
 */
export interface EventOGMetadata {
  /** Page <title> and og:title */
  title: string;
  /** og:description — max 160 chars */
  description: string;
  /** og:image absolute URL with ?v= cache-busting query param */
  imageUrl: AbsoluteUrl;
  /** og:url and <link rel="canonical"> */
  canonicalUrl: AbsoluteUrl;
  /** og:type — always 'website' (schema.org Event type is in JSON-LD, not OG type) */
  type: 'website';
  /** twitter:card */
  twitterCard: 'summary_large_image';
  /**
   * Robots meta content — only present for non-published events.
   * Published events omit this field (search engines use their defaults).
   */
  robots?: 'noindex, nofollow';
  /**
   * hreflang alternate map.
   * All locales point to the same non-prefixed URL (locale is cookie/header-negotiated).
   */
  alternateLanguages: Record<HreflangLocale, AbsoluteUrl>;
}

/**
 * Shape returned by buildTeacherMetadata(). Consumed by generateMetadata().
 */
export interface TeacherOGMetadata {
  title: string;
  description: string;
  imageUrl: AbsoluteUrl;
  canonicalUrl: AbsoluteUrl;
  type: 'profile';
  twitterCard: 'summary';
  robots?: 'noindex, nofollow';
  alternateLanguages: Record<HreflangLocale, AbsoluteUrl>;
}

// ─── JSON-LD / Structured Data Shapes ────────────────────────────────────────

/** Schema.org eventStatus values supported by Google Rich Results */
export type SchemaEventStatus =
  | 'https://schema.org/EventScheduled'
  | 'https://schema.org/EventCancelled'
  | 'https://schema.org/EventPostponed'
  | 'https://schema.org/EventRescheduled';

/** Schema.org offer availability values */
export type SchemaAvailability =
  | 'https://schema.org/InStock'
  | 'https://schema.org/SoldOut';

/**
 * Schema.org Event structured data block.
 * Rendered as <script type="application/ld+json"> in page JSX.
 * Generated by buildEventJsonLd() in lib/seo/structured-data.ts.
 */
export interface EventStructuredData {
  '@context': 'https://schema.org';
  '@type': 'Event';
  name: string;
  description: string;
  startDate: ISODateTime;
  endDate?: ISODateTime;
  eventStatus: SchemaEventStatus;
  location: {
    '@type': 'Place';
    name: string;
    address: {
      '@type': 'PostalAddress';
      streetAddress: string;
      addressLocality: string;
    };
  };
  organizer: {
    '@type': 'Organization';
    name: 'AcroYoga Community';
    url: AbsoluteUrl;
  };
  offers: {
    '@type': 'Offer';
    /** 0 for free events */
    price: number;
    /** ISO 4217 currency code, e.g., "GBP" */
    priceCurrency: string;
    availability: SchemaAvailability;
    url: AbsoluteUrl;
  };
  /** Event poster image URL — omitted if no image exists */
  image?: AbsoluteUrl;
  url: AbsoluteUrl;
}

/**
 * Schema.org Person structured data block.
 * Generated by buildTeacherJsonLd() in lib/seo/structured-data.ts.
 */
export interface TeacherStructuredData {
  '@context': 'https://schema.org';
  '@type': 'Person';
  name: string;
  description: string;
  /** First teacher photo URL — omitted if no photos exist */
  image?: AbsoluteUrl;
  url: AbsoluteUrl;
  jobTitle: 'AcroYoga Teacher';
  affiliation: {
    '@type': 'Organization';
    name: 'AcroYoga Community';
    url: AbsoluteUrl;
  };
}

// ─── Sitemap Shapes ───────────────────────────────────────────────────────────

/**
 * Internal shape returned by getSitemapEvents() and getSitemapTeachers().
 * Consumed by app/sitemap.ts to build the MetadataRoute.Sitemap array.
 * Not exposed as an HTTP endpoint — sitemap.xml is generated by Next.js.
 */
export interface SitemapEntry {
  /** Canonical URL for this resource */
  url: AbsoluteUrl;
  /** Last-modification timestamp from DB updated_at */
  lastModified: Date;
  /** Crawler change-frequency hint */
  changeFrequency: 'daily' | 'weekly' | 'monthly';
  /** Relative crawl priority (0.0–1.0) */
  priority: number;
}

// ─── Share URL Construction ───────────────────────────────────────────────────

/** UTM source values for the share panel */
export type ShareSource = 'twitter' | 'whatsapp' | 'clipboard' | 'native';

/** UTM medium values */
export type ShareMedium = 'social' | 'referral';

/**
 * Constructed client-side. Not persisted or sent to server.
 * buildShareUrl() in SharePanel.tsx returns this value.
 */
export interface ShareURL {
  /** Full URL with UTM parameters appended */
  href: AbsoluteUrl;
  source: ShareSource;
  medium: ShareMedium;
  campaign: 'event-share';
}

// ─── Error Response ───────────────────────────────────────────────────────────

/**
 * Standard error envelope used by /api/og/* and /api/events/[id]/share.
 * Consistent with existing @/lib/errors helpers.
 */
export interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}
