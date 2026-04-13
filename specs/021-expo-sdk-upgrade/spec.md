# Feature Specification: Expo SDK 52 → 53 Upgrade

**Feature Branch**: `021-expo-sdk-upgrade`  
**Created**: 2025-07-15  
**Status**: Draft  
**Input**: User description: "Upgrade Expo SDK from version 52 to 53 in the AcroYoga Community mobile app"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mobile App Runs on Latest SDK (Priority: P1)

As a mobile app user, I want the AcroYoga Community app to run on the latest Expo SDK so that I benefit from improved performance, stability, and security patches included in the newest platform release.

**Why this priority**: The SDK upgrade is the foundational change — every other story depends on the mobile app successfully running on Expo SDK 53 with React 19 and the updated React Native runtime. Without this, no other improvements can be delivered.

**Independent Test**: Can be fully tested by building and launching the mobile app on both iOS and Android, verifying that all screens load, navigation works, and the app does not crash during normal use.

**Acceptance Scenarios**:

1. **Given** the mobile app is upgraded to Expo SDK 53, **When** a user opens the app on iOS, **Then** the app launches without errors and all existing screens are accessible.
2. **Given** the mobile app is upgraded to Expo SDK 53, **When** a user opens the app on Android, **Then** the app launches without errors and all existing screens are accessible.
3. **Given** the mobile app depends on the React and React Native versions bundled with SDK 53, **When** any component renders, **Then** the component behaves identically to its behavior on the previous SDK version (no visual regressions or functional breakages).
4. **Given** the monorepo contains a web app already using React 19, **When** the mobile app is also upgraded to React 19, **Then** both apps coexist in the workspace without dependency conflicts.

---

### User Story 2 - Push Notifications Continue Working (Priority: P2)

As a mobile app user, I want to continue receiving push notifications so that I am alerted about upcoming events, messages, and community activity without interruption after the upgrade.

**Why this priority**: Push notifications are a critical engagement channel. The Expo SDK 53 upgrade introduces a breaking change to the notification handler configuration that must be addressed to preserve existing functionality.

**Independent Test**: Can be fully tested by triggering a push notification while the app is in the foreground and verifying that the notification banner and list entry appear correctly.

**Acceptance Scenarios**:

1. **Given** the notification handler has been updated for SDK 53, **When** a push notification arrives while the app is in the foreground, **Then** a notification banner is displayed to the user.
2. **Given** the notification handler has been updated for SDK 53, **When** a push notification arrives while the app is in the foreground, **Then** the notification appears in the device notification list.
3. **Given** the notification handler has been updated for SDK 53, **When** a push notification arrives while the app is in the background, **Then** the notification behaves the same as before the upgrade (sound plays, badge updates).

---

### User Story 3 - Security Vulnerabilities Resolved (Priority: P3)

As a project maintainer, I want the upgrade to resolve known security vulnerabilities in transitive dependencies so that the app's dependency tree is clean and audit-compliant without manual workarounds.

**Why this priority**: The current project carries three npm overrides to patch security vulnerabilities inherited from Expo SDK 52. SDK 53 natively resolves two of these, reducing the maintenance burden and improving the security posture.

**Independent Test**: Can be fully tested by running a dependency audit on the project after removing the resolved overrides and confirming no new vulnerabilities are introduced.

**Acceptance Scenarios**:

1. **Given** Expo SDK 53 resolves the `@xmldom/xmldom` vulnerability natively, **When** the corresponding override is removed from the root configuration, **Then** a dependency audit reports no vulnerability for `@xmldom/xmldom`.
2. **Given** Expo SDK 53 resolves the `tar` vulnerability natively, **When** the corresponding override is removed from the root configuration, **Then** a dependency audit reports no vulnerability for `tar`.
3. **Given** the `@tootallnate/once` vulnerability is not yet resolved by SDK 53, **When** the override for `@tootallnate/once` is retained, **Then** a dependency audit reports no vulnerability for `@tootallnate/once`.
4. **Given** two of three overrides have been removed, **When** the full dependency tree is audited, **Then** no new high or critical vulnerabilities are present.

---

### User Story 4 - All Existing Tests Pass (Priority: P4)

As a developer, I want all 52 existing mobile tests to continue passing after the upgrade so that I have confidence no regressions were introduced by the SDK version change.

**Why this priority**: Automated tests are the primary safety net during a major dependency upgrade. If tests break, the upgrade cannot be shipped. This story ensures the testing infrastructure itself is updated to remain compatible with the new SDK.

**Independent Test**: Can be fully tested by running the full mobile test suite and verifying 100% of previously passing tests still pass.

**Acceptance Scenarios**:

1. **Given** the test tooling has been updated for SDK 53 compatibility, **When** the full mobile test suite is executed, **Then** all 52 tests pass.
2. **Given** test configuration may need module resolution updates, **When** tests are run in the monorepo workspace, **Then** module resolution correctly locates dependencies at their new hoisted paths.
3. **Given** the test renderer must match the React version, **When** component tests render UI elements, **Then** rendering completes without React version mismatch warnings or errors.

---

### User Story 5 - CI/CD Pipeline Remains Functional (Priority: P5)

As a DevOps engineer, I want the Azure Nightly Publish workflow (spec 020) and all other CI/CD pipelines to continue functioning after the upgrade so that automated builds, tests, and deployments are not disrupted.

**Why this priority**: The nightly publish infrastructure was recently implemented and must not be broken by the SDK upgrade. Any CI/CD breakage could silently halt automated deployments.

**Independent Test**: Can be fully tested by running the CI/CD pipeline end-to-end and verifying that build, test, and publish steps complete successfully.

**Acceptance Scenarios**:

1. **Given** the mobile app has been upgraded to SDK 53, **When** the CI pipeline runs the mobile test suite, **Then** all tests pass in the CI environment.
2. **Given** the Azure Nightly Publish workflow depends on the mobile app build, **When** the nightly workflow is triggered, **Then** it completes successfully with the upgraded SDK.
3. **Given** the monorepo workspace configuration may change, **When** CI installs dependencies, **Then** dependency installation completes without errors or unresolved peer dependencies.

---

### Edge Cases

- What happens if a third-party library used by the mobile app has not yet released an SDK 53-compatible version?
- How does the app behave if the updated framework's stricter initialization rules surface previously hidden bugs in existing components?
- What happens if the dual-React setup (React 19 for both web and mobile) introduces unexpected version resolution conflicts in shared packages?
- What if updated test configuration patterns inadvertently exclude or include packages that change test outcomes?
- How does the app handle the transition if a user has the old version cached and receives an over-the-air update built with the new SDK?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The mobile app MUST upgrade all Expo packages from SDK 52-compatible versions to SDK 53-compatible versions (including expo, expo-constants, expo-haptics, expo-linking, expo-notifications, expo-router, expo-secure-store, expo-status-bar, and @expo/vector-icons).
- **FR-002**: The mobile app MUST upgrade to the versions of React and React Native bundled with Expo SDK 53.
- **FR-003**: The root project configuration MUST remove the `@xmldom/xmldom` and `tar` security overrides that SDK 53 resolves natively.
- **FR-004**: The root project configuration MUST retain the `@tootallnate/once` security override until it is natively resolved by a future SDK release.
- **FR-005**: Push notifications MUST continue to display correctly in the foreground (banner visible, appears in notification list) after the upgrade, accounting for any breaking changes to the notification handler introduced in SDK 53.
- **FR-006**: All components and hooks MUST comply with React 19's stricter initialization requirements, ensuring no runtime warnings or errors from the updated framework.
- **FR-007**: The test configuration MUST be updated so that module resolution works correctly with SDK 53's dependency structure in the monorepo.
- **FR-008**: The test runner and rendering tooling MUST be upgraded to versions compatible with SDK 53 and the bundled React version.
- **FR-009**: All 52 existing mobile tests MUST continue to pass after the upgrade with no test modifications that change what is being tested (only infrastructure/configuration changes are allowed).
- **FR-010**: The Azure Nightly Publish workflow (spec 020) MUST continue to function correctly after the upgrade, with no changes required to its configuration.
- **FR-011**: The mobile app MUST coexist with the web app (React 19 + Next.js 16) in the monorepo workspace without introducing dependency conflicts.
- **FR-012**: No new high or critical security vulnerabilities MUST be introduced by the upgrade.

## Assumptions

- Expo SDK 53 has stable releases for all packages currently used by the mobile app (expo, expo-constants, expo-haptics, expo-linking, expo-notifications, expo-router, expo-secure-store, expo-status-bar).
- The `@expo/vector-icons` package is forward-compatible with SDK 53 or has a compatible update available.
- Third-party libraries in the dependency tree (e.g., react-native-svg, @sentry/react-native, native-base) are compatible with React Native 0.79.6 and React 19, or compatible versions exist.
- The web app's React 19 setup does not require changes as part of this upgrade since it already runs React 19.
- The existing components that require initialization updates for React 19 compatibility are limited in number and isolated to the push notification setup code.
- The new notification handler properties in SDK 53 are direct behavioral replacements for the deprecated property — enabling them replicates the existing notification display behavior.
- The 52 existing tests represent the correct baseline count; any pre-existing test failures are out of scope.

## Dependencies

- **Spec 020 (Azure Nightly Publish)**: The nightly CI/CD workflow must remain fully operational. No changes to its workflow files should be required.
- **Shared packages (`packages/` directory)**: Any shared code consumed by both mobile and web apps must remain compatible with both after the mobile app moves to React 19.
- **Expo SDK 53 release availability**: All target Expo packages must be publicly available on npm at their SDK 53-compatible versions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the 52 existing mobile tests pass after the upgrade with zero test logic modifications.
- **SC-002**: The mobile app launches and renders its home screen within 5 seconds on both iOS and Android with the upgraded SDK.
- **SC-003**: Push notifications display correctly (banner and list entry visible) when received in the foreground, with sound and badge behavior preserved for background notifications.
- **SC-004**: The number of security-related dependency workarounds in the root configuration is reduced from 3 to 1 (only the one vulnerability not resolved by SDK 53 remains).
- **SC-005**: A full dependency security audit reports zero high or critical vulnerabilities after the upgrade.
- **SC-006**: The CI/CD pipeline (including the Azure Nightly Publish workflow) completes successfully with the upgraded mobile app.
- **SC-007**: No dependency version conflicts or unresolved dependency warnings are present after installation in the monorepo workspace.
- **SC-008**: The web app continues to build and pass its own tests without any changes as a result of the mobile SDK upgrade.
