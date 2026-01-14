# Feature Specification: Migrate from MUI to shadcn + Tailwind v4

**Feature Branch**: `003-shadcn-migration`
**Created**: 2026-01-14
**Status**: Draft
**Input**: User description: "Convert this project's style to use shadcn + Tailwind v4. Replace all existing MUI components and styling with shadcn components and custom components built with shadcn + Tailwind v4. Change the color scheme from purple+blueish to a much darker look with shades of grey."

## Clarifications

### Session 2026-01-14

- Q: What migration strategy should be used (incremental coexistence vs big bang)? → A: Big bang - Remove all MUI first, then rebuild everything with shadcn
- Q: Should light mode remain available or dark-only? → A: Dark default with toggle - Keep ability to switch to light mode

## Design Inspiration

Reference screenshots are available in `/tmpfiles/` folder:
- `gitlab-sidebar.png` - GitLab sidebar navigation with dark theme, clean hierarchy
- `gitlab-main.png` - GitLab main dashboard with dark background, card-based layout
- `chatgpt.png` - ChatGPT sidebar with minimalist dark theme, simple icons
- `claude-ai.png` - Claude.ai settings menu with dark grey tones, clean typography

**Key visual characteristics to emulate**:
- Deep dark backgrounds (#1a1a1a to #2d2d2d range)
- Subtle grey text hierarchy (not pure white)
- Minimal accent colors (reserved for interactive elements)
- Clean, spacious layouts with generous padding
- Subtle borders and separators (low contrast)
- Monochromatic icon styling

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Core Navigation Experience (Priority: P1)

As a user, I can navigate through all pages of the Satisfactory Dashboard using the new shadcn-based navigation sidebar and header, experiencing a consistent dark theme throughout.

**Why this priority**: Navigation is the foundation of the application. Without working navigation, users cannot access any features. This must work first before any page content migration.

**Independent Test**: Can be fully tested by loading the app and clicking through all navigation items (Home, Map, Production, Power, Trains, Drones, Players, Settings, Debug). Delivers a functional application shell.

**Acceptance Scenarios**:

1. **Given** the application loads, **When** I view the sidebar, **Then** I see all navigation items with shadcn-styled components in a dark grey theme
2. **Given** I am on any page, **When** I click a navigation item, **Then** the page changes and the active item is visually highlighted
3. **Given** I am using the app, **When** I view the header/app bar, **Then** session selector, logout button, and version display render correctly with shadcn components

---

### User Story 2 - Dashboard Home Page (Priority: P2)

As a user, I can view the dashboard home page with all overview widgets, charts, and statistics displayed using shadcn components and the new dark theme.

**Why this priority**: The home page is the primary landing experience and showcases the most complex component compositions (cards, charts, timelines). Completing this validates the migration approach for data-heavy pages.

**Independent Test**: Can be tested by loading the home page and verifying all widgets display data correctly. Delivers the main dashboard view.

**Acceptance Scenarios**:

1. **Given** I am on the home page, **When** widgets load, **Then** I see factory stats, production stats, power stats, and sink stats in shadcn Card components
2. **Given** the page loads, **When** charts render, **Then** bar charts and pie charts display correctly (using recharts or compatible charting solution)
3. **Given** I view the timeline section, **When** data loads, **Then** the timeline displays with proper dark theme styling

---

### User Story 3 - Interactive Map Page (Priority: P3)

As a user, I can use the interactive Leaflet map with all overlays (drone routes, train routes, vehicle paths) using shadcn-styled controls and popups.

**Why this priority**: The map is a core feature but requires specialized Leaflet integration. Map controls and popups need custom shadcn styling while preserving Leaflet functionality.

**Independent Test**: Can be tested by loading the map, toggling overlay controls, and clicking on map markers. Delivers the interactive map experience.

**Acceptance Scenarios**:

1. **Given** I am on the map page, **When** the map loads, **Then** the map container and controls display with dark theme styling
2. **Given** map overlays are available, **When** I toggle an overlay control, **Then** the control uses shadcn Switch/Checkbox components
3. **Given** I click a map marker, **When** the popup opens, **Then** popup content uses shadcn typography and card styling

---

### User Story 4 - Data Display Pages (Priority: P4)

As a user, I can view Production, Power, Trains, Drones, and Players pages with all data tables, lists, and visualizations using shadcn components.

**Why this priority**: These pages share common patterns (tables, lists, cards with data). Migrating them validates the component library completeness for data display.

**Independent Test**: Can be tested by navigating to each data page and verifying content renders. Delivers all secondary data views.

**Acceptance Scenarios**:

1. **Given** I am on the Production page, **When** data loads, **Then** production items display in shadcn-styled cards or tables
2. **Given** I am on the Power page, **When** circuit data loads, **Then** power gauges and circuit cards render with dark theme
3. **Given** I am on Trains/Drones pages, **When** vehicle lists load, **Then** items display with status indicators using shadcn Badge components
4. **Given** I am on Players page, **When** player data loads, **Then** player cards show avatar, name, and stats

---

### User Story 5 - Forms and Settings (Priority: P5)

As a user, I can interact with all forms including login, session management dialogs, and settings page using shadcn form components.

**Why this priority**: Forms are critical for user interaction but are fewer in number. Settings and dialogs complete the application experience.

**Independent Test**: Can be tested by opening login page, session dialogs, and settings page. Delivers all user input functionality.

**Acceptance Scenarios**:

1. **Given** I am on the login page, **When** the form renders, **Then** I see shadcn Input, Button, and form layout components
2. **Given** I click "Create Session", **When** the dialog opens, **Then** the dialog uses shadcn Dialog component with form inputs
3. **Given** I am on settings page, **When** I view options, **Then** settings use shadcn Select, Switch, and form components

---

### User Story 6 - Loading and Error States (Priority: P6)

As a user, I see appropriate loading indicators and error messages using shadcn components throughout the application.

**Why this priority**: Polish and UX completion. Loading and error states should feel consistent with the rest of the redesigned application.

**Independent Test**: Can be tested by simulating slow connections and error responses. Delivers complete UX for edge cases.

**Acceptance Scenarios**:

1. **Given** data is loading, **When** I view any page, **Then** I see shadcn Skeleton or Spinner components
2. **Given** an error occurs, **When** the error displays, **Then** I see shadcn Alert component with appropriate styling
3. **Given** a notification triggers, **When** it appears, **Then** I see a Sonner toast notification (shadcn's toast solution)

---

### Edge Cases

- What happens when a component has no direct shadcn equivalent? Custom components are built using Tailwind v4 utilities following shadcn patterns.
- How does the system handle MUI X-Charts? Charts migrate to recharts (shadcn-compatible) or a Tailwind-styled charting solution.
- What happens to MUI Lab Timeline components? Custom timeline component built with shadcn patterns and Tailwind.
- How are MUI icons handled? Migrate to lucide-react (shadcn default) or maintain @iconify/react with updated styling.
- What happens to existing theme CSS variables? New CSS variable system using shadcn's OKLCH color format with dark theme as default.

## Requirements *(mandatory)*

### Functional Requirements

**Installation & Configuration**
- **FR-001**: System MUST use Tailwind CSS v4 with @tailwindcss/vite plugin
- **FR-002**: System MUST have shadcn/ui initialized with components.json configuration
- **FR-003**: System MUST use the "new-york" style consistently across all shadcn components
- **FR-004**: System MUST have CSS variables configured using OKLCH color format for theming
- **FR-005**: System MUST have path aliases configured (@/ pointing to src/)

**Theme & Styling**
- **FR-006**: System MUST default to dark mode using shadcn's theme provider pattern
- **FR-006a**: System MUST provide a theme toggle allowing users to switch between dark and light modes
- **FR-007**: System MUST use a monochromatic grey color palette (no purple/blue tints) for dark mode; light mode uses corresponding light grey tones
- **FR-008**: System MUST preserve responsive design across all breakpoints (mobile, tablet, desktop)
- **FR-009**: System MUST maintain consistent spacing and typography hierarchy

**Component Migration**
- **FR-010**: System MUST replace all MUI Box components with Tailwind div/semantic elements
- **FR-011**: System MUST replace all MUI Button components with shadcn Button
- **FR-012**: System MUST replace all MUI Card/Paper components with shadcn Card
- **FR-013**: System MUST replace all MUI Dialog components with shadcn Dialog
- **FR-014**: System MUST replace all MUI TextField/Input components with shadcn Input
- **FR-015**: System MUST replace all MUI Select components with shadcn Select
- **FR-016**: System MUST replace all MUI Checkbox/Radio components with shadcn equivalents
- **FR-017**: System MUST replace all MUI Typography with Tailwind typography utilities
- **FR-018**: System MUST replace all MUI Table components with shadcn Table
- **FR-019**: System MUST replace all MUI Tooltip components with shadcn Tooltip
- **FR-020**: System MUST replace all MUI Menu/Dropdown components with shadcn DropdownMenu
- **FR-021**: System MUST replace all MUI Drawer components with shadcn Sheet or Sidebar
- **FR-022**: System MUST replace all MUI Alert/Snackbar with shadcn Alert and Sonner
- **FR-023**: System MUST replace all MUI Progress components with shadcn Progress or Spinner
- **FR-024**: System MUST replace all MUI Tabs components with shadcn Tabs
- **FR-025**: System MUST replace all MUI Badge components with shadcn Badge
- **FR-026**: System MUST replace all MUI Skeleton components with shadcn Skeleton
- **FR-027**: System MUST replace all MUI Slider components with shadcn Slider
- **FR-028**: System MUST replace MUI Grid2 with CSS Grid/Flexbox via Tailwind utilities
- **FR-029**: System MUST replace MUI Stack with Flexbox via Tailwind utilities

**Custom Components**
- **FR-030**: System MUST create custom Timeline component using shadcn patterns (no MUI Lab)
- **FR-031**: System MUST create custom Gauge component or integrate react-gauge-component with Tailwind styling
- **FR-032**: System MUST migrate or rebuild Label component using Tailwind classes
- **FR-033**: System MUST create custom Scrollbar wrapper if needed (or use native styling)

**Charts & Visualization**
- **FR-034**: System MUST use recharts (shadcn-compatible) for bar charts, pie charts, and sparklines
- **FR-035**: System MUST style chart components to match dark theme

**Cleanup**
- **FR-036**: System MUST remove all @mui/* packages from package.json after migration
- **FR-037**: System MUST remove all @emotion/* packages from package.json after migration
- **FR-038**: System MUST remove all MUI-related theme files after migration
- **FR-039**: System MUST have zero imports from @mui/* in any source file

### Key Entities

- **Theme Configuration**: CSS variables defining colors, spacing, typography, and shadows for the application
- **Component Library**: Collection of shadcn UI components installed in src/components/ui/
- **Layout Components**: Sidebar, Header, and page wrapper components defining application structure
- **Page Components**: Individual page views (Home, Map, Production, Power, etc.)
- **Section Components**: Reusable feature-specific components within pages

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero imports from @mui/* packages exist in the codebase (grep returns no results)
- **SC-002**: Zero @mui/* or @emotion/* packages exist in package.json dependencies
- **SC-003**: All 12 page components render without errors in the browser
- **SC-004**: All navigation items are clickable and route to correct pages
- **SC-005**: The application uses dark mode by default with grey-scale color palette
- **SC-006**: All interactive elements (buttons, inputs, selects) are functional
- **SC-007**: All data visualizations (charts, gauges, timelines) display data correctly
- **SC-008**: The application maintains responsive behavior on viewport widths from 320px to 1920px+
- **SC-009**: Page load performance remains comparable (no significant regression in initial load time)
- **SC-010**: Build process completes successfully with no TypeScript errors

## Assumptions

- Migration follows "big bang" strategy: all MUI dependencies removed upfront, then full rebuild with shadcn (application will be non-functional during migration until rebuilt)
- The existing recharts library can be retained and styled for dark theme compatibility
- The Leaflet map library integration will be preserved (only styling changes to controls/popups)
- @iconify/react will continue to be used for icons (lucide-react migration is optional)
- react-gauge-component will be styled with Tailwind to match the dark theme
- The shadcn MCP server is available for component discovery and installation
- No functional changes to the backend API are required for this migration
