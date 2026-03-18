# Contracts: Cross-Platform UI Component Interface

**Feature Branch**: `008-cross-platform-ui`  
**Created**: 2026-03-17

## Overview

This spec does not introduce new REST API endpoints — mobile apps consume the existing API-first endpoints. The contracts below define the **shared component interfaces**, **design token contract**, and **mobile auth extension** that form the inter-package boundaries.

---

## 1. Design Token Contract

### Input: Token Source File Schema (W3C DTCG)

Every token MUST conform to this shape:

```typescript
interface DesignToken {
  $value: string | number;
  $type: 'color' | 'dimension' | 'fontFamily' | 'fontWeight' | 'number' | 'shadow';
  $description?: string;
}

interface TokenGroup {
  [key: string]: DesignToken | TokenGroup;
}
```

### Output: Platform Build Artifacts

| Platform | Output Format | Path | Consumed By |
|----------|--------------|------|-------------|
| Web CSS | CSS custom properties | `packages/tokens/build/css/tokens.css` | `apps/web/` global stylesheet |
| Tailwind | TypeScript theme object | `packages/tokens/build/tailwind/tokens.ts` | `apps/web/` Tailwind config |
| iOS | Swift enum file | `packages/tokens/build/swift/DesignTokens.swift` | `apps/mobile/ios/` |
| Android | Kotlin object file | `packages/tokens/build/kotlin/DesignTokens.kt` | `apps/mobile/android/` |
| TypeScript | ES6 constants | `packages/tokens/build/ts/tokens.ts` | `packages/shared-ui/` |

### Contract: Token Change → Platform Propagation

1. Developer edits `packages/tokens/src/*.tokens.json`
2. Style Dictionary rebuilds all platform outputs
3. Web: CSS variables reload via HMR → browser updates
4. Mobile: TypeScript constants update → Expo Fast Refresh re-renders
5. CI: Build verifies all platform outputs are consistent

---

## 2. Shared Component Interface Contract

### Base Component Props

All shared components MUST extend this base:

```typescript
/** Base props shared by all cross-platform components */
interface SharedComponentProps {
  /** Unique test identifier for integration tests */
  testID?: string;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  /** Accessibility role hint */
  accessibilityRole?: 'button' | 'link' | 'header' | 'image' | 'text' | 'none';
}
```

### Button Component Contract

```typescript
interface ButtonProps extends SharedComponentProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}
```

### Card Component Contract

```typescript
interface CardProps extends SharedComponentProps {
  variant: 'default' | 'elevated' | 'outlined';
  onPress?: () => void;
  children: React.ReactNode;
}
```

### EventCard Component Contract

```typescript
interface EventCardProps extends SharedComponentProps {
  event: {
    id: string;
    title: string;
    date: string;           // ISO 8601
    location: string;
    imageUrl?: string;
    spotsLeft: number;
    totalSpots: number;
    price?: { amount: number; currency: string };
    tags: string[];
  };
  variant: 'compact' | 'expanded';
  onPress: (eventId: string) => void;
}
```

### Platform Rendering Contract

Each shared component has two renderers that MUST satisfy:

```typescript
/** Web renderer — receives shared props, returns JSX with HTML elements + Tailwind */
type WebRenderer<P> = React.FC<P>;

/** Native renderer — receives shared props, returns JSX with RN View/Text + StyleSheet */
type NativeRenderer<P> = React.FC<P>;
```

File resolution:
- `Component.web.tsx` → imported by Next.js / webpack
- `Component.native.tsx` → imported by Expo / Metro

---

## 3. Mobile Authentication Extension

### Endpoint: `POST /api/auth/mobile-token`

Exchanges a NextAuth session for a mobile-compatible JWT.

**Request:**
```typescript
// Client sends the existing session cookie (from a WebView login flow)
// No request body needed — session is read from cookie
```

**Response (200):**
```typescript
interface MobileTokenResponse {
  accessToken: string;   // JWT, signed with NEXTAUTH_SECRET
  expiresAt: string;     // ISO 8601 timestamp
  userId: string;
}
```

**Response (401):**
```typescript
interface ApiError {
  error: string;
  code: string;
}
// { error: "Authentication required", code: "UNAUTHORIZED" }
```

**Mobile client usage:**
```typescript
// All API calls from mobile include:
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
}
```

### Server middleware contract

The existing `requireAuth()` middleware MUST be extended to accept:
1. NextAuth session cookie (existing — web)
2. `Authorization: Bearer <jwt>` header (new — mobile)

Both resolve to the same `{ userId, email, roles }` identity object.

---

## 4. TanStack Query Hook Contracts

All data-fetching hooks live in `packages/shared/hooks/` and are consumed by both web and mobile.

### useEvents Hook

```typescript
interface UseEventsOptions {
  city?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

function useEvents(options?: UseEventsOptions): UseQueryResult<{
  events: Event[];
  total: number;
  page: number;
  limit: number;
}>;
```

### useEventDetail Hook

```typescript
function useEventDetail(eventId: string): UseQueryResult<Event>;
```

### useRSVP Mutation Hook

```typescript
function useRSVP(): UseMutationResult<
  { rsvpId: string; status: 'confirmed' | 'waitlisted' },
  Error,
  { eventId: string }
>;
```

### Query Key Convention

All query keys follow the pattern: `[resource, ...params]`

```typescript
// Examples:
queryKey: ['events', { city, category, page }]
queryKey: ['events', eventId]
queryKey: ['teachers']
queryKey: ['teachers', teacherId]
queryKey: ['bookings', userId]
queryKey: ['profile', userId]
```

---

## 5. Navigation Route Map (Mobile)

```typescript
/** Bottom tab routes */
type TabRoutes = 'Home' | 'Events' | 'Teachers' | 'Bookings' | 'Profile';

/** Deep link URL scheme mapping */
const deepLinkConfig = {
  prefixes: ['acroyoga://', 'https://acroyoga.community'],
  screens: {
    Home: '',
    Events: 'events',
    EventDetail: 'events/:eventId',
    Teachers: 'teachers',
    TeacherDetail: 'teachers/:teacherId',
    Bookings: 'bookings',
    Profile: 'profile',
    Settings: 'settings',
  },
};
```
