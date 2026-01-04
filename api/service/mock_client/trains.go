package mock_client

import (
	"api/models/models"
	"context"
	"math/rand"
	"time"
)

type mockPlatformConfig struct {
	platformType models.TrainStationPlatformType
	items        []models.ItemStats
}

var trainStationData = []struct {
	name      string
	loc       models.Location
	platforms []mockPlatformConfig
}{
	{"Iron Mine Alpha", loc(0, 0, 0, 0), []mockPlatformConfig{
		{models.TrainStationPlatformTypeFreight, []models.ItemStats{{Name: "Iron Ore", Count: 2400}}},
		{models.TrainStationPlatformTypeFreight, []models.ItemStats{{Name: "Limestone", Count: 800}}},
	}},
	{"Copper Mine Beta", loc(18000, 2000, 12000, 45), []mockPlatformConfig{
		{models.TrainStationPlatformTypeFreight, []models.ItemStats{{Name: "Copper Ore", Count: 1800}}},
	}},
	{"Steel Foundry Central", loc(38000, 5000, 32000, 90), []mockPlatformConfig{
		{models.TrainStationPlatformTypeFreight, []models.ItemStats{{Name: "Steel Ingot", Count: 1200}, {Name: "Steel Beam", Count: 600}}},
		{models.TrainStationPlatformTypeFreight, []models.ItemStats{{Name: "Iron Ingot", Count: 1000}}},
	}},
	{"Oil Refinery West", loc(-30000, 1000, 48000, 180), []mockPlatformConfig{
		{models.TrainStationPlatformTypeFluidFreight, []models.ItemStats{{Name: "Crude Oil", Count: 5000}}},
		{models.TrainStationPlatformTypeFreight, []models.ItemStats{{Name: "Plastic", Count: 1600}, {Name: "Rubber", Count: 1200}}},
	}},
	{"Aluminum Processing", loc(48000, 8000, -18000, 270), []mockPlatformConfig{
		{models.TrainStationPlatformTypeFluidFreight, []models.ItemStats{{Name: "Alumina Solution", Count: 3000}}},
		{models.TrainStationPlatformTypeFreight, []models.ItemStats{{Name: "Aluminum Ingot", Count: 800}}},
	}},
	{"Computer Factory Hub", loc(55000, 10000, 45000, 135), []mockPlatformConfig{
		{models.TrainStationPlatformTypeFreight, []models.ItemStats{{Name: "Computer", Count: 80}, {Name: "Circuit Board", Count: 300}}},
		{models.TrainStationPlatformTypeFreight, []models.ItemStats{{Name: "Heavy Modular Frame", Count: 50}}},
	}},
	{"Nuclear Facility", loc(-50000, 3000, -50000, 225), []mockPlatformConfig{
		{models.TrainStationPlatformTypeFreight, []models.ItemStats{{Name: "Uranium Fuel Rod", Count: 25}}},
		{models.TrainStationPlatformTypeFluidFreight, []models.ItemStats{{Name: "Sulfuric Acid", Count: 2000}}},
	}},
	{"Main Storage Depot", loc(25000, 4000, 18000, 0), []mockPlatformConfig{
		{models.TrainStationPlatformTypeFreight, []models.ItemStats{{Name: "Iron Plate", Count: 2000}, {Name: "Iron Rod", Count: 1500}}},
		{models.TrainStationPlatformTypeFreight, []models.ItemStats{{Name: "Copper Sheet", Count: 1000}}},
		{models.TrainStationPlatformTypeFreight, []models.ItemStats{{Name: "Concrete", Count: 3000}}},
	}},
}

func (c *Client) ListTrainStations(_ context.Context) ([]models.TrainStation, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)
	stations := make([]models.TrainStation, len(trainStationData))
	for i, s := range trainStationData {
		// Generate platforms with bounding boxes offset from station
		platforms := make([]models.TrainStationPlatform, len(s.platforms))
		for j, p := range s.platforms {
			// Offset each platform along the station direction
			platformOffset := float64(j+1) * 1000
			platformLoc := models.Location{
				X:        s.loc.X + platformOffset,
				Y:        s.loc.Y,
				Z:        s.loc.Z,
				Rotation: s.loc.Rotation,
			}
			platforms[j] = models.TrainStationPlatform{
				Type:     p.platformType,
				Location: platformLoc,
				BoundingBox: models.BoundingBox{
					Min: models.Location{X: platformLoc.X - 800, Y: platformLoc.Y - 1700, Z: platformLoc.Z},
					Max: models.Location{X: platformLoc.X + 800, Y: platformLoc.Y + 1700, Z: platformLoc.Z + 2000},
				},
				Inventory:   p.items,
				InflowRate:  randRange(0, 50),
				OutflowRate: randRange(0, 50),
			}
		}

		stations[i] = models.TrainStation{
			Name:     s.name,
			Location: s.loc,
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: s.loc.X - 800, Y: s.loc.Y - 1700, Z: s.loc.Z},
				Max: models.Location{X: s.loc.X + 800, Y: s.loc.Y + 1700, Z: s.loc.Z + 2100},
			},
			CircuitIDs: getStableCircuitID(i),
			Platforms:  platforms,
		}
	}
	return stations, nil
}

func (c *Client) ListTrains(ctx context.Context) ([]models.Train, error) {
	stations, _ := c.ListTrainStations(ctx)
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	stationMap := make(map[string]models.Location)
	for _, s := range stations {
		stationMap[s.Name] = s.Location
	}

	type trainConfig struct {
		name            string
		timetable       []string
		segmentDuration int64
		dockingPercent  float64
		baseSpeed       float64
		basePower       float64
		vehicles        []models.TrainVehicle
	}

	configs := []trainConfig{
		{"[IRN] Iron Express", []string{"Iron Mine Alpha", "Steel Foundry Central", "Main Storage Depot"}, 25, 0.2, 100, 95,
			[]models.TrainVehicle{
				{Type: models.TrainTypeLocomotive, Capacity: 100, Inventory: []models.ItemStats{}},
				{Type: models.TrainTypeFreight, Capacity: 3200, Inventory: []models.ItemStats{itemStats("Iron Ore", 2400, 500), itemStats("Limestone", 800, 200)}},
				{Type: models.TrainTypeFreight, Capacity: 3200, Inventory: []models.ItemStats{itemStats("Iron Ingot", 1600, 400)}},
				{Type: models.TrainTypeFreight, Capacity: 3200, Inventory: []models.ItemStats{itemStats("Steel Ingot", 1200, 300), itemStats("Steel Beam", 600, 150)}},
			}},
		{"[COP] Copper Runner", []string{"Copper Mine Beta", "Computer Factory Hub"}, 20, 0.25, 110, 75,
			[]models.TrainVehicle{
				{Type: models.TrainTypeLocomotive, Capacity: 100, Inventory: []models.ItemStats{}},
				{Type: models.TrainTypeFreight, Capacity: 3200, Inventory: []models.ItemStats{itemStats("Copper Ore", 2800, 400)}},
				{Type: models.TrainTypeFreight, Capacity: 3200, Inventory: []models.ItemStats{itemStats("Copper Ingot", 1400, 300), itemStats("Wire", 2200, 400)}},
			}},
		{"[OIL] Petroleum Express", []string{"Oil Refinery West", "Computer Factory Hub", "Main Storage Depot"}, 30, 0.15, 95, 88,
			[]models.TrainVehicle{
				{Type: models.TrainTypeLocomotive, Capacity: 100, Inventory: []models.ItemStats{}},
				{Type: models.TrainTypeFreight, Capacity: 3200, Inventory: []models.ItemStats{itemStats("Plastic", 1600, 400), itemStats("Rubber", 1200, 300)}},
				{Type: models.TrainTypeFreight, Capacity: 3200, Inventory: []models.ItemStats{itemStats("Packaged Fuel", 800, 200), itemStats("Packaged Turbofuel", 400, 100)}},
			}},
		{"[ALU] Aluminum Shuttle", []string{"Aluminum Processing", "Computer Factory Hub"}, 22, 0.2, 105, 82,
			[]models.TrainVehicle{
				{Type: models.TrainTypeLocomotive, Capacity: 100, Inventory: []models.ItemStats{}},
				{Type: models.TrainTypeFreight, Capacity: 3200, Inventory: []models.ItemStats{itemStats("Aluminum Ingot", 1000, 250), itemStats("Aluminum Casing", 600, 150)}},
				{Type: models.TrainTypeFreight, Capacity: 3200, Inventory: []models.ItemStats{itemStats("Alclad Aluminum Sheet", 400, 100), itemStats("Heat Sink", 200, 50)}},
			}},
		{"[HVY] Heavy Cargo", []string{"Steel Foundry Central", "Computer Factory Hub", "Main Storage Depot"}, 35, 0.25, 80, 105,
			[]models.TrainVehicle{
				{Type: models.TrainTypeLocomotive, Capacity: 100, Inventory: []models.ItemStats{}},
				{Type: models.TrainTypeLocomotive, Capacity: 100, Inventory: []models.ItemStats{}},
				{Type: models.TrainTypeFreight, Capacity: 3200, Inventory: []models.ItemStats{itemStats("Heavy Modular Frame", 50, 20), itemStats("Modular Frame", 200, 50)}},
				{Type: models.TrainTypeFreight, Capacity: 3200, Inventory: []models.ItemStats{itemStats("Computer", 80, 20), itemStats("Circuit Board", 300, 80)}},
			}},
		{"[NUC] Nuclear Supply", []string{"Nuclear Facility", "Main Storage Depot"}, 40, 0.3, 70, 90,
			[]models.TrainVehicle{
				{Type: models.TrainTypeLocomotive, Capacity: 100, Inventory: []models.ItemStats{}},
				{Type: models.TrainTypeFreight, Capacity: 3200, Inventory: []models.ItemStats{itemStats("Uranium Fuel Rod", 25, 10), itemStats("Electromagnetic Control Rod", 40, 15)}},
				{Type: models.TrainTypeFreight, Capacity: 3200, Inventory: []models.ItemStats{itemStats("Cooling System", 30, 10), itemStats("Heat Sink", 100, 30)}},
			}},
	}

	trains := make([]models.Train, len(configs))
	for i, cfg := range configs {
		stationLocs := make([]models.Location, len(cfg.timetable))
		for j, name := range cfg.timetable {
			stationLocs[j] = stationMap[name]
		}

		cycle := calculateTrainCycle(stationLocs, cfg.segmentDuration, cfg.dockingPercent, cfg.baseSpeed, cfg.basePower)

		timetable := make([]models.TrainTimetableEntry, len(cfg.timetable))
		for j, name := range cfg.timetable {
			timetable[j] = models.TrainTimetableEntry{Station: name}
		}

		trains[i] = models.Train{
			Name:             cfg.name,
			Speed:            cycle.speed,
			Status:           cycle.status,
			PowerConsumption: cycle.power,
			Timetable:        timetable,
			TimetableIndex:   cycle.timetableIndex,
			Vehicles:         cfg.vehicles,
			Location:         cycle.location,
			CircuitIDs:       getStableCircuitID(i),
		}
	}
	return trains, nil
}
