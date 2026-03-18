# Tasks: Cross-Platform Hot-Reloadable UI System

**Feature Branch**: `008-cross-platform-ui`
**Created**: 2026-03-17
**Input**: Design documents from `specs/008-cross-platform-ui/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Tests are included where the spec mandates them (Constitution II, FR-019, testing strategy in plan.md).

## Phase Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Setup | ✅ Complete | Monorepo with npm workspaces |
| Phase 2: Foundational | ✅ Complete | Shared types, schemas, utilities |
| Phase 3: Tokens (US1) | ✅ Complete | Style Dictionary pipeline, WCAG validation |
| Phase 4: Storybook (US2) | ✅ Complete | Storybook 10 with react-vite |
| Phase 5: Components (US5) | ✅ Complete | 11 P0 components |
| Phase 6: Mobile (US3+US4) | ⏭️ Deferred | Expo/React Native — skipped per user request |
| Phase 7: Token Hot-Swap (US6) | ✅ Complete | Concurrent dev with tokens:watch |
| Phase 8: UI Agent (US7) | ✅ Complete | .agent.md with full design system knowledge |
| Phase 9: Performance (US8) | ✅ Partial | Web bundle check done; mobile tasks deferred |
| Phase 10: Accessibility (US9) | ✅ Partial | Web jsx-a11y + CI done; mobile tasks deferred |
| Phase 11: Token Migration | ✅ Complete | 6 web components migrated |
| Phase 12: Mobile CI/CD | ⏭️ Deferred | Skipped per user request |
| Phase 13: Polish | ✅ Complete | 4 P1 components, docs, validation |

**Organization**: Tasks are grouped by user story. User stories from spec.md are mapped to phases in priority order (P0 first, then P1). Because US1–US5 are all P0, they follow the dependency order dictated by the architecture: tokens → components → mobile app scaffolding → platform adaptation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo root**: `./` (package.json, tsconfig.base.json)
- **Web app**: `apps/web/` (migrated from `src/`)
- **Mobile app**: `apps/mobile/` (new Expo app)
- **Shared logic**: `packages/shared/` (types, hooks, API fetchers)
- **Shared UI**: `packages/shared-ui/` (cross-platform components)
- **Design tokens**: `packages/tokens/` (Style Dictionary pipeline)

---

## Phase 1: Setup (Monorepo Infrastructure)

**Purpose**: Transform the single-app repo into a monorepo with npm workspaces. This is the riskiest structural change and must be done incrementally per the plan's migration strategy.

- [x] T001 Configure npm workspaces in root `package.json` — add `"workspaces": ["apps/*", "packages/*"]` field
- [x] T002 Create `tsconfig.base.json` at repo root with shared TypeScript strict-mode settings; existing `tsconfig.json` extends it
- [x] T003 Create empty package scaffolds with `package.json` and `tsconfig.json` for `packages/shared/`, `packages/shared-ui/`, and `packages/tokens/`
- [x] T004 Create `apps/` directory and move existing `src/`, `tests/`, `next.config.js`, `postcss.config.mjs`, `vitest.config.ts`, `next-env.d.ts` into `apps/web/` — create `apps/web/package.json` with web-specific dependencies
- [x] T005 Update root `package.json` scripts to delegate to workspace commands (`npm run dev -w apps/web`, etc.)
- [x] T006 Update `apps/web/tsconfig.json` to extend `../../tsconfig.base.json` and add path aliases for `@acroyoga/shared`, `@acroyoga/shared-ui`, `@acroyoga/tokens`
- [x] T007 Update all import paths in `apps/web/src/` to reflect the new directory structure (resolve any broken `@/` aliases)
- [x] T008 Verify `npm install`, `npm run dev -w apps/web`, `npm run build -w apps/web`, and `npm test -w apps/web` all pass from the repo root
- [x] T009 Update root `vitest.config.ts` to support workspace-level test execution across all packages
- [x] T010 [P] Add `packages/shared/`, `packages/shared-ui/`, `packages/tokens/` to `.gitignore` for their respective `build/` and `dist/` output directories
- [x] T011 [P] Update CI workflow `.github/workflows/ci.yml` to install from root and run workspace-aware lint, typecheck, test, and build commands

**Checkpoint**: Monorepo structure is in place. Existing web app runs identically from `apps/web/`. All CI passes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that ALL user stories depend on — shared types extraction, API client, and foundational shared-package plumbing.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T012 Extract shared TypeScript types from `apps/web/src/types/` into `packages/shared/types/` (events.ts, rsvp.ts, venues.ts, teachers.ts, permissions.ts, etc.) — update `apps/web` imports to use `@acroyoga/shared`
- [x] T013 Create `packages/shared/api/client.ts` — platform-agnostic API fetcher functions using `fetch()` with configurable base URL, error handling via shared `@/lib/errors` pattern, and `Authorization` header injection
- [x] T014 [P] Create `packages/shared/schemas/` — extract or duplicate Zod validation schemas from `apps/web/src/lib/` that are needed by both web and mobile (event schemas, RSVP schemas, profile schemas)
- [x] T015 [P] Create `packages/shared/utils/` — extract shared utility functions (date formatting, currency formatting using `Intl` APIs) from `apps/web/src/lib/`
- [x] T016 Verify `apps/web` still builds and all tests pass after shared extraction — run `npm run build -w apps/web && npm test -w apps/web`
- [x] T017 [P] Create `packages/shared-ui/index.ts` entry point and configure package.json `exports` field with conditional exports for `.web.tsx` and `.native.tsx` resolution

**Checkpoint**: Shared packages contain extracted types, schemas, API client, and utilities. Web app consumes them with zero regressions.

---

## Phase 3: User Story 1 — Shared Design System with Tokenized Theming (Priority: P0) 🎯 MVP

**Goal**: Single-source design tokens compile to CSS (web), Swift (iOS), Kotlin (Android), and TypeScript (shared logic). Token changes propagate to all platforms from one file edit.

**Independent Test**: Change the primary colour token value and verify all components using it render with the new colour on web, iOS simulator, and Android emulator.

### Implementation for User Story 1

- [x] T018 [US1] Create token source files in `packages/tokens/src/` — `color.tokens.json`, `spacing.tokens.json`, `typography.tokens.json`, `shadow.tokens.json`, `radius.tokens.json` per data-model.md schemas (W3C DTCG format)
- [x] T019 [US1] Install Style Dictionary v4 in `packages/tokens/` and create `packages/tokens/config.ts` — configure platforms: css (CSS custom properties), tailwind (TS theme), swift (enum), kotlin (object), ts (typed constants)
- [x] T020 [US1] Implement WCAG contrast validation transform in `packages/tokens/transforms/wcag-contrast.ts` — warn when foreground/background colour pairs fail AA thresholds (4.5:1 body, 3:1 large text)
- [x] T021 [US1] Add `tokens:build` and `tokens:watch` scripts to `packages/tokens/package.json` — build generates outputs to `packages/tokens/build/` (css/, tailwind/, swift/, kotlin/, ts/)
- [x] T022 [US1] Run `tokens:build` and verify all 5 platform outputs are generated correctly — `build/css/tokens.css`, `build/tailwind/tokens.ts`, `build/swift/DesignTokens.swift`, `build/kotlin/DesignTokens.kt`, `build/ts/tokens.ts`
- [x] T023 [US1] Integrate token CSS into `apps/web/` — import `packages/tokens/build/css/tokens.css` in `apps/web/src/app/globals.css` and configure `apps/web/tailwind.config.ts` to consume `packages/tokens/build/tailwind/tokens.ts`
- [x] T024 [US1] Add light/dark theme token sets — create `[data-theme="dark"]` overrides in token CSS output; extend `color.tokens.json` with `color.dark.*` category per data-model.md
- [x] T025 [US1] Add `global.tokens.json` in `packages/tokens/src/` for composite/reference tokens that alias other tokens
- [x] T026 [US1] Write Vitest tests for token pipeline in `packages/tokens/__tests__/build.test.ts` — verify build outputs exist, CSS contains expected custom properties, WCAG warning fires for low-contrast pairs, removed token reference causes build error
- [x] T027 [US1] Add `tokens:build` step to CI workflow (`.github/workflows/ci.yml`) before lint/typecheck/test steps — fail CI if WCAG contrast warnings are present or build fails

**Checkpoint**: Design token pipeline produces all platform outputs. Changing a token value in JSON propagates to CSS, Tailwind, Swift, Kotlin, and TypeScript. WCAG contrast checked on build.

---

## Phase 4: User Story 2 — Component Development Environment with Hot Reload (Priority: P0)

**Goal**: Storybook 10 (`@storybook/react-vite`) serves as the component dev environment with hot reload, viewport toggling, theme switching, and accessibility auditing.

**Independent Test**: Open Storybook, navigate to a Button component, change its padding token, confirm preview updates within 1 second without losing state.

### Implementation for User Story 2

- [x] T028 [US2] Install Storybook 10 in `apps/web/` — run `npx storybook@latest init` with `@storybook/react-vite` framework, configure `apps/web/.storybook/main.ts` to load stories from both `apps/web/src/components/` and `../../packages/shared-ui/`
- [x] T029 [US2] Configure `apps/web/.storybook/preview.ts` — import `packages/tokens/build/css/tokens.css` globally, add theme toggle decorator using `@storybook/addon-themes` to switch `[data-theme="dark"]` class
- [x] T030 [P] [US2] Install and configure Storybook addons — `@storybook/addon-essentials` (Controls, Viewport, Backgrounds, Actions, Docs), `@storybook/addon-a11y` (axe-core), `@storybook/addon-themes`
- [x] T031 [US2] Add `storybook` and `build-storybook` scripts to `apps/web/package.json` and root `package.json` — verify Storybook starts at `http://localhost:6006` and hot-reloads on component/token file changes
- [x] T032 [US2] Add Storybook static build + axe-core accessibility audit to CI workflow (`.github/workflows/ci.yml`) — `build-storybook` → run `@storybook/test-runner` with `--coverage` and `--a11y` flags; fail on critical a11y violations
- [x] T033 [P] [US2] Add viewport presets to `.storybook/preview.ts` — mobile (375px), tablet (768px), desktop (1280px) per design system breakpoints

**Checkpoint**: Storybook loads all component stories, supports theme switching, viewport toggling, and axe-core accessibility auditing. Hot reload works for component and token changes.

---

## Phase 5: User Story 5 — Shared Component Library with Platform Adaptation (Priority: P0)

**Goal**: Build cross-platform components using `.web.tsx`/`.native.tsx` pattern — shared props and logic, platform-specific rendering.

**Independent Test**: Create a Button component, verify it renders correctly in web (Storybook), iOS simulator, and Android emulator with identical behaviour but platform-appropriate styling.

### Implementation for User Story 5

- [x] T034 [US5] Define shared component architecture in `packages/shared-ui/` — create `Button/Button.tsx` with shared props interface (`ButtonProps`), variant logic, and state management
- [x] T035 [US5] Create `packages/shared-ui/Button/Button.web.tsx` — web renderer using Tailwind CSS classes and design tokens (CSS custom properties)
- [x] T036 [US5] Create `packages/shared-ui/Button/Button.native.tsx` — React Native renderer using `Pressable` + `StyleSheet` with design token TS constants
- [x] T037 [P] [US5] Create `packages/shared-ui/Button/Button.stories.tsx` — Storybook story with Controls for all variants (primary, secondary, ghost, danger), disabled state, loading state
- [x] T038 [P] [US5] Create `packages/shared-ui/Button/Button.test.tsx` — Vitest test for shared logic (variant selection, disabled behaviour, loading state)
- [x] T039 [US5] Implement `packages/shared-ui/Card/` — `Card.tsx` (shared props + layout logic), `Card.web.tsx` (Tailwind), `Card.native.tsx` (StyleSheet), `Card.stories.tsx`, `Card.test.tsx` with variants: default, elevated, outlined
- [x] T040 [P] [US5] Implement `packages/shared-ui/EventCard/` — `EventCard.tsx` (shared props: event data, date formatting, RSVP status), `EventCard.web.tsx`, `EventCard.native.tsx`, `EventCard.stories.tsx`, `EventCard.test.tsx`
- [x] T041 [P] [US5] Implement `packages/shared-ui/TeacherCard/` — `TeacherCard.tsx`, `TeacherCard.web.tsx`, `TeacherCard.native.tsx`, `TeacherCard.stories.tsx`, `TeacherCard.test.tsx`
- [x] T042 [P] [US5] Implement `packages/shared-ui/Avatar/` — `Avatar.tsx` (initials fallback, size variants sm/md/lg/xl), `Avatar.web.tsx`, `Avatar.native.tsx`, `Avatar.stories.tsx`, `Avatar.test.tsx`
- [x] T043 [P] [US5] Implement `packages/shared-ui/Badge/` — `Badge.tsx` (label, colour mapping for default/success/warning/error), `Badge.web.tsx`, `Badge.native.tsx`, `Badge.stories.tsx`, `Badge.test.tsx`
- [x] T044 [P] [US5] Implement `packages/shared-ui/Input/` — `Input.tsx` (shared validation state, error display), `Input.web.tsx`, `Input.native.tsx`, `Input.stories.tsx`, `Input.test.tsx`
- [x] T045 [P] [US5] Implement `packages/shared-ui/LoadingSpinner/` — `LoadingSpinner.tsx`, `LoadingSpinner.web.tsx` (CSS animation), `LoadingSpinner.native.tsx` (Animated.View), `LoadingSpinner.stories.tsx`
- [x] T046 [P] [US5] Implement `packages/shared-ui/OfflineBanner/` — `OfflineBanner.tsx` (connectivity state), `OfflineBanner.web.tsx`, `OfflineBanner.native.tsx`, `OfflineBanner.stories.tsx`
- [x] T047 [P] [US5] Implement `packages/shared-ui/EmptyState/` — `EmptyState.tsx`, `EmptyState.web.tsx`, `EmptyState.native.tsx`, `EmptyState.stories.tsx`
- [x] T048 [P] [US5] Implement `packages/shared-ui/Skeleton/` — `Skeleton.tsx` (text/card/avatar variants), `Skeleton.web.tsx`, `Skeleton.native.tsx`, `Skeleton.stories.tsx`
- [x] T049 [US5] Create `packages/shared-ui/index.ts` barrel export — export all components with proper conditional exports in `package.json` for web/native resolution
- [x] T050 [US5] Verify all shared components render correctly in Storybook (web) — browse catalogue, check Controls, verify theme switching and viewport toggling

**Checkpoint**: Shared component library has P0 components (Button, Card, EventCard, TeacherCard, Avatar, Badge, Input, LoadingSpinner, OfflineBanner, EmptyState, Skeleton) with web and native renderers, Storybook stories, and unit tests.

---

## Phase 6: User Story 3 & 4 — Cross-Platform Mobile App for iOS & Android (Priority: P0)

**Goal**: Scaffold Expo + React Native mobile app with 5-tab navigation, JWT auth, TanStack Query data fetching with MMKV offline persistence, consuming shared packages. iOS and Android delivered simultaneously.

**Independent Test**: Install the app on iOS simulator and Android emulator, browse events, tap into event detail, perform an RSVP, verify native navigation transitions and 60fps scrolling.

### Mobile App Scaffolding

- [-] T051 [US3] Scaffold Expo app in `apps/mobile/` — run `npx create-expo-app apps/mobile --template blank-typescript`; configure `apps/mobile/package.json` with dependencies: `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`, `@tanstack/react-query`, `react-native-mmkv`, `expo-secure-store`
- [-] T052 [US3] Configure `apps/mobile/metro.config.js` — add `watchFolders` and `nodeModulesPaths` pointing to workspace root `packages/` for monorepo resolution
- [-] T053 [US3] Configure `apps/mobile/tsconfig.json` — extend `../../tsconfig.base.json`, add path aliases for `@acroyoga/shared`, `@acroyoga/shared-ui`, `@acroyoga/tokens`
- [-] T054 [P] [US3] Configure `apps/mobile/app.json` — set app name, bundle identifier (iOS), package name (Android), Expo SDK version, required permissions
- [-] T055 [P] [US3] Create `apps/mobile/eas.json` — configure EAS Build profiles: development (simulator), preview (internal distribution), production (app store submission)

### Shared Data Fetching Hooks

- [-] T056 [US3] Create TanStack Query hooks in `packages/shared/hooks/` — `useEvents.ts` (list + filters), `useEventDetail.ts` (single event), `useRsvp.ts` (mutation + optimistic update), `useTeachers.ts` (list), `useBookings.ts` (user bookings), `useProfile.ts` (user profile)
- [-] T057 [US3] Create `packages/shared/hooks/useOnlineStatus.ts` — online/offline status hook adapting to web (`navigator.onLine`) and mobile (`@react-native-community/netinfo`)
- [-] T058 [US3] Write Vitest tests for shared hooks in `packages/shared/__tests__/hooks/` — verify query key structure, optimistic update logic, error handling

### Mobile Authentication

- [-] T059 [US3] Create `/api/auth/mobile-token` API route in `apps/web/src/app/api/auth/mobile-token/route.ts` — accepts credentials, validates via NextAuth, returns JWT (access + refresh tokens) with configurable expiry
- [-] T060 [US3] Create `apps/mobile/lib/auth.ts` — JWT storage via `expo-secure-store`, login/logout functions, token refresh logic, `getAuthHeaders()` helper returning `{ Authorization: 'Bearer <jwt>' }`
- [-] T061 [US3] Create `apps/mobile/lib/api-client.ts` — fetch wrapper that injects JWT from `auth.ts`, handles 401 responses with automatic token refresh, configurable base URL pointing to web API
- [-] T062 [US3] Write integration test for `/api/auth/mobile-token` in `apps/web/tests/integration/auth/mobile-token.test.ts` — verify JWT issuance, invalid credentials rejection, token structure

### Mobile Offline Support

- [-] T063 [US3] Create `apps/mobile/lib/offline.ts` — configure TanStack Query `persistQueryClient` with MMKV storage adapter, `gcTime: Infinity`, `staleTime: 5min`, `refetchOnReconnect: true`
- [-] T064 [US3] Create `apps/mobile/lib/connectivity.ts` — NetInfo wrapper exposing `useConnectivity()` hook, triggers `onlineManager.setOnline()` for TanStack Query

### Mobile Navigation

- [-] T065 [US3] Create `apps/mobile/app/_layout.tsx` — root layout using Expo Router's file-based routing (which wraps React Navigation internally), TanStack Query `QueryClientProvider` with persistence, auth state check (redirect to login if no JWT)
- [-] T066 [US3] Create navigation type definitions in `apps/mobile/types/navigation.ts` — `RootTabParamList`, `EventsStackParamList`, `TeachersStackParamList`, `ProfileStackParamList` per data-model.md
- [-] T067 [US3] Create `apps/mobile/app/(tabs)/_layout.tsx` — bottom tab navigator with 5 tabs: Home, Events, Teachers, Bookings, Profile — using Expo Router's `<Tabs>` component (wraps `@react-navigation/bottom-tabs`) with design token colours for active/inactive states
- [-] T068 [P] [US3] Create `apps/mobile/app/(tabs)/index.tsx` — Home tab screen showing featured events using `useEvents()` hook with `EventCard.native` component
- [-] T069 [P] [US3] Create `apps/mobile/app/(tabs)/events.tsx` — Events list screen with `FlatList`, pull-to-refresh, `useEvents()` hook, `EventCard.native` component, filter/search support
- [-] T070 [P] [US3] Create `apps/mobile/app/(tabs)/teachers.tsx` — Teachers list screen with `FlatList`, `useTeachers()` hook, `TeacherCard.native` component
- [-] T071 [P] [US3] Create `apps/mobile/app/(tabs)/bookings.tsx` — Bookings list screen with `useBookings()` hook, booking status badges
- [-] T072 [P] [US3] Create `apps/mobile/app/(tabs)/profile.tsx` — Profile screen with `useProfile()` hook, edit profile link, settings link, logout
- [-] T073 [US3] Create `apps/mobile/app/events/[id].tsx` — Event detail screen with native stack push transition, RSVP button using `useRsvp()` mutation, `ScrollView` layout
- [-] T074 [US3] Create `apps/mobile/app/login.tsx` — Login screen with email/password form using shared `Input` component, OAuth buttons, calls `auth.ts` login function

### Mobile Platform Specifics

- [-] T075 [P] [US4] Verify Android hardware back button navigates correctly in Expo Router — test on emulator: event detail → back → events list (not app exit)
- [-] T076 [P] [US4] Verify Android material motion transitions work via `@react-navigation/native-stack` animation configuration
- [-] T077 [US3] Verify iOS native push animation transitions work on simulator — event card tap → event detail with smooth push animation
- [-] T078 [US3] Run `npx expo start`, press `i` for iOS simulator, verify app loads with home screen and 5-tab navigation within 2 seconds
- [-] T079 [US4] Run `npx expo start`, press `a` for Android emulator, verify app loads with home screen and 5-tab navigation within 2 seconds

**Checkpoint**: Mobile app runs on iOS simulator and Android emulator with 5-tab navigation, JWT authentication, TanStack Query data fetching with MMKV offline cache, offline banner, and all P0 screens.

---

## Phase 7: User Story 6 — Web App Hot Module Replacement Enhanced with Token Hot-Swap (Priority: P1)

**Goal**: Design token changes propagate to the browser instantly without full page reload. Component state is preserved during HMR.

**Independent Test**: With web dev server running, edit a spacing token value and confirm browser preview updates within 1 second without losing form input or scroll position.

### Implementation for User Story 6

- [x] T080 [US6] Configure concurrent `dev` script in root `package.json` — run `tokens:watch` (Style Dictionary watch mode) and `next dev` in `apps/web` concurrently using `concurrently` or `npm-run-all`
- [x] T081 [US6] Verify token hot-swap: edit `color.tokens.json` primary colour → Style Dictionary rebuilds `tokens.css` → Next.js HMR picks up CSS change → browser updates without page reload
- [x] T082 [US6] Verify component state preservation: enter form data on a page → edit a component file → confirm form data is preserved after HMR

**Checkpoint**: Web dev workflow supports token-aware hot-swap. Editing any `*.tokens.json` file triggers rebuild → HMR → instant visual update.

---

## Phase 8: User Story 7 — UI Expert Agent for Design Assistance (Priority: P1)

**Goal**: Define a `.agent.md` file encoding design system knowledge, component library API, Tailwind conventions, WCAG rules, and mobile-first patterns.

**Independent Test**: Invoke the UI agent and ask it to create a new card component. Verify the generated component uses design tokens, includes accessibility attributes, and renders correctly in Storybook.

### Implementation for User Story 7

- [x] T083 [US7] Create `.agent.md` at repository root — define UI Expert Agent with sections: Design Tokens (paths, naming conventions, categories), Component Library (registry, prop interfaces, platform support), Tailwind CSS 4 (utility patterns, breakpoints, custom theme), WCAG 2.1 AA (contrast ratios, focus management, ARIA patterns, 44×44pt touch targets), Mobile-First Patterns (responsive breakpoints, platform adaptations)
- [x] T084 [US7] Add tool restrictions to `.agent.md` — `tools: [codebase, terminal, editFiles]`; define agent triggers: create component, review UI code, make responsive, check accessibility, convert hardcoded values
- [x] T085 [US7] Add component generation template to `.agent.md` — when agent creates a new component, it generates `Component.tsx`, `.web.tsx`, `.native.tsx`, `.stories.tsx`, `.test.tsx` per the `packages/shared-ui/` convention
- [x] T086 [US7] Add design token reference section to `.agent.md` — list all token categories (colour, spacing, typography, shadow, radius) with semantic names and usage rules from data-model.md
- [x] T087 [P] [US7] Add accessibility review checklist to `.agent.md` — contrast ratio checks, focus order, ARIA labels, touch target sizes, Dynamic Type support, screen reader compatibility

**Checkpoint**: UI Expert Agent `.agent.md` file exists with complete design system knowledge. Agent can generate token-compliant components with accessibility attributes.

---

## Phase 9: User Story 8 — Platform Performance Budgets (Priority: P1)

**Goal**: Web bundle <200KB enforced in CI. Mobile TTI <3s, 60fps scroll, binary size budgets tracked.

**Independent Test**: Run a build and verify bundle size report shows total initial JS under 200KB for web.

### Implementation for User Story 8

- [x] T088 [US8] Install `@next/bundle-analyzer` in `apps/web/` and configure in `apps/web/next.config.js` — enable `ANALYZE=true` env var for on-demand analysis
- [x] T089 [US8] Add bundle size check to CI workflow — run `ANALYZE=true npm run build -w apps/web`, parse output, fail if initial JS bundle exceeds 200KB compressed
- [-] T090 [P] [US8] Add EAS Build size reporting — configure `eas.json` to output binary size in build logs; add CI step to parse and warn if iOS >50MB or Android >30MB
- [-] T091 [P] [US8] Install `react-native-performance` in `apps/mobile/` — add TTI measurement in `apps/mobile/app/_layout.tsx`; log launch time metrics

- [-] T113 [US8] Set up Flipper performance profiling for mobile — install `react-native-flipper`, create a documented procedure for 60fps scroll verification on FlatList screens (events list, teachers list); verify ≥60fps during rapid scrolling on iOS simulator and Android emulator (FR-015, SC-007)
- [-] T114 [US8] Validate discover-to-RSVP flow tap count on each platform — measure clicks/taps from app open → browse events → view event → RSVP; verify ≤4 interactions on web, iOS, and Android (SC-008)
- [-] T115 [US3+US4] Create Maestro E2E test suite in `apps/mobile/e2e/` — install Maestro, write flow file `events-browse-rsvp.yaml` covering: app launch → scroll events → tap event card → view detail → tap RSVP → verify success state; run on iOS simulator and Android emulator (Constitution II mandate)
- [-] T116 [US3+US4] Create Maestro E2E test for offline fallback — flow file `offline-cache.yaml`: load events with network → toggle airplane mode → relaunch app → verify cached content displays with offline indicator (SC-010)

**Checkpoint**: Web bundle size gated at 200KB in CI. Mobile binary sizes and TTI tracked in EAS Build logs. 60fps scroll verified. Tap-count budget validated. Mobile E2E tests passing.

---

## Phase 10: User Story 9 — Accessibility Compliance Across Platforms (Priority: P1)

**Goal**: WCAG 2.1 AA across all platforms — keyboard navigation (web), screen reader support (all), contrast ratios, touch targets.

**Independent Test**: Run axe-core audit on Storybook web build with zero critical violations. Enable VoiceOver on iOS and TalkBack on Android, navigate events list → event detail flow.

### Implementation for User Story 9

- [x] T092 [US9] Add ESLint `jsx-a11y` plugin to `apps/web/` and `packages/shared-ui/` — enforce ARIA labels, alt text, interactive roles in CI
- [-] T093 [P] [US9] Add ESLint `accessibilityLabel` rule for React Native components in `apps/mobile/` and `packages/shared-ui/*.native.tsx` — require accessibility labels on all interactive elements
- [-] T094 [US9] Audit all shared components for 44×44pt minimum touch targets on mobile — verify in `Button.native.tsx`, `EventCard.native.tsx`, `TeacherCard.native.tsx`, `Input.native.tsx`; fix any undersized targets
- [x] T095 [US9] Add keyboard navigation tests to web Storybook stories — verify all interactive components are focusable and operable via keyboard in `Button.stories.tsx`, `Input.stories.tsx`, `EventCard.stories.tsx`
- [-] T096 [US9] Create accessibility testing checklist in `specs/008-cross-platform-ui/checklists/` — manual VoiceOver (iOS) and TalkBack (Android) audit steps for events browse → detail → RSVP flow
- [x] T097 [US9] Add CI step to fail on any new component in `packages/shared-ui/` missing accessibility annotations — lint rule + CI gate
- [-] T117 [US9] Verify Dynamic Type / font scaling at 200% on iOS — test events list, event detail, and teacher profile screens with max Dynamic Type; verify no truncation or overflow (spec edge case)
- [-] T118 [US9] Verify i18n runtime on mobile — confirm `Intl.DateTimeFormat` and `Intl.NumberFormat` work correctly in Expo/React Native; test locale formatting of event dates and ticket prices; verify string extraction pipeline works for mobile components (Constitution VIII)

**Checkpoint**: Zero critical WCAG violations on web (automated). ESLint enforces accessibility annotations on all platforms. Manual audit checklist documented.

---

## Phase 11: Web Component Migration to Design Tokens

**Purpose**: Migrate existing web components in `apps/web/src/components/` to consume design tokens instead of hardcoded values.

- [x] T098 [P] Audit `apps/web/src/components/NavHeader.tsx` — replace hardcoded colour/spacing values with token-based Tailwind classes; keep as web-only component
- [x] T099 [P] Audit `apps/web/src/components/events/` — replace hardcoded values with design tokens; identify components that should delegate to `packages/shared-ui/EventCard`
- [x] T100 Integrate `packages/shared-ui/EventCard` into `apps/web/src/` event pages — replace existing event card markup with `EventCard.web` rendering, verify styling matches via Storybook
- [x] T101 [P] Audit remaining `apps/web/src/components/` — replace hardcoded colour hex values, pixel spacing, and font sizes with token-based Tailwind utilities
- [x] T102 Verify `apps/web` build and all existing tests pass after token migration — run full CI pipeline

**Checkpoint**: All existing web components use design tokens. No hardcoded colour, spacing, or typography values remain.

---

## Phase 12: CI/CD Pipeline Extensions for Mobile

**Purpose**: Add GitHub Actions workflows for mobile preview builds on PRs and production builds + app store submission on release.

- [-] T103 [P] Create `.github/workflows/mobile-preview.yml` — trigger on PRs touching `apps/mobile/` or `packages/`; run EAS Build preview profile (iOS + Android); post build links as PR comment
- [-] T104 [P] Create `.github/workflows/mobile-release.yml` — trigger on push to `main` with release tag; run EAS Build production profile; auto-submit to TestFlight (iOS) and Play Internal (Android) via EAS Submit
- [-] T105 Extend `.github/workflows/ci.yml` — add i18n lint check for raw string literals in `apps/web/`, `apps/mobile/`, and `packages/shared-ui/`; add token build step; add Storybook a11y audit step
- [-] T106 [P] Add EXIF metadata stripping verification to mobile image upload path — ensure `apps/mobile/` image uploads route through existing API pipeline that strips EXIF/GPS per Constitution III

**Checkpoint**: CI/CD covers monorepo (lint, typecheck, test, token build, bundle analysis, Storybook a11y). Mobile preview builds run on PRs. Production builds and app store submission automated.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, P1 shared components, code cleanup, and quickstart validation.

- [x] T107 [P] Implement P1 shared components — `TextArea/`, `Select/`, `Modal/`, `Toast/` in `packages/shared-ui/` with `.web.tsx`, `.native.tsx`, `.stories.tsx`, `.test.tsx` per established pattern
- [x] T108 [P] Update `README.md` at repo root — document monorepo structure, workspace commands, development workflow (web, mobile, Storybook, tokens)
- [x] T109 [P] Update `specs/008-cross-platform-ui/quickstart.md` with final verified setup steps — run through the complete quickstart on a clean checkout to validate
- [x] T110 [P] Create component registry documentation in `packages/shared-ui/README.md` — list all components with platform support status, variants, token dependencies, and a11y compliance per data-model.md `ComponentRegistryEntry` schema
- [-] T111 Verify ≥80% shared code metric — measure shared lines in `packages/shared/` + `packages/shared-ui/` vs platform-specific lines in `apps/web/src/components/` + `apps/mobile/components/`
- [x] T112 Run full end-to-end validation: `npm install` from clean repo → `tokens:build` → `npm run build -w apps/web` → `npm test` → `npm run storybook` → `npx expo start -w apps/mobile` — all succeed

**Checkpoint**: All documentation updated. P1 components implemented. Quickstart validated. Shared code ratio measured. Full build pipeline green.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ─────────────────────────────► Phase 2 (Foundational)
                                                       │
                                                       ▼
                                          ┌────────────┴────────────┐
                                          ▼                         ▼
                                   Phase 3 (US1:         Phase 4 (US2:
                                    Tokens)                Storybook)
                                     │    │                    │
                                     │    ▼                    │
                                     │  Phase 5 (US5:          │
                                     │   Components) ◄────────┘
                                     │       │    │
                                     │       │    ▼
                                     │       │  Phase 8 (US7: Agent)
                                     │       ▼
                                     │  Phase 6 (US3+4:
                                     │   Mobile App)
                                     │       │
                                     ▼       ▼
                              Phase 7 (US6) Phase 9 (US8)
                              │           │           │
                              ▼           ▼           ▼
                       Phase 10 (US9: Accessibility)
                              │
                       ┌──────┴──────┐
                       ▼             ▼
                Phase 11          Phase 12
                (Migration)       (CI/CD)
                       │             │
                       └──────┬──────┘
                              ▼
                       Phase 13 (Polish)
```

### Critical Path

1. **Phase 1** (Setup) → **Phase 2** (Foundational) → **Phase 3** (Tokens) → **Phase 5** (Components) → **Phase 6** (Mobile) → **Phase 13** (Polish)

### User Story Dependencies

| Story | Phase | Can Start After | Dependencies on Other Stories |
|-------|-------|----------------|-------------------------------|
| US1 — Tokens | Phase 3 | Phase 2 (Foundational) | None |
| US2 — Storybook | Phase 4 | Phase 2 (Foundational) | Benefits from US1 tokens but can start in parallel |
| US5 — Components | Phase 5 | Phase 3 (US1 tokens built) + Phase 4 (US2 Storybook for preview) | Depends on US1, US2 |
| US3 — iOS App | Phase 6 | Phase 5 (US5 components available) | Depends on US1, US5 |
| US4 — Android App | Phase 6 | Phase 5 (US5 components available) | Depends on US1, US5 (same phase as US3) |
| US6 — Token Hot-Swap | Phase 7 | Phase 3 (US1 tokens) | Depends on US1 only — can start as soon as tokens are built |
| US7 — UI Agent | Phase 8 | Phase 3 (US1 tokens) + Phase 5 (US5 components) | Depends on US1, US5 — does NOT require mobile (Phase 6) |
| US8 — Performance | Phase 9 | Phase 6 (mobile app exists) | Depends on US3, US4 — requires mobile for TTI/scroll metrics |
| US9 — Accessibility | Phase 10 | Phase 5 (US5 components) + Phase 6 (mobile) | Depends on US5, US3, US4 |

### Within Each User Story

1. Configuration/setup tasks first
2. Core implementation tasks next
3. Tests and verification last
4. Story checkpoint before moving to next phase

### Parallel Opportunities

**Phase 1**: T010, T011 can run in parallel (gitignore + CI updates are independent files)
**Phase 2**: T014, T015, T017 can run in parallel (schemas, utils, shared-ui setup are independent)
**Phase 3–4**: US1 (tokens) and US2 (Storybook) can start in parallel after Phase 2
**Phase 5**: All component implementations (T039–T048) can run in parallel (each is an independent component directory)
**Phase 6**: Tab screens (T068–T072) can run in parallel; mobile platform verifications (T075–T076) can run in parallel
**Phase 7–9**: US6, US7, US8 can run in parallel after their prerequisites complete
**Phase 11–12**: Web migration and CI/CD extension can run in parallel

---

## Implementation Strategy

### MVP Scope

**MVP = Phase 1 + Phase 2 + Phase 3 (US1) + Phase 5 (US5) + Phase 6 (US3+US4)**

This delivers:
- Monorepo structure with npm workspaces
- Design token pipeline producing all platform outputs
- Shared component library with P0 components
- Working iOS and Android mobile apps with events browsing, RSVP, and offline support
- All shared business logic via TanStack Query hooks

### Incremental Delivery

| Milestone | Phases | Delivers |
|-----------|--------|----------|
| M1: Monorepo | 1 + 2 | Restructured repo, shared packages, web app unchanged |
| M2: Design System | 3 + 4 | Token pipeline, Storybook, visual consistency infrastructure |
| M3: Components | 5 | Cross-platform component library, web integration |
| M4: Mobile | 6 | iOS + Android apps with full feature set |
| M5: DX + Quality | 7 + 8 + 9 + 10 | Token hot-swap, UI agent, performance budgets, accessibility |
| M6: Ship | 11 + 12 + 13 | Web migration complete, CI/CD for mobile, documentation |

---

## Summary

| Metric | Value |
|--------|-------|
| **Total tasks** | 118 (T001–T118) |
| **Phase 1 (Setup)** | 11 tasks |
| **Phase 2 (Foundational)** | 6 tasks |
| **US1 — Tokens (Phase 3)** | 10 tasks |
| **US2 — Storybook (Phase 4)** | 6 tasks |
| **US5 — Components (Phase 5)** | 17 tasks |
| **US3+US4 — Mobile (Phase 6)** | 29 tasks |
| **US6 — Token Hot-Swap (Phase 7)** | 3 tasks |
| **US7 — UI Agent (Phase 8)** | 5 tasks |
| **US8 — Performance (Phase 9)** | 8 tasks |
| **US9 — Accessibility (Phase 10)** | 8 tasks |
| **Web Migration (Phase 11)** | 5 tasks |
| **CI/CD Mobile (Phase 12)** | 4 tasks |
| **Polish (Phase 13)** | 6 tasks |
| **Parallel opportunities** | 48 tasks marked [P] |
| **MVP tasks** | 73 tasks (Phases 1–6) |
| **Format validated** | ✅ All tasks have checkbox, ID, labels, file paths |
