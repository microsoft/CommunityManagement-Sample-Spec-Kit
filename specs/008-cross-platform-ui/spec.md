# Feature Specification: Cross-Platform Hot-Reloadable UI System

**Feature Branch**: `008-cross-platform-ui`  
**Created**: 2026-03-17  
**Status**: Implemented (Phases 6, 12 deferred — mobile/Expo)  
**Input**: User description: "Cross-Platform Hot-Reloadable UI System — hot-reloadable web interfaces, a UI expert agent, cross-platform delivery (web + iOS + Android), and a shared component architecture with maximum code reuse"

## Clarifications

### Session 2026-03-17

- Q: Which cross-platform framework for mobile? → A: Expo + React Native — true native rendering, shared React mental model with the Next.js web stack, Expo Fast Refresh for hot reload, EAS Build for CI/CD.
- Q: What is the design token pipeline and output format? → A: Style Dictionary — JSON source tokens compiled to CSS custom properties (web), Swift constants (iOS), Kotlin constants (Android). Industry-standard, integrates with CI.
- Q: Which tool for the component development environment? → A: Storybook 10 (`@storybook/react-vite`) — supports hot reload, viewport toggling, theme switching, and component documentation natively.
- Q: What is the scope and location of the UI expert agent? → A: A `.agent.md` file in the project root with knowledge of design system tokens, component library, Tailwind CSS 4 conventions, WCAG 2.1 AA rules, and mobile-first responsive patterns. Capabilities: generate components, review UI code, suggest improvements.
- Q: What is the offline data strategy for mobile apps? → A: TanStack Query (React Query) with persistent cache (AsyncStorage or MMKV). Provides offline-first reads with automatic background sync on connectivity restore.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Shared Design System with Tokenized Theming (Priority: P0)

All platform pages — web and mobile — draw from a single source of design tokens defining colours, spacing, typography, shadows, and border radii. A designer or developer edits a token value (e.g., primary colour) and every component across every platform reflects the change. The tokens enforce brand consistency and make sweeping visual updates trivial.

**Why this priority**: Every subsequent story depends on an authoritative set of design tokens. Without them, component styling diverges between web and mobile, violating the constitution's UX Consistency mandate.

**Independent Test**: Change the value of the primary colour token and verify that all components using the primary colour render with the new value on web, iOS, and Android.

**Acceptance Scenarios**:

1. **Given** a design token file exists with colour, spacing, typography, shadow, and radii categories, **When** a developer inspects any UI component, **Then** the component references tokens rather than hardcoded values.
2. **Given** the primary colour token is changed from blue to green, **When** the web app is rendered, **Then** all elements using the primary colour display green.
3. **Given** the primary colour token is changed from blue to green, **When** the mobile app is rendered on iOS or Android, **Then** all elements using the primary colour display green.
4. **Given** a new token category is added (e.g., elevation), **When** the token file is updated, **Then** the build system generates updated outputs for all platforms without manual intervention.
5. **Given** a token value uses a contrast ratio below WCAG AA thresholds, **When** the build runs, **Then** a warning is emitted identifying the failing token and the required minimum ratio.

---

### User Story 2 — Component Development Environment with Hot Reload (Priority: P0)

A developer working on UI components can preview any component in isolation with mocked data, toggle between responsive viewports, switch themes (light/dark), and see changes reflected instantly without a full page reload. The environment documents component variants and usage guidelines.

**Why this priority**: Rapid iteration on UI is the core developer experience goal. Hot-reloadable component previews dramatically reduce the feedback loop and ensure components are built in isolation before integration.

**Independent Test**: Open the component development environment, navigate to a button component, change its padding token, and confirm the preview updates within 1 second without losing component state.

**Acceptance Scenarios**:

1. **Given** a developer opens the component preview environment, **When** they browse the component catalogue, **Then** they see every shared component listed with a live preview and usage notes.
2. **Given** a developer edits a component's styling, **When** they save the file, **Then** the component preview updates within 1 second without a full page refresh.
3. **Given** a developer toggles between light and dark themes, **When** the toggle is activated, **Then** the previewed component re-renders with the alternate token set immediately.
4. **Given** a developer selects a mobile viewport preset (e.g., 375px width), **When** the viewport changes, **Then** the component renders in the constrained viewport with appropriate responsive behaviour.
5. **Given** a component accepts props, **When** the developer adjusts prop controls in the preview panel, **Then** the component re-renders with the new prop values.

---

### User Story 3 — Cross-Platform Mobile App for iOS (Priority: P0)

An AcroYoga community member opens the iOS app on their iPhone. They can browse events, view event details, RSVP, explore teachers, manage bookings, and edit their profile — all with native navigation, smooth scrolling, and touch interactions that feel like a first-class iOS experience. The app shares business logic and data-fetching with the web app.

**Why this priority**: Mobile users represent a large segment of event-goers who need on-the-go access. iOS is the highest-priority mobile platform based on the target audience demographics.

**Independent Test**: Install the iOS app on a device or simulator, browse events, tap into an event detail, perform an RSVP, and verify the interaction is smooth with native animations and gestures.

**Acceptance Scenarios**:

1. **Given** a user opens the iOS app, **When** the app loads, **Then** they see the home screen with featured events and navigation within 2 seconds on a broadband connection.
2. **Given** a user navigates to the events list, **When** they scroll through events, **Then** scrolling is 60fps-smooth with no jank or dropped frames.
3. **Given** a user taps an event card, **When** the event detail screen opens, **Then** the transition uses native iOS navigation patterns (push animation).
4. **Given** a user RSVPs to an event, **When** the RSVP is confirmed, **Then** a success indicator appears and the event's RSVP state updates immediately.
5. **Given** a user has no internet connection, **When** they open the app, **Then** they see cached data from their last session with a clear offline indicator.
6. **Given** the user has VoiceOver enabled, **When** they navigate through the app, **Then** all interactive elements are announced with meaningful labels and the navigation order is logical.

---

### User Story 4 — Cross-Platform Mobile App for Android (Priority: P0)

An AcroYoga community member opens the Android app on their phone. They have the same full feature set as iOS — events, teachers, bookings, profile — with Android-native navigation patterns (back button, material transitions) and equivalent performance.

**Why this priority**: Android represents a significant share of the user base. Delivering both platforms simultaneously maximises reach without doubling development effort.

**Independent Test**: Install the Android app on a device or emulator, browse events, tap into an event detail, perform an RSVP, and verify Android-native interactions.

**Acceptance Scenarios**:

1. **Given** a user opens the Android app, **When** the app loads, **Then** they see the home screen with featured events and navigation within 2 seconds on a broadband connection.
2. **Given** a user presses the hardware back button, **When** they are on an event detail screen, **Then** the app navigates back to the events list (not exits the app).
3. **Given** a user navigates between screens, **When** transitions occur, **Then** they follow Android material motion patterns.
4. **Given** a user RSVPs to an event, **When** the RSVP is confirmed, **Then** the experience is functionally identical to iOS with a success indicator and updated state.
5. **Given** the user has TalkBack enabled, **When** they navigate through the app, **Then** all interactive elements are announced with meaningful labels and the navigation order is logical.

---

### User Story 5 — Shared Component Library with Platform Adaptation (Priority: P0)

A developer builds a new UI component (e.g., an event card) once. The component renders appropriately on web (as styled markup) and on mobile (as native views). Shared props, data shapes, and interaction logic are written once; only the rendering layer differs per platform.

**Why this priority**: Code reuse is the economic engine of cross-platform delivery. Without a shared component architecture, maintaining feature parity across three platforms becomes untenable.

**Independent Test**: Create a new shared component with a prop interface, verify it renders correctly in the web app, iOS simulator, and Android emulator without duplicating business logic.

**Acceptance Scenarios**:

1. **Given** a developer creates a shared component with a defined prop interface, **When** the component is imported in the web app, **Then** it renders using web-appropriate markup and styling.
2. **Given** the same shared component is imported in the mobile app, **When** the mobile app renders the component, **Then** it displays using native mobile views with equivalent visual appearance.
3. **Given** the shared component has interaction logic (e.g., an "expand details" toggle), **When** the user interacts with it on any platform, **Then** the behaviour is identical.
4. **Given** a shared component is updated (e.g., a new prop is added), **When** the change is made in one place, **Then** both web and mobile receive the update.
5. **Given** at least 80% of component logic is shared, **When** platform-specific code is measured, **Then** only rendering adapters and platform-specific navigation differ.

---

### User Story 6 — Web App Hot Module Replacement Enhanced with Design Token Hot-Swap (Priority: P1)

A developer working on the web app changes a design token, a component file, or a page layout. The browser reflects the change instantly — within 1 second — without a full page reload. Component state is preserved during hot reload. This extends the existing web hot-reload with design-token-aware refresh capabilities.

**Why this priority**: The web app already has HMR. This story enhances it with token-aware refresh so design system changes propagate instantly rather than requiring a manual refresh.

**Independent Test**: With the web dev server running, edit a spacing token value and confirm the browser preview updates within 1 second without losing form input or scroll position.

**Acceptance Scenarios**:

1. **Given** the development server is running, **When** a developer edits a component file, **Then** the browser reflects the change within 1 second without a full page reload.
2. **Given** the developer has form data entered on a page, **When** they edit a component used on that page, **Then** the form data is preserved after the hot reload.
3. **Given** the developer changes a design token value, **When** the token file is saved, **Then** every component on the current page updates to reflect the new token value without manual refresh.
4. **Given** the developer adds a new component, **When** the file is saved, **Then** the component is importable and renderable immediately without restarting the dev server.

---

### User Story 7 — UI Expert Agent for Design Assistance (Priority: P1)

A developer invokes a specialised UI agent within their editor. The agent understands the platform's design system tokens, component library, accessibility requirements, and page layouts. It can suggest design improvements, generate component code that adheres to the design system, review UI code for accessibility issues, and propose responsive layout adjustments.

**Why this priority**: A specialised agent accelerates UI development by encoding institutional knowledge about the design system, reducing ramp-up time for new contributors and catching accessibility issues early.

**Independent Test**: Invoke the UI agent and ask it to create a new card component. Verify the generated component uses design tokens, includes accessibility attributes, and renders correctly in the component preview environment.

**Acceptance Scenarios**:

1. **Given** a developer invokes the UI agent, **When** they ask for a new component, **Then** the agent generates code that uses design system tokens and includes appropriate accessibility attributes.
2. **Given** a developer pastes a component with hardcoded colour values, **When** they ask the agent to review it, **Then** the agent identifies the hardcoded values and suggests token replacements.
3. **Given** a developer asks the agent about the platform's colour palette, **When** the agent responds, **Then** it references the actual token values from the design system.
4. **Given** a component is missing accessible labels, **When** the developer asks for an accessibility review, **Then** the agent identifies the missing labels and suggests corrections meeting WCAG 2.1 AA.
5. **Given** a developer asks the agent to make a desktop layout responsive, **When** the agent generates responsive code, **Then** the code follows mobile-first patterns with appropriate breakpoints from the design system.

---

### User Story 8 — Platform Performance Budgets Per Platform (Priority: P1)

Each platform has defined performance budgets that are measured and enforced. The web app respects the existing 200KB initial JS bundle limit. Mobile apps have defined launch time and scroll performance targets. Budgets are checked automatically during development and in CI.

**Why this priority**: Performance directly impacts user retention. The constitution mandates performance budgets for web; extending them to mobile ensures consistent quality across platforms.

**Independent Test**: Run a build and verify the bundle size report shows total initial JS under 200KB for web, and that mobile build logs report launch time estimates under thresholds.

**Acceptance Scenarios**:

1. **Given** the web app is built, **When** the bundle analysis runs, **Then** initial JS bundle size is reported and the build fails if it exceeds 200KB.
2. **Given** the iOS app is launched on a representative device, **When** launch time is measured, **Then** the app reaches interactive state within 3 seconds on a mid-range device.
3. **Given** the Android app is launched on a representative device, **When** launch time is measured, **Then** the app reaches interactive state within 3 seconds on a mid-range device.
4. **Given** a developer adds a large dependency, **When** the CI build runs, **Then** a warning or failure is triggered with the impact on bundle size.
5. **Given** any list screen is scrolled rapidly, **When** frame rate is measured, **Then** it consistently meets 60fps on both iOS and Android.

---

### User Story 9 — Accessibility Compliance Across Platforms (Priority: P1)

All UI components across all three platforms meet WCAG 2.1 AA standards. Interactive elements are keyboard-navigable on web and screen-reader-compatible on all platforms. Colour contrast meets AA minimum. Touch targets meet minimum size requirements on mobile.

**Why this priority**: Accessibility is a constitutional mandate and a legal and ethical obligation. It applies equally across all platforms.

**Independent Test**: Run an accessibility audit on web, enable VoiceOver on iOS, enable TalkBack on Android, and navigate through a complete user flow verifying all elements are accessible.

**Acceptance Scenarios**:

1. **Given** any interactive element on web, **When** a user navigates with keyboard only, **Then** the element is focusable and operable.
2. **Given** any text element on any platform, **When** colour contrast is measured, **Then** it meets WCAG AA minimum (4.5:1 for body text, 3:1 for large text).
3. **Given** any tappable element on mobile, **When** its touch target area is measured, **Then** it is at least 44×44 points.
4. **Given** an automated accessibility audit is run on the web app, **When** results are reviewed, **Then** zero critical or serious violations are found.
5. **Given** a screen reader is active on any platform, **When** a user navigates through the events list and event detail flow, **Then** all content is announced in a logical reading order with meaningful labels.

---

### Edge Cases

- What happens when a design token is removed but a component still references it? — The build system emits a clear error identifying the component and the missing token before any deployment.
- What happens when the mobile app is opened after a long period without updates? — The app prompts the user to update if the client version is too old for the current API; cached data is shown while the update is offered.
- What happens when a component renders differently on one platform? — The component preview environment supports platform-specific override previews, and visual regression tests catch unintended divergence.
- What happens when the mobile app has poor network connectivity? — Graceful degradation: cached screens load, mutations queue for retry, and a persistent banner indicates connectivity status.
- What happens when an iOS accessibility feature (Dynamic Type) scales text beyond the expected range? — Components use flexible layouts that accommodate 200% Dynamic Type scaling without truncation or overflow.
- What happens when the JS bundle budget is exceeded? — CI blocks the build with a clear report of the new bundle size versus the budget, and identifies which modules contributed to the increase.
- What happens when a new component is added without accessibility annotations? — An automated lint step in CI flags the missing annotations and prevents merge.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The platform MUST define a single-source design token file covering colours, spacing, typography, shadows, and border radii, consumed by all platforms.
- **FR-002**: Design tokens MUST be compiled via **Style Dictionary** from a JSON source into platform-specific formats: CSS custom properties for web, Swift constants for iOS, and Kotlin constants for Android. The Style Dictionary pipeline runs as a build step and in watch mode during development.
- **FR-003**: Changing a design token value MUST propagate to all platforms without requiring manual per-platform updates.
- **FR-004**: **Storybook 10** (`@storybook/react-vite`) MUST serve as the component development environment, allowing isolated rendering, prop manipulation (via Controls addon), viewport toggling (via Viewport addon), and theme switching (light/dark via toolbar toggle).
- **FR-005**: Storybook MUST support hot reload — changes to component code or tokens MUST reflect within 1 second without full page refresh. Storybook stories MUST be co-located with their component files.
- **FR-006**: The platform MUST deliver a native iOS app via **Expo + React Native** with the full feature set (events, teachers, bookings, profile, settings) and native navigation patterns (React Navigation with native stack). Expo Fast Refresh provides hot reload during development.
- **FR-007**: The platform MUST deliver a native Android app via **Expo + React Native** with the full feature set and Android-native navigation patterns (hardware back button, material transitions via React Navigation).
- **FR-008**: Mobile apps MUST share business logic, data-fetching (TanStack Query hooks), and Zod validation schemas with the web app via a shared `packages/shared` workspace package — only the rendering layer differs per platform.
- **FR-009**: At least 80% of component logic (props, state, data transformations) MUST be shared across web and mobile.
- **FR-010**: The web app MUST maintain hot module replacement with design-token-aware refresh — token changes propagate without full page reload.
- **FR-011**: A specialised UI agent definition MUST exist as a **`.agent.md` file in the project root** with explicit knowledge of: (a) design system tokens and their semantic names, (b) the shared component library API surfaces, (c) Tailwind CSS 4 utility conventions and breakpoints, (d) WCAG 2.1 AA rules including contrast, focus management, and ARIA patterns, (e) mobile-first responsive layout patterns. The agent MUST be capable of generating new components, reviewing existing UI code for design system compliance, and suggesting accessibility improvements.
- **FR-012**: The UI agent MUST generate component code that uses design system tokens (never hardcoded values), includes appropriate ARIA attributes, follows mobile-first responsive patterns, and co-locates a Storybook story file.
- **FR-013**: The web app's initial JS bundle MUST NOT exceed 200KB.
- **FR-014**: Mobile apps MUST reach interactive state within 3 seconds on mid-range devices.
- **FR-015**: All scrollable lists MUST render at 60fps on all platforms.
- **FR-016**: All interactive elements MUST be keyboard-navigable on web and screen-reader-compatible on all platforms.
- **FR-017**: All text colour combinations MUST meet WCAG AA contrast ratios (4.5:1 body, 3:1 large text).
- **FR-018**: All tappable elements on mobile MUST have a minimum touch target of 44×44 points.
- **FR-019**: An automated accessibility audit MUST run in CI and block merges if critical violations are found.
- **FR-020**: Mobile apps MUST provide offline access via **TanStack Query with persistent cache** (backed by AsyncStorage or MMKV). Previously fetched data is served from cache immediately on app open. Mutations made offline are queued and automatically retried with exponential backoff when connectivity returns. A persistent banner MUST indicate offline status.
- **FR-021**: All mobile API communication MUST go through the existing API-first endpoints — no direct database access from mobile clients.
- **FR-022**: All user-facing strings in mobile apps MUST use the existing i18n infrastructure for translation support.
- **FR-023**: The build system MUST emit warnings when token contrast ratios fall below WCAG AA thresholds.
- **FR-024**: When a referenced design token is removed, the build MUST fail with a clear error identifying the affected component and missing token.
- **FR-025**: Components MUST support both light and dark themes via token sets.
- **FR-026**: Mobile apps MUST strip EXIF/GPS metadata from user-uploaded images before transmission, per the constitution's privacy mandate.

### Key Entities

- **Design Token**: A named, typed value (colour, dimension, font, shadow, radius) drawn from a central token file, consumed by all platform-specific build outputs.
- **Shared Component**: A UI component with a defined prop interface, shared interaction logic, and platform-specific rendering adapters for web (markup), iOS (native views), and Android (native views).
- **Component Registry**: A catalogue of all shared components with their prop interfaces, variant documentation, platform support status, and accessibility compliance notes.
- **Platform Adapter**: A thin layer that maps shared component output to platform-specific rendering (e.g., CSS for web, native views for mobile).
- **UI Agent**: A specialised agent mode defined in an `.agent.md` file with design system knowledge, component library context, and accessibility review capabilities.

### Assumptions

- The existing API-first architecture provides all data endpoints needed by mobile apps. One new endpoint is required: `/api/auth/mobile-token` for JWT issuance to mobile clients (see plan.md Phase 6). All other data endpoints are reused as-is.
- Authentication on mobile uses a `/api/auth/mobile-token` endpoint that exchanges credentials for a JWT pair (access + refresh). This is a new API route built on top of the existing NextAuth infrastructure.
- The 200KB bundle budget applies to the web platform only; mobile apps have separate size budgets managed by app store guidelines.
- The existing i18n infrastructure supports being consumed by mobile apps.
- The team has access to iOS and Android development tooling (Xcode, Android Studio) for native builds. Expo EAS Build handles cloud-based native compilation.
- The component development environment (Storybook 10) is a development-only tool and does not ship to end users.
- The project adopts a monorepo structure with workspaces: `apps/web` (Next.js), `apps/mobile` (Expo + React Native), `packages/shared` (business logic, types, hooks), `packages/tokens` (Style Dictionary source + build).
- Expo SDK is kept on the latest stable release supporting React Native's New Architecture (Fabric renderer, TurboModules) for maximum performance.
- TanStack Query is already used in the web app; the mobile app reuses the same query keys and fetcher functions from the shared package.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can preview any component change and see the result on-screen within 1 second during development.
- **SC-002**: A design token change propagates to all three platforms (web, iOS, Android) from a single file edit.
- **SC-003**: Web app initial JS bundle remains under 200KB across all production builds.
- **SC-004**: iOS and Android apps reach interactive state within 3 seconds on a mid-range device.
- **SC-005**: At least 80% of component logic is shared between web and mobile, measured by shared lines of code versus platform-specific lines.
- **SC-006**: Zero critical WCAG 2.1 AA violations on web, zero critical screen-reader issues on iOS (VoiceOver) and Android (TalkBack).
- **SC-007**: All scrollable list screens sustain 60fps during rapid scrolling on both mobile platforms.
- **SC-008**: Users on any platform can complete the discover-to-RSVP flow (open app → browse events → view event → RSVP) in under 4 taps/clicks.
- **SC-009**: The shared component catalogue documents 100% of shared components with live previews and prop descriptions.
- **SC-010**: Mobile apps display cached content within 1 second when opened offline, with a visible offline indicator.
