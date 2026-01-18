# Quickstart: Data History Persistence

**Feature**: 006-data-history-persistence
**Date**: 2026-01-17

## Overview

This feature adds historical data storage for time-series metrics, enabling trend analysis and rolling averages in the dashboard.

## Required Configuration

Set the retention duration environment variable before starting the API:

```bash
# Required: Maximum history retention in game-time seconds
export SD_MAX_SAMPLE_GAME_DURATION=3600  # 1 hour of game time

# Optional examples:
# export SD_MAX_SAMPLE_GAME_DURATION=7200   # 2 hours
# export SD_MAX_SAMPLE_GAME_DURATION=86400  # 24 hours (1 day)
```

**Note**: The API will fail to start if `SD_MAX_SAMPLE_GAME_DURATION` is not set.

## Key Concepts

### Game-Time IDs

Data points are identified by game time (seconds), not wall-clock time. This is derived from the game's `TotalPlayDuration` value, ensuring:
- Consistent timeline even if real-world polling varies
- Correct behavior when loading older saves
- Meaningful time-based averages

### Per-Save History

History is stored separately for each save file. When you load a different save:
- New data goes to the new save's history
- Old save's history remains queryable
- No data mixing between saves

### Supported Data Types

Only time-series data is stored historically:
- `circuits` - Power circuit metrics
- `generatorStats` - Generator production data
- `prodStats` - Production statistics
- `factoryStats` - Factory efficiency metrics
- `sinkStats` - Awesome sink points

## API Usage

### Fetch History

```bash
# Get all history for production stats (current save)
curl "http://localhost:8081/v1/sessions/{sessionId}/history/prodStats"

# Get history since a specific game-time ID
curl "http://localhost:8081/v1/sessions/{sessionId}/history/prodStats?since=3600"

# Get history for a specific save
curl "http://localhost:8081/v1/sessions/{sessionId}/history/prodStats?saveName=MySave"

# Limit results
curl "http://localhost:8081/v1/sessions/{sessionId}/history/prodStats?limit=50"
```

### Response Format

```json
{
  "dataType": "prodStats",
  "saveName": "MySaveGame",
  "latestId": 7200,
  "points": [
    {"gameTimeId": 3600, "data": {...}},
    {"gameTimeId": 3604, "data": {...}}
  ]
}
```

### List Available Saves

```bash
curl "http://localhost:8081/v1/sessions/{sessionId}/history"
```

```json
{
  "saveNames": ["MySaveGame", "AnotherSave"],
  "currentSave": "MySaveGame"
}
```

## SSE Integration

Existing SSE events now include a `gameTimeId` field:

```json
{
  "type": "prodStats",
  "data": {...},
  "gameTimeId": 7204
}
```

### Client Pattern

1. Initial fetch: `GET /v1/sessions/{id}/history/prodStats?since=0`
2. Store `latestId` from response
3. On SSE event, check: `event.gameTimeId > lastKnownId`
4. If true, add to local data and update `lastKnownId`
5. If false, ignore (duplicate or old data)

## Frontend Hook Example

```typescript
import { useHistoryData } from '@/hooks/useHistoryData';
import { useSettings } from '@/hooks/use-settings';

function ProductionChart({ sessionId }) {
  const { settings } = useSettings();
  const { data, loading, error } = useHistoryData(
    sessionId,
    'prodStats',
    settings.historyDataRange
  );

  if (loading) return <Loading />;
  if (error) return <Error message={error} />;

  // data is an array of {gameTimeId, data} sorted by time
  return <TimeSeriesChart data={data} />;
}
```

## History Data Range Settings (User Story 5)

Users can configure how much historical data to fetch and maintain in memory via the Settings page.

### Available Presets

| Option    | Value (seconds) | Description                           |
|-----------|-----------------|---------------------------------------|
| 1 min     | 60              | Very short window for quick testing   |
| 2 min     | 120             | Short monitoring window               |
| 3 min     | 180             | Brief analysis window                 |
| 4 min     | 240             | Short analysis window                 |
| 5 min     | 300             | Default - good balance                |
| 10 min    | 600             | Medium analysis window                |
| 60 min    | 3600            | Longer trend analysis                 |
| 8 hours   | 28800           | Extended session monitoring           |
| All time  | -1              | Fetch all available history           |
| Custom    | 1-31536000      | User-specified range in seconds       |

### Configuration via Settings UI

1. Navigate to **Settings** page
2. Find the **Data History** card
3. Select a preset from the dropdown or choose "Custom"
4. For custom values, enter the number of seconds and click "Apply"

### Behavior

- **Initial Fetch**: When a session loads, the hook fetches history from the server, then applies client-side pruning based on the configured range
- **SSE Updates**: As new data arrives via SSE, old data is automatically pruned to maintain the configured range
- **Setting Change**: Changing the history range triggers a refetch with the new configuration
- **Persistence**: Settings are stored in localStorage and persist across browser sessions

### Manual Validation Scenarios

#### Scenario 1: Basic Range Restriction
1. Open Settings → Data History
2. Set history range to "1 min" (60 seconds)
3. Navigate to a page using historical data (e.g., Production view)
4. Verify the displayed data spans approximately 1 minute of game time
5. Wait for SSE events to arrive
6. Verify old data is pruned to maintain the ~1 minute window

#### Scenario 2: All Time Mode
1. Open Settings → Data History
2. Set history range to "All time"
3. Navigate to a page using historical data
4. Verify all available historical data is fetched (no pruning)
5. Wait for SSE events to arrive
6. Verify no data is pruned (all history maintained)

#### Scenario 3: Custom Value
1. Open Settings → Data History
2. Select "Custom" from dropdown
3. Enter a custom value (e.g., 45 seconds)
4. Click "Apply"
5. Verify the custom value is saved and applied
6. Navigate to a page using historical data
7. Verify data spans approximately 45 seconds

#### Scenario 4: Custom Value Validation
1. Open Settings → Data History
2. Select "Custom" from dropdown
3. Try entering invalid values:
   - Empty value → Should show error
   - 0 → Should show "Minimum value is 1 second"
   - Negative number → Should show error
   - Very large number (>31536000) → Should show "Maximum value is 31,536,000 seconds (1 year)"
4. Verify error messages display correctly

#### Scenario 5: Persistence
1. Set history range to a non-default value (e.g., "10 min")
2. Close and reopen the browser tab
3. Navigate to Settings
4. Verify the "10 min" option is still selected

#### Scenario 6: Range Change Triggers Refetch
1. Load a session with history data using "5 min" setting
2. Note the current data range
3. Change setting to "All time"
4. Verify data is refetched and more history appears
5. Change setting back to "1 min"
6. Verify data is refetched and range is restricted

## Development Testing

1. Start with mock mode enabled in config
2. Set `SD_MAX_SAMPLE_GAME_DURATION=300` (5 minutes for quick testing)
3. Create a session and wait for data collection
4. Query history endpoint to verify storage

## Redis Storage

History is stored in Redis sorted sets:

```
Key: history:{sessionId}:{saveName}:{dataType}
Score: gameTimeId (seconds)
Member: JSON data point
```

View stored data:
```bash
redis-cli ZRANGE "history:abc-123:MySave:prodStats" 0 -1 WITHSCORES
```

## Troubleshooting

### "SD_MAX_SAMPLE_GAME_DURATION environment variable is required"

Set the environment variable before starting:
```bash
export SD_MAX_SAMPLE_GAME_DURATION=3600
```

### No history data appearing

1. Verify session is connected and polling (check `/v1/sessions/{id}` status)
2. Ensure data type is one of the supported time-series types
3. Wait at least one poll interval (4 seconds)
4. Check Redis has keys: `redis-cli KEYS "history:*"`

### Duplicate data in frontend

Ensure your SSE handler checks `gameTimeId > lastKnownId` before adding data.

### History disappears after restart

Redis must persist data. Check Redis configuration for persistence settings (RDB/AOF).
