package frm_client

import (
	"api/models/models"
	"api/service/frm_client/frm_models"
	"context"
	"fmt"
	"sync"
)

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
