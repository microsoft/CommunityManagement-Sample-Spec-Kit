# Tasks: Mobile App (Expo/React Native)

**Input**: Design documents from `/specs/016-mobile-app/`, Spec 008 Phase 6 deferred tasks (T051–T079)
**Prerequisites**: plan.md (required), spec.md (required)

**Tests**: Constitution mandates test-first development. Tests are included and MUST fail before implementation.

**Organization**: Tasks are grouped by phase. This is the largest spec — 9 phases with 60+ tasks. Many tasks map directly to Spec 008's deferred Phase 6 tasks (T051–T079).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Mobile app**: `apps/mobile/`
- **Mobile routes**: `apps/mobile/app/`
- **Mobile lib**: `apps/mobile/lib/`
- **Mobile tests**: `apps/mobile/__tests__/`
- **Shared hooks**: `packages/shared/src/hooks/`
- **Shared types**: `packages/shared/src/types/`
- **Web API routes**: `apps/web/src/app/api/`
- **Web integration tests**: `apps/web/tests/integration/`

---

## Phase 1: Scaffolding & Configuration (Blocking Prerequisites)

**Purpose**: Create Expo project, configure monorepo integration, TypeScript, EAS Build

*Maps to Spec 008 T051–T055*

- [ ] T001 [US4] Scaffold Expo app in `apps/mobile/` using `npx create-expo-app`. Configure `package.json` with workspace name `@acroyoga/mobile` and dependencies on `@acroyoga/shared`, `@acroyoga/shared-ui`, `@acroyoga/tokens`
- [ ] T002 [P] [US4] Configure `apps/mobile/metro.config.js` for monorepo — resolve `packages/shared`, `packages/shared-ui`, `packages/tokens` via `watchFolders` and `nodeModulesPaths`
- [ ] T003 [P] [US4] Configure `apps/mobile/tsconfig.json` extending `../../tsconfig.base.json` with React Native path aliases and JSX settings
- [ ] T004 [P] [US4] Configure `apps/mobile/app.json` — app name, slug, scheme (deep links), iOS bundleIdentifier, Android package, icons, splash screen
- [ ] T005 [P] [US4] Configure `apps/mobile/eas.json` — development, preview, and production build profiles for iOS and Android

**Checkpoint**: Expo app scaffolded, Metro resolves monorepo packages, TypeScript compiles, `npx expo start` launches without errors.

---

## Phase 2: Authentication (US3 — Mobile Auth)

**Purpose**: Implement JWT auth, SecureStore, API client, server-side token endpoint

### Tests for Phase 2

- [ ] T006 [P] [US3] Unit tests for auth module — JWT storage, retrieval, refresh, expiry check in `apps/mobile/__tests__/auth.test.ts`
- [ ] T007 [P] [US3] Unit tests for API client — auth header injection, 401 handling, token refresh retry in `apps/mobile/__tests__/api-client.test.ts`
- [ ] T008 [P] [US3] Integration test for mobile-token endpoint — session validation, JWT issuance, 401 for unauthenticated in `apps/web/tests/integration/auth/mobile-token.test.ts`

### Implementation for Phase 2

- [ ] T009 [US3] Create JWT auth module in `apps/mobile/lib/auth.ts` — `signIn()`, `signOut()`, `getToken()`, `refreshToken()`, `isAuthenticated()` using `expo-secure-store` for JWT storage
- [ ] T010 [US3] Create typed API client in `apps/mobile/lib/api-client.ts` — base URL configuration, automatic JWT header injection, 401 interception with token refresh, typed request/response using `@acroyoga/shared` types
- [ ] T011 [US3] Create `POST /api/auth/mobile-token` API route in `apps/web/src/app/api/auth/mobile-token/route.ts` — validates existing session, issues JWT with user claims, supports refresh tokens. Protected by `requireAuth()`
- [ ] T012 [US3] Add `MobileTokenResponse` type to `packages/shared/src/types/auth.ts` — `{ token: string, refreshToken: string, expiresAt: string }`

**Checkpoint**: Authentication functional — user can sign in, JWT stored securely, API client sends authenticated requests.

---

## Phase 3: Navigation & Layout (US4 — Five-Tab Navigation)

**Purpose**: Set up Expo Router with 5-tab bottom navigation, nested stacks, platform transitions

### Tests for Phase 3

- [ ] T013 [P] [US4] Unit tests for navigation configuration — tab routes, stack screens, auth gate redirect in `apps/mobile/__tests__/navigation.test.ts`

### Implementation for Phase 3

- [ ] T014 [US4] Create root layout `apps/mobile/app/_layout.tsx` — auth gate (redirect to login if not authenticated), global providers (TanStack Query, theme)
- [ ] T015 [US4] Create auth group layout `apps/mobile/app/(auth)/_layout.tsx` and login screen `apps/mobile/app/(auth)/login.tsx`
- [ ] T016 [US4] Create tab layout `apps/mobile/app/(tabs)/_layout.tsx` — 5 tabs (Home, Events, Teachers, Bookings, Profile) with icons from `@expo/vector-icons`, platform-specific tab bar styling
- [ ] T017 [P] [US4] Create Events tab stack `apps/mobile/app/(tabs)/events/_layout.tsx` — stack navigator with native transitions (push on iOS, material on Android)
- [ ] T018 [P] [US4] Create Teachers tab stack `apps/mobile/app/(tabs)/teachers/_layout.tsx`
- [ ] T019 [P] [US4] Create Profile tab stack with settings nesting `apps/mobile/app/(tabs)/profile/`
- [ ] T020 [US4] Create not-found screen `apps/mobile/app/+not-found.tsx`

**Checkpoint**: 5-tab navigation functional. Auth gate redirects unauthenticated users. Platform-appropriate transitions.

---

## Phase 4: Core Screens — Events (US1, US2)

**Purpose**: Build Home feed, Events list/detail, RSVP flow

### Tests for Phase 4

- [ ] T021 [P] [US1] Unit tests for shared `useEvents` hook — query key generation, pagination, filter params in `packages/shared/src/hooks/__tests__/useEvents.test.ts`
- [ ] T022 [P] [US1] Unit tests for Home screen rendering — event list, loading state, empty state in `apps/mobile/__tests__/screens/home.test.tsx`
- [ ] T023 [P] [US2] Unit tests for RSVP flow — role selection, submission, error handling in `apps/mobile/__tests__/screens/rsvp.test.tsx`

### Implementation for Phase 4

- [ ] T024 [US1] Create shared `useEvents` hook in `packages/shared/src/hooks/useEvents.ts` — TanStack Query hook wrapping `GET /api/events` with filter params, pagination, and cache key
- [ ] T025 [US1] Create Home tab screen `apps/mobile/app/(tabs)/index.tsx` — FlatList of upcoming events using shared `EventCard` component (`.native.tsx`), pull-to-refresh, loading/empty states
- [ ] T026 [US1] Create Events list screen `apps/mobile/app/(tabs)/events/index.tsx` — searchable, filterable event list with category filter chips
- [ ] T027 [US1] Create Event detail screen `apps/mobile/app/(tabs)/events/[id].tsx` — full event details, map preview, attendee count, RSVP button
- [ ] T028 [US2] Create RSVP action in Event detail — role selection bottom sheet, API submission, success/error feedback, navigate to bookings on success

**Checkpoint**: Event browsing and RSVP functional. Shared-ui EventCard renders on native.

---

## Phase 5: Remaining Screens (US1, US4)

**Purpose**: Build Teachers, Bookings, Profile screens

### Tests for Phase 5

- [ ] T029 [P] [US1] Unit tests for shared `useTeachers` hook in `packages/shared/src/hooks/__tests__/useTeachers.test.ts`

### Implementation for Phase 5

- [ ] T030 [US1] Create shared `useTeachers` hook in `packages/shared/src/hooks/useTeachers.ts`
- [ ] T031 [US1] Create Teachers list screen `apps/mobile/app/(tabs)/teachers/index.tsx` — FlatList with search, certification badges
- [ ] T032 [US1] Create Teacher detail screen `apps/mobile/app/(tabs)/teachers/[id].tsx` — profile, certifications, reviews, upcoming events
- [ ] T033 [US4] Create Bookings screen `apps/mobile/app/(tabs)/bookings/index.tsx` — list of user's RSVPs grouped by upcoming/past
- [ ] T034 [US4] Create Profile screen `apps/mobile/app/(tabs)/profile/index.tsx` — user info, social links, edit profile action
- [ ] T035 [P] [US4] Create Notification settings screen `apps/mobile/app/(tabs)/profile/settings/notifications.tsx` — reuse preference types from Spec 015

**Checkpoint**: All 5 tabs have content. Core mobile experience is complete.

---

## Phase 6: Offline Support (US5)

**Purpose**: MMKV persistence, connectivity monitoring, offline banner

### Tests for Phase 6

- [ ] T036 [P] [US5] Unit tests for offline module — MMKV serialization, cache size management, LRU eviction in `apps/mobile/__tests__/offline.test.ts`
- [ ] T037 [P] [US5] Unit tests for connectivity hook — online/offline state transitions, event listeners in `apps/mobile/__tests__/connectivity.test.ts`

### Implementation for Phase 6

- [ ] T038 [US5] Create offline module in `apps/mobile/lib/offline.ts` — TanStack Query persister using `react-native-mmkv`, cache size limit (50MB), LRU eviction strategy
- [ ] T039 [US5] Create connectivity module in `apps/mobile/lib/connectivity.ts` — `useOnlineStatus()` hook using `@react-native-community/netinfo`, online/offline event handling
- [ ] T040 [US5] Integrate offline persistence with TanStack Query in root layout — `PersistQueryClientProvider` with MMKV persister
- [ ] T041 [US5] Add `OfflineBanner` (shared-ui `.native.tsx`) to root layout — visible when offline, auto-hides when online

**Checkpoint**: Cached data available offline. Connectivity transitions handled gracefully.

---

## Phase 7: Push Notifications (US6)

**Purpose**: expo-notifications integration, device token registration, deep link handling

*Depends on Spec 015 (Background Jobs & Notifications)*

### Tests for Phase 7

- [ ] T042 [P] [US6] Unit tests for push notification setup — permission request, token registration, notification tap handler in `apps/mobile/__tests__/push.test.ts`

### Implementation for Phase 7

- [ ] T043 [US6] Configure `expo-notifications` in `apps/mobile/app.json` — iOS APNs, Android FCM credentials
- [ ] T044 [US6] Create push notification module in `apps/mobile/lib/push.ts` — request permission, register device token with server, handle foreground/background notifications
- [ ] T045 [US6] Create `POST /api/notifications/devices` API route in `apps/web/src/app/api/notifications/devices/route.ts` — register device token for push delivery
- [ ] T046 [US6] Implement notification tap deep linking — parse notification data, navigate to relevant screen using Expo Router

**Checkpoint**: Push notifications delivered to device. Tapping navigates to relevant content.

---

## Phase 8: Testing & CI (All Stories)

**Purpose**: Comprehensive testing, CI integration with EAS Build

- [ ] T047 [P] Verify all shared-ui components render correctly on iOS simulator — snapshot test each of the 17 components in `apps/mobile/__tests__/shared-ui/`
- [ ] T048 [P] Verify all shared-ui components render correctly on Android emulator
- [ ] T049 Create Detox E2E test for login → browse events → RSVP flow on iOS in `apps/mobile/e2e/`
- [ ] T050 [P] Create Detox E2E test for same flow on Android
- [ ] T051 Add mobile CI step to `.github/workflows/ci.yml` — install, typecheck, unit test (no device-dependent E2E in CI)
- [ ] T052 Configure EAS Build in CI — preview builds on PR, production builds on main merge

**Checkpoint**: All tests pass. CI builds mobile app.

---

## Phase 9: Platform-Specific Optimization (US1, US4)

**Purpose**: iOS and Android specific polish

- [ ] T053 [US4] iOS: Verify native back swipe gesture works correctly in all stack navigators
- [ ] T054 [P] [US4] iOS: Add haptic feedback to RSVP confirmation and tab switches
- [ ] T055 [P] [US4] iOS: Support Dynamic Type (system font size) for accessibility
- [ ] T056 [US4] Android: Verify hardware back button navigation in all screens
- [ ] T057 [P] [US4] Android: Configure material transitions (shared element transitions for event detail)
- [ ] T058 [P] [US4] Android: Configure edge-to-edge display with proper status bar handling

---

## Phase 10: Polish & Documentation

- [ ] T059 Update `README.md` — add Spec 016 to specs table, add mobile workspace to project structure
- [ ] T060 Update deferred mobile tasks in Spec 008 (T051–T079) — change status to "addressed by Spec 016"
- [ ] T061 Close GitHub issues #370–#375 (deferred mobile tasks) with reference to Spec 016
- [ ] T062 Add mobile development section to `CONTRIBUTING.md` — Expo development workflow, simulator setup, EAS Build
- [ ] T063 Run full validation checklist for web workspace (ensure no regressions)

**Checkpoint**: Documentation updated. All deferred mobile tasks resolved. Web validation passes.

---

## Dependencies & Execution Order

- **Phase 1**: No dependencies — can start immediately
- **Phase 2**: Depends on Phase 1 (needs scaffolded app)
- **Phase 3**: Depends on Phase 1 (needs Expo Router setup)
- **Phase 4**: Depends on Phases 2–3 (needs auth and navigation)
- **Phase 5**: Depends on Phases 3–4 (needs navigation and shared hooks)
- **Phase 6**: Depends on Phase 4 (needs TanStack Query setup)
- **Phase 7**: Depends on Phase 2 and Spec 015 (needs auth and notification infrastructure)
- **Phase 8**: Depends on Phases 4–7 (needs all screens built)
- **Phase 9**: Depends on Phase 8 (needs functional app to polish)
- **Phase 10**: Depends on all prior phases

**External Dependency**: Phase 7 (Push Notifications) depends on Spec 015 (Background Jobs & Notifications) being implemented.
