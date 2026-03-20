# Feature Specification: Events Explorer

**Feature Branch**: `010-events-explorer`  
**Created**: 2026-03-19  
**Status**: Complete  
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

### User Story 1 - Browse Events in Compact Month Calendar (Priority: P1)

A community member visits the Events Explorer page and sees events displayed in a compact month calendar. The calendar fits within a fixed-height panel with no scrolling required. Events are color-coded by category (Jam, Workshop, Class, Festival, Social, Retreat, Teacher Training) with small event count bubbles beside each date number. Today's date has a subtle underline indicator. Clicking a day selects it and highlights the cell. Users navigate between months using prev/next arrows.

**Why this priority**: The calendar is the central panel and core value proposition. A compact month view provides an at-a-glance overview of event distribution across dates, enabling users to quickly identify busy days. This replaces the current simple list view and delivers immediate improvement.

**Independent Test**: Navigate to the Events Explorer page. Verify month view displays with event count bubbles colored by category next to date numbers. Verify today has an underline. Click a day — cell highlights. Navigate to next/prev month. Verify calendar fits in panel without scrolling.

**Acceptance Scenarios**:

1. **Given** the Events Explorer page loads, **When** events exist in the current date range, **Then** month view shows event count bubbles next to date numbers on days with events.
2. **Given** the calendar renders, **When** the current month is displayed, **Then** today's date has a subtle underline indicator.
3. **Given** a day cell is visible, **When** the user clicks it, **Then** the cell highlights with a light background color and the date is selected.
4. **Given** events of different categories exist, **When** displayed on the calendar, **Then** each event's count bubble matches its category color (Jam = Indigo, Workshop = Emerald, Class = Blue, Festival = Pink, Social = Amber, Retreat = Purple, Teacher Training = Teal).
5. **Given** the calendar is displayed, **When** the user clicks prev/next arrows, **Then** the calendar navigates to the adjacent month.
6. **Given** the calendar panel has a fixed height, **When** any month is displayed, **Then** the grid fits within the panel without requiring scrolling.

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

### User Story 3 - Explore Events on a 3-Level Hierarchical Map (Priority: P1)

A community member sees event locations on a 3-level hierarchical map that provides progressive drill-down from globe to country to city level. At globe level, country bubbles show the total event count per country, sized proportionally. Clicking a country bubble (or zooming in past the country threshold) transitions to country level showing city bubbles with event counts. At city level, individual event markers appear, clustered by proximity when dense. Zoom levels snap automatically with hysteresis thresholds to prevent flickering between levels. Hovering over a bubble shows the location name in a popup; the bubble itself only displays the count number.

**Why this priority**: The map provides the spatial dimension that differentiates the Explorer from a plain calendar. The 3-level hierarchical approach prevents information overload at global scale while enabling detailed exploration at city level.

**Independent Test**: Load the Explorer with events in multiple countries. At globe level, verify country bubbles appear with count numbers. Click a country bubble — map zooms in and shows city bubbles. Click a city bubble — map zooms to city level showing individual markers. Hover a bubble — popup shows location name. Zoom out past threshold — level snaps back.

**Acceptance Scenarios**:

1. **Given** the Events Explorer loads with geolocated events, **When** the map renders at globe level (zoom < 5), **Then** country bubbles appear showing event counts sized proportionally.
2. **Given** country level is active (zoom 5–10), **When** city data is available, **Then** city bubbles appear showing event counts for each city.
3. **Given** city level is active (zoom ≥ 10), **When** events exist in the visible area, **Then** individual event markers appear, clustered by proximity when dense.
4. **Given** the map is at any level, **When** the user zooms past a threshold, **Then** the level snaps automatically with hysteresis (up-thresholds: 5, 10; down-thresholds: 3, 8) to prevent flickering.
5. **Given** a bubble is visible, **When** the user hovers over it, **Then** a popup appears showing the location name; the bubble itself only displays the event count number.
6. **Given** a location node is selected in the tree, **When** the map should zoom to it, **Then** the map uses flyTo for city nodes (avoiding bounds-based zoom reset) and flyToBounds for larger areas.
7. **Given** the map is loaded, **When** the initial script bundle is measured, **Then** the map library is loaded lazily and does not exceed the page JS budget.

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

All three panels — location tree, calendar, and map — stay synchronized. Selecting a location in the tree updates both the calendar filter and the map viewport. Changing the date range in the calendar updates which events show on the map. Moving the map viewport can optionally filter the event list to show only events visible on the map. Filter controls (category, skill level, status) apply across all panels simultaneously. A "Reset filters" button appears when any filter is active, allowing the user to clear all filters at once.

**Why this priority**: Synchronization is what transforms three independent panels into a cohesive exploration experience. Without it, users would need to manually re-filter each panel. Depends on all three panels (P1 + P2 stories) being functional.

**Independent Test**: Select "Europe" in the location tree — calendar shows only European events, map zooms to Europe. Navigate calendar to next month — map markers update to show only that month's events. Pan the map to show only Germany — optionally the calendar filters to German events. Apply a "Workshop" category filter — all three panels update. Click "Reset filters" — all filters cleared.

**Acceptance Scenarios**:

1. **Given** a location is selected in the tree, **When** the selection changes, **Then** the calendar filters to that location's events and the map viewport adjusts to show that area.
2. **Given** the calendar date range changes, **When** the user navigates to a different month, **Then** the map updates to show only markers for events in that date range.
3. **Given** the user pans or zooms the map, **When** a "sync map to list" option is enabled, **Then** the calendar/list filters to show only events within the visible map bounds.
4. **Given** a filter is applied (category, skill level, or status), **When** the filter state changes, **Then** all three panels reflect the updated filter simultaneously.
5. **Given** any combination of filters is active, **When** the URL is inspected, **Then** all filter state is encoded as URL search parameters and the page can be bookmarked/shared.
6. **Given** one or more filters are active, **When** the user clicks "Reset filters", **Then** all filters (location, dates, categories) are cleared and all panels show unfiltered data.

---

### User Story 5a - Event Count Toggles (Priority: P2)

Each visual panel (map, calendar, filters) has an independent "#" toggle button that controls whether event count numbers are displayed within that panel. The toggle state is persisted in localStorage as a user preference so it survives page reloads. Map toggles count labels on bubbles/clusters; calendar toggles count bubbles next to date numbers; filters toggle count numbers next to category labels.

**Why this priority**: Count numbers add information density but can feel cluttered for users who prefer a cleaner view. Independent toggles per panel give users control over their preferred information density.

**Independent Test**: Click the "#" button on the map panel — count labels disappear from bubbles. Reload the page — toggle state persists. Toggle calendar counts off — date count bubbles disappear but map counts are unaffected. Toggle filter counts — category count numbers appear/disappear next to labels.

**Acceptance Scenarios**:

1. **Given** the map panel renders, **When** the user clicks the "#" toggle button, **Then** event count labels on map bubbles/clusters are shown or hidden.
2. **Given** the calendar panel renders, **When** the user clicks the "#" toggle button, **Then** event count bubbles next to date numbers are shown or hidden.
3. **Given** the filter panel renders, **When** the user clicks the "#" toggle button, **Then** event count numbers next to category labels are shown or hidden.
4. **Given** a toggle has been changed, **When** the page is reloaded, **Then** the toggle state is restored from localStorage.
5. **Given** one panel's count toggle is off, **When** another panel's toggle is on, **Then** the toggles operate independently.

---

### User Story 5b - City-Level Event List (Priority: P2)

When a user drills down to city level in the location tree (either by clicking a city node or zooming the map to city level), the left navigation panel expands to display a list of individual events in that city below the tree. Each event in the list shows a category color dot, event title, date, and venue name. This provides an event-level detail view directly in the sidebar without leaving the Explorer.

**Why this priority**: When users drill to a specific city, they want to see what events are there. Showing events directly in the sidebar eliminates the need to cross-reference the calendar or map markers.

**Independent Test**: Click a city in the location tree — below the tree, a bordered section appears with the heading "Events in {City Name}" listing all events in that city. Each event shows a color dot, title, date, and venue. Click a country or continent — the event list disappears.

**Acceptance Scenarios**:

1. **Given** a city is selected in the location tree, **When** the location panel renders, **Then** a list of events in that city appears below the tree hierarchy.
2. **Given** the city event list is visible, **When** events exist, **Then** each event displays a category color dot, event title, formatted date, and venue name.
3. **Given** the city event list is visible, **When** no events match the current filters, **Then** a "No events found" message is displayed.
4. **Given** a non-city node (country or continent) is selected, **When** the location panel renders, **Then** no event list is shown.

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

- **FR-001**: System MUST display events in a compact month calendar view with event count bubbles next to date numbers, prev/next month navigation, today underline, and day selection highlighting.
- **FR-002**: System MUST color-code events by category using the defined category-color mapping (Jam = Indigo, Workshop = Emerald, Class = Blue, Festival = Pink, Social = Amber, Retreat = Purple, Teacher Training = Teal).
- **FR-003**: System MUST display recurring events with a visual recurrence indicator and multi-day events spanning across their full date range.
- **FR-004**: System MUST render an interactive 3-level hierarchical map with globe (country bubbles), country (city bubbles), and city (individual markers) levels.
- **FR-005**: System MUST implement zoom-level snapping with hysteresis thresholds (up: 5, 10; down: 3, 8) to prevent flickering between levels, with count-sized bubbles at globe/country levels and proximity-based clustering at city level.
- **FR-006**: System MUST display location name in a hover popup on map bubbles and show event summary (name, date, category, location) when an individual city-level marker is clicked.
- **FR-007**: System MUST display a hierarchical location tree showing Continent → Country → City with event counts at each level.
- **FR-008**: System MUST filter the calendar and map when a location tree node is selected, and zoom the map to the selected area using flyTo for city nodes and flyToBounds for larger areas.
- **FR-009**: System MUST support search/filter within the location tree to find specific locations.
- **FR-010**: System MUST synchronize filters across all three panels — applying a filter in any panel updates the other two.
- **FR-011**: System MUST encode all filter state (categories, location, date range) in URL search parameters for bookmarkability.
- **FR-012**: System MUST display a category legend bar that also functions as quick filter toggles, with optional event count numbers next to each category label.
- **FR-013**: System MUST adapt layout responsively — sidebar + content on desktop (≥1024px), stacked with collapsed tree on tablet (768–1023px), single panel with tab navigation (Calendar/Map/Filters) on mobile (<768px).
- **FR-014**: System MUST navigate to the event detail page when an event is clicked in any panel.
- **FR-015**: System MUST use the existing events API endpoint with its query filter capabilities.
- **FR-016**: System MUST support all user-facing strings as i18n-extractable.
- **FR-017**: System MUST be fully keyboard navigable and meet WCAG 2.1 AA accessibility requirements.
- **FR-018**: System MUST use design tokens exclusively for all colors and spacing values.
- **FR-019**: System MUST provide date range quick pick buttons: "This week", "This weekend", "This month", "Next 30 days".
- **FR-020**: ~~System MUST provide a "Near me" geolocation button~~ — **Deferred to future iteration**.
- **FR-021**: ~~System MUST gracefully handle geolocation denial~~ — **Deferred with FR-020**.
- **FR-022**: ~~System MUST provide an optional event density heatmap overlay~~ — **Deferred to future iteration**.
- **FR-023**: System MUST lazy-load the map library to keep initial JS bundle within budget.
- **FR-024**: System MUST display an appropriate empty state when no events match the active filters.
- **FR-025**: System MUST handle events without geographic coordinates by showing them in calendar but excluding them from the map.
- **FR-026**: System MUST provide independent event count toggle buttons ("#") for map, calendar, and filter panels, persisted in localStorage as user preferences.
- **FR-027**: System MUST display a city-level event list in the location tree panel when a city node is selected, showing category dot, title, date, and venue for each event.
- **FR-028**: System MUST provide a "Reset filters" button that clears all active filters (location, dates, categories) when visible.

### Key Entities

- **Event**: The primary entity displayed in all panels — has a name, date(s), category, location, recurrence pattern, and geographic coordinates. Represented by the existing `EventSummary` type.
- **City**: A geographic location with a name and coordinates, organized within a Country and Continent hierarchy. Represented by the existing `City` type.
- **Location Hierarchy**: The Continent → Country → City tree structure, with computed event counts at each level. Derived from City data and event locations.
- **Event Category**: One of seven defined types (Jam, Workshop, Class, Festival, Social, Retreat, Teacher Training), each mapped to a specific color from the design token system.
- **Filter State**: The combination of active category filters, selected location, date range, view mode, and any other filter parameters. Persisted in URL search parameters.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find and click an event in a specific city within 15 seconds using either the location tree or the map.
- **SC-002**: ~~Users can switch between all four calendar views~~ — Calendar uses a compact month-only view; the metric now applies to month navigation speed (< 1 second).
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
