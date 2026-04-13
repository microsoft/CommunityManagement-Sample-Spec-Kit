# Contracts: Expo SDK 52 → 53 Upgrade

**Feature**: 021-expo-sdk-upgrade
**Status**: N/A — No new external interfaces

---

## Rationale

This feature is a dependency upgrade that modifies internal implementation details (package versions, notification handler API, type annotations). It does not:

- Add, remove, or modify any public API endpoints
- Change any request/response schemas
- Alter any shared TypeScript interfaces consumed by other packages
- Modify any CLI commands or configuration schemas
- Change any inter-service communication protocols

The notification handler change (`shouldShowAlert` → `shouldShowBanner` + `shouldShowList`) is an internal SDK API consumed only by `apps/mobile/lib/push.ts` — it is not an external contract of this project.

## Preserved Contracts

The following existing contracts remain unchanged:

| Contract | Location | Status |
|----------|----------|--------|
| Push token registration API | `POST /api/notifications/devices` | Unchanged |
| Notification data payload shape | `{ type: string, resourceId: string }` | Unchanged |
| Shared package exports | `packages/shared/`, `packages/shared-ui/`, `packages/tokens/` | Unchanged |
| Web app APIs | `apps/web/src/app/api/` | Unchanged |
