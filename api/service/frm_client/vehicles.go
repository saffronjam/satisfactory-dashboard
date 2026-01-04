package frm_client

import (
	"api/models/models"
	"api/service/frm_client/frm_models"
	"context"
	"fmt"
	"sync"
)

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
			ID:        raw.ID,
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
			ID:        raw.ID,
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
			ID:        raw.ID,
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
