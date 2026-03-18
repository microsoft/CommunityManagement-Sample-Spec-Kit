# Research: Cross-Platform Hot-Reloadable UI System

**Feature Branch**: `008-cross-platform-ui`  
**Created**: 2026-03-17  
**Status**: Complete

## Cross-Platform Architecture Evaluation

### Decision: Expo + React Native (SDK 53+)

**Rationale:** Expo provides the most ergonomic React Native development experience with managed native builds (EAS Build), Fast Refresh for hot reload, and first-class TypeScript support. The shared React mental model with the existing Next.js web stack maximises code reuse. Expo SDK 53+ supports React Native's New Architecture (Fabric + TurboModules) for near-native performance.

**Alternatives considered:**

| Framework | Pros | Cons | Rejected Because |
|-----------|------|------|------------------|
| Capacitor (Ionic) | Web-first, single codebase | WebView-based, not truly native UI; scroll/gesture performance inferior | Constitution V (UX Consistency) requires native-feel 60fps scrolling |
| PWA | Zero install, web-only codebase | No app store presence, limited offline, no push on iOS (partial), reduced native gestures | Mobile users expect app store discovery; offline requirements demand robust strategy |
| Flutter | Fast rendering, single codebase | Dart language (no React reuse), widget system incompatible with existing React components | Zero code reuse with existing React/Next.js codebase; team would need Dart expertise |
| React Native (bare) | Full native access | Complex native build config, slower iteration without Expo tooling | Expo wraps this with superior DX; no reason to go bare unless a native module is unavailable |

**Key capabilities:**
- **Fast Refresh**: HMR for React Native during development (~300ms update cycle)
- **EAS Build**: Cloud-based native compilation for iOS/Android without local Xcode/Android Studio for CI
- **Expo Router**: File-based routing (mirrors Next.js mental model), though we use React Navigation for richer native patterns
- **OTA Updates**: EAS Update for JS-only patches without app store resubmission
- **New Architecture**: Fabric renderer + TurboModules for synchronous native calls and concurrent rendering

### Authentication Strategy for Mobile

The existing NextAuth session uses HTTP-only cookies for web. Mobile apps cannot use cookies natively. Strategy:

1. Add a `/api/auth/mobile-token` endpoint that exchanges a NextAuth session for a JWT
2. Mobile stores JWT in Expo SecureStore (encrypted keychain/keystore)
3. All API calls from mobile include `Authorization: Bearer <jwt>` header
4. Server middleware accepts either cookie session (web) or JWT (mobile)
5. JWT expiry matches NextAuth session expiry; refresh handled via re-auth

This avoids duplicating auth logic — the same `requireAuth()` middleware resolves identity from either source.

---

## Design Token Standards

### Decision: Style Dictionary v4

**Rationale:** Style Dictionary is the industry-standard token compiler with native support for the W3C Design Tokens Community Group (DTCG) format. Version 4 supports composable transforms, modern output formats, and custom file headers. It integrates cleanly into a monorepo build pipeline.

**Alternatives considered:**

| Tool | Pros | Cons | Rejected Because |
|------|------|------|------------------|
| Token Studio (Figma plugin) | Designer-friendly, Figma sync | Heavy Figma dependency, JSON output still needs compilation, paid features for multi-file | We need a CI-friendly build tool, not a Figma plugin; Token Studio can feed into Style Dictionary later |
| Theo (Salesforce) | Mature, simple | Last commit 2021, no DTCG support, limited platform outputs | Unmaintained; violates Simplicity principle (dependencies must have activity within 6 months) |
| Custom scripts | Full control | Maintenance burden, no community, reinventing a solved problem | >200 lines of custom code easily; Style Dictionary eliminates this |

**Token file format:** W3C DTCG-compatible JSON

```json
{
  "color": {
    "primary": {
      "$value": "#6366F1",
      "$type": "color",
      "$description": "Primary brand colour used for interactive elements"
    }
  }
}
```

**Build outputs:**
- **Web**: CSS custom properties (`--color-primary: #6366F1;`) + Tailwind CSS 4 theme config
- **iOS**: Swift `enum DesignTokens` with static properties
- **Android**: Kotlin `object DesignTokens` with `const val` properties
- **TypeScript**: Type-safe token constants for shared component logic

**WCAG contrast checking:** Style Dictionary custom action that validates all foreground/background colour pairs against WCAG AA thresholds (4.5:1 body, 3:1 large) during build. Warnings emitted for failing pairs.

---

## Component Development Environments

### Decision: Storybook 10

**Rationale:** Storybook 10 (`@storybook/react-vite`) has React 19 compatibility, built-in viewport/theme toggling addons, and auto-includes essentials. Controls addon enables prop manipulation. Hot reload via Vite provides <1s update times.

**Alternatives considered:**

| Tool | Pros | Cons | Rejected Because |
|------|------|------|------------------|
| Ladle | Extremely fast, Vite-native | No React Native support, smaller addon ecosystem, no framework-specific features | Missing Next.js mocking (Image, Link, router); no path to mobile component preview |
| Histoire | Vue-first with React support | React support is secondary, fewer addons, smaller community | React Native incompatible; React support less mature than Storybook |

**Configuration approach:**
- Storybook installed in `apps/web` (web component previewing)
- Stories co-located with components: `Button.stories.tsx` next to `Button.tsx`
- Addons: `@storybook/addon-essentials` (Controls, Viewport, Backgrounds), `@storybook/addon-a11y` (axe-core)
- Design token integration: CSS custom properties loaded globally in `.storybook/preview.ts`
- Theme switching: Toolbar toggle switches CSS class (`[data-theme="dark"]`) to swap token values

**React Native component preview:** Use Expo's dev client with a dedicated preview screen — no Storybook for RN (the ecosystem is immature; Constitution VII Simplicity applies).

---

## Mobile Performance Benchmarks

### Target Device Profiles

| Platform | Device | Category | Use |
|----------|--------|----------|-----|
| iOS | iPhone 12 | Mid-range | Primary testing target (~2020 SoC, A14) |
| iOS | iPhone SE 3 | Low-end | Performance floor; smallest screen |
| Android | Pixel 6a | Mid-range | Tensor G1; representative Android user |
| Android | Samsung Galaxy A14 | Low-end | Budget device; performance floor |

### Performance Budgets

| Metric | Web | iOS | Android |
|--------|-----|-----|---------|
| Initial JS bundle | < 200KB compressed | N/A (native binary) | N/A (native binary) |
| Time to Interactive | < 3.5s (3G) | < 3s (mid-range) | < 3s (mid-range) |
| Scroll frame rate | 60fps | 60fps | 60fps |
| App binary size | N/A | < 50MB (download) | < 30MB (download) |
| Cold launch | N/A | < 2s (mid-range) | < 2.5s (mid-range) |

### Measurement Tooling

- **Web**: Lighthouse CI in GitHub Actions; `next/bundle-analyzer` for bundle composition
- **iOS**: Xcode Instruments (Time Profiler, Core Animation); Detox for automated perf tests
- **Android**: Android Studio Profiler; `adb shell dumpsys gfxinfo` for frame stats
- **Both mobile**: Flipper for React Native performance monitoring during development
- **CI**: `react-native-performance` library for automated startup time measurement in EAS builds

---

## Accessibility Tooling Across Platforms

### Web

- **axe-core** via `@storybook/addon-a11y` (development) and `@axe-core/playwright` (CI)
- **eslint-plugin-jsx-a11y** for static analysis of JSX ARIA patterns
- Lighthouse accessibility audit as CI quality gate

### iOS

- **Xcode Accessibility Inspector** for manual audit
- **XCTest accessibility assertions** for automated VoiceOver label testing
- Expo provides `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` Props that map to native UIAccessibility

### Android

- **Android Accessibility Scanner** for manual audit
- **Espresso** accessibility checks via `AccessibilityChecks.enable()`
- React Native maps `accessibilityLabel` to Android `contentDescription`

### Cross-Platform

- **react-native-testing-library** with `toHaveAccessibilityValue`, `toBeAccessible` matchers
- Custom ESLint rule: enforce `accessibilityLabel` on all `Pressable`/`TouchableOpacity`
- CI: automated axe-core scan on Storybook static build; mobile a11y lint rules enforce labels

---

## Shared Component Library Patterns

### Decision: Platform-conditional rendering with `.web.tsx` / `.native.tsx` extensions

**Rationale:** React Native and Metro bundler natively resolve platform-specific file extensions (`.ios.tsx`, `.android.tsx`, `.native.tsx`, `.web.tsx`). This is the simplest pattern that avoids runtime platform checks and keeps bundle sizes minimal per platform.

**Alternatives considered:**

| Approach | Pros | Cons | Rejected Because |
|----------|------|------|------------------|
| React Native Web (RNW) | Write once, render everywhere | Large bundle size (+100KB), imperfect web DOM, breaks Tailwind | Constitution VI: 200KB budget makes this infeasible; breaks existing Tailwind |
| Tamagui | Universal components, optimizing compiler | New styling paradigm, incompatible with Tailwind, steep learning curve | Rewrite all existing components; Constitution VII (Simplicity) |
| NativeWind | Tailwind classes in React Native | Decent web/native bridge | Immature for Tailwind v4; acceptable as future upgrade path |

**Component architecture:**

```
packages/shared-ui/
├── Button/
│   ├── Button.tsx          # Shared props interface + logic (state, handlers)
│   ├── Button.web.tsx      # Web rendering (Tailwind classes, HTML)
│   ├── Button.native.tsx   # RN rendering (StyleSheet, View/Text)
│   ├── Button.stories.tsx  # Storybook story (web only)
│   └── Button.test.tsx     # Shared logic tests
```

Metro (mobile) resolves `.native.tsx`; webpack/Next.js (web) resolves `.web.tsx`.

### Shared Code Boundary

| Layer | Shared? | Location |
|-------|---------|----------|
| TypeScript types & Zod schemas | ✅ 100% | `packages/shared/types/` |
| API fetcher functions | ✅ 100% | `packages/shared/api/` |
| TanStack Query hooks | ✅ 100% | `packages/shared/hooks/` |
| Business logic utilities | ✅ 100% | `packages/shared/utils/` |
| Component props & state logic | ✅ ~90% | `packages/shared-ui/*/Component.tsx` |
| Component rendering | ❌ Per-platform | `*.web.tsx` / `*.native.tsx` |
| Navigation | ❌ Per-platform | Next.js Router vs React Navigation |
| Authentication flow | ❌ Per-platform | Cookie session vs JWT + SecureStore |

This achieves the spec's 80% shared code target with clear platform boundaries.

---

## Monorepo Tooling

### Decision: npm workspaces

**Rationale:** The project uses npm. npm workspaces provide zero-config monorepo package linking with no additional tooling needed.

**Alternatives rejected:**
- **Turborepo**: Adds build orchestration complexity; can add later (Constitution VII)
- **Nx**: Enterprise-grade, too heavy for current scale
- **pnpm workspaces**: Would require migrating package manager

---

## Offline Data Strategy

### Decision: TanStack Query v5 + MMKV persistent cache

**Rationale:** TanStack Query provides offline-first caching with zero-config background sync. MMKV is the fastest key-value store for React Native (10x faster than AsyncStorage).

**Architecture:**
- `QueryClient` configured with `gcTime: Infinity` for offline scenarios
- `persistQueryClient` from `@tanstack/query-persist-client-core` with MMKV adapter
- Mutations use `useMutation` with `onMutate` for optimistic updates
- Offline mutations enqueued and replayed via `onlineManager` + exponential backoff
- Connectivity monitored via `@react-native-community/netinfo`
- Stale-while-revalidate: cached data shown immediately, background refetch on connectivity

---

## Navigation Strategy for Mobile

### Decision: React Navigation v7 with native stack

**Rationale:** React Navigation is the standard navigation library for React Native / Expo. Native stack uses native navigation containers (UINavigationController on iOS, Fragment on Android).

**Stack structure:**
- **TabNavigator** (bottom tabs): Home, Events, Teachers, Bookings, Profile
- **StackNavigator** per tab: e.g., Events → EventsList → EventDetail → RSVP
- **Modal stack**: Login, Settings, RSVP confirmation
- Hardware back button: Handled automatically by React Navigation
- Deep linking: Expo linking configuration for URL scheme + universal links

---

## CI/CD Pipeline Additions

### Mobile Build Pipeline (EAS Build)

1. **PR checks**: TypeScript compile, ESLint, Vitest (shared packages)
2. **Preview builds**: EAS Build preview profile on feature branches (internal distribution)
3. **Production builds**: EAS Build production profile on `main` merge
4. **App store submission**: EAS Submit for TestFlight (iOS) and Play Store internal track (Android)

### Bundle Size Monitoring

- **Web**: `@next/bundle-analyzer`; fail CI if >200KB
- **Mobile**: EAS Build logs include binary size; custom check against 50MB iOS / 30MB Android budgets

### Accessibility CI

- **Web**: `axe-core` against Storybook static build; zero critical/serious violations
- **Mobile**: Lint rules enforce `accessibilityLabel`; manual audit per release

### Design Token CI

- Style Dictionary build runs as pre-commit hook and in CI
- Contrast ratio check runs during token build; fails CI on AA violations
- Token removal: TypeScript compile catches references to deleted tokens (type-safe exports)
