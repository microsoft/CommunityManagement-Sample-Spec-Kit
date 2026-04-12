# Implementation Plan: Expo SDK 52 → 53 Upgrade

**Branch**: `021-expo-sdk-upgrade` | **Date**: 2025-07-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/021-expo-sdk-upgrade/spec.md`

## Summary

Upgrade the AcroYoga Community mobile app (`apps/mobile`) from Expo SDK 52 to SDK 53. This is a major dependency upgrade that transitions the mobile app to React 19, react-native 0.79.6, and updated Expo packages. The upgrade requires addressing one breaking API change (notification handler `shouldShowAlert` → `shouldShowBanner` + `shouldShowList`), two React 19 type-safety fixes (`useRef` initial values), test infrastructure updates (jest-expo ~53.0, `@testing-library/react-native` v14, removal of deprecated `react-test-renderer`), and cleanup of two security overrides that SDK 53 resolves natively. No changes are required to the web app, shared packages, or CI/CD workflows.

## Technical Context

**Language/Version**: TypeScript ^5.9.3, React 19.0.0, React Native 0.79.6
**Primary Dependencies**: Expo SDK 53 (`expo ~53.0.0`), expo-router ~5.1.0, expo-notifications ~0.31.0, @tanstack/react-query ^5.62.16
**Storage**: N/A (mobile client — MMKV for offline cache, no schema changes)
**Testing**: Jest ^29.7.0 via jest-expo ~53.0.0, @testing-library/react-native ^14.0.0
**Target Platform**: iOS (iPad/iPhone) and Android via Expo managed workflow
**Project Type**: Mobile app in npm-workspaces monorepo (`apps/mobile`)
**Performance Goals**: App launch and home screen render within 5 seconds on device
**Constraints**: All 52 existing mobile tests must pass; zero changes to test logic; spec 020 (nightly workflow) must remain intact; no new high/critical CVEs
**Scale/Scope**: ~900 lines of test code across 8 test files, 2 source files requiring modification (`lib/push.ts`, `package.json`), 1 root config file (`package.json`)

### Current → Target Version Matrix

| Package | Current (SDK 52) | Target (SDK 53) |
|---------|-----------------|-----------------|
| `expo` | ~52.0.0 | ~53.0.0 |
| `expo-constants` | ~17.0.0 | ~17.1.0 |
| `expo-haptics` | ~14.0.0 | ~14.1.0 |
| `expo-linking` | ~7.0.0 | ~7.1.0 |
| `expo-notifications` | ~0.29.0 | ~0.31.0 |
| `expo-router` | ~4.0.0 | ~5.1.0 |
| `expo-secure-store` | ~14.0.0 | ~14.2.0 |
| `expo-status-bar` | ~2.0.0 | ~2.2.0 |
| `@expo/vector-icons` | ^14.0.4 | ^14.1.0 |
| `react` | 18.3.1 | 19.0.0 |
| `react-native` | 0.76.6 | 0.79.6 |
| `react-native-gesture-handler` | ~2.20.0 | ~2.24.0 |
| `react-native-reanimated` | ~3.16.0 | ~3.17.0 |
| `react-native-safe-area-context` | ~4.14.0 | 5.4.0 |
| `react-native-screens` | ~4.4.0 | ~4.11.0 |
| `jest-expo` (dev) | ~52.0.0 | ~53.0.0 |
| `@testing-library/react-native` (dev) | ^12.9.0 | ^14.0.0 |
| `react-test-renderer` (dev) | 18.3.1 | *(removed)* |
| `@types/react` (dev) | ~18.3.0 | ^19.0.0 |

### Breaking Changes Summary

1. **expo-notifications**: `shouldShowAlert` removed → use `shouldShowBanner` + `shouldShowList` (in `lib/push.ts`)
2. **React 19 types**: `useRef<T>()` without initial value is a type error → add `null` initial value (2 occurrences in `lib/push.ts`)
3. **react-test-renderer**: Deprecated in React 19 → remove; `@testing-library/react-native` v14 uses its own renderer
4. **@testing-library/react-native v14**: `render`, `fireEvent`, `act` are now async → test files may need `await` additions
5. **Jest moduleNameMapper**: After upgrade, root `node_modules/react-native` remains at 0.76.6 (hoisted from `@expo/vector-icons`), while `apps/mobile/node_modules/react-native` has 0.79.6 → mapper must point to local copy

### Security Override Changes

| Override | Current | After Upgrade | Action |
|----------|---------|--------------|--------|
| `@xmldom/xmldom` | >=0.8.12 | Resolved by SDK 53 | Remove |
| `tar` | >=7.5.11 | Resolved by SDK 53 | Remove |
| `@tootallnate/once` | >=3.0.1 | Still needed | Retain |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Check (Phase 0 Gate)

| # | Principle | Applies? | Status | Notes |
|---|-----------|----------|--------|-------|
| I | API-First Design | No | N/A | No new APIs — this is a dependency upgrade |
| II | Test-First Development | Yes | ✅ PASS | All 52 tests must continue passing; test infrastructure updated, not test logic |
| III | Privacy & Data Protection | No | N/A | No PII changes |
| IV | Server-Side Authority | No | N/A | No business logic changes |
| V | UX Consistency | No | N/A | No UI changes — notification behavior preserved |
| VI | Performance Budget | Yes | ✅ PASS | App launch time SC-002 (< 5s); no bundle size impact on web |
| VII | Simplicity | Yes | ✅ PASS | Minimal changes — only what the SDK upgrade requires; no speculative refactoring |
| VIII | Internationalisation | No | N/A | No string changes |
| IX | Scoped Permissions | No | N/A | No permission changes |
| X | Notification Architecture | Yes | ✅ PASS | Notification handler updated for SDK 53 breaking change; behavior preserved |
| XI | Resource Ownership | No | N/A | No resource changes |
| XII | Financial Integrity | No | N/A | No payment changes |
| XIII | Development Environment | Yes | ✅ PASS | All builds/tests run on Linux (CI ubuntu-latest); no environment changes |
| XIV | Managed Identity | No | N/A | No Azure service changes |

### Quality Gates Impact

| # | Gate | Impact | Status |
|---|------|--------|--------|
| 1 | Type check (`tsc --noEmit`) | React 19 types require `useRef(null)` | ✅ Addressed in plan |
| 2 | Tests (`npm run test`) | jest-expo + RNTL upgrade | ✅ Addressed in plan |
| 3 | Lint | No impact | ✅ PASS |
| 4 | Build | No impact on web build | ✅ PASS |
| 5 | Bundle size | No impact on web bundle | ✅ PASS |
| 6 | Accessibility | No UI changes | ✅ PASS |
| 7 | API contract | No API changes | ✅ PASS |
| 8 | Constitution review | This document | ✅ PASS |
| 9 | i18n compliance | No string changes | ✅ PASS |
| 10 | Permission smoke test | No new endpoints | ✅ PASS |

**Gate Result**: ✅ ALL GATES PASS — no violations, no justifications needed.

### Post-Design Re-Check

| # | Principle | Status | Notes |
|---|-----------|--------|-------|
| II | Test-First | ✅ PASS | Test infrastructure updated; no test logic changes; all 52 tests required to pass |
| VI | Performance | ✅ PASS | SDK 53 includes performance improvements (New Architecture default) |
| VII | Simplicity | ✅ PASS | Design uses minimum required changes; no unnecessary abstractions |
| X | Notification Architecture | ✅ PASS | 1:1 behavioral replacement (`shouldShowAlert` → `shouldShowBanner` + `shouldShowList`) |
| XIII | Dev Environment | ✅ PASS | No CI workflow changes needed |

## Project Structure

### Documentation (this feature)

```text
specs/021-expo-sdk-upgrade/
├── plan.md              # This file
├── research.md          # Phase 0: SDK 53 research findings
├── data-model.md        # Phase 1: Dependency version model & change map
├── quickstart.md        # Phase 1: Step-by-step upgrade guide
├── contracts/           # Phase 1: N/A for this feature (no external interfaces added)
└── tasks.md             # Phase 2: Task breakdown (generated by /speckit.tasks)
```

### Source Code (files modified by this upgrade)

```text
# Root configuration
package.json                           # Remove 2 of 3 security overrides

# Mobile app
apps/mobile/
├── package.json                       # All dependency version bumps + jest config update
├── lib/
│   └── push.ts                        # shouldShowAlert → shouldShowBanner + shouldShowList
│                                      # useRef<T>() → useRef<T | null>(null)
└── __tests__/
    └── setup.ts                       # Verify mock compatibility (may need minor updates)

# NOT modified (verified)
apps/web/                              # Already on React 19; no changes
packages/shared/                       # peerDependencies "react": ">=18" — compatible
packages/shared-ui/                    # peerDependencies "react": ">=18" — compatible
packages/tokens/                       # No React dependency
.github/workflows/ci.yml              # No changes needed
.github/workflows/nightly.yml         # No changes needed (FR-010)
.github/workflows/deploy.yml          # No changes needed
```

**Structure Decision**: Existing monorepo structure is unchanged. This is a dependency-only upgrade affecting `apps/mobile` and root `package.json`. No new directories or files are created in source code.

## Complexity Tracking

> No violations found — table intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)* | — | — |
