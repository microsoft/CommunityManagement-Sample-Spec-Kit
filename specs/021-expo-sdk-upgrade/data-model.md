# Data Model: Expo SDK 52 → 53 Upgrade

**Feature**: 021-expo-sdk-upgrade
**Date**: 2025-07-15

---

## Overview

This upgrade introduces no new data entities, database schemas, or storage models. The "data model" for a dependency upgrade is the **dependency version map** and the **change map** — the structured representation of what changes where and why.

---

## Entity: Root Package Configuration

**File**: `package.json` (repository root)
**Type**: npm workspace root configuration

### Fields Modified

| Field | Current Value | Target Value | Validation Rule |
|-------|--------------|-------------|-----------------|
| `overrides["@xmldom/xmldom"]` | `">=0.8.12"` | *(removed)* | SDK 53 resolves natively |
| `overrides["tar"]` | `">=7.5.11"` | *(removed)* | SDK 53 resolves natively |
| `overrides["@tootallnate/once"]` | `">=3.0.1"` | `">=3.0.1"` | Retained — not resolved by SDK 53 |

### State Transitions

```
overrides: 3 entries → overrides: 1 entry
```

**Invariant**: After transition, `npm audit` must report zero high/critical vulnerabilities.

---

## Entity: Mobile App Package Configuration

**File**: `apps/mobile/package.json`
**Type**: npm workspace member configuration

### Dependencies Modified

| Field Path | Current Value | Target Value | Category |
|-----------|--------------|-------------|----------|
| `dependencies["expo"]` | `"~52.0.0"` | `"~53.0.0"` | Core SDK |
| `dependencies["expo-constants"]` | `"~17.0.0"` | `"~17.1.0"` | Core SDK |
| `dependencies["expo-haptics"]` | `"~14.0.0"` | `"~14.1.0"` | Core SDK |
| `dependencies["expo-linking"]` | `"~7.0.0"` | `"~7.1.0"` | Core SDK |
| `dependencies["expo-notifications"]` | `"~0.29.0"` | `"~0.31.0"` | Core SDK (breaking) |
| `dependencies["expo-router"]` | `"~4.0.0"` | `"~5.1.0"` | Core SDK |
| `dependencies["expo-secure-store"]` | `"~14.0.0"` | `"~14.2.0"` | Core SDK |
| `dependencies["expo-status-bar"]` | `"~2.0.0"` | `"~2.2.0"` | Core SDK |
| `dependencies["@expo/vector-icons"]` | `"^14.0.4"` | `"^14.1.0"` | Core SDK |
| `dependencies["react"]` | `"18.3.1"` | `"19.0.0"` | Framework (breaking) |
| `dependencies["react-native"]` | `"0.76.6"` | `"0.79.6"` | Framework |
| `dependencies["react-native-gesture-handler"]` | `"~2.20.0"` | `"~2.24.0"` | Navigation |
| `dependencies["react-native-reanimated"]` | `"~3.16.0"` | `"~3.17.0"` | Animation |
| `dependencies["react-native-safe-area-context"]` | `"~4.14.0"` | `"5.4.0"` | Layout |
| `dependencies["react-native-screens"]` | `"~4.4.0"` | `"~4.11.0"` | Navigation |

### DevDependencies Modified

| Field Path | Current Value | Target Value | Category |
|-----------|--------------|-------------|----------|
| `devDependencies["jest-expo"]` | `"~52.0.0"` | `"~53.0.0"` | Testing |
| `devDependencies["@testing-library/react-native"]` | `"^12.9.0"` | `"^14.0.0"` | Testing |
| `devDependencies["react-test-renderer"]` | `"18.3.1"` | *(removed)* | Testing (deprecated) |
| `devDependencies["@types/react"]` | `"~18.3.0"` | `"^19.0.0"` | Types |

### Jest Configuration Modified

| Field Path | Current Value | Target Value | Reason |
|-----------|--------------|-------------|--------|
| `jest.moduleNameMapper["^react$"]` | `"<rootDir>/../../node_modules/react"` | `"<rootDir>/node_modules/react"` | React 19 installed locally |
| `jest.moduleNameMapper["^react/(.*)$"]` | `"<rootDir>/../../node_modules/react/$1"` | `"<rootDir>/node_modules/react/$1"` | React 19 installed locally |
| `jest.moduleNameMapper["^react-native$"]` | `"<rootDir>/../../node_modules/react-native"` | `"<rootDir>/node_modules/react-native"` | RN 0.79.6 installed locally (root has 0.76.6 from @expo/vector-icons) |

### Validation Rules

- After all changes: `npm run test -w @acroyoga/mobile` must pass all 52 tests
- After all changes: `npm run typecheck` must pass with zero errors
- `npm audit` must report zero high/critical vulnerabilities

---

## Entity: Notification Handler Configuration

**File**: `apps/mobile/lib/push.ts`
**Type**: Source code — Expo notification handler

### Fields Modified

| Property | Current Value | Target Value | SDK Change |
|----------|--------------|-------------|------------|
| `shouldShowAlert` | `true` | *(removed)* | Deprecated in SDK 53 |
| `shouldShowBanner` | *(new)* | `true` | Replaces shouldShowAlert for banner |
| `shouldShowList` | *(new)* | `true` | Replaces shouldShowAlert for notification list |

### Type Annotations Modified

| Variable | Current Type | Target Type |
|----------|-------------|-------------|
| `notificationListener` | `useRef<Notifications.EventSubscription>()` | `useRef<Notifications.EventSubscription \| null>(null)` |
| `responseListener` | `useRef<Notifications.EventSubscription>()` | `useRef<Notifications.EventSubscription \| null>(null)` |

### State Transition

```
shouldShowAlert: true
  → shouldShowBanner: true + shouldShowList: true

useRef<T>()
  → useRef<T | null>(null)
```

**Invariant**: Notification behavior is identical before and after the change. Both banner and notification list entries must appear for foreground notifications.

---

## Relationships

```
package.json (root)
  └── overrides ──affects──▶ apps/mobile/node_modules (transitive deps)

apps/mobile/package.json
  ├── dependencies ──installed-to──▶ apps/mobile/node_modules
  ├── devDependencies ──installed-to──▶ apps/mobile/node_modules
  └── jest config ──references──▶ node_modules paths

apps/mobile/lib/push.ts
  └── imports ──from──▶ expo-notifications (~0.31.0)

apps/mobile/__tests__/*
  └── uses ──from──▶ jest-expo (~53.0.0) + @testing-library/react-native (^14.0.0)
```

---

## Unchanged Entities (verified)

| Entity | Reason |
|--------|--------|
| Database schema | No database in mobile app |
| API contracts | No API changes |
| Shared package types | `@acroyoga/shared` types are not version-specific |
| Web app config | Already on React 19; not affected |
| CI workflow files | Commands are version-agnostic |
| `app.json` | Forward-compatible with SDK 53 |
