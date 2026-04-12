# Research: Expo SDK 52 → 53 Upgrade

**Feature**: 021-expo-sdk-upgrade
**Date**: 2025-07-15
**Status**: Complete — all unknowns resolved

---

## R-001: Expo SDK 53 Target Package Versions

**Question**: What are the exact SDK 53-compatible version ranges for all Expo and React Native packages used in `apps/mobile`?

**Decision**: Use version ranges from Expo's `bundledNativeModules.json` on the `sdk-53` branch as the authoritative source.

**Findings**:

| Package | SDK 52 (current) | SDK 53 (target) | Change Type |
|---------|-----------------|-----------------|-------------|
| `expo` | ~52.0.0 | ~53.0.0 | Major |
| `expo-constants` | ~17.0.0 | ~17.1.0 | Minor |
| `expo-haptics` | ~14.0.0 | ~14.1.0 | Minor |
| `expo-linking` | ~7.0.0 | ~7.1.0 | Minor |
| `expo-notifications` | ~0.29.0 | ~0.31.0 | Minor (breaking API) |
| `expo-router` | ~4.0.0 | ~5.1.0 | Major |
| `expo-secure-store` | ~14.0.0 | ~14.2.0 | Minor |
| `expo-status-bar` | ~2.0.0 | ~2.2.0 | Minor |
| `@expo/vector-icons` | ^14.0.4 | ^14.1.0 | Minor |
| `react` | 18.3.1 | 19.0.0 | Major |
| `react-native` | 0.76.6 | 0.79.6 | Minor (within RN 0.x) |
| `react-native-gesture-handler` | ~2.20.0 | ~2.24.0 | Minor |
| `react-native-reanimated` | ~3.16.0 | ~3.17.0 | Minor |
| `react-native-safe-area-context` | ~4.14.0 | 5.4.0 | Major |
| `react-native-screens` | ~4.4.0 | ~4.11.0 | Minor |

**Rationale**: Expo's `bundledNativeModules.json` defines exact compatible ranges for each SDK release. Using these ensures all packages are tested together by Expo's CI.

**Alternatives Considered**:
- Using `npx expo install --fix` to auto-resolve: Would work, but documenting explicit targets ensures reproducibility and review-ability.
- Using `latest` for all packages: Rejected — could pull in versions beyond SDK 53's tested compatibility window.

---

## R-002: React 19 Breaking Changes for Mobile

**Question**: What React 19 breaking changes affect the existing mobile app codebase?

**Decision**: Two changes require code modifications; the rest are informational.

**Findings**:

### Changes Requiring Code Modifications

1. **`useRef()` requires explicit initial value** (type-level enforcement):
   - In React 18 + `@types/react@18`, `useRef<T>()` was allowed and returned `MutableRefObject<T | undefined>`.
   - In React 19 + `@types/react@19`, `useRef()` without an argument is a type error.
   - **Impact**: 2 occurrences in `apps/mobile/lib/push.ts` (lines 70–71):
     ```typescript
     // Before:
     const notificationListener = useRef<Notifications.EventSubscription>();
     const responseListener = useRef<Notifications.EventSubscription>();
     // After:
     const notificationListener = useRef<Notifications.EventSubscription | null>(null);
     const responseListener = useRef<Notifications.EventSubscription | null>(null);
     ```
   - **Cleanup usage already uses optional chaining** (`if (notificationListener.current)`), so no runtime changes needed beyond the type fix.

2. **`react-test-renderer` deprecated**:
   - React 19 deprecates `react-test-renderer` with console warnings.
   - Replacement: `@testing-library/react-native` v14 ships its own built-in renderer.
   - **Impact**: Remove `react-test-renderer` from devDependencies. No test files import it directly (all tests use `@testing-library/react-native`).

### Changes NOT Requiring Modifications

- **`forwardRef` deprecated**: No `React.forwardRef()` usage found in `apps/mobile/`.
- **`defaultProps` on function components deprecated**: No `defaultProps` usage found.
- **`propTypes` removed**: Not used in the TypeScript codebase.
- **Ref callback cleanup**: New feature; existing ref patterns are compatible.
- **New `use()` hook**: New feature; not required for upgrade.

**Rationale**: Targeted search of the entire `apps/mobile/` directory confirms the impact is limited to 2 `useRef` type annotations and the `react-test-renderer` devDependency.

**Alternatives Considered**:
- Suppressing TypeScript errors with `// @ts-expect-error`: Rejected — violates Principle VII (Simplicity) and the fix is trivial.
- Keeping `react-test-renderer` with warnings: Rejected — clean dependency tree is a goal; v14 of RNTL doesn't need it.

---

## R-003: expo-notifications Breaking Change

**Question**: What changed in `expo-notifications` between SDK 52 (~0.29.0) and SDK 53 (~0.31.0)?

**Decision**: Replace `shouldShowAlert` with `shouldShowBanner` + `shouldShowList` in the notification handler.

**Findings**:

The `handleNotification` callback return type changed:

```typescript
// SDK 52 (expo-notifications ~0.29.0)
{
  shouldShowAlert: boolean;    // Single flag for all foreground display
  shouldPlaySound: boolean;
  shouldSetBadge: boolean;
}

// SDK 53 (expo-notifications ~0.31.0)
{
  shouldShowBanner: boolean;   // Controls in-app banner notification
  shouldShowList: boolean;     // Controls notification center/tray entry
  shouldPlaySound: boolean;
  shouldSetBadge: boolean;
}
```

- `shouldShowAlert: true` is equivalent to `shouldShowBanner: true, shouldShowList: true`.
- The split gives developers finer control (e.g., show in notification list but suppress the banner).
- For this app, both should be `true` to preserve existing behavior.

**Impact**: Single file change in `apps/mobile/lib/push.ts` (lines 11–15).

**Rationale**: The 1:1 behavioral replacement preserves existing notification UX exactly. Users see the same banner and notification list behavior as before.

**Alternatives Considered**:
- Setting only `shouldShowBanner: true`: Rejected — would lose notification list entries, breaking acceptance scenario 2 of User Story 2.
- Setting only `shouldShowList: true`: Rejected — would lose the in-app banner, breaking acceptance scenario 1 of User Story 2.

---

## R-004: Test Infrastructure Upgrade Path

**Question**: What test tooling changes are needed for SDK 53 + React 19 compatibility?

**Decision**: Upgrade jest-expo to ~53.0.0, `@testing-library/react-native` to ^14.0.0, remove `react-test-renderer`, update `@types/react` to ^19.0.0.

**Findings**:

### jest-expo ~53.0.0
- Ships updated `transformIgnorePatterns` compatible with SDK 53's dependency tree.
- The existing custom `transformIgnorePatterns` in `apps/mobile/package.json` should be preserved (it covers project-specific packages like `@acroyoga/*`, `@sentry/react-native`, `native-base`).
- No changes to the preset API itself.

### @testing-library/react-native v14
- **Major change**: `render`, `fireEvent`, `act` are now **async**.
- Uses its own built-in renderer, replacing `react-test-renderer`.
- However, the existing test suite may work without `await` additions if the tests already use `await` with `waitFor`, `findBy*`, etc.
- If tests fail, the migration path is to add `await` before `render()` calls.
- Codemods are available: `npx @callstack/rntl-upgrade --from 12 --to 14`.

### @types/react ^19.0.0
- Required for React 19 type definitions.
- Enforces `useRef(null)` instead of `useRef()`.
- `React.FC` typing changes are minimal and backward-compatible.

### Jest moduleNameMapper Update
- **Problem**: In the monorepo, `react-native` hoisting puts 0.76.6 at root (pulled by `@expo/vector-icons`) while 0.79.6 is at `apps/mobile/node_modules/`.
- **Current mapper**: `"^react-native$": "<rootDir>/../../node_modules/react-native"` → points to root (0.76.6) — **WRONG after upgrade**.
- **Fix**: Change to `"^react-native$": "<rootDir>/node_modules/react-native"` to use the local 0.79.6 copy.
- The `react` mapper (`<rootDir>/../../node_modules/react`) should also be updated to point to the local copy since the mobile app will have React 19 locally while the root may hoist a different version.

**Rationale**: The test infrastructure must match the runtime SDK version. Mismatched versions cause subtle rendering failures and false test results.

**Alternatives Considered**:
- Staying on `@testing-library/react-native` v12 with `--legacy-peer-deps`: Rejected — v12 is incompatible with React 19's rendering internals at runtime.
- Using `jest.config.js` instead of `package.json` jest config: Rejected — unnecessary structural change for this upgrade (Principle VII).

---

## R-005: Security Override Resolution

**Question**: Which npm overrides can be removed after upgrading to SDK 53?

**Decision**: Remove `@xmldom/xmldom` and `tar` overrides; retain `@tootallnate/once`.

**Findings**:

| Override | Why It Exists | SDK 53 Status | Action |
|----------|--------------|---------------|--------|
| `@xmldom/xmldom >=0.8.12` | CVE in transitive dep from Expo SDK 52 | SDK 53 depends on a fixed version natively | **Remove** |
| `tar >=7.5.11` | CVE in transitive dep from Expo SDK 52 | SDK 53 depends on a fixed version natively | **Remove** |
| `@tootallnate/once >=3.0.1` | CVE in transitive dep (not Expo-specific) | Not resolved by SDK 53 | **Retain** |

**Verification**: After removing the two overrides and running `npm audit`, no new high or critical vulnerabilities should appear. If they do, re-add the override or investigate.

**Rationale**: Reducing overrides simplifies the dependency tree and removes maintenance burden. Each override is a workaround that should be removed as soon as the upstream fix is available.

**Alternatives Considered**:
- Removing all three overrides: Rejected — `@tootallnate/once` vulnerability is not resolved by SDK 53.
- Keeping all overrides "just in case": Rejected — unnecessary overrides can mask version conflicts and complicate debugging.

---

## R-006: Shared Package Compatibility

**Question**: Are the shared packages (`@acroyoga/shared`, `@acroyoga/shared-ui`, `@acroyoga/tokens`) compatible with React 19?

**Decision**: No changes needed to shared packages.

**Findings**:

| Package | React Dependency | Compatibility |
|---------|-----------------|---------------|
| `@acroyoga/shared` | No React peerDependency | ✅ Compatible (pure TypeScript utilities) |
| `@acroyoga/shared-ui` | `peerDependencies: { "react": ">=18" }` | ✅ Compatible (React 19 satisfies >=18) |
| `@acroyoga/tokens` | No React dependency | ✅ Compatible (design tokens only) |

The web app already uses React 19.2.4, confirming the shared packages work with React 19.

**Rationale**: The `>=18` peer dependency range is intentionally broad to support both web (React 19) and mobile (previously React 18, now React 19).

---

## R-007: CI/CD Pipeline Impact

**Question**: Do any CI/CD workflows need modification for the SDK 53 upgrade?

**Decision**: No workflow changes needed.

**Findings**:

| Workflow | Impact | Notes |
|----------|--------|-------|
| `ci.yml` | None | Runs `npm run test -w @acroyoga/mobile` — same command, updated deps |
| `nightly.yml` | None | Validate job mirrors CI; build/deploy jobs are web-only |
| `deploy.yml` | None | Web-only deployment |
| `close-completed-issues.yml` | None | Issue management only |
| `copilot-setup-steps.yml` | None | Copilot environment setup |

The CI pipeline installs all workspace dependencies via `npm ci`, which will pick up the updated versions from `package.json` and `package-lock.json`. No workflow file changes are required.

**Rationale**: The upgrade is entirely within `package.json` version changes and source code modifications. The CI commands (`npm ci`, `npm run test`, etc.) are version-agnostic.

---

## R-008: @tanstack/react-query React 19 Compatibility

**Question**: Are the current @tanstack/react-query v5 packages compatible with React 19?

**Decision**: No changes needed.

**Findings**:
- `@tanstack/react-query ^5.62.16` explicitly lists React 18 and 19 as supported peer dependencies.
- `@tanstack/react-query-persist-client ^5.62.16` has the same compatibility.
- `@tanstack/query-async-storage-persister ^5.62.16` has no React peer dependency.
- The web app already uses these packages with React 19.2.4, confirming compatibility.

**Rationale**: TanStack Query v5 was designed with React 19 support from its initial release.

---

## R-009: react-native-mmkv Compatibility

**Question**: Is `react-native-mmkv ^3.2.0` compatible with react-native 0.79.6?

**Decision**: Compatible — no version change needed.

**Findings**:
- react-native-mmkv v3.x supports React Native 0.74+ and the New Architecture (TurboModules).
- react-native 0.79.6 (SDK 53) defaults to New Architecture, which mmkv v3 supports.
- v4.x is available but not required for this upgrade.

**Rationale**: The existing version satisfies compatibility requirements. Upgrading to v4 would be a separate, optional improvement.

---

## R-010: @react-native-community/netinfo Compatibility

**Question**: Is `@react-native-community/netinfo ^11.4.1` compatible with SDK 53?

**Decision**: Compatible — no version change needed.

**Findings**:
- NetInfo v11.x supports React Native 0.73+ and the New Architecture.
- No breaking changes affect the APIs used in the mobile app (`addEventListener`, `fetch`, `useNetInfo`).

**Rationale**: The package's broad React Native version support covers 0.79.6.

---

## R-011: app.json Configuration Changes

**Question**: Does `app.json` need updates for SDK 53?

**Decision**: No changes needed.

**Findings**:
- `newArchEnabled: true` is already set (SDK 53 defaults to New Architecture regardless, but explicit setting is fine).
- `expo-router` plugin config is unchanged.
- `expo-notifications` plugin config is unchanged.
- `expo-secure-store` plugin config is unchanged.
- The `experiments.typedRoutes` flag is still supported in SDK 53.

**Rationale**: The app.json configuration is forward-compatible with SDK 53.
