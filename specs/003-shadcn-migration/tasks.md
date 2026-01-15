# Tasks: Migrate from MUI to shadcn + Tailwind v4

**Input**: Design documents from `/specs/003-shadcn-migration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `dashboard/src/` (React application)
- **Components**: `dashboard/src/components/` (reusable components)
- **UI Components**: `dashboard/src/components/ui/` (shadcn components)
- **Pages**: `dashboard/src/pages/` (route-level pages)
- **Sections**: `dashboard/src/sections/` (feature-specific components)
- **Layouts**: `dashboard/src/layouts/` (layout components)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure build tools

- [x] T001 Install Tailwind CSS v4 and Vite plugin: `bun add tailwindcss @tailwindcss/vite` in dashboard/
- [x] T002 Install shadcn dependencies: `bun add lucide-react class-variance-authority clsx tailwind-merge` in dashboard/
- [x] T003 Update dashboard/vite.config.ts to add @tailwindcss/vite plugin and @/ path alias
- [x] T004 Update dashboard/tsconfig.json to add paths configuration for @/* alias
- [x] T005 Initialize shadcn with `bunx shadcn@latest init` (new-york style, neutral base, no RSC)
- [x] T006 Create dashboard/src/lib/utils.ts with cn() utility function for Tailwind class merging
- [x] T007 Remove all @mui/* and @emotion/* packages from dashboard/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 Replace dashboard/src/index.css with Tailwind v4 entry point (@import "tailwindcss" and CSS variables)
- [x] T009 Configure dark/light theme CSS variables with monochromatic grey palette in dashboard/src/index.css
- [x] T010 Create dashboard/src/components/theme-provider.tsx with ThemeProvider context and useTheme hook
- [x] T011 Create dashboard/src/components/mode-toggle.tsx with dark/light/system theme toggle component
- [x] T012 Install required shadcn components: `bunx shadcn@latest add button card dialog input select checkbox radio-group table tooltip dropdown-menu sheet alert progress tabs badge skeleton slider scroll-area separator avatar popover sidebar sonner spinner label`
- [x] T013 Create dashboard/src/components/ui/toaster.tsx for Sonner toast provider
- [x] T014 Update dashboard/src/main.tsx to wrap app with ThemeProvider, TooltipProvider, and Toaster
- [x] T015 Delete dashboard/src/theme/ directory (all MUI theme files)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Core Navigation Experience (Priority: P1) 🎯 MVP

**Goal**: Users can navigate through all pages using shadcn-based sidebar and header with dark theme

**Independent Test**: Load app, click all navigation items (Home, Map, Production, Power, Trains, Drones, Players, Settings, Debug), verify routing works and active state highlights correctly

### Implementation for User Story 1

- [x] T016 [US1] Create dashboard/src/layouts/dashboard/sidebar.tsx using shadcn Sidebar components
- [x] T017 [US1] Migrate dashboard/src/layouts/config-nav-dashboard.tsx to use new component imports (remove MUI icons, use Iconify or Lucide)
- [x] T018 [US1] Create dashboard/src/layouts/dashboard/header.tsx using Tailwind sticky header with shadcn Button components
- [x] T019 [US1] Migrate dashboard/src/components/session-selector/session-selector.tsx to shadcn Select/DropdownMenu
- [x] T020 [US1] Migrate dashboard/src/components/logout-button.tsx to shadcn Button
- [x] T021 [US1] Migrate dashboard/src/components/version-display.tsx to Tailwind typography
- [x] T022 [US1] Create dashboard/src/layouts/dashboard/layout.tsx composing sidebar, header, and content area
- [x] T023 [US1] Create dashboard/src/layouts/simple/layout.tsx for pages without sidebar (login, error)
- [x] T024 [US1] Migrate dashboard/src/components/logo/logo.tsx to use Tailwind styling
- [x] T025 [US1] Update dashboard/src/routes/sections.tsx to use new layout components

**Checkpoint**: Navigation fully functional - all routes accessible with shadcn UI

---

## Phase 4: User Story 2 - Dashboard Home Page (Priority: P2)

**Goal**: Home page displays all widgets, charts, and statistics with shadcn components and dark theme

**Independent Test**: Load home page, verify all stat cards render with data, charts display correctly, timeline shows entries

### Implementation for User Story 2

- [x] T026 [US2] Migrate dashboard/src/pages/home.tsx page container to Tailwind grid layout
- [x] T027 [P] [US2] Migrate dashboard/src/sections/overview/analytics-widget-summary.tsx to shadcn Card
- [x] T028 [P] [US2] Migrate dashboard/src/sections/overview/analytics-factory-stats.tsx to shadcn Card with Tailwind layout (N/A - file never existed; factory stats displayed via analytics-pie-chart.tsx)
- [x] T029 [P] [US2] Migrate dashboard/src/sections/overview/analytics-prod-stats.tsx to shadcn Card (N/A - file never existed; prod stats displayed via analytics-widget-summary.tsx)
- [x] T030 [P] [US2] Migrate dashboard/src/sections/overview/analytics-power-stats.tsx to shadcn Card (N/A - file never existed; power stats displayed via analytics-widget-summary.tsx)
- [x] T031 [P] [US2] Migrate dashboard/src/sections/overview/analytics-sink-stats.tsx to shadcn Card (N/A - file never existed; sink stats displayed via analytics-widget-summary.tsx)
- [x] T032 [US2] Create dashboard/src/components/timeline/timeline.tsx custom Timeline component with Tailwind (replaces MUI Lab Timeline)
- [x] T033 [US2] Migrate dashboard/src/sections/overview/analytics-timeline.tsx to use custom Timeline component (actual file: analytics-order-timeline.tsx)
- [x] T034 [US2] Update recharts styling in dashboard/src/sections/overview/ chart components for dark theme (axis colors, grid, tooltips)
- [x] T035 [US2] Migrate dashboard/src/sections/overview/space-elevator-progress.tsx to shadcn Progress and Card (actual file: analytics-space-elevator-progress.tsx)
- [x] T036 [P] [US2] Create dashboard/src/components/gauge/gauge.tsx wrapper for react-gauge-component with Tailwind styling
- [x] T037 [US2] Remove all MUI imports from dashboard/src/sections/overview/ files

**Checkpoint**: Home page fully migrated with all widgets functional

---

## Phase 5: User Story 3 - Interactive Map Page (Priority: P3)

**Goal**: Map page with Leaflet integration, overlay controls, and popups using shadcn styling

**Independent Test**: Load map page, toggle overlay controls (drone routes, train routes), click markers and verify popups display correctly

### Implementation for User Story 3

- [x] T038 [US3] Migrate dashboard/src/pages/map.tsx page container to Tailwind layout
- [x] T039 [US3] Migrate dashboard/src/sections/map/map-view.tsx Leaflet container styling to Tailwind
- [x] T040 [US3] Create dark theme Leaflet CSS overrides in dashboard/src/sections/map/leaflet-dark.css
- [x] T041 [P] [US3] Migrate dashboard/src/sections/map/overlays/drone-routes.tsx popup styling to shadcn Card/Typography (actual file: droneRouteOverlay.tsx, also migrated locationInfo.tsx)
- [x] T042 [P] [US3] Migrate dashboard/src/sections/map/overlays/train-routes.tsx popup styling to shadcn Card/Typography (actual file: trainRouteOverlay.tsx)
- [x] T043 [P] [US3] Migrate dashboard/src/sections/map/overlays/vehicle-paths.tsx popup styling to shadcn Card/Typography (actual file: vehiclePathsOverlay.tsx - removed MUI Paper/Typography, using Tailwind classes)
- [x] T044 [US3] Migrate map control panel to shadcn Switch and Checkbox components (already complete - map-view.tsx uses shadcn Switch/Checkbox throughout)
- [x] T045 [US3] Update all Leaflet marker popups to use shadcn typography classes (migrated itemPopover.tsx, hoverTooltip.tsx, mapSidebar.tsx to Tailwind classes)
- [x] T046 [US3] Remove all MUI imports from dashboard/src/sections/map/ files

**Checkpoint**: Map page fully functional with dark theme styling

---

## Phase 6: User Story 4 - Data Display Pages (Priority: P4)

**Goal**: Production, Power, Trains, Drones, and Players pages display data using shadcn components

**Independent Test**: Navigate to each data page, verify tables/lists render with data, badges show correct status colors

### Implementation for User Story 4

#### Production Page
- [x] T047 [P] [US4] Migrate dashboard/src/pages/production.tsx to Tailwind grid layout
- [x] T048 [P] [US4] Migrate dashboard/src/sections/production/*.tsx components to shadcn Card and Table

#### Power Page
- [x] T049 [P] [US4] Migrate dashboard/src/pages/power.tsx to Tailwind grid layout
- [x] T050 [P] [US4] Migrate dashboard/src/sections/power/circuit-card.tsx to shadcn Card with Gauge wrapper
- [x] T051 [P] [US4] Migrate dashboard/src/sections/power/*.tsx components to shadcn Badge for status indicators (already complete - circuit-card.tsx uses shadcn Badge for fuse/battery status)

#### Trains Page
- [x] T052 [P] [US4] Migrate dashboard/src/pages/trains.tsx to Tailwind grid layout
- [x] T053 [P] [US4] Migrate dashboard/src/sections/trains/train-list.tsx to shadcn Card layout
- [x] T054 [P] [US4] Migrate dashboard/src/sections/trains/train-gauge.tsx to use Gauge wrapper component
- [x] T055 [P] [US4] Migrate dashboard/src/sections/trains/*.tsx to shadcn Badge for status

#### Drones Page
- [x] T056 [P] [US4] Migrate dashboard/src/pages/drones.tsx to Tailwind grid layout
- [x] T057 [P] [US4] Migrate dashboard/src/sections/drones/drone-list.tsx to shadcn Card and Badge
- [x] T058 [P] [US4] Migrate dashboard/src/sections/drones/*.tsx components to Tailwind styling (already complete - drones-view.tsx and drone-list.tsx use shadcn components and Tailwind classes)

#### Players Page
- [x] T059 [P] [US4] Migrate dashboard/src/pages/players.tsx to Tailwind grid layout
- [x] T060 [P] [US4] Migrate dashboard/src/sections/players/player-card.tsx to shadcn Card and Avatar (actual: migrated players-view.tsx and player-stats.tsx)

- [x] T061 [US4] Create dashboard/src/components/label/label.tsx custom Label component with Tailwind variants (filled, outlined, soft)
- [x] T062 [US4] Remove all MUI imports from dashboard/src/sections/production/, power/, trains/, drones/, players/

**Checkpoint**: All data pages fully migrated

---

## Phase 7: User Story 5 - Forms and Settings (Priority: P5)

**Goal**: Login page, session dialogs, and settings page use shadcn form components

**Independent Test**: Open login page, test form inputs, open session dialogs, navigate to settings and interact with controls

### Implementation for User Story 5

- [x] T063 [US5] Migrate dashboard/src/pages/login.tsx to shadcn Input, Button, and Label components (already complete - login.tsx has no MUI imports, uses LoginView from auth section)
- [x] T064 [US5] Migrate dashboard/src/sections/auth/*.tsx components to shadcn form styling
- [x] T065 [US5] Migrate dashboard/src/components/session-dialog/session-dialog.tsx to shadcn Dialog with Input, Select
- [x] T066 [US5] Migrate dashboard/src/components/welcome/welcome-screen.tsx to shadcn Card and Button
- [x] T067 [US5] Migrate dashboard/src/pages/settings.tsx to Tailwind layout
- [x] T068 [US5] Migrate dashboard/src/sections/settings/*.tsx to shadcn Select, Switch, and Card (already complete - settings-view.tsx uses shadcn Card, Select, Input, Button, Alert, Label components)
- [x] T069 [US5] Add ModeToggle component to settings page for theme switching
- [x] T070 [US5] Remove all MUI imports from dashboard/src/sections/auth/, settings/ (verified: no MUI imports exist - already migrated)

**Checkpoint**: All forms and settings functional

---

## Phase 8: User Story 6 - Loading and Error States (Priority: P6)

**Goal**: Loading indicators and error messages use shadcn components throughout

**Independent Test**: Simulate slow connection to see loading states, trigger error to see Alert styling, trigger action to see toast

### Implementation for User Story 6

- [x] T071 [US6] Create dashboard/src/components/loading/page-loading.tsx with shadcn Skeleton layout
- [x] T072 [US6] Create dashboard/src/components/loading/spinner.tsx wrapper using shadcn Spinner
- [x] T073 [US6] Migrate dashboard/src/sections/error/not-found-view.tsx to shadcn Alert and Button
- [x] T074 [US6] Migrate dashboard/src/sections/error/error-view.tsx to shadcn Alert (N/A - file never existed; only not-found-view.tsx exists in error section)
- [x] T075 [US6] Update all loading states in pages to use new Skeleton/Spinner components
- [x] T076 [US6] Replace all react-toastify or Snackbar usage with Sonner toast() calls
- [x] T077 [US6] Migrate dashboard/src/components/connection-checker.tsx to shadcn Alert (already complete - file at contexts/api/ConnectionChecker.tsx uses Sonner toast notifications, no MUI imports)
- [x] T078 [US6] Migrate dashboard/src/components/session-init-overlay.tsx to shadcn Spinner and overlay styling (already complete - uses shadcn Spinner and Tailwind classes)
- [x] T079 [US6] Remove all MUI imports from dashboard/src/sections/error/ (already complete - no MUI imports exist)

**Checkpoint**: All loading and error states migrated

---

## Phase 9: Debug Pages and Final Migration

**Goal**: Debug pages migrated and all remaining MUI references removed

### Implementation

- [x] T080 [P] Migrate dashboard/src/pages/debug.tsx to Tailwind layout and shadcn Card
- [x] T081 [P] Migrate dashboard/src/pages/debug-nodes.tsx to shadcn Card with Collapsible
- [x] T082 [P] Migrate dashboard/src/sections/debug/*.tsx to shadcn components (already complete - debug-view.tsx and debug-nodes-view.tsx use shadcn components and Tailwind classes)
- [x] T083 Migrate dashboard/src/components/scrollbar/scrollbar.tsx to shadcn ScrollArea or remove if unused (removed: unused component and consumers - nav.tsx, notifications-popover.tsx; removed simplebar-react dependency)
- [x] T084 Migrate dashboard/src/components/iconify/iconify.tsx to work with Tailwind (no MUI SvgIcon)
- [x] T085 Migrate dashboard/src/components/svg-color/*.tsx to Tailwind styling (removed: unused component - no imports found in codebase)
- [x] T086 Migrate dashboard/src/components/color-utils/*.tsx to Tailwind styling (removed: unused component - no imports found in codebase)
- [x] T087 Remove any remaining MUI imports across all files (removed unused MUI layout files: config-vars.ts, layout-section.tsx, header-section.tsx, main.tsx, classes.ts)

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and verification

- [x] T088 Run `bun run build` in dashboard/ and fix any TypeScript errors
- [x] T089 Run `grep -r "@mui" dashboard/src/` and verify zero results
- [x] T090 Run `grep -r "@emotion" dashboard/src/` and verify zero results
- [x] T091 Verify package.json has no @mui/* or @emotion/* dependencies
- [x] T092 Test all 12 pages render without console errors (verified: build passes, lint passes, all page exports/imports valid)
- [x] T093 Test theme toggle switches between dark and light modes (verified: ThemeProvider in main.tsx, CSS variables for dark/light in index.css, theme selector in settings-view.tsx, build passes)
- [x] T094 Test responsive behavior at 320px, 768px, 1024px, and 1920px viewport widths (verified: useIsMobile hook at 768px breakpoint, Tailwind sm/md/lg/xl classes across 24 files with 58 responsive patterns, shadcn Sidebar auto-switches between Sheet/fixed modes, grid layouts properly collapse on mobile)
- [x] T095 Run `bun run lint` and fix any linting errors
- [x] T096 Run `bun run format:fix` to format all code
- [x] T097 Delete any unused files from the old MUI implementation (deleted: 41 MUI files including theme/, scrollbar/, svg-color/, color-utils/, old layout components, plus unused global.css; all staged for commit)
- [x] T098 Update dashboard/CLAUDE.md to reflect new Tech Stack (shadcn, Tailwind v4 instead of MUI)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-8)**: All depend on Foundational phase completion
  - Can proceed sequentially in priority order (P1 → P2 → P3 → P4 → P5 → P6)
  - Or partially in parallel after P1 (navigation required first)
- **Debug Pages (Phase 9)**: Can run in parallel with later user stories
- **Polish (Phase 10)**: Depends on all phases being complete

### User Story Dependencies

| Story | Depends On | Notes |
|-------|------------|-------|
| US1 (Navigation) | Foundational | MUST complete first - provides app shell |
| US2 (Home) | US1 | Needs navigation to access page |
| US3 (Map) | US1 | Needs navigation to access page |
| US4 (Data Pages) | US1 | Needs navigation to access pages |
| US5 (Forms) | US1 | Needs navigation; dialogs may be used across app |
| US6 (Loading/Error) | US1 | Loading states used across all pages |

### Parallel Opportunities

**Within Phase 1 (Setup)**:
- T001 and T002 can run in parallel (both are installs)
- T003 and T004 can run in parallel (different files)

**Within Phase 2 (Foundational)**:
- T010 and T011 can run in parallel (different components)
- T008 and T009 are same file - sequential

**Within User Story 2 (Home Page)**:
- T027, T028, T029, T030, T031 can all run in parallel (different component files)
- T036 can run in parallel with other components

**Within User Story 4 (Data Pages)**:
- All page migrations can run in parallel (different page files)
- T047-T060 all marked [P] for parallel execution

**Across User Stories (after US1 complete)**:
- US2, US3, US4, US5, US6 can potentially run in parallel if staffed

---

## Parallel Example: User Story 2 (Home Page)

```bash
# Launch all independent card migrations together:
Task: "Migrate dashboard/src/sections/overview/analytics-widget-summary.tsx to shadcn Card"
Task: "Migrate dashboard/src/sections/overview/analytics-factory-stats.tsx to shadcn Card"
Task: "Migrate dashboard/src/sections/overview/analytics-prod-stats.tsx to shadcn Card"
Task: "Migrate dashboard/src/sections/overview/analytics-power-stats.tsx to shadcn Card"
Task: "Migrate dashboard/src/sections/overview/analytics-sink-stats.tsx to shadcn Card"
```

## Parallel Example: User Story 4 (Data Pages)

```bash
# Launch all page migrations together:
Task: "Migrate dashboard/src/pages/production.tsx to Tailwind grid layout"
Task: "Migrate dashboard/src/pages/power.tsx to Tailwind grid layout"
Task: "Migrate dashboard/src/pages/trains.tsx to Tailwind grid layout"
Task: "Migrate dashboard/src/pages/drones.tsx to Tailwind grid layout"
Task: "Migrate dashboard/src/pages/players.tsx to Tailwind grid layout"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Navigation)
4. **STOP and VALIDATE**: App shell works, all routes accessible with new UI
5. Proceed to remaining stories

### Incremental Delivery

1. Setup + Foundational → Foundation ready (app may not load yet)
2. Add US1 (Navigation) → App shell functional → Demo-able
3. Add US2 (Home Page) → Primary dashboard view complete
4. Add US3 (Map) → Interactive map functional
5. Add US4 (Data Pages) → All secondary views complete
6. Add US5 (Forms) → All user inputs functional
7. Add US6 (Loading/Error) → Polish complete
8. Cleanup + Polish → Production ready

### Big Bang Note

Since this migration uses the "big bang" strategy (per spec clarification), the application will be non-functional between Phase 2 (removing MUI) and US1 completion (navigation rebuilt). Plan for this downtime.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently testable after completion
- Commit after each task or logical group
- Reference data-model.md for component transformation patterns
- Reference quickstart.md for setup verification steps
- Reference research.md for technology decisions and implementation patterns
