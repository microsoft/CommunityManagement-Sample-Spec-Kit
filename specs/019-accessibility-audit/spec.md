# Feature Specification: WCAG Accessibility Audit & Remediation

**Feature Branch**: `019-wcag-accessibility-audit`
**Created**: 2025-07-18
**Status**: Draft
**Priority**: P1
**Constitution Check**: Principles II, V, VI, VII, VIII
**Deferred From**: README roadmap ("WCAG Manual Audit — Keyboard navigation and screen reader testing beyond axe-core automation")

## Summary

Conduct a comprehensive WCAG 2.1 AA accessibility audit across the entire AcroYoga Community Platform — web and mobile — and remediate every issue discovered. The platform currently has partial accessibility support: form inputs have error associations, the modal uses native dialog semantics, the location tree has ARIA tree roles, and toasts use live regions. However, critical gaps remain: no skip-navigation links, no focus trapping in modals, no visible focus indicators on interactive cards, no reduced-motion support, no dedicated accessibility test suite, and incomplete keyboard navigation on complex interactive components (map, calendar, event filters). This spec covers eight complementary audit and remediation areas — keyboard navigation, screen reader compatibility, focus management, colour contrast, motion preferences, form accessibility, mobile accessibility, and automated testing — to bring the platform into full WCAG 2.1 AA compliance and fulfil Constitution Principle V (UX Consistency).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Keyboard-Only Navigation Across All Pages (Priority: P1)

A user who relies exclusively on a keyboard (no mouse or touch) navigates the entire platform — browsing events, viewing event details, completing the RSVP flow, exploring teacher profiles, searching the user directory, using the events explorer (map, calendar, and location tree views), and adjusting account settings. Every interactive element is reachable via Tab and Shift+Tab, operable via Enter or Space, and visually indicates when it has focus. Complex widgets like the location tree support arrow-key navigation, and the map provides keyboard-accessible alternatives for zoom, pan, and marker selection.

**Why this priority**: Keyboard accessibility is the foundation of all other assistive technology support. Screen readers, switch devices, and voice control all depend on keyboard operability. Without it, large segments of users are completely locked out of the platform. Constitution Principle V mandates that all interactive elements MUST be keyboard navigable.

**Independent Test**: Unplug the mouse, start at the home page, and attempt to complete every core user flow (browse events, open event detail, RSVP, view teacher profile, search directory, use explorer filters, change settings) using only the keyboard. Every interactive element must receive visible focus and be operable.

**Acceptance Scenarios**:

1. **Given** any page on the platform, **When** a user presses Tab repeatedly, **Then** focus moves through all interactive elements in a logical reading order without skipping any actionable control or getting trapped.
2. **Given** the events listing page, **When** a user presses Tab to reach an event card and presses Enter, **Then** the event detail page opens, just as it would with a mouse click.
3. **Given** the events explorer with the location tree visible, **When** a user focuses the tree and presses arrow keys, **Then** focus moves between tree nodes (Up/Down), and Right/Left expand or collapse parent nodes.
4. **Given** the events explorer with the calendar panel visible, **When** a user focuses a calendar day cell and presses arrow keys, **Then** focus moves logically between days (Left/Right for previous/next day, Up/Down for same day in previous/next week).
5. **Given** the events explorer with the map panel visible, **When** a user who cannot use a mouse needs to interact with the map, **Then** keyboard-accessible controls are available for zoom in, zoom out, and selecting map markers — or an equivalent non-map listing view provides the same event information.
6. **Given** any interactive element on any page, **When** that element receives keyboard focus, **Then** a clearly visible focus indicator (meeting a minimum 3:1 contrast ratio against adjacent colours) is displayed.
7. **Given** the RSVP flow on an event detail page, **When** a user tabs through role selection options and the confirm button, **Then** all options are selectable via keyboard and the RSVP can be completed without a mouse.
8. **Given** any filter pill or toggle button on the events explorer, **When** a user focuses the control and presses Enter or Space, **Then** the filter activates or deactivates, and the results update accordingly.

---

### User Story 2 — Screen Reader Compatibility Across All Pages (Priority: P1)

A blind user navigates the platform using a screen reader. Every page has a clear structure: landmark regions (header, navigation, main content, footer) allow quick jumping between sections. Headings follow a logical hierarchy (h1 for the page title, h2 for major sections, h3 for subsections) with no skipped levels. Interactive elements announce their name, role, and state. Dynamic content changes — such as RSVP confirmations, filter result updates, and toast notifications — are announced without requiring the user to manually search for what changed.

**Why this priority**: Screen reader users represent one of the largest groups of assistive technology users. Without correct semantic structure, ARIA labels, and live region announcements, the platform is unusable for blind and low-vision users. This is a core WCAG 2.1 AA requirement and a prerequisite for meaningful platform access.

**Independent Test**: Enable a screen reader (VoiceOver on macOS, NVDA on Windows, or TalkBack on Android) and navigate every page. Verify that landmarks are announced on page load, headings follow a logical hierarchy, interactive elements announce their purpose, and dynamic updates (RSVP confirmation, filter changes, toast messages) are spoken automatically.

**Acceptance Scenarios**:

1. **Given** any page on the platform, **When** a screen reader user navigates by landmarks, **Then** the page announces distinct banner, navigation, main, and contentinfo regions.
2. **Given** any page on the platform, **When** a screen reader user navigates by headings, **Then** headings follow a sequential hierarchy (h1 → h2 → h3) with no skipped levels, and each heading accurately describes the section it introduces.
3. **Given** an event card in the events listing, **When** a screen reader reads the card, **Then** it announces the event name, date, location, and available spots — not raw markup or unlabelled elements.
4. **Given** a user completes an RSVP action, **When** the confirmation message appears on screen, **Then** the screen reader automatically announces the confirmation without the user needing to navigate to find it.
5. **Given** the events explorer page with active filters, **When** a user changes a filter and results update, **Then** a live region announces the updated result count (e.g., "12 events found").
6. **Given** any icon-only button (close button, notification bell, social icons), **When** a screen reader encounters the button, **Then** it announces a meaningful accessible name describing the button's purpose — not "button" alone or a filename.
7. **Given** the teacher profile page, **When** a screen reader reads the certification and review sections, **Then** star ratings, verification badges, and certification statuses are announced as meaningful text (e.g., "4.5 out of 5 stars", "Verified teacher"), not as decorative images or unlabelled icons.

---

### User Story 3 — Focus Management in Modals and Dialogs (Priority: P1)

A user opens a modal dialog — such as the share panel on an event detail page or a confirmation dialog for an RSVP cancellation. When the modal opens, focus moves into the modal and is trapped within it: Tab cycles only through the modal's interactive elements and does not leak to content behind the overlay. When the user closes the modal (via a close button or the Escape key), focus returns to the element that originally triggered the modal. Skip-navigation links at the top of every page allow keyboard users to bypass repetitive navigation and jump directly to the main content.

**Why this priority**: Without focus trapping, keyboard and screen reader users can accidentally interact with hidden content behind a modal, leading to confusion, data loss, or inability to dismiss the dialog. Focus restoration prevents disorientation after closing dialogs. Skip links are one of the most impactful single accessibility improvements for keyboard users who must otherwise tab through the entire header and navigation on every page.

**Independent Test**: Open any modal dialog using only the keyboard. Verify focus moves into the modal, Tab cycles only within the modal, Escape closes it, and focus returns to the triggering element. Then reload any page and verify that a "Skip to main content" link appears on the first Tab press and correctly moves focus past the navigation to the main content area.

**Acceptance Scenarios**:

1. **Given** a user triggers a modal (share panel, confirmation dialog, or any overlay), **When** the modal opens, **Then** keyboard focus moves to the first interactive element inside the modal.
2. **Given** a modal is open, **When** a user presses Tab repeatedly, **Then** focus cycles only among the interactive elements within the modal and does not move to content behind the overlay.
3. **Given** a modal is open, **When** a user presses Escape, **Then** the modal closes and focus returns to the element that opened it.
4. **Given** a modal is open, **When** a screen reader user navigates, **Then** the modal is announced with its title, and content outside the modal is hidden from the accessibility tree.
5. **Given** any page on the platform, **When** a keyboard user presses Tab as the first action after the page loads, **Then** a visually-hidden "Skip to main content" link becomes visible and focused.
6. **Given** the skip-navigation link is focused, **When** the user presses Enter, **Then** focus moves to the beginning of the main content area, bypassing the header and navigation.

---

### User Story 4 — Accessible Forms with Clear Error Feedback (Priority: P2)

A user with a visual impairment fills out a settings form (account details, notification preferences, privacy settings, or teacher profile). Every form field has a visible label, an accessible name, and — where helpful — a description of the expected input format. Required fields are indicated both visually and programmatically. When the user submits the form with errors, each error message is associated with its field and announced immediately by the screen reader. The notification preferences table is navigable with clear row and column associations.

**Why this priority**: Forms are the primary way users interact with their account. Inaccessible forms prevent users from managing their own data — a privacy and autonomy concern. Constitution Principle V mandates inline validation errors on all forms.

**Independent Test**: Navigate to each settings page using a screen reader. Verify that every field's label and description are announced when focused, required indicators are announced, and submitting with invalid data causes error messages to be announced immediately and associated with the correct field.

**Acceptance Scenarios**:

1. **Given** any form field on any settings page, **When** a screen reader user focuses the field, **Then** the screen reader announces the field's label, its required status if applicable, and any descriptive help text.
2. **Given** a form with required fields, **When** the form renders, **Then** required fields are indicated both visually (with a marker or text) and programmatically (so screen readers announce "required").
3. **Given** a user submits a form with validation errors, **When** the errors appear on screen, **Then** each error message is programmatically associated with its corresponding field, and the screen reader announces the errors automatically.
4. **Given** the notification preferences page with its table of checkboxes, **When** a screen reader user navigates the table, **Then** each checkbox announces both the notification type (row) and the channel (column) it controls.
5. **Given** a form field that expects a specific format (e.g., a URL or date), **When** the field is focused, **Then** format guidance is available and announced by screen readers before the user begins typing.

---

### User Story 5 — Sufficient Colour Contrast in All Visual States (Priority: P2)

A user with low vision or colour vision deficiency can comfortably read all text and distinguish all interactive controls across the platform. Text meets the WCAG AA contrast minimum against its background in every state — default, hover, focus, active, disabled, and selected. Non-text elements that convey information (icons, chart segments, status badges, map markers) also meet the required contrast ratio. No information is conveyed by colour alone — an additional visual cue (text label, pattern, or icon) always accompanies colour coding.

**Why this priority**: Colour contrast failures are the most common WCAG violation category. Automated tools catch many issues but miss dynamic states (hover, focus, selected), custom-styled components, and colour-only information patterns. Manual verification closes these gaps. Constitution Principle V mandates AA contrast minimums.

**Independent Test**: Audit every page using a contrast-checking tool across all interactive states (default, hover, focus, active, disabled, selected). Verify that all text meets 4.5:1 for normal text and 3:1 for large text. Verify that non-text UI components (borders, icons, focus indicators) meet 3:1 against adjacent colours. Verify that no information is conveyed by colour alone.

**Acceptance Scenarios**:

1. **Given** any text content on any page, **When** its contrast ratio is measured against the immediate background, **Then** the ratio meets or exceeds 4.5:1 for normal text and 3:1 for large text (18pt or 14pt bold).
2. **Given** any interactive element in any visual state (default, hover, focus, active, disabled), **When** its contrast ratio is measured, **Then** it meets the applicable AA minimum for that element type.
3. **Given** the event category badges or colour-coded indicators, **When** viewed by a user who cannot perceive colour differences, **Then** an additional visual cue (text label, icon, or pattern) distinguishes each category — colour is never the sole differentiator.
4. **Given** a disabled form element, **When** its appearance is assessed, **Then** it is visually distinguishable from enabled elements through means beyond colour alone (e.g., reduced opacity plus a visual indicator such as a strikethrough or "disabled" text).
5. **Given** map markers on the events explorer, **When** markers represent different event categories, **Then** each category is distinguishable through shape, icon, or label in addition to colour.

---

### User Story 6 — Respecting Motion and Animation Preferences (Priority: P2)

A user who experiences motion sickness or vestibular disorders has enabled the "reduce motion" preference in their operating system. When they use the platform, all non-essential animations — skeleton shimmer effects, page transitions, card hover effects, and decorative motion — are either removed entirely or replaced with simple opacity fades. Essential animations (such as a loading spinner indicating an ongoing operation) are retained but simplified. No content autoplays or moves unexpectedly.

**Why this priority**: Motion sensitivity affects a significant population, and uncontrolled animation can cause physical discomfort ranging from distraction to nausea and seizures. WCAG 2.1 AA Success Criterion 2.3.1 requires that content does not flash more than three times per second, and SC 2.3.3 (AAA, but best practice) recommends respecting user motion preferences. The platform currently has no reduced-motion support.

**Independent Test**: Enable "Reduce motion" in the operating system accessibility settings. Navigate through the platform and verify that skeleton shimmer animations, card hover transitions, page transitions, and any other decorative motion are eliminated or replaced with simple opacity changes. Verify that essential loading indicators still function.

**Acceptance Scenarios**:

1. **Given** a user has enabled "prefers-reduced-motion: reduce" in their OS settings, **When** any page loads, **Then** skeleton shimmer animations are replaced with a static placeholder or a simple opacity pulse.
2. **Given** reduced-motion preference is active, **When** a user hovers over or focuses on interactive cards, **Then** any scale, slide, or transform animations are replaced with a simple opacity or colour change.
3. **Given** reduced-motion preference is active, **When** a toast notification appears, **Then** it appears instantly without a slide-in or fade-in transition (or uses only a brief opacity transition under 200ms).
4. **Given** reduced-motion preference is active, **When** a loading spinner or progress indicator is shown, **Then** it still indicates that an operation is in progress, but any spinning or pulsing animation is simplified (e.g., a static icon with text "Loading…" or a minimal opacity pulse).
5. **Given** no reduced-motion preference is set, **When** the user interacts with the platform, **Then** animations play normally as designed — motion support does not degrade the default experience.

---

### User Story 7 — Mobile Accessibility on Touch Devices (Priority: P3)

A user with a motor impairment uses the mobile app (Expo/React Native) or the responsive web app on a touch device. All touch targets (buttons, links, cards, checkboxes) are large enough to tap accurately. Gestures that require fine motor control (pinch-to-zoom on the map, swipe to dismiss) have accessible alternatives (zoom buttons, a close button). The mobile app exposes correct accessibility properties so that platform screen readers (VoiceOver on iOS, TalkBack on Android) can identify and operate every control.

**Why this priority**: Mobile usage represents a large share of community platform traffic. Motor-impaired users and users with large fingers or in bumpy environments need generous touch targets and gesture alternatives. The Expo/React Native mobile app needs explicit accessibility props to work with native screen readers.

**Independent Test**: Open the mobile app and responsive web app on a touch device. Enable the platform's screen reader (VoiceOver or TalkBack). Verify that all touch targets meet the minimum size, that every gesture-dependent interaction has an alternative, and that the screen reader can identify and operate every control.

**Acceptance Scenarios**:

1. **Given** any interactive element (button, link, card, checkbox) on the mobile app or responsive web, **When** its touch target area is measured, **Then** it is at least 44 × 44 CSS pixels (per Constitution Principle V).
2. **Given** the map view on a touch device, **When** a user cannot perform a pinch-to-zoom gesture, **Then** visible zoom-in and zoom-out buttons are available as an alternative.
3. **Given** the mobile app running with TalkBack or VoiceOver, **When** the screen reader encounters any interactive element, **Then** it announces a meaningful label and role (e.g., "RSVP button" not "button").
4. **Given** a swipe gesture is used to dismiss a notification or navigate between views, **When** a user cannot perform the swipe, **Then** an on-screen button or tap alternative achieves the same action.
5. **Given** the mobile app's Expo components, **When** a custom interactive component is rendered, **Then** it exposes the correct native accessibility properties (accessible, accessibilityLabel, accessibilityRole, accessibilityState) so platform screen readers can identify it.

---

### User Story 8 — Automated Accessibility Testing and CI Enforcement (Priority: P3)

A developer makes changes to a component or page. Before the code can be merged, an automated accessibility test suite runs as part of the CI pipeline. The suite scans every page and shared component for WCAG 2.1 AA violations and fails the build if any new violation is introduced. The test suite covers both static analysis (linting rules for accessibility attributes) and runtime analysis (rendering components and scanning the resulting markup for violations). The CI gate provides clear, actionable error messages so developers can fix issues without accessibility expertise.

**Why this priority**: Manual accessibility auditing is valuable but does not prevent regressions. Automated testing catches the approximately 30–40% of WCAG issues that are machine-detectable (missing alt text, missing labels, incorrect ARIA, contrast failures) and ensures they never regress. This builds on the existing "no new axe-core violations" quality gate by expanding it from a policy to an enforced, comprehensive test suite.

**Independent Test**: Introduce a deliberate accessibility violation (e.g., remove an aria-label from a button) in a test branch. Run the CI pipeline and verify it fails with a clear error message identifying the violation, the affected element, and the WCAG success criterion violated. Fix the violation and verify the pipeline passes.

**Acceptance Scenarios**:

1. **Given** the CI pipeline runs on a pull request, **When** accessibility tests execute, **Then** every page and every shared UI component is scanned for WCAG 2.1 AA violations.
2. **Given** a developer introduces a new accessibility violation (e.g., an image without alternative text), **When** the CI pipeline runs, **Then** the build fails with an error message identifying the violating element, the rule violated, and the WCAG success criterion.
3. **Given** a shared UI component is rendered in isolation (e.g., in a test harness), **When** the accessibility scanner runs, **Then** it evaluates the rendered markup — not just the source code — for violations.
4. **Given** the CI pipeline, **When** all accessibility tests pass, **Then** the pipeline reports the count of elements scanned and confirms zero violations found.
5. **Given** the existing static analysis rules for accessibility attributes in the linter, **When** a developer writes a component missing a required accessibility attribute, **Then** the linter flags the issue before the code is even committed.

---

### Edge Cases

- What happens when a user's browser or device does not support the "prefers-reduced-motion" media query? The platform defaults to showing animations as designed — no degradation occurs; the feature is a progressive enhancement.
- How does the platform handle dynamically-inserted content (e.g., infinite scroll loading more events)? New content must be announced to screen readers via a live region, and focus must not jump unexpectedly.
- What happens when a modal is opened from within another modal (nested dialogs)? Focus trapping must apply to the topmost modal, and closing it must restore focus to the element in the parent modal that triggered it.
- How does the system handle right-to-left (RTL) languages in the context of focus order? Tab order must follow the visual reading direction of the active locale, matching the existing RTL layout support from Spec 014.
- What happens when the map component fails to load (network error or timeout)? The fallback message must be accessible — announced by screen readers and keyboard-focusable if it contains a retry action.
- How are automated accessibility tests handled for components that depend on third-party libraries (e.g., the Leaflet map)? Tests scan the rendered output including third-party markup, but known third-party violations that cannot be fixed are documented and excluded from the CI gate with an explicit waiver and tracking issue.

---

## Requirements *(mandatory)*

### Functional Requirements

**Keyboard Navigation**

- **FR-001**: All interactive elements across all pages (links, buttons, form controls, cards, tabs, menus) MUST be reachable and operable using only a keyboard (Tab, Shift+Tab, Enter, Space, Escape, and arrow keys as appropriate).
- **FR-002**: Every interactive element MUST display a visible focus indicator when it receives keyboard focus, with a contrast ratio of at least 3:1 against adjacent colours.
- **FR-003**: The location tree component MUST support arrow-key navigation: Up/Down to move between sibling nodes, Right to expand a collapsed node, Left to collapse an expanded node.
- **FR-004**: The calendar panel MUST support arrow-key navigation: Left/Right for previous/next day, Up/Down for same day in previous/next week, and keyboard-accessible month navigation.
- **FR-005**: The map panel MUST provide keyboard-accessible zoom controls and a mechanism to select and activate map markers without a pointing device — or provide an equivalent accessible alternative view that surfaces the same event information.
- **FR-006**: Event filter pills and toggle buttons MUST be activatable via Enter or Space when focused.

**Screen Reader Compatibility**

- **FR-007**: Every page MUST use landmark roles (banner, navigation, main, contentinfo) to define its structural regions.
- **FR-008**: Every page MUST have a logical heading hierarchy starting at h1, with no skipped heading levels.
- **FR-009**: All icon-only buttons and controls MUST have an accessible name (via visible text, aria-label, or aria-labelledby) that describes their purpose.
- **FR-010**: All images that convey information MUST have descriptive alternative text. Decorative images MUST be hidden from the accessibility tree.
- **FR-011**: Dynamic content changes (RSVP confirmations, filter result updates, toast notifications, form validation errors) MUST be announced to screen readers via ARIA live regions with the appropriate politeness level.
- **FR-012**: Star ratings, verification badges, and certification statuses MUST be announced as meaningful text (e.g., "4.5 out of 5 stars") rather than as unlabelled images or icons.

**Focus Management**

- **FR-013**: When a modal or dialog opens, keyboard focus MUST move to the first interactive element within the modal.
- **FR-014**: While a modal is open, keyboard focus MUST be trapped within the modal — Tab and Shift+Tab MUST cycle only among the modal's interactive elements.
- **FR-015**: When a modal closes, keyboard focus MUST return to the element that triggered the modal.
- **FR-016**: When a modal is open, content outside the modal MUST be hidden from the accessibility tree (using aria-hidden or the inert attribute on the background content).
- **FR-017**: Every page MUST include a "Skip to main content" link as the first focusable element, visible on keyboard focus, that moves focus past the header and navigation to the main content area.

**Colour Contrast**

- **FR-018**: All text content MUST meet WCAG 2.1 AA contrast minimums: 4.5:1 for normal text and 3:1 for large text (18pt regular or 14pt bold).
- **FR-019**: Non-text UI components (icons, borders, focus indicators) that convey information MUST meet a 3:1 contrast ratio against adjacent colours.
- **FR-020**: No information MUST be conveyed by colour alone. An additional visual cue (text, icon, pattern, or shape) MUST accompany colour-coded indicators such as event category badges and map markers.

**Motion and Animation**

- **FR-021**: When the user's operating system "prefers-reduced-motion" preference is set to "reduce", all non-essential animations (skeleton shimmers, card hover effects, page transitions, slide-in toasts) MUST be removed or replaced with simple opacity transitions under 200ms.
- **FR-022**: Essential loading indicators MUST remain functional when reduced motion is active, but MUST be simplified (e.g., a minimal opacity pulse or static "Loading…" text instead of a continuous spin).
- **FR-023**: No content on the platform MUST flash more than three times per second.

**Form Accessibility**

- **FR-024**: Every form field MUST have a programmatically-associated visible label.
- **FR-025**: Required form fields MUST be indicated both visually (marker or text) and programmatically (via the "required" attribute or aria-required).
- **FR-026**: Form validation error messages MUST be programmatically associated with their corresponding fields (via aria-describedby or equivalent) and announced by screen readers when they appear.
- **FR-027**: Form fields that expect a specific format (URLs, dates, numbers) MUST provide format guidance that is programmatically associated with the field and announced by screen readers.
- **FR-028**: The notification preferences table MUST allow screen readers to announce both the row header (notification type) and column header (channel) for each checkbox, so users understand what they are toggling.

**Mobile Accessibility**

- **FR-029**: All interactive touch targets on mobile (buttons, links, cards, checkboxes) MUST have a minimum size of 44 × 44 CSS pixels.
- **FR-030**: Every gesture-based interaction (pinch-to-zoom, swipe-to-dismiss) MUST have an equivalent single-tap or button alternative.
- **FR-031**: All custom interactive components in the Expo/React Native mobile app MUST expose the correct native accessibility properties (accessible, accessibilityLabel, accessibilityRole, accessibilityState) for platform screen readers.

**Automated Testing**

- **FR-032**: An automated accessibility test suite MUST scan every page and every shared UI component for WCAG 2.1 AA violations at runtime (against rendered markup, not just source code).
- **FR-033**: The CI pipeline MUST fail the build if any new WCAG 2.1 AA accessibility violation is introduced.
- **FR-034**: CI accessibility test failure messages MUST identify the violating element, the rule violated, and the associated WCAG success criterion.
- **FR-035**: Known third-party accessibility violations that cannot be remediated (e.g., within the map rendering library's internal markup) MUST be explicitly documented and excluded from the CI gate with a tracking issue for each waiver.

### Assumptions

- The platform's existing design token system provides the foundation for colour contrast fixes — token values can be updated centrally, and all consuming components inherit the change.
- The existing `<dialog>` element usage in the Modal component provides a solid baseline for focus management, but requires focus trapping and restoration logic.
- The existing `eslint-plugin-jsx-a11y` linter plugin is active and will continue to provide static analysis alongside the new runtime accessibility testing.
- Screen reader testing will be validated against VoiceOver (macOS/iOS), NVDA (Windows), and TalkBack (Android) — the three most widely-used screen readers.
- The Leaflet map library has known accessibility limitations in its internal markup. These will be documented and waived in the CI gate, with accessible alternatives provided for all map functionality.
- The existing internationalisation support (Spec 014) handles RTL layout structurally, and this spec ensures accessibility features (focus order, landmarks, heading hierarchy) align with the active locale direction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of interactive elements across all 28 pages are operable using only a keyboard, verified by manual testing of every core user flow (event browse, event detail, RSVP, teacher profile, user directory, events explorer, settings).
- **SC-002**: Zero WCAG 2.1 AA violations detected by automated scanning tools across all pages and shared UI components (excluding explicitly documented and waived third-party issues).
- **SC-003**: Every page passes a screen reader walkthrough — all landmarks are announced, headings follow a logical hierarchy, and all interactive elements announce their name, role, and state correctly.
- **SC-004**: All text on the platform meets AA contrast minimums (4.5:1 for normal text, 3:1 for large text) in all visual states (default, hover, focus, active, disabled, selected), verified by contrast analysis tools.
- **SC-005**: When "prefers-reduced-motion: reduce" is active, zero non-essential animations play — verified by visual inspection on every page.
- **SC-006**: 100% of form fields across all settings pages have programmatically-associated labels, error descriptions, and required indicators — verified by screen reader testing.
- **SC-007**: All touch targets on the mobile app and responsive web measure at least 44 × 44 CSS pixels, verified by measurement tools.
- **SC-008**: The CI pipeline catches and rejects 100% of machine-detectable accessibility regressions — verified by introducing a deliberate violation and confirming the build fails.
- **SC-009**: Users relying on screen readers can complete the core user journey (find an event, view its details, and RSVP) without encountering any unlabelled controls, missing announcements, or focus traps outside of modals.
- **SC-010**: Every modal and dialog on the platform correctly traps focus, responds to Escape, and restores focus on close — verified by keyboard-only testing of each modal trigger point.
