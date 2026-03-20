# Feature Specification: Events Explorer

**Feature Branch**: `010-events-explorer`  
**Created**: 2026-03-19  
**Status**: Draft  
**Input**: User description: "An advanced Events Explorer page with a rich 3-panel exploration interface featuring location tree, calendar views, and interactive map"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Browse Events in Calendar Views (Priority: P1)

A community member visits the Events Explorer page and sees events displayed in a calendar format. They can switch between month, week, list, and agenda views to find events that fit their schedule. Events are color-coded by category (Jam, Workshop, Class, Festival, Social, Retreat, Teacher Training) so users can quickly scan for event types they care about. Clicking an event navigates to that event's detail page.

**Why this priority**: The calendar is the central panel and core value proposition. Without a functional, multi-view calendar showing categorized events, the Explorer has no primary content area. This replaces the current simple list view and delivers immediate improvement.

**Independent Test**: Navigate to the Events Explorer page. Verify month view displays as default with event dots colored by category. Switch to week, list, and agenda views — each renders events correctly. Click an event — navigate to the detail page.

**Acceptance Scenarios**:

1. **Given** the Events Explorer page loads, **When** events exist in the current date range, **Then** month view shows event indicators on the correct dates, colored by category.
2. **Given** month view is active, **When** the user switches to week view, **Then** events display as time blocks within the week timeline.
3. **Given** any calendar view is active, **When** the user clicks an event, **Then** they navigate to that event's detail page.
4. **Given** events of different categories exist, **When** displayed in any view, **Then** each event's visual indicator matches its category color (Jam = Indigo, Workshop = Emerald, Class = Blue, Festival = Pink, Social = Amber, Retreat = Purple, Teacher Training = Teal).
5. **Given** list view is active, **When** events are displayed, **Then** they appear in dense chronological order grouped by date.
6. **Given** agenda view is active, **When** events are displayed, **Then** they are grouped by day with expandable event cards showing summary details.
7. **Given** a recurring event exists, **When** displayed in any view, **Then** it shows a recurrence icon distinguishing it from one-time events.
8. **Given** a multi-day event exists, **When** displayed in month or week view, **Then** it visually spans across the appropriate date range.

---

### User Story 2 - Filter Events by Category (Priority: P1)

A community member sees a category legend bar showing all event types with their associated colors. They click on category labels in the legend to toggle them on/off as quick filters. Active filters apply to all panels — calendar, map, and location tree counts update to reflect only the selected categories.

**Why this priority**: Category filtering is the most common way users narrow down events and is essential for making the Explorer usable when there are many events. The legend also serves as a visual key for understanding the color coding.

**Independent Test**: Load the Explorer with events of mixed categories. Click "Workshop" in the legend — only Workshop events remain in the calendar, map markers update, and location tree counts update. Click "Workshop" again to re-enable it — all events return.

**Acceptance Scenarios**:

1. **Given** the Events Explorer loads, **When** the page renders, **Then** a category legend bar is visible showing all event types with their color indicators.
2. **Given** the legend is visible, **When** the user clicks a category label, **Then** that category is toggled off and events of that category are hidden from all panels.
3. **Given** one or more categories are toggled off, **When** the user clicks a disabled category, **Then** it is re-enabled and those events reappear in all panels.
4. **Given** category filters are active, **When** the URL is inspected, **Then** the active category filter state is encoded in URL search parameters.

---

### User Story 3 - Explore Events on an Interactive Map (Priority: P1)

A community member sees event locations plotted on an interactive map panel. Markers are color-coded by event category. In areas with many events, markers are clustered with a count badge. Clicking a cluster zooms in to reveal individual markers. Clicking an individual marker shows a popup with an event summary card (name, date, category, location).

**Why this priority**: The map provides the spatial dimension that differentiates the Explorer from a plain calendar. It enables users to find events near them or in specific locations — a core use case for a geographically distributed community.

**Independent Test**: Load the Explorer with events in multiple cities. Verify markers appear at correct locations with category-appropriate colors. Zoom out until clusters form — verify cluster badges show counts. Click a cluster — map zooms in. Click an individual marker — popup shows event summary.

**Acceptance Scenarios**:

1. **Given** the Events Explorer loads with geolocated events, **When** the map panel renders, **Then** markers appear at the correct geographic positions for each event.
2. **Given** markers are displayed, **When** events of different categories exist, **Then** marker colors correspond to their event category.
3. **Given** a dense area with many events, **When** the map is zoomed out, **Then** nearby markers are grouped into clusters showing an event count.
4. **Given** a cluster is visible, **When** the user clicks it, **Then** the map zooms in to reveal the individual markers within.
5. **Given** an individual marker is visible, **When** the user clicks it, **Then** a popup appears showing the event name, date, category, and location.
6. **Given** the map is loaded, **When** the initial script bundle is measured, **Then** the map library is loaded lazily and does not exceed the page JS budget.

---

### User Story 4 - Filter Events by Location Using the Location Tree (Priority: P2)

A community member uses the left-side location panel displaying a hierarchical tree of Continent → Country → City. Each node shows the count of active events at that level. Clicking a location node filters the calendar and map to show only events in that location, and the map zooms to that geographic area. The tree supports search/filter to quickly find a specific city or country.

**Why this priority**: The location tree provides structured geographic navigation that complements the freeform map interaction. It's especially useful when users want to browse events within a known region rather than panning the map. Depends on the calendar (P1) and map (P1) being functional.

**Independent Test**: Load the Explorer. Expand "Europe" → "United Kingdom" → "Bristol" in the tree — see event count beside each node. Click "Bristol" — calendar and list show only Bristol events, map zooms to Bristol area. Type "Tokyo" in the tree search — see it highlighted. Click it — panels filter to Tokyo.

**Acceptance Scenarios**:

1. **Given** the Events Explorer loads, **When** the location panel renders, **Then** it displays a hierarchical tree of Continent → Country → City.
2. **Given** the tree is displayed, **When** events exist in various locations, **Then** each node shows the count of active events at that geographic level.
3. **Given** a tree node is visible, **When** the user clicks "Bristol", **Then** the calendar filters to Bristol events and the map zooms to the Bristol area.
4. **Given** the tree has a search input, **When** the user types a partial city name, **Then** the tree filters to show only matching locations.
5. **Given** a location filter is active, **When** the user clears the location selection, **Then** all panels return to showing all events.
6. **Given** category filters are also active, **When** a location is selected, **Then** both filters apply — showing only events matching the selected category AND location.

---

### User Story 5 - Cross-Panel Synchronization (Priority: P2)

All three panels — location tree, calendar, and map — stay synchronized. Selecting a location in the tree updates both the calendar filter and the map viewport. Changing the date range in the calendar updates which events show on the map. Moving the map viewport can optionally filter the event list to show only events visible on the map. Filter controls (category, skill level, status) apply across all panels simultaneously.

**Why this priority**: Synchronization is what transforms three independent panels into a cohesive exploration experience. Without it, users would need to manually re-filter each panel. Depends on all three panels (P1 + P2 stories) being functional.

**Independent Test**: Select "Europe" in the location tree — calendar shows only European events, map zooms to Europe. Navigate calendar to next month — map markers update to show only that month's events. Pan the map to show only Germany — optionally the calendar filters to German events. Apply a "Workshop" category filter — all three panels update.

**Acceptance Scenarios**:

1. **Given** a location is selected in the tree, **When** the selection changes, **Then** the calendar filters to that location's events and the map viewport adjusts to show that area.
2. **Given** the calendar date range changes, **When** the user navigates to a different month, **Then** the map updates to show only markers for events in that date range.
3. **Given** the user pans or zooms the map, **When** a "sync map to list" option is enabled, **Then** the calendar/list filters to show only events within the visible map bounds.
4. **Given** a filter is applied (category, skill level, or status), **When** the filter state changes, **Then** all three panels reflect the updated filter simultaneously.
5. **Given** any combination of filters is active, **When** the URL is inspected, **Then** all filter state is encoded as URL search parameters and the page can be bookmarked/shared.

---

### User Story 6 - Responsive Layout Adaptation (Priority: P2)

The Events Explorer adapts to different screen sizes. On desktop, all three panels are visible side by side. On tablet, the location tree collapses to a dropdown or modal, and the calendar and map stack vertically with a toggle between them. On mobile, only one panel is visible at a time with bottom tab navigation to switch between List, Map, and Filters views.

**Why this priority**: A significant portion of users will access the Explorer on mobile or tablet. Without responsive adaptation, the three-panel layout would be unusable on smaller screens. Depends on core panel functionality being implemented.

**Independent Test**: Open the Explorer at desktop width (≥1024px) — see all three panels. Resize to tablet (768–1023px) — location tree becomes a dropdown, calendar and map stack. Resize to mobile (<768px) — single panel with bottom tabs for List, Map, Filters.

**Acceptance Scenarios**:

1. **Given** the viewport width is ≥1024px, **When** the Explorer renders, **Then** all three panels (location, calendar, map) are visible side by side.
2. **Given** the viewport width is 768–1023px, **When** the Explorer renders, **Then** the location tree collapses to a dropdown or modal trigger, and the calendar and map stack vertically with a toggle.
3. **Given** the viewport width is <768px, **When** the Explorer renders, **Then** a single panel is shown with bottom tab navigation for List, Map, and Filters views.
4. **Given** the user is on mobile, **When** they tap the "Map" tab, **Then** the map panel replaces the list view and shows all currently filtered events.
5. **Given** the user switches between responsive breakpoints, **When** filters are active, **Then** filter state is preserved across layout changes.

---

### User Story 7 - Date Range Quick Picks (Priority: P3)

A community member can quickly jump to common date ranges using pre-set buttons: "This week", "This weekend", "This month", and "Next 30 days". Selecting a quick pick sets the calendar date range and updates the map and location tree accordingly.

**Why this priority**: Convenient shortcuts that reduce friction when browsing, but not essential for core Explorer functionality. Users can manually navigate dates without them.

**Independent Test**: Click "This weekend" — the calendar jumps to show Saturday/Sunday of the current week, and only events on those dates appear in all panels. Click "Next 30 days" — the date range expands accordingly.

**Acceptance Scenarios**:

1. **Given** the Events Explorer is displayed, **When** the user clicks "This week", **Then** the calendar date range is set to the current week and all panels filter to that range.
2. **Given** "This weekend" is clicked, **When** the calendar updates, **Then** only Saturday and Sunday events are displayed across all panels.
3. **Given** "Next 30 days" is clicked, **When** the calendar updates, **Then** events within the next 30 calendar days are shown.
4. **Given** a quick pick is active, **When** the URL is inspected, **Then** the date range is reflected in URL parameters.

---

### User Story 8 - "Near Me" Geolocation (Priority: P3)

A community member clicks a "Near me" button that uses the browser's geolocation to center the map on their current position and optionally filter events by proximity. This helps users find local events quickly without manually navigating the map.

**Why this priority**: Great convenience feature for mobile users, but depends on browser geolocation permission and is not essential for core browsing. Users can manually pan the map to their location.

**Independent Test**: Click "Near me" (and grant geolocation permission) — map centers on the user's position and events near that location are highlighted. Deny geolocation — an informative message appears instead of an error.

**Acceptance Scenarios**:

1. **Given** the user clicks "Near me", **When** geolocation permission is granted, **Then** the map centers on the user's current position.
2. **Given** the map is centered on the user, **When** nearby events exist, **Then** those events are prioritized or highlighted in all panels.
3. **Given** the user clicks "Near me", **When** geolocation is denied or unavailable, **Then** a user-friendly message explains that location access is needed and no error is thrown.

---

### User Story 9 - Event Density Heatmap (Priority: P3)

A community member toggles a "heatmap" option on the map that overlays an event density visualization, showing where events are concentrated geographically. This helps users discover event hotspots they might not have considered.

**Why this priority**: A nice-to-have visualization enhancement. The marker clusters already convey density information, so this is supplementary.

**Independent Test**: Toggle the heatmap option on the map — see a colored density overlay showing event concentration. Toggle it off — return to standard marker view.

**Acceptance Scenarios**:

1. **Given** the map is displayed, **When** the user enables the heatmap toggle, **Then** an event density overlay appears showing concentration of events by area.
2. **Given** the heatmap is active, **When** category filters are applied, **Then** the heatmap recalculates to reflect only the filtered events.
3. **Given** the heatmap is visible, **When** the user disables the toggle, **Then** the map returns to the standard marker/cluster view.

---

### Edge Cases

- What happens when no events match the current filter combination? All panels show an appropriate empty state with a message and suggestions to broaden filters.
- How does the system handle events with no geographic coordinates? Events without coordinates appear in the calendar and list views but not on the map. The location tree excludes them from counts.
- What happens when the map library fails to load (network issue)? The calendar and location tree continue to function. The map panel shows a fallback message with a retry option.
- How does the system handle thousands of events in a single view? Marker clustering on the map, pagination or virtualized scrolling in list view, and event dot limits in month view (e.g., "+3 more" overflow).
- What happens when the user navigates to a URL with invalid filter parameters? Invalid parameters are silently ignored and the Explorer loads with default settings.
- How does the system behave when the browser's geolocation times out? The "Near me" button shows a timeout message and remains usable for retry.
- What happens with events that span across months in month view? Multi-day events that cross month boundaries appear in both months when navigating.
- How does keyboard navigation work across the three panels? Users can tab between panels.  Within each panel, arrow keys navigate elements. Focus indicators are clearly visible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display events in four view modes — month, week, list, and agenda — with the ability to switch between them.
- **FR-002**: System MUST color-code events by category using the defined category-color mapping (Jam = Indigo, Workshop = Emerald, Class = Blue, Festival = Pink, Social = Amber, Retreat = Purple, Teacher Training = Teal).
- **FR-003**: System MUST display recurring events with a visual recurrence indicator and multi-day events spanning across their full date range.
- **FR-004**: System MUST render an interactive map with event markers positioned at event coordinates.
- **FR-005**: System MUST cluster nearby map markers in dense areas, showing event count on the cluster badge.
- **FR-006**: System MUST display a popup with event summary (name, date, category, location) when a map marker is clicked.
- **FR-007**: System MUST display a hierarchical location tree showing Continent → Country → City with event counts at each level.
- **FR-008**: System MUST filter the calendar and map when a location tree node is selected, and zoom the map to the selected area.
- **FR-009**: System MUST support search/filter within the location tree to find specific locations.
- **FR-010**: System MUST synchronize filters across all three panels — applying a filter in any panel updates the other two.
- **FR-011**: System MUST encode all filter state (categories, location, date range, view mode) in URL search parameters for bookmarkability.
- **FR-012**: System MUST display a category legend bar that also functions as quick filter toggles.
- **FR-013**: System MUST adapt layout responsively — three-panel on desktop (≥1024px), stacked with collapsed tree on tablet (768–1023px), single panel with tab navigation on mobile (<768px).
- **FR-014**: System MUST navigate to the event detail page when an event is clicked in any panel.
- **FR-015**: System MUST use the existing events API endpoint with its query filter capabilities.
- **FR-016**: System MUST support all user-facing strings as i18n-extractable.
- **FR-017**: System MUST be fully keyboard navigable and meet WCAG 2.1 AA accessibility requirements.
- **FR-018**: System MUST use design tokens exclusively for all colors and spacing values.
- **FR-019**: System MUST provide date range quick pick buttons: "This week", "This weekend", "This month", "Next 30 days".
- **FR-020**: System MUST provide a "Near me" geolocation button that centers the map on the user's position when permission is granted.
- **FR-021**: System MUST gracefully handle geolocation denial or unavailability with a user-friendly message.
- **FR-022**: System MUST provide an optional event density heatmap overlay on the map.
- **FR-023**: System MUST lazy-load the map library to keep initial JS bundle within budget.
- **FR-024**: System MUST display an appropriate empty state when no events match the active filters.
- **FR-025**: System MUST handle events without geographic coordinates by showing them in calendar/list but excluding them from the map.

### Key Entities

- **Event**: The primary entity displayed in all panels — has a name, date(s), category, location, recurrence pattern, and geographic coordinates. Represented by the existing `EventSummary` type.
- **City**: A geographic location with a name and coordinates, organized within a Country and Continent hierarchy. Represented by the existing `City` type.
- **Location Hierarchy**: The Continent → Country → City tree structure, with computed event counts at each level. Derived from City data and event locations.
- **Event Category**: One of seven defined types (Jam, Workshop, Class, Festival, Social, Retreat, Teacher Training), each mapped to a specific color from the design token system.
- **Filter State**: The combination of active category filters, selected location, date range, view mode, and any other filter parameters. Persisted in URL search parameters.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find and click an event in a specific city within 15 seconds using either the location tree or the map.
- **SC-002**: Users can switch between all four calendar views (month, week, list, agenda) and see events update within 1 second.
- **SC-003**: All filtering actions (category toggle, location select, date change) update all visible panels within 1 second.
- **SC-004**: 90% of users can successfully locate a specific event using category filters and date navigation on their first attempt.
- **SC-005**: The Events Explorer page loads and becomes interactive within 3 seconds on a standard broadband connection.
- **SC-006**: The Explorer is fully usable at all three breakpoints — desktop, tablet, and mobile — without horizontal scrolling or overlapping elements.
- **SC-007**: All interactive elements (events, markers, tree nodes, tabs, filters) are reachable and operable via keyboard alone.
- **SC-008**: Shared filter URLs (bookmarked or sent to another user) reproduce the exact same filtered view when opened.
- **SC-009**: Map interactions (marker click, cluster zoom, pan) remain smooth with no perceptible lag when displaying up to 500 visible markers.
- **SC-010**: The map library contributes less than 200KB to the compressed JS bundle through lazy loading.

## Assumptions

- The existing `/api/events` endpoint supports filtering by location (city/country), category, date range, and pagination sufficient for the Explorer's needs.
- The existing `City` type includes geographic coordinates (latitude/longitude) and belongs to a country and continent hierarchy.
- Events without geographic coordinates are a minority edge case and excluding them from the map is acceptable.
- Browser geolocation for "Near me" follows standard permission flows and is not required for core Explorer functionality.
- The category list (Jam, Workshop, Class, Festival, Social, Retreat, Teacher Training) is stable and does not need to be dynamically configurable for the initial release.
- Design tokens for the seven category colors already exist or will be defined as part of this feature.
- The existing event detail page is functional and can receive navigation from the Explorer.
