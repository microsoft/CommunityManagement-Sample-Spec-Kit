# Data Model: Internationalisation (i18n)

**Spec**: 014 | **Date**: 2026-04-04

## Overview

The internationalisation feature introduces **no new database tables**. It is a purely client-side and build-time concern. Translation files are static JSON assets. Locale preference is stored in a browser cookie. Formatting helpers use the browser's built-in `Intl` APIs.

## Entity Relationship Overview

```
                    ┌──────────────────────────┐
                    │   Locale Configuration    │
                    │   (next-intl config)      │
                    └────────┬─────────────────┘
                             │
              ┌──────────────┼──────────────────┐
              ▼              ▼                   ▼
  ┌───────────────┐  ┌─────────────┐   ┌──────────────┐
  │ Translation   │  │  Formatting │   │ Locale       │
  │ Files (JSON)  │  │  Helpers    │   │ Switcher UI  │
  │ messages/*.json│  │  (Intl API) │   │              │
  └───────┬───────┘  └──────┬──────┘   └──────┬───────┘
          │                 │                  │
          ▼                 ▼                  ▼
  ┌───────────────────────────────────────────────────┐
  │           React Components (UI Layer)              │
  │  useTranslations() hook → translated string        │
  │  formatDate() / formatCurrency() → formatted value │
  │  dir="rtl" / dir="ltr" → layout direction          │
  └───────────────────────────────────────────────────┘
```

## 1. Translation File Schema

Each locale has a JSON file in `apps/web/messages/` with a flat namespace hierarchy.

| Namespace | Purpose | Example Keys |
|-----------|---------|-------------|
| `common` | Shared UI elements | `common.loading`, `common.error`, `common.save`, `common.cancel` |
| `events` | Event-related strings | `events.rsvp`, `events.free`, `events.capacity`, `events.waitlist` |
| `community` | Social features | `community.follow`, `community.block`, `community.report` |
| `permissions` | Admin/role strings | `permissions.grantSuccess`, `permissions.revokeConfirm` |
| `teachers` | Teacher profiles | `teachers.verified`, `teachers.certification`, `teachers.review` |
| `payments` | Payment strings | `payments.connectButton`, `payments.connected` |
| `directory` | User directory | `directory.search`, `directory.filter`, `directory.noResults` |
| `explorer` | Events explorer | `explorer.calendar`, `explorer.map`, `explorer.tree` |
| `auth` | Authentication | `auth.login`, `auth.register`, `auth.logout` |
| `errors` | Error messages | `errors.notFound`, `errors.unauthorized`, `errors.serverError` |

### File Format

```json
{
  "common": {
    "loading": "Loading…",
    "error": "Something went wrong",
    "save": "Save",
    "cancel": "Cancel",
    "actions": "Actions",
    "networkError": "Network error — please try again"
  },
  "events": {
    "free": "Free",
    "rsvp": "RSVP",
    "capacity": "{current} / {max} spots",
    "waitlist": "Join waitlist",
    "date": "{date, date, medium}",
    "time": "{time, time, short}"
  }
}
```

**ICU MessageFormat** is used for parameterized strings (e.g., `{current} / {max} spots`).

## 2. Locale Configuration

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `defaultLocale` | `SupportedLocale` | `"en"` | English — always available as fallback |
| `supportedLocales` | `SupportedLocale[]` | `["en", "es"]` | Extensible by adding JSON file + entry |
| `localeDirection` | `Record<SupportedLocale, "ltr" \| "rtl">` | `{ en: "ltr", es: "ltr" }` | RTL for Arabic, Hebrew, etc. |
| `localeDetectionOrder` | `string[]` | `["cookie", "header", "default"]` | Cookie first, then Accept-Language, then default |

### Type Definition

```typescript
// packages/shared/src/types/i18n.ts
export type SupportedLocale = "en" | "es"; // Extend as locales are added
export type Direction = "ltr" | "rtl";

export interface LocaleConfig {
  defaultLocale: SupportedLocale;
  supportedLocales: readonly SupportedLocale[];
  localeDirection: Record<SupportedLocale, Direction>;
}
```

## 3. Formatting Helper Signatures

```typescript
// packages/shared/src/utils/format.ts

/** Format a date with locale and timezone awareness */
export function formatEventDate(
  date: string | Date,
  options?: {
    locale?: string;
    timeZone?: string;
    style?: "full" | "long" | "medium" | "short";
    includeTime?: boolean;
  }
): string;

/** Format currency with ISO 4217 validation */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  locale?: string
): string;

/** Format relative time (e.g., "3 hours ago") */
export function formatRelativeTime(
  date: string | Date,
  locale?: string
): string;

/** Format a number with locale-aware separators */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions & { locale?: string }
): string;
```

## 4. Cookie Schema

| Cookie Name | Value | Max-Age | Path | Notes |
|-------------|-------|---------|------|-------|
| `NEXT_LOCALE` | `SupportedLocale` (e.g., `"es"`) | 1 year | `/` | Standard `next-intl` cookie name |

## 5. Migration from Existing `translations.ts`

The existing `packages/shared/src/utils/translations.ts` module contains 41 strings across 7 categories. These will be:

1. **Migrated** into `apps/web/messages/en.json` under their respective namespaces
2. **Re-exported** as translation key constants for backward compatibility
3. **Deprecated** once all consumers use `useTranslations()` hook directly

### Mapping

| Current Category | New Namespace | Example |
|-----------------|---------------|---------|
| `translations.roles.*` | `permissions.roles.*` | `permissions.roles.globalAdmin` |
| `translations.scopes.*` | `permissions.scopes.*` | `permissions.scopes.global` |
| `translations.permissions.*` | `permissions.*` | `permissions.grantSuccess` |
| `translations.requests.*` | `permissions.requests.*` | `permissions.requests.submitSuccess` |
| `translations.payments.*` | `payments.*` | `payments.connectButton` |
| `translations.common.*` | `common.*` | `common.loading` |

## Database Changes

**None.** This spec introduces no database tables or migrations. Locale preference is stored client-side in a cookie. All translation data is static JSON served as part of the Next.js build.
