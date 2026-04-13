# Tasks: Expo SDK 52 → 53 Upgrade

**Input**: Design documents from `/specs/021-expo-sdk-upgrade/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: All 52 existing mobile tests MUST pass. No new test files are created — test infrastructure is updated to remain compatible with SDK 53, React 19, and `@testing-library/react-native` v14.

**Organization**: Tasks are grouped by user story (from spec.md) to enable independent implementation and verification. Since this is a dependency upgrade, stories have natural sequential dependencies (US1 must complete before US2–US5 can be verified).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo root**: `package.json` at repository root
- **Mobile app**: `apps/mobile/` (workspace `@acroyoga/mobile`)
- **Source code**: `apps/mobile/lib/`, `apps/mobile/app/`
- **Tests**: `apps/mobile/__tests__/`

---

## Phase 1: Setup (Branch & Backup)

**Purpose**: Create the feature branch and establish baseline test results before any changes

- [ ] T001 Create feature branch `021-expo-sdk-upgrade` from main
- [ ] T002 Run baseline mobile test suite (`npm run test -w @acroyoga/mobile`) and record that all 52 tests pass

---

## Phase 2: Foundational (Dependency Version Bumps)

**Purpose**: Update all package versions across the monorepo. These JSON-only changes MUST be complete before any source code modifications or `npm install` can succeed.

**⚠️ CRITICAL**: No source code or test infrastructure changes until all version bumps are committed.

- [ ] T003 [P] Update root security overrides in `package.json` — remove `@xmldom/xmldom` and `tar` overrides, retain `@tootallnate/once` override (reduce from 3 overrides to 1)
- [ ] T004 [P] Update Expo core SDK dependencies in `apps/mobile/package.json` — bump `expo` from `~52.0.0` to `~53.0.0`, `expo-constants` from `~17.0.0` to `~17.1.0`, `expo-haptics` from `~14.0.0` to `~14.1.0`, `expo-linking` from `~7.0.0` to `~7.1.0`, `expo-notifications` from `~0.29.0` to `~0.31.0`, `expo-router` from `~4.0.0` to `~5.1.0`, `expo-secure-store` from `~14.0.0` to `~14.2.0`, `expo-status-bar` from `~2.0.0` to `~2.2.0`
- [ ] T005 [P] Update React and React Native dependencies in `apps/mobile/package.json` — bump `react` from `18.3.1` to `19.0.0`, `react-native` from `0.76.6` to `0.79.6`, `@expo/vector-icons` from `^14.0.4` to `^14.1.0`
- [ ] T006 [P] Update React Native ecosystem dependencies in `apps/mobile/package.json` — bump `react-native-gesture-handler` from `~2.20.0` to `~2.24.0`, `react-native-reanimated` from `~3.16.0` to `~3.17.0`, `react-native-safe-area-context` from `~4.14.0` to `5.4.0`, `react-native-screens` from `~4.4.0` to `~4.11.0`
- [ ] T007 [P] Update test and dev dependencies in `apps/mobile/package.json` — bump `jest-expo` from `~52.0.0` to `~53.0.0`, `@testing-library/react-native` from `^12.9.0` to `^14.0.0`, `@types/react` from `~18.3.0` to `^19.0.0`, and REMOVE `react-test-renderer` entry entirely from devDependencies
- [ ] T008 Update Jest `moduleNameMapper` in `apps/mobile/package.json` — change `"^react$"` from `"<rootDir>/../../node_modules/react"` to `"<rootDir>/node_modules/react"`, change `"^react/(.*)$"` from `"<rootDir>/../../node_modules/react/$1"` to `"<rootDir>/node_modules/react/$1"`, change `"^react-native$"` from `"<rootDir>/../../node_modules/react-native"` to `"<rootDir>/node_modules/react-native"`
- [ ] T009 Run `npm install` from repository root to regenerate `package-lock.json` with the updated dependency tree

**Checkpoint**: All `package.json` files updated, `node_modules` resolved. No source code changed yet.

---

## Phase 3: User Story 1 — Mobile App Runs on Latest SDK (Priority: P1) 🎯 MVP

**Goal**: The mobile app builds and runs on Expo SDK 53 with React 19 and React Native 0.79.6 without crashes or type errors.

**Independent Test**: Run `npm run typecheck` — zero errors across all workspaces. App can be launched with `npx expo start` on iOS and Android.

### Implementation for User Story 1

- [ ] T010 [US1] Fix `useRef` type annotations in `apps/mobile/lib/push.ts` — change `useRef<Notifications.EventSubscription>()` to `useRef<Notifications.EventSubscription | null>(null)` on both `notificationListener` (line 70) and `responseListener` (line 71) for React 19 type compatibility
- [ ] T011 [US1] Run type check (`npm run typecheck`) and verify zero errors across all workspaces — confirms React 19 types, SDK 53 types, and shared package compatibility

**Checkpoint**: Mobile app type-checks cleanly on SDK 53 + React 19. All `useRef` calls comply with React 19's stricter initialization requirements. The app can be built and launched.

---

## Phase 4: User Story 2 — Push Notifications Continue Working (Priority: P2)

**Goal**: Push notifications display correctly in foreground (banner + notification list) after the `expo-notifications` breaking API change.

**Independent Test**: Trigger a push notification while the app is foregrounded — both a banner and a notification list entry should appear. Background notifications play sound and update badge.

### Implementation for User Story 2

- [ ] T012 [US2] Update notification handler in `apps/mobile/lib/push.ts` — replace `shouldShowAlert: true` with `shouldShowBanner: true` and `shouldShowList: true` in the `Notifications.setNotificationHandler` callback (lines 12–18). Retain `shouldPlaySound: true` and `shouldSetBadge: true` unchanged.

**Checkpoint**: Notification handler uses SDK 53 API. Foreground notifications produce both a banner and a notification list entry — identical UX to SDK 52.

---

## Phase 5: User Story 3 — Security Vulnerabilities Resolved (Priority: P3)

**Goal**: The root `package.json` carries only 1 security override (down from 3), and `npm audit` reports zero high/critical vulnerabilities.

**Independent Test**: Run `npm audit` and verify no high or critical vulnerabilities. Inspect root `package.json` overrides — only `@tootallnate/once` should remain.

### Implementation for User Story 3

- [ ] T013 [US3] Verify security override removal in `package.json` — confirm `@xmldom/xmldom` and `tar` overrides were removed in T003 and that only `@tootallnate/once` remains
- [ ] T014 [US3] Run `npm audit` and verify zero high/critical vulnerabilities in the full dependency tree

**Checkpoint**: Security posture improved — 2 of 3 workarounds eliminated. Audit is clean.

---

## Phase 6: User Story 4 — All Existing Tests Pass (Priority: P4)

**Goal**: All 52 existing mobile tests pass with the updated test infrastructure (jest-expo ~53.0.0, `@testing-library/react-native` ^14.0.0, no `react-test-renderer`).

**Independent Test**: Run `npm run test -w @acroyoga/mobile` — all 52 tests pass with zero failures.

### Implementation for User Story 4

- [ ] T015 [US4] Run mobile test suite (`npm run test -w @acroyoga/mobile`) and verify all 52 tests pass — if any tests fail due to `@testing-library/react-native` v14 async API changes (render/fireEvent/act now async), add `await` before the affected calls in the failing test files under `apps/mobile/__tests__/`
- [ ] T016 [US4] Run full monorepo test suite (`npm run test`) and verify all workspace tests pass (tokens, shared-ui, shared, web, mobile) — confirms the mobile SDK upgrade does not break other workspaces

**Checkpoint**: Test safety net is green. All 52 mobile tests pass. No other workspace tests regressed.

---

## Phase 7: User Story 5 — CI/CD Pipeline Remains Functional (Priority: P5)

**Goal**: The CI pipeline (ci.yml), Azure Nightly Publish workflow (nightly.yml, spec 020), and deploy workflow continue to function with zero changes to workflow files.

**Independent Test**: CI pipeline runs successfully end-to-end on the feature branch — `npm ci`, type check, and all tests pass in the CI environment.

### Implementation for User Story 5

- [ ] T017 [US5] Verify no changes were made to any files in `.github/workflows/` — `ci.yml`, `nightly.yml`, `deploy.yml`, `close-completed-issues.yml`, and `copilot-setup-steps.yml` must be unmodified
- [ ] T018 [US5] Verify no changes were made to any files in `apps/web/` or `packages/` — web app and shared packages must be completely untouched by this upgrade
- [ ] T019 [US5] Push feature branch and confirm CI pipeline passes — `npm ci` installs cleanly, type check passes, all tests pass in CI environment

**Checkpoint**: CI/CD infrastructure unaffected. The upgrade is fully contained within `package.json` (root), `apps/mobile/package.json`, and `apps/mobile/lib/push.ts`.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup across all user stories

- [ ] T020 [P] Run quickstart.md verification checklist from `specs/021-expo-sdk-upgrade/quickstart.md` — all 11 items must pass
- [ ] T021 Commit all changes and create pull request with summary of: version changes, breaking change fixes, security override cleanup, and test results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all source code changes
- **US1 (Phase 3)**: Depends on Phase 2 (npm install must complete first)
- **US2 (Phase 4)**: Depends on Phase 2 (expo-notifications ~0.31.0 must be installed)
- **US3 (Phase 5)**: Depends on Phase 2 (overrides removed in T003, verified after install)
- **US4 (Phase 6)**: Depends on Phases 3 + 4 (source code must be correct before tests can pass)
- **US5 (Phase 7)**: Depends on Phase 6 (all tests must pass before CI validation)
- **Polish (Phase 8)**: Depends on all previous phases

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — foundation for all other stories
- **US2 (P2)**: Can start after Phase 2, in parallel with US1 (different code section in same file, but no conflict — lines 12–18 vs lines 70–71)
- **US3 (P3)**: Verification only — depends on T003 (Phase 2) and T009 (npm install)
- **US4 (P4)**: Depends on US1 + US2 completion — tests can only pass when all source changes are correct
- **US5 (P5)**: Depends on US4 — CI validation requires all tests passing

### Within Each User Story

- Version bumps (Phase 2) before source code changes (Phase 3+)
- Source code changes before test verification
- Test verification before CI validation

### Parallel Opportunities

- T003, T004, T005, T006, T007 can ALL run in parallel (different files or different sections of `apps/mobile/package.json`)
- T010 (useRef fix) and T012 (notification handler) can run in parallel (different sections of `apps/mobile/lib/push.ts`, lines 70–71 vs lines 12–18)
- T013 and T014 (security verification) can run in parallel
- T017 and T018 (no-change verification) can run in parallel
- T020 (quickstart checklist) can run in parallel with T017–T018

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all package.json edits together (different files or non-overlapping sections):
Task T003: "Update root security overrides in package.json"
Task T004: "Update Expo core SDK dependencies in apps/mobile/package.json"
Task T005: "Update React and React Native dependencies in apps/mobile/package.json"
Task T006: "Update React Native ecosystem dependencies in apps/mobile/package.json"
Task T007: "Update test and dev dependencies in apps/mobile/package.json"

# Then sequentially:
Task T008: "Update Jest moduleNameMapper in apps/mobile/package.json" (after T004-T007)
Task T009: "Run npm install" (after all package.json changes)
```

## Parallel Example: Source Code Changes (Phases 3 + 4)

```bash
# Launch both source changes in push.ts together (non-overlapping lines):
Task T010: "Fix useRef type annotations in apps/mobile/lib/push.ts (lines 70-71)"
Task T012: "Update notification handler in apps/mobile/lib/push.ts (lines 12-18)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (branch, baseline)
2. Complete Phase 2: Foundational (all version bumps + npm install)
3. Complete Phase 3: US1 — useRef fixes + type check
4. **STOP and VALIDATE**: `npm run typecheck` passes; app can launch
5. This alone delivers a working SDK 53 app (minus notification handler fix)

### Incremental Delivery

1. Phase 1 + 2 → All dependencies updated, lock file regenerated
2. Add US1 (type fixes) → App type-checks and builds on SDK 53 (MVP!)
3. Add US2 (notification handler) → Push notifications work correctly
4. Add US3 (security verification) → Audit is clean, overrides reduced
5. Add US4 (test verification) → All 52 tests green
6. Add US5 (CI verification) → Pipeline validated end-to-end
7. Each story adds confidence without breaking previous stories

### Single Developer Strategy (Recommended)

This upgrade is best done by a single developer in sequence:
1. All Phase 2 tasks in one commit (version bumps)
2. T009 (npm install) — generates new lock file
3. T010 + T012 in one commit (source code fixes)
4. T011 + T013–T016 (verification pass)
5. T017–T019 (CI validation)
6. T020–T021 (polish + PR)

**Total: ~6 logical commits, 3 files modified**

---

## Files Modified Summary

| File | Tasks | Changes |
|------|-------|---------|
| `package.json` (root) | T003 | Remove 2 of 3 security overrides |
| `apps/mobile/package.json` | T004–T008 | 15 dependency bumps, 1 removal, 3 jest mapper updates |
| `apps/mobile/lib/push.ts` | T010, T012 | 2 useRef type fixes, 1 notification handler API update |
| `package-lock.json` | T009 | Auto-regenerated by npm install |

---

## Notes

- [P] tasks = different files or non-overlapping sections, no dependencies
- [Story] label maps task to specific user story for traceability
- This upgrade modifies exactly 3 source/config files + 1 auto-generated lock file
- No files are created or deleted — all changes are edits to existing files
- No changes to web app, shared packages, or CI/CD workflows
- The `react-test-renderer` package is removed (not replaced) — `@testing-library/react-native` v14 has its own built-in renderer
- If `@testing-library/react-native` v14 causes test failures, use the codemod: `npx @callstack/rntl-upgrade --from 12 --to 14`
