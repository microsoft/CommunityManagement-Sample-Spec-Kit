# Feature Specification: Mobile App (Expo/React Native)

**Feature Branch**: `016-mobile-app`  
**Created**: 2026-04-04  
**Status**: Draft  
**Input**: Spec 008 Phase 6 deferred mobile tasks (T051–T079), existing shared design token pipeline (CSS/TS/Swift/Kotlin), 20 cross-platform shared-ui components, Constitution Principle V (UX Consistency)

## Summary

Build native iOS and Android mobile applications using Expo and React Native. The platform's monorepo already includes a shared design token pipeline that outputs Swift and Kotlin values, 20 cross-platform UI components with `.native.tsx` entry points, and shared TypeScript types. This spec delivers: (1) Expo app scaffolding in `apps/mobile/`, (2) 5-tab navigation (Home, Events, Teachers, Bookings, Profile), (3) JWT-based mobile authentication, (4) TanStack Query data fetching with MMKV offline persistence, (5) native navigation transitions, and (6) platform-specific optimizations for iOS and Android. This is the largest spec in the project — it completes the cross-platform vision established in Spec 008.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Events on Mobile (Priority: P1)

A community member opens the mobile app and sees a feed of upcoming events. They can scroll through events, filter by category, and tap into event details. The experience feels native — smooth 60fps scrolling, platform-appropriate transitions, and responsive layout that adapts to device screen size.

**Why this priority**: Event browsing is the core use case. Delivering it on mobile validates the entire cross-platform stack (shared types, tokens, components, API).

**Independent Test**: Install the app on iOS simulator and Android emulator. Scroll through events. Tap a category filter. Tap an event — see detail page with native transition animation. Verify 60fps scrolling.

**Acceptance Scenarios**:

1. **Given** the app launches, **When** events exist, **Then** a scrollable list of events is displayed using native FlatList with 60fps performance.
2. **Given** events are displayed, **When** the user taps a category filter, **Then** the list updates to show only events in that category.
3. **Given** an event is visible, **When** the user taps it, **Then** a detail page opens with a native push animation (iOS) or material transition (Android).
4. **Given** the event detail page, **When** the user views it, **Then** event title, date, location, capacity, and description are displayed using shared-ui components.
5. **Given** the user is offline, **When** they open the app, **Then** cached events are displayed with an offline banner.

---

### User Story 2 - RSVP to Events on Mobile (Priority: P1)

A community member taps the RSVP button on an event detail page. They select their role (Base/Flyer/Hybrid) and confirm. The RSVP is submitted to the API. If the event is full, they can join the waitlist. The booking appears in their Bookings tab.

**Why this priority**: RSVP is the primary conversion action — users find events to attend them. This validates the mutation flow (auth, API, state update).

**Independent Test**: Log in to the app. Find an event with available spots. Tap RSVP, select a role, confirm. Verify the RSVP appears in the Bookings tab. Verify the event capacity updates.

**Acceptance Scenarios**:

1. **Given** an event with available spots, **When** the user taps RSVP, **Then** a role selection sheet appears (Base/Flyer/Hybrid).
2. **Given** a role is selected, **When** the user confirms, **Then** the RSVP is submitted to the API and success feedback is shown.
3. **Given** a full event, **When** the user taps RSVP, **Then** a waitlist join option is presented instead.
4. **Given** a successful RSVP, **When** the user navigates to the Bookings tab, **Then** the event appears in their bookings list.

---

### User Story 3 - Mobile Authentication (Priority: P1)

A community member opens the app for the first time and sees a login screen. They authenticate via the web login flow (which supports email/password and social login via Entra External ID), and the mobile app exchanges the resulting web session for a JWT. The JWT is stored securely and used for all API requests. The session persists across app restarts.

**Why this priority**: Authentication is a prerequisite for all personalized features (RSVP, bookings, profile, notifications).

**Independent Test**: Open the app. Tap "Sign in". Authenticate with email/password. Verify the home screen shows personalized content. Close and reopen the app — still authenticated.

**Acceptance Scenarios**:

1. **Given** the app is not authenticated, **When** it launches, **Then** a login screen is displayed.
2. **Given** the login screen, **When** the user authenticates, **Then** a JWT is obtained and stored in secure storage (iOS Keychain / Android Keystore).
3. **Given** a valid JWT, **When** the user opens the app, **Then** they are automatically authenticated without re-entering credentials.
4. **Given** a JWT that has expired, **When** the user makes an API request, **Then** the JWT is refreshed transparently or the user is prompted to re-authenticate.

---

### User Story 4 - Five-Tab Navigation (Priority: P1)

A community member uses the bottom tab bar to navigate between five main sections: Home (event feed), Events (search/explore), Teachers (browse profiles), Bookings (my RSVPs), and Profile (settings). Each tab maintains its own navigation stack. Tab switching is instant with no loading delay.

**Why this priority**: Tab navigation is the mobile app's skeleton — all content hangs off these five tabs.

**Independent Test**: Launch the app. Tap each of the 5 tabs. Verify each loads its content. Navigate deep into one tab (e.g., Events → Event Detail). Switch tabs. Return — the previous position is preserved.

**Acceptance Scenarios**:

1. **Given** the app is authenticated, **When** it renders, **Then** a bottom tab bar shows 5 tabs with icons and labels.
2. **Given** any tab, **When** the user taps another tab, **Then** the switch is instant (no loading spinner).
3. **Given** a deep navigation stack in one tab, **When** the user switches to another tab and back, **Then** the previous navigation position is restored.
4. **Given** iOS, **When** the user swipes back, **Then** the native iOS back gesture works correctly.
5. **Given** Android, **When** the user presses the hardware back button, **Then** navigation pops the current screen or exits the tab.

---

### User Story 5 - Offline Support (Priority: P2)

A community member is in an area with poor connectivity. Previously loaded events, teacher profiles, and their bookings are available from the local cache. An offline banner is shown at the top of the screen. When connectivity returns, the cache refreshes automatically and the banner disappears.

**Why this priority**: Mobile users frequently encounter poor connectivity. Offline support is a key differentiator from the web experience.

**Independent Test**: Load events while online. Enable airplane mode. Navigate the app — cached data is displayed. Disable airplane mode — data refreshes.

**Acceptance Scenarios**:

1. **Given** the user has previously loaded data, **When** they go offline, **Then** cached data is displayed from MMKV persistent storage.
2. **Given** the user is offline, **When** any screen loads, **Then** an offline banner is visible (using shared-ui `OfflineBanner` component).
3. **Given** the user regains connectivity, **When** the network status changes, **Then** stale data is refetched and the offline banner disappears.
4. **Given** the user is offline, **When** they attempt a mutation (RSVP), **Then** an error message explains the action requires connectivity.

---

### User Story 6 - Push Notifications (Priority: P3)

A community member receives push notifications for events they care about — new RSVPs to their events, waitlist promotions, event cancellations. Notification preferences are synced with the server-side preferences from Spec 015. Tapping a notification navigates to the relevant resource.

**Why this priority**: Push notifications complete the notification architecture (Constitution X) for mobile. Depends on Spec 015 infrastructure.

**Independent Test**: Enable push notifications. Have someone RSVP to your event. Verify a push notification appears. Tap it — navigates to the event.

**Acceptance Scenarios**:

1. **Given** the app is installed, **When** it first launches, **Then** the user is prompted for push notification permission.
2. **Given** push is enabled, **When** a notification event occurs, **Then** a push notification is delivered to the device.
3. **Given** a push notification, **When** the user taps it, **Then** the app opens and navigates to the relevant resource.
4. **Given** notification preferences, **When** the user disables push for a type, **Then** no push notifications are sent for that type.

---

### Edge Cases

- App must handle JWT refresh race conditions (multiple concurrent requests during refresh)
- Deep links from push notifications must work even when app is cold-started
- MMKV cache must be bounded (max 50MB) with LRU eviction
- Large event lists must use FlatList with windowSize optimization to avoid memory pressure
- Network transitions (WiFi → cellular → offline) must be handled gracefully
- App must handle background → foreground transitions (refresh stale data)

## Requirements

### Functional Requirements

- **FR-001**: Mobile app MUST be built with Expo and React Native, hosted in `apps/mobile/`
- **FR-002**: Mobile app MUST consume the existing REST API — no mobile-specific backend endpoints except JWT auth (`/api/auth/mobile-token`) and push token registration (`/api/notifications/devices`)
- **FR-003**: Authentication MUST use JWT stored in platform-secure storage (Keychain/Keystore)
- **FR-004**: All data fetching MUST use TanStack Query with MMKV offline persistence
- **FR-005**: Navigation MUST use Expo Router with 5-tab bottom navigation
- **FR-006**: Shared-ui components MUST be used via their `.native.tsx` entry points
- **FR-007**: Design tokens MUST be consumed from `@acroyoga/tokens` (Swift/Kotlin values for native, TS values for RN)
- **FR-008**: The app MUST maintain 60fps scrolling on mid-range devices
- **FR-009**: Offline mode MUST display cached data with an offline banner
- **FR-010**: Push notifications MUST integrate with Spec 015 notification preferences

### Key Entities

- **Mobile app**: Expo project in `apps/mobile/`
- **Auth module**: JWT-based authentication with secure storage
- **API client**: Typed HTTP client using shared types
- **Offline cache**: MMKV-backed TanStack Query persistence
- **Navigation**: Expo Router 5-tab layout with nested stacks

## Success Criteria

### Measurable Outcomes

- **SC-001**: App installs and runs on iOS 16+ simulator and Android 13+ emulator
- **SC-002**: Event list scrolls at 60fps on iPhone 12 / Pixel 6 equivalent
- **SC-003**: Cold start to interactive < 3 seconds
- **SC-004**: Offline mode displays cached events, teachers, and bookings
- **SC-005**: All 20 shared-ui components render correctly on both platforms
- **SC-006**: 5-tab navigation with deep linking functional on both platforms

## Constitution Compliance

| Principle | Applicable | Notes |
|-----------|:---:|-------|
| I. API-First | ✅ | Consumes existing REST API. Only new endpoint: `/api/auth/mobile-token` for JWT issuance |
| II. Test-First | ✅ | Unit tests for hooks, API client, auth module. E2E with Detox on iOS/Android |
| III. Privacy | ✅ | JWT in secure storage. No PII cached unencrypted. EXIF stripping on photo uploads |
| IV. Server-Side Authority | ✅ | All business logic on server. Mobile is a thin client |
| V. UX Consistency | ✅ | **Primary** — shared design tokens and components ensure visual consistency across platforms |
| VI. Performance Budget | ✅ | 60fps target. FlatList optimization. Lazy-loaded screens. MMKV for fast reads |
| VII. Simplicity | ✅ | Expo managed workflow. No ejection. Shared components reduce duplication |
| VIII. Internationalisation | ✅ | Reuses Spec 014 translation infrastructure via shared package |
| IX. Scoped Permissions | N/A | Permissions enforced server-side via API |
| X. Notification Architecture | ✅ | Push notifications extend Spec 015 with a new channel |
| XI. Resource Ownership | N/A | Ownership enforced server-side |
| XII. Financial Integrity | ✅ | Payments handled via in-app browser to web payment flow |
| XIII. Development Environment | ✅ | Expo Go for development. EAS Build for CI |
| XIV. Managed Identity | N/A | Mobile does not access Azure services directly |
