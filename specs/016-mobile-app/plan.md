# Implementation Plan: Mobile App (Expo/React Native)

**Branch**: `016-mobile-app` | **Date**: 2026-04-04 | **Spec**: [specs/016-mobile-app/spec.md](spec.md)
**Input**: Feature specification from `/specs/016-mobile-app/spec.md`
**Status**: Draft

## Summary

Scaffold an Expo React Native app in `apps/mobile/` consuming the existing REST API, shared types, shared-ui components (`.native.tsx` entry points), and design tokens. Implement JWT authentication with secure storage, TanStack Query data fetching with MMKV offline persistence, Expo Router 5-tab navigation, and push notification integration. This is the largest spec — estimated 28+ tasks from Spec 008's deferred Phase 6, plus additional tasks for features added since (Spec 009–013).

## Technical Context

**Language/Version**: TypeScript 5.9 (strict mode), React Native 0.76+, Expo SDK 52+
**Primary Dependencies**: Expo (managed workflow), Expo Router (file-based navigation), TanStack Query (data fetching), MMKV (offline storage), expo-secure-store (JWT storage), expo-notifications (push)
**Storage**: MMKV for offline cache (50MB limit, LRU eviction), SecureStore for JWT
**Testing**: Jest + React Native Testing Library (unit), Detox (E2E on simulators)
**Target Platform**: iOS 16+, Android 13+ (API 33+)
**Project Type**: Mobile application (React Native via Expo, monorepo workspace)
**Performance Goals**: 60fps scrolling, cold start < 3s, TanStack Query cache reads < 10ms via MMKV
**Constraints**: No native module ejection (Expo managed workflow only); reuse shared packages; JWT auth (not session cookies); design tokens from `@acroyoga/tokens`

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. API-First Design | ✅ PASS | Consumes existing REST API. One new endpoint: `POST /api/auth/mobile-token` (JWT issuance from session). All shared types from `@acroyoga/shared`. |
| II. Test-First Development | ✅ PASS | Jest unit tests for hooks, API client, auth. Detox E2E for critical flows. |
| III. Privacy & Data Protection | ✅ PASS | JWT in SecureStore (Keychain/Keystore). MMKV cache contains public data only. EXIF stripping via existing server-side pipeline. |
| IV. Server-Side Authority | ✅ PASS | Mobile is a thin client. All business rules enforced by API. No client-side validation beyond UX. |
| V. UX Consistency | ✅ PASS | Shared design tokens (Swift/Kotlin/TS outputs). 20 shared-ui components with `.native.tsx` entry points. |
| VI. Performance Budget | ✅ PASS | FlatList with windowSize. Lazy screen loading. MMKV for fast cache reads. Hermes JS engine for fast startup. |
| VII. Simplicity | ✅ PASS | Expo managed workflow — no ejection, no native code. Shared packages reduce code duplication. |
| VIII. Internationalisation | ✅ PASS | Import translations from `@acroyoga/shared`. Use React Native's `Intl` polyfill (Hermes) for formatting. |
| IX. Scoped Permissions | N/A | Permissions enforced server-side. |
| X. Notification Architecture | ✅ PASS | Push notifications as new channel in Spec 015 preferences. expo-notifications for delivery. |
| XI. Resource Ownership | N/A | Enforced server-side. |
| XII. Financial Integrity | ✅ PASS | Payments via in-app browser (Stripe web checkout). No in-app purchase integration. |
| QG-5: Bundle Size | ✅ PASS | Expo manages JS bundle splitting. Hermes bytecode reduces parse time. |

**Gate result: PASS — no violations.**

## Project Structure

### Documentation

```text
specs/016-mobile-app/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Dependency-ordered tasks
```

### Source Code

```text
apps/mobile/                        # NEW — Expo React Native app
├── app/                             # Expo Router file-based routes
│   ├── _layout.tsx                  # Root layout (auth gate, providers)
│   ├── (auth)/                      # Auth group (login, register)
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (tabs)/                      # Authenticated tab group
│   │   ├── _layout.tsx              # Bottom tab bar configuration
│   │   ├── index.tsx                # Home tab (event feed)
│   │   ├── events/                  # Events tab (search/explore)
│   │   │   ├── _layout.tsx          # Stack navigator
│   │   │   ├── index.tsx            # Event list
│   │   │   └── [id].tsx             # Event detail
│   │   ├── teachers/                # Teachers tab
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── bookings/                # Bookings tab
│   │   │   └── index.tsx
│   │   └── profile/                 # Profile tab
│   │       ├── index.tsx
│   │       └── settings/
│   │           └── notifications.tsx
│   └── +not-found.tsx
├── lib/                             # Mobile-specific utilities
│   ├── auth.ts                      # JWT management, SecureStore
│   ├── api-client.ts                # Typed HTTP client with JWT headers
│   ├── offline.ts                   # MMKV cache, TanStack Query persister
│   └── connectivity.ts             # Network status hook (NetInfo)
├── app.json                         # Expo app configuration
├── eas.json                         # EAS Build configuration
├── metro.config.js                  # Metro bundler config (monorepo support)
├── tsconfig.json                    # TypeScript config (extends base)
├── package.json                     # Workspace package
└── __tests__/                       # Unit tests (Jest)

apps/web/src/app/api/auth/
└── mobile-token/route.ts            # NEW — JWT issuance endpoint

packages/shared/src/
├── hooks/                           # NEW — Shared data fetching hooks
│   ├── useEvents.ts                 # TanStack Query hook for events
│   ├── useTeachers.ts               # TanStack Query hook for teachers
│   └── useOnlineStatus.ts           # Cross-platform connectivity hook
└── types/
    └── auth.ts                      # MODIFIED — add MobileTokenResponse type
```

## Phase Breakdown

### Phase 1: Scaffolding & Configuration
Scaffold Expo app, configure Metro for monorepo, set up TypeScript, configure EAS Build.

### Phase 2: Authentication
Implement JWT auth flow, SecureStore, API client with auth headers, mobile-token API endpoint.

### Phase 3: Navigation & Layout
Set up Expo Router with 5-tab bottom navigation, nested stack navigators, platform-specific transitions.

### Phase 4: Core Screens (US1, US2)
Build Home feed, Events list/detail, RSVP flow. Validate shared-ui components render on native.

### Phase 5: Remaining Screens
Build Teachers list/detail, Bookings list, Profile page, Settings.

### Phase 6: Offline Support (US5)
Integrate MMKV persistence with TanStack Query, add connectivity monitoring, offline banner.

### Phase 7: Push Notifications (US6)
Integrate expo-notifications, register device token with server, handle notification taps for deep linking.

### Phase 8: Testing & Polish
Jest unit tests, Detox E2E, performance profiling (60fps), CI integration with EAS Build.

### Phase 9: Platform-Specific Optimization
iOS: back swipe gestures, haptic feedback, Dynamic Type. Android: material transitions, back button handling, edge-to-edge.
