package mock_client

import (
	"api/models/models"
	"context"
	"math/rand"
	"time"
)

var truckStationData = []struct {
	name string
	loc  models.Location
}{
	{"Main Factory Hub", loc(15000, 3000, 15000, 0)},
	{"Remote Mining Outpost", loc(60000, 20000, 60000, 180)},
	{"Oil Platform Alpha", loc(-55000, 1000, 55000, 270)},
	{"Sulfur Extraction Site", loc(50000, 15000, -45000, 135)},
}

var tractorStationData = []struct {
	name string
	loc  models.Location
}{
	{"Farm Outpost", loc(25000, 5000, 25000, 0)},
	{"Resource Depot", loc(40000, 8000, 40000, 180)},
}

var explorerStationData = []struct {
	name string
	loc  models.Location
}{
	{"Exploration Base", loc(35000, 12000, 35000, 0)},
	{"Remote Site Alpha", loc(70000, 25000, 70000, 180)},
	{"Remote Site Beta", loc(-30000, 8000, 50000, 90)},
}

func (c *Client) GetVehicles(ctx context.Context) (models.Vehicles, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	trains, _ := c.ListTrains(ctx)
	drones, _ := c.ListDrones(ctx)
	trucks, _ := c.ListTrucks(ctx)
	tractors, _ := c.ListTractors(ctx)
	explorers, _ := c.ListExplorers(ctx)

	return models.Vehicles{
		Trains:    trains,
		Drones:    drones,
		Trucks:    trucks,
		Tractors:  tractors,
		Explorers: explorers,
	}, nil
}

func (c *Client) GetVehicleStations(ctx context.Context) (models.VehicleStations, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	trainStations, _ := c.ListTrainStations(ctx)
	droneStations, _ := c.ListDroneStations(ctx)
	truckStations, _ := c.ListTruckStations(ctx)

	return models.VehicleStations{
		TrainStations: trainStations,
		DroneStations: droneStations,
		TruckStations: truckStations,
	}, nil
}

func (c *Client) ListTruckStations(_ context.Context) ([]models.TruckStation, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)
	stations := make([]models.TruckStation, len(truckStationData))
	for i, s := range truckStationData {
		stations[i] = models.TruckStation{Name: s.name, Location: s.loc, CircuitIDs: getStableCircuitID(i)}
	}
	return stations, nil
}

func (c *Client) ListTrucks(_ context.Context) ([]models.Truck, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	type truckConfig struct {
		name      string
		homeIdx   int
		destIdx   int
		baseSpeed float64
		fuelName  string
		inventory []models.ItemStats
	}

	configs := []truckConfig{
		{"Hauler Alpha", 0, 1, 60, "Fuel", []models.ItemStats{
			itemStats("Iron Ore", 1500, 500), itemStats("Copper Ore", 800, 200),
		}},
		{"Oil Tanker", 2, 0, 50, "Fuel", []models.ItemStats{
			itemStats("Packaged Fuel", 600, 200), itemStats("Packaged Oil", 400, 100),
		}},
		{"Sulfur Runner", 3, 0, 70, "Turbofuel", []models.ItemStats{
			itemStats("Sulfur", 1000, 300), itemStats("Coal", 500, 150),
		}},
		{"Mining Shuttle", 1, 3, 55, "Fuel", []models.ItemStats{
			itemStats("Raw Quartz", 400, 100), itemStats("Bauxite", 600, 200),
		}},
	}

	trucks := make([]models.Truck, len(configs))
	for i, cfg := range configs {
		// Calculate truck position based on time cycle
		nowSec := time.Now().Unix()
		cycleDuration := int64(120) // 2-minute cycle
		cyclePos := nowSec % cycleDuration
		cyclePercent := float64(cyclePos) / float64(cycleDuration)

		homeLoc := truckStationData[cfg.homeIdx].loc
		destLoc := truckStationData[cfg.destIdx].loc

		var status models.TruckStatus
		var speed float64
		var location models.Location

		switch {
		case cyclePercent < 0.15:
			// Parked at home
			status = models.TruckStatusParked
			speed = 0
			location = homeLoc
		case cyclePercent < 0.50:
			// Driving to destination
			progress := (cyclePercent - 0.15) / 0.35
			status = models.TruckStatusSelfDriving
			speed = randRange(cfg.baseSpeed, 15)
			location = lerpLoc(homeLoc, destLoc, progress)
		case cyclePercent < 0.65:
			// Parked at destination
			status = models.TruckStatusParked
			speed = 0
			location = destLoc
		default:
			// Driving home
			progress := (cyclePercent - 0.65) / 0.35
			status = models.TruckStatusSelfDriving
			speed = randRange(cfg.baseSpeed, 15)
			location = lerpLoc(destLoc, homeLoc, progress)
		}

		trucks[i] = models.Truck{
			Name:   cfg.name,
			Speed:  speed,
			Status: status,
			Fuel: &models.Fuel{
				Name:   cfg.fuelName,
				Amount: randRange(300, 200),
			},
			Inventory:  cfg.inventory,
			Location:   location,
			CircuitIDs: getStableCircuitID(i),
		}
	}
	return trucks, nil
}

func (c *Client) ListTractors(_ context.Context) ([]models.Tractor, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	type tractorConfig struct {
		name      string
		homeIdx   int
		destIdx   int
		baseSpeed float64
		fuelName  string
		inventory []models.ItemStats
	}

	configs := []tractorConfig{
		{"Farm Tractor 1", 0, 1, 40, "Fuel", []models.ItemStats{
			itemStats("Leaves", 500, 200), itemStats("Wood", 300, 100),
		}},
		{"Resource Tractor", 1, 0, 45, "Fuel", []models.ItemStats{
			itemStats("Limestone", 800, 300), itemStats("Iron Ore", 500, 200),
		}},
	}

	tractors := make([]models.Tractor, len(configs))
	for i, cfg := range configs {
		// Calculate tractor position based on time cycle
		nowSec := time.Now().Unix()
		cycleDuration := int64(90) // 1.5-minute cycle
		cyclePos := nowSec % cycleDuration
		cyclePercent := float64(cyclePos) / float64(cycleDuration)

		homeLoc := tractorStationData[cfg.homeIdx].loc
		destLoc := tractorStationData[cfg.destIdx].loc

		var status models.TractorStatus
		var speed float64
		var location models.Location

		switch {
		case cyclePercent < 0.15:
			status = models.TractorStatusParked
			speed = 0
			location = homeLoc
		case cyclePercent < 0.50:
			progress := (cyclePercent - 0.15) / 0.35
			status = models.TractorStatusSelfDriving
			speed = randRange(cfg.baseSpeed, 10)
			location = lerpLoc(homeLoc, destLoc, progress)
		case cyclePercent < 0.65:
			status = models.TractorStatusParked
			speed = 0
			location = destLoc
		default:
			progress := (cyclePercent - 0.65) / 0.35
			status = models.TractorStatusSelfDriving
			speed = randRange(cfg.baseSpeed, 10)
			location = lerpLoc(destLoc, homeLoc, progress)
		}

		tractors[i] = models.Tractor{
			Name:   cfg.name,
			Speed:  speed,
			Status: status,
			Fuel: &models.Fuel{
				Name:   cfg.fuelName,
				Amount: randRange(200, 100),
			},
			Inventory:  cfg.inventory,
			Location:   location,
			CircuitIDs: getStableCircuitID(i + 100), // Offset to avoid collision with other vehicles
		}
	}
	return tractors, nil
}

func (c *Client) ListExplorers(_ context.Context) ([]models.Explorer, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	type explorerConfig struct {
		name      string
		homeIdx   int
		destIdx   int
		baseSpeed float64
		fuelName  string
		inventory []models.ItemStats
	}

	configs := []explorerConfig{
		{"Scout Alpha", 0, 1, 70, "Fuel", []models.ItemStats{
			itemStats("Power Shard", 10, 5), itemStats("Mercer Sphere", 3, 2),
		}},
		{"Pathfinder", 0, 2, 65, "Turbofuel", []models.ItemStats{
			itemStats("Somersloop", 2, 1), itemStats("Hard Drive", 5, 3),
		}},
	}

	explorers := make([]models.Explorer, len(configs))
	for i, cfg := range configs {
		// Calculate explorer position based on time cycle
		nowSec := time.Now().Unix()
		cycleDuration := int64(150) // 2.5-minute cycle
		cyclePos := nowSec % cycleDuration
		cyclePercent := float64(cyclePos) / float64(cycleDuration)

		homeLoc := explorerStationData[cfg.homeIdx].loc
		destLoc := explorerStationData[cfg.destIdx].loc

		var status models.ExplorerStatus
		var speed float64
		var location models.Location

		switch {
		case cyclePercent < 0.10:
			status = models.ExplorerStatusParked
			speed = 0
			location = homeLoc
		case cyclePercent < 0.45:
			progress := (cyclePercent - 0.10) / 0.35
			status = models.ExplorerStatusSelfDriving
			speed = randRange(cfg.baseSpeed, 15)
			location = lerpLoc(homeLoc, destLoc, progress)
		case cyclePercent < 0.55:
			status = models.ExplorerStatusParked
			speed = 0
			location = destLoc
		default:
			progress := (cyclePercent - 0.55) / 0.45
			status = models.ExplorerStatusSelfDriving
			speed = randRange(cfg.baseSpeed, 15)
			location = lerpLoc(destLoc, homeLoc, progress)
		}

		explorers[i] = models.Explorer{
			Name:   cfg.name,
			Speed:  speed,
			Status: status,
			Fuel: &models.Fuel{
				Name:   cfg.fuelName,
				Amount: randRange(400, 200),
			},
			Inventory:  cfg.inventory,
			Location:   location,
			CircuitIDs: getStableCircuitID(i + 200), // Offset to avoid collision with other vehicles
		}
	}
	return explorers, nil
}

func (c *Client) ListVehiclePaths(_ context.Context) ([]models.VehiclePath, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	paths := []models.VehiclePath{
		{
			Name:        "Main Truck Route",
			VehicleType: models.VehiclePathTypeTruck,
			PathLength:  1250.5, // meters
			Vertices: []models.Location{
				loc(15000, 3000, 15000, 0),
				loc(20000, 5000, 25000, 0),
				loc(35000, 10000, 40000, 0),
				loc(50000, 15000, 55000, 0),
				loc(60000, 20000, 60000, 0),
			},
		},
		{
			Name:        "Oil Transport Route",
			VehicleType: models.VehiclePathTypeTruck,
			PathLength:  980.2, // meters
			Vertices: []models.Location{
				loc(-55000, 1000, 55000, 0),
				loc(-40000, 2000, 45000, 0),
				loc(-20000, 2500, 30000, 0),
				loc(0, 2800, 20000, 0),
				loc(15000, 3000, 15000, 0),
			},
		},
		{
			Name:        "Farm Tractor Path",
			VehicleType: models.VehiclePathTypeTractor,
			PathLength:  420.8, // meters
			Vertices: []models.Location{
				loc(25000, 5000, 25000, 0),
				loc(28000, 5500, 30000, 0),
				loc(33000, 7000, 35000, 0),
				loc(40000, 8000, 40000, 0),
			},
		},
		{
			Name:        "Exploration Path Alpha",
			VehicleType: models.VehiclePathTypeExplorer,
			PathLength:  1850.3, // meters
			Vertices: []models.Location{
				loc(35000, 12000, 35000, 0),
				loc(40000, 15000, 45000, 0),
				loc(50000, 18000, 55000, 0),
				loc(60000, 22000, 65000, 0),
				loc(70000, 25000, 70000, 0),
			},
		},
		{
			Name:        "Exploration Path Beta",
			VehicleType: models.VehiclePathTypeExplorer,
			PathLength:  1420.6, // meters
			Vertices: []models.Location{
				loc(35000, 12000, 35000, 0),
				loc(20000, 10000, 40000, 0),
				loc(0, 9000, 45000, 0),
				loc(-30000, 8000, 50000, 0),
			},
		},
	}

	return paths, nil
}
