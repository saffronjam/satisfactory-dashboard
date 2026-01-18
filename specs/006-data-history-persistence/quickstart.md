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

function ProductionChart({ sessionId }) {
  const { data, loading, error } = useHistoryData(sessionId, 'prodStats');

  if (loading) return <Loading />;
  if (error) return <Error message={error} />;

  // data is an array of {gameTimeId, data} sorted by time
  return <TimeSeriesChart data={data} />;
}
```

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
