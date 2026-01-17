# Feature Specification: Unlockables System

**Feature Branch**: `005-unlockables`
**Created**: 2026-01-17
**Status**: Draft
**Input**: User description: "Make frontend have unlockables, so trains/drones should be locked, faded + a padlock on them until unlocked. Fetch from endpoint, with frontend mapping of what milestones unlock what features."

## Clarifications

### Session 2026-01-17

- Q: What should happen when a user clicks on a locked navigation item? → A: Navigate to locked page showing a large padlock icon and hint text describing what is required to unlock the feature.
- Q: How should the system match milestones in feature lock mapping to schematics data? → A: Match by milestone Name (e.g., "Monorail Train Technology") for human-readable, maintainable configuration.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Locked Feature Visibility (Priority: P1)

A user opens the dashboard in the early game before they have unlocked trains and drones. They can see the trains and drones navigation items in the sidebar, but these items appear visually distinct (faded/grayed out with a padlock icon) to indicate they are locked features. This gives users awareness of upcoming features without misleading them into thinking the features are currently available.

**Why this priority**: Core feature visibility - users need immediate visual feedback about what's available vs locked to avoid confusion and frustration.

**Independent Test**: Navigate to dashboard before unlocking Monorail Train Technology milestone - trains navigation item should appear locked with padlock icon and faded styling.

**Acceptance Scenarios**:

1. **Given** a user has not purchased "Monorail Train Technology" milestone, **When** they view the sidebar navigation, **Then** the Trains menu item appears faded with a padlock icon overlay.
2. **Given** a user has not purchased "Aeronautical Engineering" milestone, **When** they view the sidebar navigation, **Then** the Drones menu item appears faded with a padlock icon overlay.
3. **Given** a user has purchased both milestones, **When** they view the sidebar navigation, **Then** both Trains and Drones menu items appear normal without any locked indicators.

---

### User Story 2 - Locked Page Access Prevention (Priority: P1)

A user attempts to access a locked feature page directly (via URL or by clicking the locked navigation item). The system prevents full access to the page content and displays a clear locked state that explains which milestone needs to be unlocked and what tier it belongs to.

**Why this priority**: Prevents users from accessing non-functional pages and provides clear guidance on how to unlock the feature.

**Independent Test**: Navigate directly to /trains URL before unlocking the milestone - page should show locked state with unlock requirement information.

**Acceptance Scenarios**:

1. **Given** the Trains feature is locked, **When** a user navigates to the trains page, **Then** they see a locked state screen showing "Monorail Train Technology (Tier 6)" as the requirement.
2. **Given** the Drones feature is locked, **When** a user navigates to the drones page, **Then** they see a locked state screen showing "Aeronautical Engineering (Tier 8)" as the requirement.
3. **Given** a feature is locked, **When** viewing the locked state screen, **Then** the screen clearly indicates the milestone name and tier required to unlock it.

---

### User Story 3 - Real-time Unlock Updates (Priority: P2)

A user is viewing the dashboard while actively playing Satisfactory. When they purchase a milestone in-game that unlocks a feature, the dashboard updates to reflect the newly unlocked state without requiring a page refresh.

**Why this priority**: Enhances user experience by keeping dashboard in sync with game state, but users can work around this by manually refreshing.

**Independent Test**: With dashboard open, purchase "Monorail Train Technology" in-game - trains navigation and page should update to unlocked state automatically.

**Acceptance Scenarios**:

1. **Given** a user has the Trains feature locked and the dashboard open, **When** they purchase "Monorail Train Technology" in-game, **Then** the Trains navigation item transitions from locked to unlocked appearance.
2. **Given** a user is on the locked Trains page, **When** they purchase "Monorail Train Technology" in-game, **Then** the page content transitions from locked state to full functional view.

---

### User Story 4 - Configurable Feature Locks (Priority: P3)

New lockable features can be added to the system by defining a mapping configuration that specifies which milestone unlocks each feature. The mapping includes the milestone name, tier, and associated navigation/page routes.

**Why this priority**: Provides maintainability and extensibility for future lockable features, but initial implementation can work with hardcoded values.

**Independent Test**: Add a new entry to the unlock mapping configuration - the corresponding page should respect the lock state without code changes.

**Acceptance Scenarios**:

1. **Given** a feature mapping configuration exists, **When** a developer adds a new lockable feature entry, **Then** that feature respects the lock state based on the specified milestone.
2. **Given** a milestone is specified in the mapping, **When** the system checks unlock status, **Then** it queries the schematics data for that milestone's purchased status.

---

### Edge Cases

- What happens when the schematics endpoint is unavailable? System should treat features as unlocked to avoid blocking users.
- What happens when a milestone name in the mapping doesn't match any schematic? Feature should be treated as unlocked with a warning logged.
- How does the system handle partial data where some schematics are missing? Features with missing milestone data should be treated as unlocked.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch schematic/milestone data from the game to determine unlock status.
- **FR-002**: System MUST display locked navigation items with a faded appearance and padlock icon overlay.
- **FR-003**: System MUST allow navigation to locked feature pages but display a locked state screen instead of functional content.
- **FR-004**: Locked state screen MUST display a large padlock icon and hint text showing the required milestone name and tier number.
- **FR-005**: System MUST maintain a mapping configuration that defines which milestone unlocks each feature.
- **FR-006**: System MUST update unlock status when new schematic data is received via SSE events.
- **FR-007**: System MUST treat features as unlocked when schematic data is unavailable or incomplete (fail-open behavior).
- **FR-008**: Trains feature MUST be locked until "Monorail Train Technology" milestone (Tier 6) is purchased.
- **FR-009**: Drones feature MUST be locked until "Aeronautical Engineering" milestone (Tier 8) is purchased.

### Key Entities

- **Schematic**: Represents a game milestone/technology with properties including ID, Name, Tier (TechTier in API), Type, and Purchased status.
- **Feature Lock Mapping**: Configuration that associates dashboard features (navigation routes) with their required milestone names and tiers. Matching is performed by milestone Name for human-readable configuration.
- **Unlock Status**: Derived state for each feature indicating whether it is currently accessible based on schematic data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can distinguish locked from unlocked features within 1 second of viewing the navigation.
- **SC-002**: All locked features display their unlock requirement information accurately (milestone name and tier).
- **SC-003**: Unlock status updates are reflected in the UI within 5 seconds of receiving new schematic data.
- **SC-004**: System correctly identifies lock status for 100% of configured features when schematic data is available.
- **SC-005**: Adding a new lockable feature requires only configuration changes, no code modifications to core lock logic.
