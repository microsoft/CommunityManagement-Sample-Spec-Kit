# Testing Guide

> **Test Runner**: [Vitest 4](https://vitest.dev) with global APIs  
> **E2E**: [Playwright](https://playwright.dev) for browser-level testing  
> **Database**: [PGlite](https://electric-sql.com/product/pglite) — in-memory PostgreSQL  
> **DOM**: jsdom for React component tests  
> **Accessibility**: axe-core via Storybook  
> **CI**: Tests run on every PR via GitHub Actions

## Running Tests

```bash
# Run all tests (tokens → shared-ui → web)
npm run test

# Run tests for a specific workspace
npm run test -w @acroyoga/tokens      # 20 token pipeline tests
npm run test -w @acroyoga/shared-ui   # 85 component tests
npm run test -w @acroyoga/web         # 630+ integration & unit tests

# Watch mode for development
npm run test:watch
```

## Test Organization

```
apps/web/tests/
├── helpers/
│   ├── db.ts                # createTestDb(), applyMigrations(), setTestDb(), clearTestDb()
│   └── users.ts             # seedSampleUsers(), seedSampleUser()
├── integration/             # API route integration tests
│   ├── account/             # GDPR export download
│   ├── community/           # Follows, blocks, profiles, threads, GDPR
│   ├── events/              # CRUD, RSVP, waitlist, venues, credits
│   ├── gdpr/                # Data export
│   ├── journeys/            # Cross-feature user journeys
│   ├── payments/            # Stripe Connect, webhook, callback, auth, status
│   ├── permissions/         # Grants, scope hierarchy, audit log
│   ├── recurring/           # Event groups, bookings, concessions
│   ├── requests/            # Permission request lifecycle
│   ├── teachers/            # Profiles, certifications, reviews, photos
│   ├── social-user.test.ts  # Social login provisioning
│   ├── login-redirect.test.ts
│   ├── health.test.ts
│   ├── link-account.test.ts
│   └── gdpr-social.test.ts
└── unit/                    # Pure function unit tests
    ├── auth-middleware.test.ts    # requireAuth() middleware
    ├── rate-limit.test.ts        # Rate limiting middleware
    ├── share-meta.test.ts        # OG/social share metadata
    ├── url-bookmark.test.ts
    ├── extractMapMarkers.test.ts
    ├── completeness.test.ts
    ├── category-colors.test.ts
    ├── CalendarPanel.test.tsx
    ├── LocationTreePanel.test.tsx
    ├── MapMarkerPopup.test.tsx
    ├── DateQuickPicks.test.tsx
    └── CategoryLegendBar.test.tsx
```

## Integration Test Pattern

Integration tests exercise API route handlers with a real (in-memory) PostgreSQL database.

### Basic Setup

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { createTestDb, setTestDb, clearTestDb } from "../helpers/db";

describe("My API route", () => {
  let testDb: PGlite;

  beforeAll(async () => {
    testDb = await createTestDb();  // Creates PGlite with all migrations applied
    setTestDb(testDb);              // Injects into the application's DB client
  });

  afterAll(() => {
    clearTestDb();                  // Restores the default DB client
  });

  it("returns expected data", async () => {
    // Dynamically import the route handler
    const { GET } = await import("../../src/app/api/my-route/route");

    // Create a Request object
    const request = new Request("http://localhost/api/my-route");

    // Call the handler directly
    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("expected_field");
  });
});
```

### Key Concepts

1. **`createTestDb()`** — Creates a fresh PGlite instance and applies all SQL migrations in order. Each test suite gets an isolated database.

2. **`setTestDb(db)`** — Replaces the application's database client with the test database. All route handlers then query the test DB.

3. **`clearTestDb()`** — Restores the default database client after tests complete.

4. **Dynamic imports** — Route handlers are imported dynamically so they pick up the test database injection.

### Per-Test Isolation

For tests that need a clean database between tests (not just test files):

```typescript
import { PGlite } from "@electric-sql/pglite";
import { applyMigrations, setTestDb, clearTestDb } from "../helpers/db";
import { clearCache } from "../../src/lib/permissions/cache";

describe("Permission operations", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = new PGlite();
    await applyMigrations(db);
    setTestDb(db);
    clearCache();  // Clear the permission cache between tests
  });

  afterEach(async () => {
    clearTestDb();
    clearCache();
    await db.close();
  });
});
```

## Seeding Test Data

### Mock Users

```typescript
import { seedSampleUsers, seedSampleUser } from "../helpers/users";

// Seed all sample users with permissions and geography
await seedSampleUsers(testDb);

// Seed a single user by slug
await seedSampleUser(testDb, "alice");
```

The `seedSampleUsers()` helper:
- Seeds geography reference data (cities, countries, continents)
- Creates users from `@/lib/auth/mock-users` (SAMPLE_USERS)
- Grants permissions (global admin, city admin, event creator)
- Uses `ON CONFLICT` for idempotent inserts

### Geography Data

```typescript
import { seedGeography } from "../helpers/db";

await seedGeography(db);  // Seeds continents, countries, and cities
```

### Creating Users Programmatically

```typescript
async function createUser(db: PGlite, email: string): Promise<string> {
  const result = await db.query(
    "INSERT INTO users (id, email) VALUES (gen_random_uuid(), $1) RETURNING id",
    [email]
  );
  return result.rows[0].id;
}
```

## Testing Auth & Permissions

### Mock Authentication

Tests mock the session by controlling which user is "authenticated":

```typescript
// Set the mock user before importing route handlers
process.env.MOCK_USER_SLUG = "alice";

// Import and call the route handler
const { POST } = await import("../../src/app/api/my-route/route");
const response = await POST(request);
```

### vi.mock Pattern for Session Control

For HTTP-level route tests, use `vi.mock` to control `getServerSession`:

```typescript
import { vi } from "vitest";

// Mock session at module level
vi.mock("@/lib/auth/session", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "@/lib/auth/session";
const mockGetServerSession = vi.mocked(getServerSession);

// In tests — set auth state
mockGetServerSession.mockResolvedValue({ userId: "user-123" }); // authenticated
mockGetServerSession.mockResolvedValue(null);                    // unauthenticated

// Call route handler directly
const { GET } = await import("@/app/api/my-route/route");
const response = await GET();
expect(response.status).toBe(200);

// Clean up
afterEach(() => { vi.resetAllMocks(); });
```

### Testing 403 for Unauthorized Callers

**Constitution QG-10 requires** every new mutation endpoint to include a test proving 403 for an unauthorized caller:

```typescript
it("returns 403 for non-owner", async () => {
  // Create resource owned by user A
  await createEventOwnedBy(db, userA);

  // Attempt to modify as user B (not owner, not admin)
  process.env.MOCK_USER_SLUG = "user-b";
  const { PATCH } = await import("../../src/app/api/events/[id]/route");

  const request = new Request("http://localhost/api/events/123", {
    method: "PATCH",
    body: JSON.stringify({ title: "hacked" }),
  });

  const response = await PATCH(request, { params: { id: "123" } });
  expect(response.status).toBe(403);
});
```

### Testing Permission Hierarchy

```typescript
it("city admin cannot modify resources outside their city", async () => {
  // Grant city_admin for Bristol
  await grantPermission(db, userId, "city_admin", "city", "bristol");

  // Attempt to modify resource in London
  const response = await modifyResource(londonResourceId);
  expect(response.status).toBe(403);
});
```

## Unit Test Pattern

Unit tests verify pure functions without database or network access:

```typescript
import { describe, it, expect } from "vitest";
import { mapFiltersToQuery } from "../../src/lib/explorer-api";

describe("URL bookmark fidelity", () => {
  it("serializes empty filters to minimal query", () => {
    const query = mapFiltersToQuery({
      categories: [],
      dateRange: null,
      location: null,
    });
    expect(query.category).toBeUndefined();
  });

  it("round-trips category filter", () => {
    const query = mapFiltersToQuery({ categories: ["jam", "workshop"] });
    const parsed = parseQueryToFilters(query);
    expect(parsed.categories).toEqual(["jam", "workshop"]);
  });
});
```

## Component Test Pattern

React component tests use `@testing-library/react` with jsdom:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalendarPanel } from "../../src/components/events/CalendarPanel";

describe("CalendarPanel", () => {
  it("renders month navigation buttons", () => {
    render(<CalendarPanel events={[]} onDateSelect={() => {}} />);
    expect(screen.getByRole("button", { name: /previous/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /next/i })).toBeDefined();
  });
});
```

## Vitest Configuration

### Root Level (`vitest.config.ts`)

Orchestrates monorepo test projects:

```typescript
export default defineConfig({
  test: {
    globals: true,
    projects: ["apps/*/vitest.config.ts", "packages/*/vitest.config.ts"],
  },
});
```

### Web App (`apps/web/vitest.config.ts`)

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: "threads",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@acroyoga/shared": path.resolve(__dirname, "../../packages/shared/src"),
      "@acroyoga/shared-ui": path.resolve(__dirname, "../../packages/shared-ui/src"),
      "@acroyoga/tokens": path.resolve(__dirname, "../../packages/tokens/src"),
    },
  },
});
```

## Test Coverage Areas

| Domain | Test Files | Focus |
|--------|-----------|-------|
| Events | 8 | CRUD, RSVP, waitlist, venues, credits, interest, filter counts |
| Community | 5 | Profiles, threads, reports, GDPR, follows, blocks/mutes |
| Permissions | 6 | Grant/revoke, scope hierarchy, unauthorized access, audit log, multi-grant |
| Recurring | 4 | Event groups, recurrence, bookings, concessions/capacity |
| Teachers | 6 | Profiles, certifications, event-teachers, applications, reviews, photo CRUD |
| Payments | 6 | Stripe Connect, webhook signature validation, OAuth callback, connect authorization, status endpoint, unauthorized access |
| Requests | 2 | Request lifecycle, unauthorized access |
| Auth | 4 | Social user provisioning, login redirect, account linking, GDPR social |
| GDPR | 2 | Data export, export download (ownership, status validation) |
| Explorer | 3 | Calendar views, category filter, responsive layout |
| Journeys | 2 | Friend visibility, blocked user visibility |
| Health | 1 | Health check endpoints |
| Unit | 9 | URL bookmarks, map markers, completeness, category colors, components |

## Best Practices

1. **Isolate databases** — Use `createTestDb()` per test suite. For tests that modify state heavily, use `beforeEach` with a fresh PGlite instance.

2. **Clear caches** — Call `clearCache()` between tests when testing permissions. The permission system caches grants in memory.

3. **Dynamic imports** — Always import route handlers dynamically to ensure they use the test database client.

4. **Test the 403 path** — Every mutation endpoint needs a test proving unauthorized callers get 403 (Constitution QG-10).

5. **Seed minimally** — Only seed the data your test needs. Use `seedSampleUser(db, slug)` for a single user rather than `seedSampleUsers()` when possible.

6. **30-second timeout** — PGlite operations can be slow on first run. The 30-second timeout accommodates migration application.

7. **No skipped tests** — Skipped tests require a linked GitHub issue. CI enforces this.

---

## E2E Tests (Playwright)

> **Runner**: [Playwright](https://playwright.dev)  
> **Browser**: Chromium  
> **Mocking**: Route interception — no real database needed

### Running E2E Tests

```bash
# Install browsers (first time only)
npx playwright install --with-deps chromium

# Run E2E tests (starts Next.js dev server automatically)
npm run test:e2e -w @acroyoga/web
```

### Test Organization

```
apps/web/e2e/
├── fixtures.ts                   # Shared fixtures, mock data, API interception
├── calendar-panel.spec.ts        # Calendar month grid, navigation, day selection
├── map-interactions.spec.ts      # Map rendering, tile layer, count toggle
└── location-tree.spec.ts         # Location tree, search filtering, URL updates
```

### How API Mocking Works

E2E tests use Playwright's `page.route()` to intercept API calls and return
deterministic mock data. This means tests run without a database or external
services:

```typescript
import { test, expect } from "./fixtures";

test("my test", async ({ explorerPage: page }) => {
  // `explorerPage` fixture automatically:
  // 1. Intercepts /api/events and /api/cities with mock data
  // 2. Navigates to /events
  // 3. Waits for the page to load
  await expect(page.locator('[role="grid"]')).toBeVisible();
});
```

### Configuration

Playwright config lives at `apps/web/playwright.config.ts`. Key settings:

- **webServer**: Starts `next dev` on port 3000 automatically
- **retries**: 1 on CI, 0 locally
- **trace**: Captured on first retry for debugging
- **screenshots**: Captured on failure

---

## Internationalisation (i18n) Testing

### Unit Tests for Formatting Helpers

Test file: `apps/web/tests/unit/i18n-format.test.ts`

Tests the shared `Intl` formatting helpers (`formatEventDate`, `formatCurrency`, `formatRelativeTime`, `formatNumber`) with explicit locale and timezone parameters:

```typescript
import { formatEventDate, formatCurrency } from "@acroyoga/shared/utils/format";

// Always pass explicit locale and timezone for deterministic results
expect(formatEventDate("2026-04-15T14:30:00Z", "en", "UTC")).toContain("Apr");
expect(formatCurrency(25.5, "USD", "en")).toContain("$25.50");
```

### Translation Key Completeness

Test file: `apps/web/tests/unit/i18n-completeness.test.ts`

Validates that every key in `en.json` exists in all other locale files, and vice versa. Runs as part of the standard test suite.

### Mocking next-intl in Integration Tests

For components that use `useTranslations()`:

```typescript
vi.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
  useLocale: () => "en",
}));
```

### RTL Layout Testing

Test file: `apps/web/tests/integration/i18n/rtl-layout.test.ts`

Verifies that Arabic locale returns RTL direction and that Arabic translation files exist with proper content. For visual RTL testing, force `dir="rtl"` on the `<html>` element.

### Locale Switching

Test file: `apps/web/tests/integration/i18n/locale-switch.test.ts`

Tests the locale infrastructure: supported locales metadata, direction mapping, and default locale configuration.

---

*For database schema details, see `docs/database.md`. For API endpoint reference, see `docs/api-reference.md`.*
