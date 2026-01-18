# Feature Specification: Data History Persistence

**Feature Branch**: `006-data-history-persistence`
**Created**: 2026-01-17
**Status**: Draft
**Input**: User description: "Better data fetching with persistence of historical data per session per savename, using game time offsets as data IDs for client history retrieval and SSE delta updates"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Historical Factory Statistics (Priority: P1)

As a dashboard user, I want to see historical data (production stats, power usage, etc.) so that I can analyze trends over time and calculate averages, peaks, and other metrics to optimize my factory.

**Why this priority**: Historical data is the core value proposition - without it, users cannot analyze trends or compute meaningful statistics. This is the foundation that enables all other features.

**Independent Test**: Can be fully tested by loading a session, waiting for data collection, then viewing accumulated data points with their timestamps. Delivers value by allowing users to see how metrics change over time.

**Acceptance Scenarios**:

1. **Given** a session connected to a Satisfactory server, **When** data is fetched from the game, **Then** each data point is stored with a game-time identifier derived from TotalPlayerDuration
2. **Given** stored historical data, **When** a user requests history for a data type, **Then** the system returns all stored data points with their game-time identifiers
3. **Given** a session with accumulated data, **When** the user switches to a different save file and back, **Then** the historical data for each save is preserved separately and accessible

---

### User Story 2 - Receive Incremental Data Updates via SSE (Priority: P1)

As a dashboard user, I want to receive only new data points through the real-time connection so that I don't receive duplicate data and can efficiently maintain my local data state.

**Why this priority**: Co-equal with P1 Story 1 because clients need a reliable mechanism to receive updates without duplicates. The incremental ID system is essential for the frontend to function correctly with historical data.

**Independent Test**: Can be fully tested by connecting to SSE stream, requesting data with a "last known ID", and verifying only newer data points are received. Delivers value by enabling efficient real-time updates without data duplication.

**Acceptance Scenarios**:

1. **Given** a client with existing data up to ID N, **When** the client subscribes to SSE updates specifying ID N, **Then** the client receives only data points with ID greater than N
2. **Given** multiple data points collected, **When** fetching initial data via REST endpoint, **Then** each data chunk includes an incremental ID that the client can use to track its position
3. **Given** a reconnecting client, **When** the client provides its last known data ID, **Then** the system efficiently returns only the missing data points

---

### User Story 3 - Configure Data Retention Limits (Priority: P2)

As a system administrator, I want to configure maximum data retention limits so that storage usage remains bounded and predictable across sessions.

**Why this priority**: Important for production deployments but not critical for core functionality. Users need historical data to work before worrying about limiting it.

**Independent Test**: Can be fully tested by setting a retention limit, generating data beyond that limit, and verifying old data is pruned. Delivers value by preventing unbounded storage growth.

**Acceptance Scenarios**:

1. **Given** a configured maximum item limit, **When** data exceeds this limit, **Then** the oldest data points are removed to maintain the limit
2. **Given** retention limits in settings, **When** a session stores data, **Then** each session respects its configured retention limit independently

---

### User Story 4 - Handle Save File Time Discontinuities (Priority: P3)

As a user who loads older saves or rolls back, I want the system to handle time discontinuities gracefully so that my data timeline remains coherent even when game time jumps backward.

**Why this priority**: Edge case handling that improves robustness. Most users will have linear time progression; this handles the exceptional cases.

**Independent Test**: Can be fully tested by loading an older save (time jumps backward), collecting new data, and verifying the "future" data is properly overwritten. Delivers value by ensuring data integrity during save rollbacks.

**Acceptance Scenarios**:

1. **Given** stored data up to game time T, **When** a save from time T-X is loaded (time goes backward), **Then** new data collected from time T-X overwrites any "future" data as the timeline progresses
2. **Given** a time discontinuity event, **When** the system detects time has moved backward, **Then** the system logs the event and continues collecting data at the new timeline position

---

### Edge Cases

- What happens when the game server is unreachable during a data fetch? (System should skip that fetch cycle and continue on next interval)
- What happens when TotalPlayerDuration returns unexpected values (negative, zero, or null)? (System should reject invalid values and use previous known good offset)
- How does system handle extremely rapid polling that generates many data points per second? (Data points should still maintain correct ordering via the game-time identifier)
- What happens when multiple API instances are running? (Each instance should independently calculate game-time offsets from its local cache)
- What happens when storage approaches the retention limit during high-frequency data collection? (Pruning should happen atomically to prevent data corruption)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST store fetched data per session and per save name, allowing historical data to persist when switching between save files
- **FR-002**: System MUST assign a game-time identifier to each data point derived from TotalPlayerDuration (offset + elapsed time calculation)
- **FR-003**: System MUST cache the TotalPlayerDuration offset locally (OffsetSeconds, ProbedAt tuple) before fetching any data that requires timestamps
- **FR-004**: System MUST calculate current game time as: `OffsetSeconds + seconds(now - ProbedAt)` for any data point being stored
- **FR-005**: System MUST provide a REST endpoint to fetch historical data chunks with incremental IDs
- **FR-006**: System MUST support SSE updates that only send data points with IDs greater than a client-specified threshold
- **FR-007**: System MUST enforce data retention limits based on game-time duration, configured via SD_MAX_SAMPLE_GAME_DURATION environment variable (required configuration, no default)
- **FR-008**: System MUST prune data points older than the configured game-time duration when limits are exceeded
- **FR-009**: System MUST handle time discontinuities (save rollbacks) by overwriting "future" data points as new data arrives at earlier timestamps
- **FR-010**: System MUST persist historical data across API restarts (not just in-memory storage)

### Key Entities

- **DataPoint**: A single measurement at a point in game time. Contains: game-time identifier, data type, payload, session ID, save name
- **GameTimeOffset**: The cached reference point for calculating game time. Contains: OffsetSeconds (from TotalPlayerDuration), ProbedAt (wall-clock timestamp when offset was captured)
- **DataHistory**: Collection of DataPoints for a specific session and save name combination, with retention limit enforcement
- **HistoryChunk**: A batch of DataPoints returned to clients, includes: data points array, latest ID for tracking position

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can retrieve historical data up to the configured SD_MAX_SAMPLE_GAME_DURATION for trend analysis
- **SC-002**: Clients receiving SSE updates experience no duplicate data points when using the incremental ID tracking mechanism
- **SC-003**: Frontend can calculate rolling averages and trends from historical data with per-second granularity based on game time
- **SC-004**: System maintains data integrity during save file switches - 100% of historical data remains accessible when returning to a previously used save
- **SC-005**: Storage usage remains bounded and predictable, never exceeding configured retention limits by more than one polling cycle's worth of data
- **SC-006**: Time discontinuity handling preserves timeline coherence - after a save rollback, data timeline shows no gaps or duplicates at the rollback point

## Clarifications

### Session 2026-01-17

- Q: Which data types require history storage? → A: Time-series only: circuits, generatorStats, prodStats, factoryStats, sinkStats
- Q: Game-time ID precision? → A: Seconds (integer) - game data isn't more precise anyway
- Q: Default retention limit? → A: No default; require explicit config via SD_MAX_SAMPLE_GAME_DURATION env var (duration in game-time)

## Assumptions

- TotalPlayerDuration from the game API returns a stable, monotonically increasing value during normal gameplay
- Game server time progression is approximately 1:1 with real-world time (1 game second = 1 real second)
- Retention limit configured via SD_MAX_SAMPLE_GAME_DURATION environment variable (game-time duration); application fails to start if not set
- Redis is available for persistent storage (based on existing project infrastructure)
- The incremental ID is represented as game-time offset in seconds (integer) - matches game data precision
- Data types that support history: circuits, generatorStats, prodStats, factoryStats, sinkStats (time-series data only; static/semi-static data like drones, trains, players excluded)
