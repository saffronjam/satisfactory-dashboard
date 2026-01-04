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

// GetVehicles fetches all vehicle data: trains, drones, trucks, tractors, and explorers
func (client *Client) GetVehicles(ctx context.Context) (models.Vehicles, error) {
	var vehicles models.Vehicles

	var wg sync.WaitGroup
	var mu sync.Mutex
	var firstError error

	wg.Add(1)
	go func() {
		defer wg.Done()
		trains, err := client.ListTrains(ctx)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = fmt.Errorf("failed to get trains. details: %w", err)
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		vehicles.Trains = trains
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		drones, err := client.ListDrones(ctx)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = fmt.Errorf("failed to get drones. details: %w", err)
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		vehicles.Drones = drones
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		trucks, err := client.ListTrucks(ctx)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = fmt.Errorf("failed to get trucks. details: %w", err)
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		vehicles.Trucks = trucks
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		tractors, err := client.ListTractors(ctx)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = fmt.Errorf("failed to get tractors. details: %w", err)
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		vehicles.Tractors = tractors
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		explorers, err := client.ListExplorers(ctx)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = fmt.Errorf("failed to get explorers. details: %w", err)
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		vehicles.Explorers = explorers
		mu.Unlock()
	}()

	wg.Wait()

	if firstError != nil {
		return models.Vehicles{}, firstError
	}

	return vehicles, nil
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

// ListDrones fetches drone data. Requires drone stations for linking.
func (client *Client) ListDrones(ctx context.Context) ([]models.Drone, error) {
	// Drones need station info. Fetch stations first or ensure they are already available.
	// This version fetches stations concurrently.
	var rawDrones []frm_models.Drone
	var modelDroneStations []models.DroneStation // Use the model type directly

	var wg sync.WaitGroup
	var mu sync.Mutex
	var firstError error

	wg.Add(1)
	go func() {
		defer wg.Done()
		err := client.makeSatisfactoryCall(ctx, "/getDrone", &rawDrones)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = fmt.Errorf("failed to get drones. details: %w", err)
			}
			mu.Unlock()
		}
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		// Fetch stations using the dedicated function which returns model type
		stations, err := client.ListDroneStations(ctx)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = fmt.Errorf("failed to get drone stations for drone linking. details: %w", err)
			}
			mu.Unlock()
		} else {
			mu.Lock()
			modelDroneStations = stations // Store the result
			mu.Unlock()
		}
	}()

	wg.Wait()

	if firstError != nil {
		return nil, firstError
	}

	// Create a map for quick station lookup by name
	stationMap := make(map[string]models.DroneStation, len(modelDroneStations))
	for _, station := range modelDroneStations {
		stationMap[station.Name] = station
	}

	drones := make([]models.Drone, len(rawDrones))
	for i, raw := range rawDrones {
		// Find linked stations from the map
		homeStation, _ := stationMap[raw.HomeStation] // Zero value if not found
		pairedStation, _ := stationMap[raw.TargetStation]
		destinationStation, _ := stationMap[raw.DestinationStation]

		drones[i] = models.Drone{
			Name:        raw.Name,
			Location:    parseLocation(raw.Location),
			CircuitIDs:  homeStation.CircuitIDs, // Assume drone uses home station circuits
			Speed:       raw.FlyingSpeed,
			Status:      satisfactoryStatusToDroneStatus(&raw, modelDroneStations),
			Home:        homeStation,
			Paired:      &pairedStation,
			Destination: &destinationStation,
		}
	}

	return drones, nil
}

func (client *Client) ListTrucks(ctx context.Context) ([]models.Truck, error) {
	var rawTrucks []frm_models.Truck
	err := client.makeSatisfactoryCall(ctx, "/getTruck", &rawTrucks)
	if err != nil {
		return nil, fmt.Errorf("failed to get trucks. details: %w", err)
	}

	trucks := make([]models.Truck, len(rawTrucks))
	for i, raw := range rawTrucks {
		var inventory []models.ItemStats
		for _, item := range raw.Storage {
			inventory = append(inventory, models.ItemStats{
				Name:  item.Name,
				Count: item.Amount,
			})
		}

		var status models.TruckStatus
		if raw.AutoPilot {
			status = models.TruckStatusSelfDriving
		} else if raw.Driver != "" {
			status = models.TruckStatusManualDriving
		} else {
			status = models.TruckStatusParked
		}

		// Pick first fuel entry as primary fuel
		var fuel *models.Fuel
		if len(raw.Fuel) > 0 {
			fuel = &models.Fuel{
				Name:   raw.Fuel[0].FuelName,
				Amount: raw.Fuel[0].Amount,
			}
		}

		trucks[i] = models.Truck{
			Name:      raw.Name,
			Speed:     raw.ForwardSpeed,
			Status:    status,
			Fuel:      fuel,
			Inventory: inventory,
			Location:  parseLocation(raw.Location),
		}
	}
	return trucks, nil
}

// GetVehicleStations fetches all vehicle station data: train, drone, and truck stations
func (client *Client) GetVehicleStations(ctx context.Context) (models.VehicleStations, error) {
	var stations models.VehicleStations

	var wg sync.WaitGroup
	var mu sync.Mutex
	var firstError error

	wg.Add(1)
	go func() {
		defer wg.Done()
		trainStations, err := client.ListTrainStations(ctx)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = fmt.Errorf("failed to get train stations. details: %w", err)
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		stations.TrainStations = trainStations
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		droneStations, err := client.ListDroneStations(ctx)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = fmt.Errorf("failed to get drone stations. details: %w", err)
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		stations.DroneStations = droneStations
		mu.Unlock()
	}()

	wg.Add(1)
	go func() {
		defer wg.Done()
		truckStations, err := client.ListTruckStations(ctx)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = fmt.Errorf("failed to get truck stations. details: %w", err)
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		stations.TruckStations = truckStations
		mu.Unlock()
	}()

	wg.Wait()

	if firstError != nil {
		return models.VehicleStations{}, firstError
	}

	return stations, nil
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
			// Skip train stations (Build_TrainStation_C) - only include actual freight platforms
			if rawPlatform.ClassName == "Build_TrainStation_C" {
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

// ListDroneStations fetches drone station data
func (client *Client) ListDroneStations(ctx context.Context) ([]models.DroneStation, error) {
	var rawStations []frm_models.DroneStation
	err := client.makeSatisfactoryCall(ctx, "/getDroneStation", &rawStations)
	if err != nil {
		return nil, fmt.Errorf("failed to get drone stations. details: %w", err)
	}

	stations := make([]models.DroneStation, len(rawStations))
	for i, raw := range rawStations {
		var fuelName *string // Use pointer for optional field
		if raw.ActiveFuel.FuelName != "N/A" {
			fn := raw.ActiveFuel.FuelName
			fuelName = &fn
		}

		// Find amount by matching active fuel name with fuel inventory
		var fuelAmount *float64
		if fuelName != nil {
			for _, fuel := range raw.FuelInventory {
				if fuel.Name == *fuelName {
					fa := fuel.Amount
					fuelAmount = &fa
					break
				}
			}
		}

		var fuel *models.Fuel
		if fuelName != nil && fuelAmount != nil {
			fuel = &models.Fuel{
				Name:   *fuelName,
				Amount: *fuelAmount,
			}
		}

		// Parse InputInventory
		inputInventory := make([]models.ItemStats, len(raw.InputInventory))
		for j, item := range raw.InputInventory {
			inputInventory[j] = models.ItemStats{
				Name:  item.Name,
				Count: item.Amount,
			}
		}

		// Parse OutputInventory
		outputInventory := make([]models.ItemStats, len(raw.OutputInventory))
		for j, item := range raw.OutputInventory {
			outputInventory[j] = models.ItemStats{
				Name:  item.Name,
				Count: item.Amount,
			}
		}

		stations[i] = models.DroneStation{
			Name:            raw.Name,
			Location:        parseLocation(raw.Location),
			BoundingBox:     parseBoundingBox(raw.BoundingBox),
			CircuitIDs:      parseCircuitIDsFromPowerInfo(raw.PowerInfo),
			Fuel:            fuel,
			IncomingRate:    raw.AvgIncRate,
			OutgoingRate:    raw.AvgOutRate,
			InputInventory:  inputInventory,
			OutputInventory: outputInventory,
		}
	}
	return stations, nil
}

// ListTruckStations fetches truck station data
func (client *Client) ListTruckStations(ctx context.Context) ([]models.TruckStation, error) {
	var rawStations []frm_models.TruckStation
	err := client.makeSatisfactoryCall(ctx, "/getTruckStation", &rawStations)
	if err != nil {
		return nil, fmt.Errorf("failed to get truck stations. details: %w", err)
	}

	stations := make([]models.TruckStation, len(rawStations))
	for i, raw := range rawStations {
		// Parse Inventory
		inventory := make([]models.ItemStats, len(raw.Inventory))
		for j, item := range raw.Inventory {
			inventory[j] = models.ItemStats{
				Name:  item.Name,
				Count: item.Amount,
			}
		}

		stations[i] = models.TruckStation{
			Name:            raw.Name,
			Location:        parseLocation(raw.Location),
			BoundingBox:     parseBoundingBox(raw.BoundingBox),
			CircuitIDs:      parseCircuitIDsFromPowerInfo(raw.PowerInfo),
			TransferRate:    raw.TransferRate,
			MaxTransferRate: raw.MaxTransferRate,
			Inventory:       inventory,
		}
	}
	return stations, nil
}

// ListTractors fetches tractor data
func (client *Client) ListTractors(ctx context.Context) ([]models.Tractor, error) {
	var rawTractors []frm_models.Tractor
	err := client.makeSatisfactoryCall(ctx, "/getTractor", &rawTractors)
	if err != nil {
		return nil, fmt.Errorf("failed to get tractors. details: %w", err)
	}

	tractors := make([]models.Tractor, len(rawTractors))
	for i, raw := range rawTractors {
		var inventory []models.ItemStats
		for _, item := range raw.Storage {
			inventory = append(inventory, models.ItemStats{
				Name:  item.Name,
				Count: item.Amount,
			})
		}

		var status models.TractorStatus
		if raw.AutoPilot {
			status = models.TractorStatusSelfDriving
		} else if raw.Driver != "" {
			status = models.TractorStatusManualDriving
		} else {
			status = models.TractorStatusParked
		}

		// Pick first fuel entry as primary fuel
		var fuel *models.Fuel
		if len(raw.Fuel) > 0 {
			fuel = &models.Fuel{
				Name:   raw.Fuel[0].FuelName,
				Amount: raw.Fuel[0].Amount,
			}
		}

		tractors[i] = models.Tractor{
			Name:      raw.Name,
			Speed:     raw.ForwardSpeed,
			Status:    status,
			Fuel:      fuel,
			Inventory: inventory,
			Location:  parseLocation(raw.Location),
		}
	}
	return tractors, nil
}

// ListExplorers fetches explorer data
func (client *Client) ListExplorers(ctx context.Context) ([]models.Explorer, error) {
	var rawExplorers []frm_models.Explorer
	err := client.makeSatisfactoryCall(ctx, "/getExplorer", &rawExplorers)
	if err != nil {
		return nil, fmt.Errorf("failed to get explorers. details: %w", err)
	}

	explorers := make([]models.Explorer, len(rawExplorers))
	for i, raw := range rawExplorers {
		var inventory []models.ItemStats
		for _, item := range raw.Storage {
			inventory = append(inventory, models.ItemStats{
				Name:  item.Name,
				Count: item.Amount,
			})
		}

		var status models.ExplorerStatus
		if raw.AutoPilot {
			status = models.ExplorerStatusSelfDriving
		} else if raw.Driver != "" {
			status = models.ExplorerStatusManualDriving
		} else {
			status = models.ExplorerStatusParked
		}

		// Pick first fuel entry as primary fuel
		var fuel *models.Fuel
		if len(raw.Fuel) > 0 {
			fuel = &models.Fuel{
				Name:   raw.Fuel[0].FuelName,
				Amount: raw.Fuel[0].Amount,
			}
		}

		explorers[i] = models.Explorer{
			Name:      raw.Name,
			Speed:     raw.ForwardSpeed,
			Status:    status,
			Fuel:      fuel,
			Inventory: inventory,
			Location:  parseLocation(raw.Location),
		}
	}
	return explorers, nil
}

// ListVehiclePaths fetches vehicle path data
// NOTE: FRM /getVehiclePaths endpoint currently causes crashes, returning empty list
func (client *Client) ListVehiclePaths(ctx context.Context) ([]models.VehiclePath, error) {
	// TODO: Re-enable when FRM fixes the /getVehiclePaths endpoint
	// var rawPaths []frm_models.VehiclePath
	// err := client.makeSatisfactoryCall(ctx, "/getVehiclePaths", &rawPaths)
	// if err != nil {
	// 	return nil, fmt.Errorf("failed to get vehicle paths. details: %w", err)
	// }
	//
	// paths := make([]models.VehiclePath, len(rawPaths))
	// for i, raw := range rawPaths {
	// 	// Convert vertices to our location type
	// 	vertices := make([]models.Location, len(raw.Vertices))
	// 	for j, v := range raw.Vertices {
	// 		vertices[j] = models.Location{X: v.X, Y: v.Y, Z: v.Z, Rotation: 0}
	// 	}
	//
	// 	// Map FRM vehicle type string to our enum
	// 	var vehicleType models.VehiclePathType
	// 	switch raw.VehicleType {
	// 	case "Explorer":
	// 		vehicleType = models.VehiclePathTypeExplorer
	// 	case "Factory Cart":
	// 		vehicleType = models.VehiclePathTypeFactoryCart
	// 	case "Truck":
	// 		vehicleType = models.VehiclePathTypeTruck
	// 	case "Tractor":
	// 		vehicleType = models.VehiclePathTypeTractor
	// 	default:
	// 		vehicleType = models.VehiclePathTypeTruck // Default to Truck
	// 	}
	//
	// 	paths[i] = models.VehiclePath{
	// 		Name:        raw.PathName,
	// 		VehicleType: vehicleType,
	// 		PathLength:  raw.PathLength / 100, // Convert from cm to meters
	// 		Vertices:    vertices,
	// 	}
	// }
	// return paths, nil

	return []models.VehiclePath{}, nil
}
