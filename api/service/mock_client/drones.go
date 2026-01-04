package mock_client

import (
	"api/models/models"
	"context"
	"math/rand"
	"time"
)

var droneStationData = []struct {
	name     string
	loc      models.Location
	fuelName string
}{
	{"Computer Factory Port", loc(55000, 12000, 45000, 0), "Packaged Turbofuel"},
	{"Quartz Processing Port", loc(58000, 6000, 58000, 45), "Packaged Turbofuel"},
	{"Nuclear Facility Port", loc(-50000, 5000, -50000, 90), "Packaged Fuel"},
	{"Remote Mining Outpost", loc(60000, 20000, 60000, 180), "Packaged Fuel"},
	{"Oil Platform Alpha", loc(-55000, 1000, 55000, 270), "Packaged Turbofuel"},
	{"Sulfur Extraction Site", loc(50000, 15000, -45000, 135), "Packaged Fuel"},
}

func (c *Client) ListDroneStations(_ context.Context) ([]models.DroneStation, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)
	stations := make([]models.DroneStation, len(droneStationData))
	for i, s := range droneStationData {
		fuel := &models.Fuel{
			Name:   s.fuelName,
			Amount: randRange(500, 100),
		}

		stations[i] = models.DroneStation{Name: s.name, Location: s.loc, Fuel: fuel, CircuitIDs: getStableCircuitID(i)}
	}
	return stations, nil
}

func (c *Client) ListDrones(ctx context.Context) ([]models.Drone, error) {
	stations, _ := c.ListDroneStations(ctx)
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	type droneConfig struct {
		name          string
		homeIdx       int
		pairedIdx     int
		cycleDuration int64
		baseSpeed     float64
	}

	configs := []droneConfig{
		{"Crystal Courier", 0, 1, 20, 200},
		{"Nuclear Runner", 2, 0, 45, 220},
		{"Remote Miner Shuttle", 3, 0, 60, 180},
		{"Oil Transport Alpha", 4, 0, 35, 210},
		{"Sulfur Express", 5, 0, 30, 190},
	}

	drones := make([]models.Drone, len(configs))
	for i, cfg := range configs {
		cycle := calculateDroneCycle(stations[cfg.homeIdx], stations[cfg.pairedIdx], cfg.cycleDuration, cfg.baseSpeed)

		drones[i] = models.Drone{
			Name:        cfg.name,
			Speed:       cycle.speed,
			Status:      cycle.status,
			Location:    cycle.location,
			CircuitIDs:  getStableCircuitID(i),
			Home:        stations[cfg.homeIdx],
			Paired:      &stations[cfg.pairedIdx],
			Destination: cycle.destination,
		}
	}
	return drones, nil
}
