package frm_client

import (
	"api/models/models"
	"api/service/frm_client/frm_models"
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
)

// classNameToTrainType converts FRM API ClassName to TrainType enum
func classNameToTrainType(className string) models.TrainType {
	lowerName := strings.ToLower(className)
	if strings.Contains(lowerName, "locomotive") {
		return models.TrainTypeLocomotive
	}
	if strings.Contains(lowerName, "freight") || strings.Contains(lowerName, "wagon") {
		return models.TrainTypeFreight
	}
	// Default to freight for unknown types
	return models.TrainTypeFreight
}

// ListTrains fetches train data, requires station data for status calculation
func (client *Client) ListTrains(ctx context.Context) ([]models.Train, error) {
	var rawTrains []frm_models.Train
	var rawStations []frm_models.TrainStation // Fetch stations needed for status calculation

	var wg sync.WaitGroup
	var mu sync.Mutex
	var firstError error

	wg.Add(1)
	go func() {
		defer wg.Done()
		err := client.makeSatisfactoryCall(ctx, "/getTrains", &rawTrains)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = fmt.Errorf("failed to get trains. details: %w", err)
			}
			mu.Unlock()
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		err := client.makeSatisfactoryCall(ctx, "/getTrainStation", &rawStations)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = fmt.Errorf("failed to get train stations for train status. details: %w", err)
			}
			mu.Unlock()
		}
	}()

	wg.Wait()

	if firstError != nil {
		return nil, firstError
	}

	// Convert raw stations to model stations (needed for status check)
	modelStations := make([]models.TrainStation, len(rawStations))
	for i, rs := range rawStations {
		// Parse platforms (skip train stations, only include freight platforms)
		var platforms []models.TrainStationPlatform
		for _, rawPlatform := range rs.CargoInventory {
			// Skip train stations (Build_TrainStation_C) - only include actual freight platforms
			if rawPlatform.ClassName == "Build_TrainStation_C" {
				continue
			}

			platformType := models.TrainStationPlatformTypeFreight
			if rawPlatform.ClassName == "Build_TrainDockingStationLiquid_C" {
				platformType = models.TrainStationPlatformTypeFluidFreight
			}

			// Determine platform mode from LoadingMode
			platformMode := models.TrainStationPlatformModeImport
			if rawPlatform.LoadingMode == "Unloading" {
				platformMode = models.TrainStationPlatformModeExport
			}

			// Determine platform status from LoadingStatus
			platformStatus := models.TrainStationPlatformStatusIdle
			if rawPlatform.LoadingStatus != "Idle" && rawPlatform.LoadingStatus != "" {
				platformStatus = models.TrainStationPlatformStatusDocking
			}

			inventory := make([]models.ItemStats, len(rawPlatform.Inventory))
			for k, item := range rawPlatform.Inventory {
				inventory[k] = models.ItemStats{
					Name:  item.Name,
					Count: item.Amount,
				}
			}

			platforms = append(platforms, models.TrainStationPlatform{
				Type:         platformType,
				Mode:         platformMode,
				Status:       platformStatus,
				Location:     parseLocation(rawPlatform.Location),
				BoundingBox:  parseBoundingBox(rawPlatform.BoundingBox),
				Inventory:    inventory,
				TransferRate: rawPlatform.TransferRate,
				InflowRate:   rawPlatform.InflowRate,
				OutflowRate:  rawPlatform.OutflowRate,
			})
		}

		modelStations[i] = models.TrainStation{
			Name:        rs.Name,
			Location:    parseLocation(rs.Location),
			BoundingBox: parseBoundingBox(rs.BoundingBox),
			Platforms:   platforms,
		}
	}

	trains := make([]models.Train, 0, len(rawTrains))
	for _, raw := range rawTrains {
		timetable := make([]models.TrainTimetableEntry, len(raw.TimeTable))
		for i, stop := range raw.TimeTable {
			timetable[i] = models.TrainTimetableEntry{
				Station: stop.StationName,
			}
		}

		vehicles := make([]models.TrainVehicle, len(raw.Vehicles))
		for i, v := range raw.Vehicles {
			inventory := make([]models.ItemStats, len(v.Inventory))
			for j, item := range v.Inventory {
				inventory[j] = models.ItemStats{
					Name:  item.Name,
					Count: item.Amount,
				}
			}
			vehicles[i] = models.TrainVehicle{
				Type:      classNameToTrainType(v.ClassName),
				Capacity:  v.MaxPayloadMass,
				Inventory: inventory,
			}
		}

		trains = append(trains, models.Train{
			ID:               raw.ID,
			Name:             raw.Name,
			Speed:            raw.ForwardSpeed,
			Location:         parseLocation(raw.Location),
			CircuitIDs:       parseCircuitIDsFromPowerInfo(raw.PowerInfo),
			Timetable:        timetable,
			TimetableIndex:   raw.TimeTableIndex,
			Status:           satisfactoryStatusToTrainStatus(&raw, modelStations),
			PowerConsumption: raw.PowerInfo.PowerConsumed * 1_000_000, // MW to W
			Vehicles:         vehicles,
		})
	}

	return trains, nil
}

// platformAssignment tracks the best station assignment for a cargo platform
type platformAssignment struct {
	stationIndex  int
	platformIndex int
	rawPlatform   frm_models.TrainStationPlatform
}

// ListTrainStations fetches train station data with deduplication
// When multiple stations are chained, platforms may appear in multiple stations.
// Each platform is assigned to the station where it has the lowest index.
func (client *Client) ListTrainStations(ctx context.Context) ([]models.TrainStation, error) {
	var rawStations []frm_models.TrainStation
	err := client.makeSatisfactoryCall(ctx, "/getTrainStation", &rawStations)
	if err != nil {
		return nil, fmt.Errorf("failed to get train stations. details: %w", err)
	}

	// First pass: find the best assignment for each platform (lowest index wins)
	bestAssignment := make(map[string]platformAssignment)
	for stationIdx, raw := range rawStations {
		for platformIdx, rawPlatform := range raw.CargoInventory {
			// Only include actual freight platforms
			if rawPlatform.ClassName == "Build_TrainStation_C" {
				continue
			}
			if rawPlatform.ClassName == "Build_TrainPlatformEmpty_C" {
				continue
			}
			if rawPlatform.ClassName == "Build_TrainPlatformEmpty_02_C" {
				continue
			}

			existing, exists := bestAssignment[rawPlatform.ID]
			if !exists || platformIdx < existing.platformIndex {
				bestAssignment[rawPlatform.ID] = platformAssignment{
					stationIndex:  stationIdx,
					platformIndex: platformIdx,
					rawPlatform:   rawPlatform,
				}
			}
		}
	}

	// Second pass: group platforms by their assigned station
	stationPlatforms := make([][]platformAssignment, len(rawStations))
	for _, assignment := range bestAssignment {
		stationPlatforms[assignment.stationIndex] = append(
			stationPlatforms[assignment.stationIndex],
			assignment,
		)
	}

	// Sort each station's platforms by their platform index to maintain order
	for i := range stationPlatforms {
		sort.Slice(stationPlatforms[i], func(a, b int) bool {
			return stationPlatforms[i][a].platformIndex < stationPlatforms[i][b].platformIndex
		})
	}

	// Third pass: build final station models
	stations := make([]models.TrainStation, len(rawStations))
	for i, raw := range rawStations {
		// Convert assigned platforms to model platforms
		platforms := make([]models.TrainStationPlatform, len(stationPlatforms[i]))
		for j, assignment := range stationPlatforms[i] {
			rawPlatform := assignment.rawPlatform

			// Determine platform type from ClassName
			platformType := models.TrainStationPlatformTypeFreight
			if rawPlatform.ClassName == "Build_TrainDockingStationLiquid_C" {
				platformType = models.TrainStationPlatformTypeFluidFreight
			}

			// Determine platform mode from LoadingMode
			platformMode := models.TrainStationPlatformModeImport
			if rawPlatform.LoadingMode == "Loading" {
				platformMode = models.TrainStationPlatformModeExport
			}

			// Determine platform status from LoadingStatus
			// "Idle" means idle, anything else (Loading/Unloading) means docking
			platformStatus := models.TrainStationPlatformStatusIdle
			if rawPlatform.LoadingStatus != "Idle" && rawPlatform.LoadingStatus != "" {
				platformStatus = models.TrainStationPlatformStatusDocking
			}

			// Parse inventory
			inventory := make([]models.ItemStats, len(rawPlatform.Inventory))
			for k, item := range rawPlatform.Inventory {
				inventory[k] = models.ItemStats{
					Name:  item.Name,
					Count: item.Amount,
				}
			}

			platforms[j] = models.TrainStationPlatform{
				Type:         platformType,
				Mode:         platformMode,
				Status:       platformStatus,
				Location:     parseLocation(rawPlatform.Location),
				BoundingBox:  parseBoundingBox(rawPlatform.BoundingBox),
				Inventory:    inventory,
				TransferRate: rawPlatform.TransferRate,
				InflowRate:   rawPlatform.InflowRate,
				OutflowRate:  rawPlatform.OutflowRate,
			}
		}

		stations[i] = models.TrainStation{
			Name:        raw.Name,
			Location:    parseLocation(raw.Location),
			BoundingBox: parseBoundingBox(raw.BoundingBox),
			CircuitIDs:  parseCircuitIDsFromPowerInfo(raw.PowerInfo),
			Platforms:   platforms,
		}
	}
	return stations, nil
}
