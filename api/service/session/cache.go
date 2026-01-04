package session

import (
	"api/models/models"
	"api/pkg/db/key_value"
	"encoding/json"
	"fmt"
)

// GetCachedState retrieves cached state for a session from Redis.
// Returns a State with whatever data is available in cache (empty fields for cache misses).
func GetCachedState(sessionID string) *models.State {
	kvClient := key_value.New()
	state := &models.State{
		// Initialize with empty defaults
		Circuits:        []models.Circuit{},
		Players:         []models.Player{},
		Drones:          []models.Drone{},
		Trains:          []models.Train{},
		TrainStations:   []models.TrainStation{},
		DroneStations:   []models.DroneStation{},
		Belts:           []models.Belt{},
		Pipes:           []models.Pipe{},
		PipeJunctions:   []models.PipeJunction{},
		TrainRails:      []models.TrainRail{},
		SplitterMergers: []models.SplitterMerger{},
		Cables:          []models.Cable{},
		Storages:        []models.Storage{},
		Machines:        []models.Machine{},
		Tractors:        []models.Tractor{},
		Explorers:       []models.Explorer{},
		VehiclePaths:    []models.VehiclePath{},
		RadarTowers:     []models.RadarTower{},
		ResourceNodes:   []models.ResourceNode{},
	}

	// Helper to get cached data and unmarshal
	getCached := func(eventType models.SatisfactoryEventType, target interface{}) {
		key := fmt.Sprintf("state:%s:%s", sessionID, eventType)
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
	getCached(models.SatisfactoryEventRadarTowers, &state.RadarTowers)
	getCached(models.SatisfactoryEventResourceNodes, &state.ResourceNodes)

	return state
}

// ClearCachedState removes all cached state for a session.
// Call this when a session is deleted.
func ClearCachedState(sessionID string) {
	kvClient := key_value.New()

	eventTypes := []models.SatisfactoryEventType{
		models.SatisfactoryEventApiStatus,
		models.SatisfactoryEventCircuits,
		models.SatisfactoryEventFactoryStats,
		models.SatisfactoryEventProdStats,
		models.SatisfactoryEventGeneratorStats,
		models.SatisfactoryEventSinkStats,
		models.SatisfactoryEventPlayers,
		models.SatisfactoryEventMachines,
		models.SatisfactoryEventBelts,
		models.SatisfactoryEventPipes,
		models.SatisfactoryEventVehicles,
		models.SatisfactoryEventVehicleStations,
		models.SatisfactoryEventTrainRails,
		models.SatisfactoryEventCables,
		models.SatisfactoryEventStorages,
		models.SatisfactoryEventTractors,
		models.SatisfactoryEventExplorers,
		models.SatisfactoryEventVehiclePaths,
		models.SatisfactoryEventSpaceElevator,
		models.SatisfactoryEventRadarTowers,
		models.SatisfactoryEventResourceNodes,
	}

	for _, eventType := range eventTypes {
		key := fmt.Sprintf("state:%s:%s", sessionID, eventType)
		kvClient.Del(key)
	}
}

// GetSessionStage computes the stage of a session by checking if all required event types are cached.
// Returns SessionStageReady if all cache keys exist, otherwise SessionStageInit.
func GetSessionStage(sessionID string) models.SessionStage {
	kvClient := key_value.New()

	for _, eventType := range models.RequiredEventTypes {
		key := fmt.Sprintf("state:%s:%s", sessionID, eventType)
		exists, err := kvClient.IsSet(key)
		if err != nil || !exists {
			return models.SessionStageInit
		}
	}

	return models.SessionStageReady
}

// IsSessionReady is a convenience function to check if a session is ready
func IsSessionReady(sessionID string) bool {
	return GetSessionStage(sessionID) == models.SessionStageReady
}
