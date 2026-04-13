# Quickstart: Expo SDK 52 → 53 Upgrade

**Feature**: 021-expo-sdk-upgrade
**Date**: 2025-07-15

---

## Prerequisites

- Node.js >=22.0.0 (already enforced by root `package.json` engines)
- npm (ships with Node.js)
- Git (for branch management)
- Access to the monorepo at the repository root

## Step-by-Step Upgrade

### Step 1: Create Feature Branch

```bash
git checkout -b 021-expo-sdk-upgrade
```

### Step 2: Update Root Security Overrides

Edit `package.json` (repository root) — remove the two overrides resolved by SDK 53:

```jsonc
// Before:
"overrides": {
  "@xmldom/xmldom": ">=0.8.12",
  "tar": ">=7.5.11",
  "@tootallnate/once": ">=3.0.1"
}

// After:
"overrides": {
  "@tootallnate/once": ">=3.0.1"
}
```

### Step 3: Update Mobile Dependencies

Edit `apps/mobile/package.json` — update all version ranges:

**dependencies**:
```jsonc
"expo": "~53.0.0",
"expo-constants": "~17.1.0",
"expo-haptics": "~14.1.0",
"expo-linking": "~7.1.0",
"expo-notifications": "~0.31.0",
"expo-router": "~5.1.0",
"expo-secure-store": "~14.2.0",
"expo-status-bar": "~2.2.0",
"@expo/vector-icons": "^14.1.0",
"react": "19.0.0",
"react-native": "0.79.6",
"react-native-gesture-handler": "~2.24.0",
"react-native-reanimated": "~3.17.0",
"react-native-safe-area-context": "5.4.0",
"react-native-screens": "~4.11.0",
```

**devDependencies**:
```jsonc
"jest-expo": "~53.0.0",
"@testing-library/react-native": "^14.0.0",
"@types/react": "^19.0.0",
// REMOVE: "react-test-renderer": "18.3.1"
```

### Step 4: Update Jest moduleNameMapper

In `apps/mobile/package.json`, update the jest `moduleNameMapper` to point to local `node_modules` (not root):

```jsonc
"moduleNameMapper": {
  "^@/(.*)$": "<rootDir>/$1",
  "^react$": "<rootDir>/node_modules/react",
  "^react/(.*)$": "<rootDir>/node_modules/react/$1",
  "^react-native$": "<rootDir>/node_modules/react-native"
}
```

### Step 5: Fix Notification Handler (Breaking Change)

Edit `apps/mobile/lib/push.ts`:

```typescript
// Before:
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// After:
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

### Step 6: Fix useRef Type Annotations (React 19)

In `apps/mobile/lib/push.ts`, update the `useRef` calls:

```typescript
// Before:
const notificationListener = useRef<Notifications.EventSubscription>();
const responseListener = useRef<Notifications.EventSubscription>();

// After:
const notificationListener = useRef<Notifications.EventSubscription | null>(null);
const responseListener = useRef<Notifications.EventSubscription | null>(null);
```

### Step 7: Install Dependencies

```bash
# From repository root
npm install
```

This regenerates `package-lock.json` with the new dependency tree.

### Step 8: Run Type Check

```bash
npm run typecheck
```

All workspaces should pass with zero errors.

### Step 9: Run Mobile Tests

```bash
npm run test -w @acroyoga/mobile
```

All 52 tests must pass. If `@testing-library/react-native` v14 causes failures due to async API changes, add `await` before `render()` calls in affected test files.

### Step 10: Run Full Test Suite

```bash
npm run test
```

Verifies that all workspaces (tokens, shared-ui, shared, web, mobile) still pass.

### Step 11: Run Security Audit

```bash
npm audit
```

Verify zero high/critical vulnerabilities.

## Verification Checklist

- [ ] All 52 mobile tests pass (`npm run test -w @acroyoga/mobile`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Full test suite passes (`npm run test`)
- [ ] Security audit clean (`npm audit` — zero high/critical)
- [ ] Root `package.json` has exactly 1 override (`@tootallnate/once`)
- [ ] `apps/mobile/lib/push.ts` uses `shouldShowBanner` + `shouldShowList` (not `shouldShowAlert`)
- [ ] `apps/mobile/lib/push.ts` uses `useRef<T | null>(null)` (not `useRef<T>()`)
- [ ] `react-test-renderer` is NOT in `apps/mobile/package.json`
- [ ] No changes to `.github/workflows/` files
- [ ] No changes to `apps/web/` files
- [ ] No changes to `packages/` files

## Troubleshooting

### Problem: Tests fail with "Cannot find module 'react-native'"
**Cause**: moduleNameMapper still pointing to root `node_modules`.
**Fix**: Ensure `moduleNameMapper["^react-native$"]` points to `<rootDir>/node_modules/react-native` (not `<rootDir>/../../node_modules/react-native`).

### Problem: TypeScript error on `useRef<T>()`
**Cause**: `@types/react@19` requires an explicit initial value.
**Fix**: Change `useRef<T>()` to `useRef<T | null>(null)`.

### Problem: Tests fail with async render errors
**Cause**: `@testing-library/react-native` v14 makes `render()` async.
**Fix**: Add `await` before `render()` calls in test files. Run the codemod: `npx @callstack/rntl-upgrade --from 12 --to 14`.

### Problem: `npm audit` reports new vulnerabilities
**Cause**: A transitive dependency may have a new CVE.
**Fix**: Check if the vulnerability is from SDK 53's tree. If so, add a targeted override. If from a non-Expo dependency, address separately.

### Problem: `expo-notifications` mock fails in tests
**Cause**: Test mock in `__tests__/setup.ts` may need updating if the mock return shape changed.
**Fix**: The mock uses `setNotificationHandler: jest.fn()` which accepts any arguments — no changes needed to the mock itself. The real API change is only in the source code.
