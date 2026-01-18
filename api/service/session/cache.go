package session

import (
	"api/models/models"
	"api/pkg/db/key_value"
	"api/pkg/log"
	"encoding/json"
	"fmt"
	"time"
)

const deletedSessionTTL = 24 * time.Hour

// MarkSessionDeleted sets a marker key to prevent pollers from inserting data
// for a deleted session. The marker has a 24h TTL.
func MarkSessionDeleted(sessionID string) error {
	kvClient := key_value.New()
	return kvClient.Set("deleted-session:"+sessionID, "1", deletedSessionTTL)
}

// IsSessionDeleted checks if a session has been marked as deleted.
func IsSessionDeleted(sessionID string) bool {
	kvClient := key_value.New()
	exists, _ := kvClient.IsSet("deleted-session:" + sessionID)
	return exists
}

// stateKey generates the Redis key for caching state data.
// Format: state:{sessionID}:{saveName}:{eventType}
func stateKey(sessionID, saveName string, eventType models.SatisfactoryEventType) string {
	return fmt.Sprintf("state:%s:%s:%s", sessionID, saveName, eventType)
}

// GetCachedState retrieves cached state for a session from Redis.
// Returns a State with whatever data is available in cache (empty fields for cache misses).
func GetCachedState(sessionID, saveName string) *models.State {
	kvClient := key_value.New()
	state := &models.State{
		// Initialize with empty defaults
		Circuits:           []models.Circuit{},
		Players:            []models.Player{},
		Drones:             []models.Drone{},
		Trains:             []models.Train{},
		TrainStations:      []models.TrainStation{},
		DroneStations:      []models.DroneStation{},
		Belts:              []models.Belt{},
		Pipes:              []models.Pipe{},
		PipeJunctions:      []models.PipeJunction{},
		TrainRails:         []models.TrainRail{},
		SplitterMergers:    []models.SplitterMerger{},
		Hypertubes:         []models.Hypertube{},
		HypertubeEntrances: []models.HypertubeEntrance{},
		Cables:             []models.Cable{},
		Storages:           []models.Storage{},
		Machines:           []models.Machine{},
		Tractors:           []models.Tractor{},
		Explorers:          []models.Explorer{},
		VehiclePaths:       []models.VehiclePath{},
		RadarTowers:        []models.RadarTower{},
		ResourceNodes:      []models.ResourceNode{},
		Schematics:         []models.Schematic{},
	}

	// Helper to get cached data and unmarshal
	getCached := func(eventType models.SatisfactoryEventType, target interface{}) {
		key := stateKey(sessionID, saveName, eventType)
		data, err := kvClient.Get(key)
		if err != nil || data == "" {
			return // Cache miss - leave as default
		}
		json.Unmarshal([]byte(data), target)
	}

	// Load each field from cache
	getCached(models.SatisfactoryEventApiStatus, &state.SatisfactoryApiStatus)
	getCached(models.SatisfactoryEventCircuits, &state.Circuits)
	getCached(models.SatisfactoryEventFactoryStats, &state.FactoryStats)
	getCached(models.SatisfactoryEventProdStats, &state.ProdStats)
	getCached(models.SatisfactoryEventGeneratorStats, &state.GeneratorStats)
	getCached(models.SatisfactoryEventSinkStats, &state.SinkStats)
	getCached(models.SatisfactoryEventPlayers, &state.Players)
	getCached(models.SatisfactoryEventMachines, &state.Machines)
	getCached(models.SatisfactoryEventBelts, &state.Belts)
	getCached(models.SatisfactoryEventPipes, &state.Pipes)
	getCached(models.SatisfactoryEventTrainRails, &state.TrainRails)
	getCached(models.SatisfactoryEventCables, &state.Cables)
	getCached(models.SatisfactoryEventStorages, &state.Storages)
	getCached(models.SatisfactoryEventTractors, &state.Tractors)
	getCached(models.SatisfactoryEventExplorers, &state.Explorers)
	getCached(models.SatisfactoryEventVehiclePaths, &state.VehiclePaths)
	getCached(models.SatisfactoryEventSpaceElevator, &state.SpaceElevator)
	getCached(models.SatisfactoryEventHub, &state.Hub)
	getCached(models.SatisfactoryEventRadarTowers, &state.RadarTowers)
	getCached(models.SatisfactoryEventResourceNodes, &state.ResourceNodes)
	getCached(models.SatisfactoryEventSchematics, &state.Schematics)

	// Handle composite hypertubes event
	var hypertubesData models.Hypertubes
	getCached(models.SatisfactoryEventHypertubes, &hypertubesData)
	state.Hypertubes = hypertubesData.Hypertubes
	state.HypertubeEntrances = hypertubesData.HypertubeEntrances

	return state
}

// ClearCachedState removes all cached state for a session.
// Uses pattern matching to clean up all state keys regardless of save name.
// Call this when a session is deleted.
func ClearCachedState(sessionID string) {
	kvClient := key_value.New()

	pattern := fmt.Sprintf("state:%s:*", sessionID)
	keys, err := kvClient.List(pattern)
	if err != nil {
		log.Warnf("Failed to list state keys for session %s: %v", sessionID, err)
		return
	}

	for _, key := range keys {
		if err := kvClient.Del(key); err != nil {
			log.Warnf("Failed to delete state key %s: %v", key, err)
		}
	}

	log.Infof("Cleared %d state keys for session %s", len(keys), sessionID)
}

// GetSessionStage computes the stage of a session by checking if all required event types are cached.
// Returns SessionStageReady if all cache keys exist, otherwise SessionStageInit.
func GetSessionStage(sessionID, saveName string) models.SessionStage {
	kvClient := key_value.New()

	for _, eventType := range models.RequiredEventTypes {
		key := stateKey(sessionID, saveName, eventType)
		exists, err := kvClient.IsSet(key)
		if err != nil || !exists {
			return models.SessionStageInit
		}
	}

	return models.SessionStageReady
}

// IsSessionReady is a convenience function to check if a session is ready
func IsSessionReady(sessionID, saveName string) bool {
	return GetSessionStage(sessionID, saveName) == models.SessionStageReady
}

// ClearHistoryData removes all historical data for a session.
// Key patterns:
//   - history:{sessionID}:{saveName}:{dataType} (sorted set indices)
//   - history:{sessionID}:{saveName}:{dataType}:data:{gameTimeID} (data points)
func ClearHistoryData(sessionID string) error {
	kvClient := key_value.New()

	pattern := fmt.Sprintf("history:%s:*", sessionID)
	keys, err := kvClient.List(pattern)
	if err != nil {
		return fmt.Errorf("failed to list history keys: %w", err)
	}

	for _, key := range keys {
		if err := kvClient.Del(key); err != nil {
			log.Warnf("Failed to delete history key %s: %v", key, err)
		}
	}

	log.Infof("Cleared %d history keys for session %s", len(keys), sessionID)
	return nil
}

// historyKey generates the Redis key for storing history data.
func historyKey(sessionID, saveName, dataType string) string {
	return fmt.Sprintf("history:%s:%s:%s", sessionID, saveName, dataType)
}

// historyMemberKey generates a unique member key for Redis ZSET that enables overwrites.
// By using only the game-time ID as the member identifier, ZADD will replace existing
// entries at the same game-time when a save rollback occurs.
func historyMemberKey(gameTimeID int64) string {
	return fmt.Sprintf("%d", gameTimeID)
}

// StoreHistoryPoint stores a data point in the Redis sorted set for historical data.
// The game time ID is used as both the score (for ordering) and the member key to enable
// overwrites on save rollbacks. The actual data is stored separately keyed by game-time.
// Returns early without error if the session has been deleted.
func StoreHistoryPoint(sessionID, saveName, dataType string, gameTimeID int64, data any) error {
	if IsSessionDeleted(sessionID) {
		return nil
	}

	kvClient := key_value.New()

	dataPoint := models.DataPoint{
		GameTimeID: gameTimeID,
		DataType:   dataType,
		Data:       data,
	}

	jsonData, err := json.Marshal(dataPoint)
	if err != nil {
		return fmt.Errorf("failed to marshal data point: %w", err)
	}

	key := historyKey(sessionID, saveName, dataType)
	memberKey := historyMemberKey(gameTimeID)

	dataKey := fmt.Sprintf("%s:data:%s", key, memberKey)
	if err := kvClient.Set(dataKey, string(jsonData), 0); err != nil {
		return fmt.Errorf("failed to store data point: %w", err)
	}

	if err := kvClient.ZAdd(key, float64(gameTimeID), memberKey); err != nil {
		return err
	}

	log.Debugf("History store: session=%s save=%s type=%s gameTime=%d", sessionID, saveName, dataType, gameTimeID)
	return nil
}

// GetHistory retrieves historical data points from Redis for a session/save/dataType combination.
// If sinceID is provided (> 0), only returns data points with gameTimeID greater than sinceID.
// Returns a HistoryChunk containing the data points ordered by game time ascending.
func GetHistory(sessionID, saveName, dataType string, sinceID int64) (*models.HistoryChunk, error) {
	kvClient := key_value.New()

	key := historyKey(sessionID, saveName, dataType)

	minScore := float64(sinceID + 1)
	if sinceID <= 0 {
		minScore = 0
	}
	maxScore := float64(1<<62 - 1)

	memberKeys, err := kvClient.ZRangeByScore(key, minScore, maxScore)
	if err != nil {
		return nil, fmt.Errorf("failed to get history from Redis: %w", err)
	}

	points := make([]models.DataPoint, 0, len(memberKeys))
	var latestID int64

	for _, memberKey := range memberKeys {
		dataKey := fmt.Sprintf("%s:data:%s", key, memberKey)
		jsonData, err := kvClient.Get(dataKey)
		if err != nil || jsonData == "" {
			continue
		}

		var point models.DataPoint
		if err := json.Unmarshal([]byte(jsonData), &point); err != nil {
			continue
		}
		points = append(points, point)
		if point.GameTimeID > latestID {
			latestID = point.GameTimeID
		}
	}

	log.Debugf("History query: session=%s save=%s type=%s sinceID=%d returned=%d points", sessionID, saveName, dataType, sinceID, len(points))

	return &models.HistoryChunk{
		DataType: dataType,
		SaveName: saveName,
		LatestID: latestID,
		Points:   points,
	}, nil
}

// GetHistorySaves returns a list of save names that have historical data for a session.
// It scans Redis keys matching the history pattern for the session and extracts unique save names.
func GetHistorySaves(sessionID string) ([]string, error) {
	kvClient := key_value.New()

	pattern := fmt.Sprintf("history:%s:*", sessionID)
	keys, err := kvClient.List(pattern)
	if err != nil {
		return nil, fmt.Errorf("failed to list history keys: %w", err)
	}

	saveNameSet := make(map[string]struct{})
	for _, key := range keys {
		parts := extractSaveName(key, sessionID)
		if parts != "" {
			saveNameSet[parts] = struct{}{}
		}
	}

	saveNames := make([]string, 0, len(saveNameSet))
	for saveName := range saveNameSet {
		saveNames = append(saveNames, saveName)
	}

	return saveNames, nil
}

// extractSaveName parses a Redis history key and extracts the save name component.
// Key format: history:{sessionID}:{saveName}:{dataType}
func extractSaveName(key, sessionID string) string {
	prefix := fmt.Sprintf("history:%s:", sessionID)
	if len(key) <= len(prefix) {
		return ""
	}

	remainder := key[len(prefix):]
	for i := len(remainder) - 1; i >= 0; i-- {
		if remainder[i] == ':' {
			return remainder[:i]
		}
	}

	return ""
}

// PruneOldHistory removes data points older than the configured retention limit.
// It calculates the cutoff time as currentGameTimeID - maxDurationSeconds and removes
// all data points with game time IDs below that threshold. Also cleans up associated data keys.
func PruneOldHistory(sessionID, saveName, dataType string, currentGameTimeID, maxDurationSeconds int64) error {
	if maxDurationSeconds <= 0 {
		return nil
	}

	cutoffID := currentGameTimeID - maxDurationSeconds
	if cutoffID <= 0 {
		return nil
	}

	kvClient := key_value.New()
	key := historyKey(sessionID, saveName, dataType)

	memberKeys, err := kvClient.ZRangeByScore(key, 0, float64(cutoffID))
	if err != nil {
		return fmt.Errorf("failed to get members to prune: %w", err)
	}

	if len(memberKeys) == 0 {
		return nil
	}

	for _, memberKey := range memberKeys {
		dataKey := fmt.Sprintf("%s:data:%s", key, memberKey)
		kvClient.Del(dataKey)
	}

	_, err = kvClient.ZRemRangeByScore(key, 0, float64(cutoffID))
	if err != nil {
		return fmt.Errorf("failed to prune old history: %w", err)
	}

	log.Debugf("History prune: session=%s save=%s type=%s cutoff=%d removed=%d points", sessionID, saveName, dataType, cutoffID, len(memberKeys))

	return nil
}
