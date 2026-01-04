package mock_client

import (
	"api/models/models"
	"api/pkg/log"
	"context"
	"fmt"
	"math"
	"math/rand"
	"time"
)

type Client struct{}

func NewClient() *Client {
	return &Client{}
}

var now = time.Now().UnixMilli()

// ============================================================================
// Helper Functions
// ============================================================================

// randRange returns a random float64 in [base, base+variance)
func randRange(base, variance float64) float64 {
	return base + rand.Float64()*variance
}

// randInt returns a random int in [base, base+variance)
func randInt(base, variance int) int {
	return base + rand.Intn(variance)
}

// loc creates a Location
func loc(x, y, z, rotation float64) models.Location {
	return models.Location{X: x, Y: y, Z: z, Rotation: rotation}
}

// lerp linearly interpolates between two values
func lerp(a, b, t float64) float64 {
	return a + (b-a)*t
}

// lerpLoc linearly interpolates between two locations
func lerpLoc(from, to models.Location, t float64) models.Location {
	return models.Location{
		X:        lerp(from.X, to.X, t),
		Y:        lerp(from.Y, to.Y, t),
		Z:        lerp(from.Z, to.Z, t),
		Rotation: from.Rotation,
	}
}

// itemStats creates an ItemStats with random variance
func itemStats(name string, base, variance float64) models.ItemStats {
	return models.ItemStats{Name: name, Count: randRange(base, variance)}
}

// prodStats creates a MachineProdStats
func prodStats(name string, current, max, stored, efficiency float64) models.MachineProdStats {
	return models.MachineProdStats{
		Name:       name,
		Current:    current,
		Max:        max,
		Stored:     stored,
		Efficiency: efficiency,
	}
}

// prodStatsRand creates a MachineProdStats with random variance
func prodStatsRand(name string, currentBase, currentVar, max, storedBase, storedVar, effBase, effVar float64) models.MachineProdStats {
	return models.MachineProdStats{
		Name:       name,
		Current:    randRange(currentBase, currentVar),
		Max:        max,
		Stored:     randRange(storedBase, storedVar),
		Efficiency: randRange(effBase, effVar),
	}
}

// getStableCircuitID returns a circuit ID that changes every 30 seconds
// Uses entity index offset so different entities don't all change at once
func getStableCircuitID(entityIndex int) models.CircuitIDs {
	cycle := time.Now().Unix() / 30
	circuitID := 1 + int((cycle+int64(entityIndex))%5) // Rotate through circuits 1-5
	return models.CircuitIDs{
		CircuitID: circuitID,
	}
}

// ============================================================================
// Item Production Stats Generator
// ============================================================================

type itemProdConfig struct {
	name            string
	minable         bool
	baseCount       float64
	countRate       float64 // divisor for time-based count increase
	prodBase        float64
	prodMax         float64
	consBase        float64
	consMax         float64
	efficiencyBase  float64
	efficiencyRange float64
}

func generateItemProdStats(cfg itemProdConfig) models.ItemProdStats {
	elapsed := float64(time.Now().UnixMilli() - now)
	return models.ItemProdStats{
		ItemStats: models.ItemStats{
			Name:  cfg.name,
			Count: cfg.baseCount + elapsed/cfg.countRate,
		},
		Minable:             cfg.minable,
		ProducedPerMinute:   randRange(cfg.prodBase, cfg.prodMax*0.1),
		MaxProducePerMinute: randRange(cfg.prodMax, cfg.prodMax*0.05),
		ProduceEfficiency:   randRange(cfg.efficiencyBase, cfg.efficiencyRange),
		ConsumedPerMinute:   randRange(cfg.consBase, cfg.consMax*0.1),
		MaxConsumePerMinute: randRange(cfg.consMax, cfg.consMax*0.05),
		ConsumeEfficiency:   randRange(cfg.efficiencyBase-0.05, cfg.efficiencyRange),
	}
}

// ============================================================================
// Machine Generator
// ============================================================================

type machineConfig struct {
	machineType models.MachineType
	category    models.MachineCategory
	status      models.MachineStatus
	location    models.Location
	inputs      []models.MachineProdStats
	outputs     []models.MachineProdStats
}

func generateMachine(cfg machineConfig) models.Machine {
	// Generate a bounding box based on location (simulating machine footprint)
	boundingBox := models.BoundingBox{
		Min: models.Location{X: cfg.location.X - 500, Y: cfg.location.Y - 500, Z: cfg.location.Z - 100},
		Max: models.Location{X: cfg.location.X + 500, Y: cfg.location.Y + 500, Z: cfg.location.Z + 500},
	}
	return models.Machine{
		Type:        cfg.machineType,
		Category:    cfg.category,
		Status:      cfg.status,
		Location:    cfg.location,
		BoundingBox: boundingBox,
		Input:       cfg.inputs,
		Output:      cfg.outputs,
	}
}

// ============================================================================
// Drone Cycle Logic
// ============================================================================

type droneCycleResult struct {
	status      models.DroneStatus
	speed       float64
	location    models.Location
	destination *models.DroneStation
}

func calculateDroneCycle(home, paired models.DroneStation, cycleDuration int64, baseSpeed float64) droneCycleResult {
	nowSec := time.Now().Unix()
	cyclePos := nowSec % cycleDuration
	cyclePercent := float64(cyclePos) / float64(cycleDuration)

	// Phases: 0-10% dock@home, 10-50% fly to paired, 50-60% dock@paired, 60-100% fly home
	var result droneCycleResult
	pairedPtr := &paired

	switch {
	case cyclePercent < 0.10:
		result.status = models.DroneStatusDocking
		result.speed = 0
		result.location = home.Location
		result.destination = pairedPtr
	case cyclePercent < 0.50:
		progress := (cyclePercent - 0.10) / 0.40
		result.status = models.DroneStatusFlying
		result.speed = randRange(baseSpeed, 50)
		result.location = lerpLoc(home.Location, paired.Location, progress)
		result.location.Y += 5000 // Flying altitude (scaled 10x)
		result.destination = pairedPtr
	case cyclePercent < 0.60:
		result.status = models.DroneStatusDocking
		result.speed = 0
		result.location = paired.Location
		result.destination = &home
	default:
		progress := (cyclePercent - 0.60) / 0.40
		result.status = models.DroneStatusFlying
		result.speed = randRange(baseSpeed, 50)
		result.location = lerpLoc(paired.Location, home.Location, progress)
		result.location.Y += 5000 // Flying altitude (scaled 10x)
		result.destination = &home
	}

	return result
}

// ============================================================================
// Train Cycle Logic
// ============================================================================

type trainCycleResult struct {
	status         models.TrainStatus
	speed          float64
	power          float64
	location       models.Location
	timetableIndex int
}

func calculateTrainCycle(stations []models.Location, segmentDuration int64, dockingPercent, baseSpeed, basePower float64) trainCycleResult {
	nowSec := time.Now().Unix()
	numStops := len(stations)
	totalCycleDuration := segmentDuration * int64(numStops)
	cyclePos := nowSec % totalCycleDuration

	segmentIndex := int(cyclePos / segmentDuration)
	segmentProgress := float64(cyclePos%segmentDuration) / float64(segmentDuration)

	fromLoc := stations[segmentIndex]
	toLoc := stations[(segmentIndex+1)%numStops]

	var result trainCycleResult
	result.timetableIndex = segmentIndex

	if segmentProgress < dockingPercent {
		result.status = models.TrainStatusDocking
		result.speed = 0
		result.power = basePower * 0.3
		result.location = fromLoc
	} else {
		travelProgress := (segmentProgress - dockingPercent) / (1.0 - dockingPercent)
		result.status = models.TrainStatusSelfDriving
		result.speed = randRange(baseSpeed, 20)
		result.power = randRange(basePower, 15)
		result.location = lerpLoc(fromLoc, toLoc, travelProgress)
	}

	return result
}

// ============================================================================
// Event Stream
// ============================================================================

func Publish[T any](ctx context.Context, eventType models.SatisfactoryEventType, generator func(ctx context.Context) (T, error), onEvent func(*models.SatisfactoryEvent)) {
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			default:
				time.Sleep(time.Duration(rand.Float64()*1000) * time.Millisecond)
				generated, err := generator(ctx)
				if err != nil {
					log.PrettyError(fmt.Errorf("failed to generate event, details: %w", err))
					continue
				}
				onEvent(&models.SatisfactoryEvent{Type: eventType, Data: generated})
			}
		}
	}()
}

func (c *Client) SetupEventStream(ctx context.Context, onEvent func(*models.SatisfactoryEvent)) error {
	Publish(ctx, models.SatisfactoryEventApiStatus, c.GetSatisfactoryApiStatus, onEvent)
	Publish(ctx, models.SatisfactoryEventFactoryStats, c.GetFactoryStats, onEvent)
	Publish(ctx, models.SatisfactoryEventProdStats, c.GetProdStats, onEvent)
	Publish(ctx, models.SatisfactoryEventGeneratorStats, c.GetGeneratorStats, onEvent)
	Publish(ctx, models.SatisfactoryEventSinkStats, c.GetSinkStats, onEvent)
	Publish(ctx, models.SatisfactoryEventCircuits, c.ListCircuits, onEvent)
	Publish(ctx, models.SatisfactoryEventPlayers, c.ListPlayers, onEvent)
	Publish(ctx, models.SatisfactoryEventMachines, c.GetMachines, onEvent)
	Publish(ctx, models.SatisfactoryEventVehicles, c.GetVehicles, onEvent)
	Publish(ctx, models.SatisfactoryEventVehicleStations, c.GetVehicleStations, onEvent)
	Publish(ctx, models.SatisfactoryEventBelts, c.GetBelts, onEvent)
	Publish(ctx, models.SatisfactoryEventPipes, c.GetPipes, onEvent)
	Publish(ctx, models.SatisfactoryEventTrainRails, c.ListTrainRails, onEvent)
	Publish(ctx, models.SatisfactoryEventCables, c.ListCables, onEvent)
	Publish(ctx, models.SatisfactoryEventStorages, c.ListStorageContainers, onEvent)
	Publish(ctx, models.SatisfactoryEventTractors, c.ListTractors, onEvent)
	Publish(ctx, models.SatisfactoryEventExplorers, c.ListExplorers, onEvent)
	Publish(ctx, models.SatisfactoryEventVehiclePaths, c.ListVehiclePaths, onEvent)
	Publish(ctx, models.SatisfactoryEventSpaceElevator, c.GetSpaceElevator, onEvent)
	Publish(ctx, models.SatisfactoryEventRadarTowers, c.ListRadarTowers, onEvent)
	return nil
}

// ============================================================================
// Basic Info
// ============================================================================

func (c *Client) GetSatisfactoryApiStatus(_ context.Context) (*models.SatisfactoryApiStatus, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)
	return &models.SatisfactoryApiStatus{PingMS: randInt(30, 25), Running: true}, nil
}

func (c *Client) GetSessionInfo(_ context.Context) (*models.SessionInfo, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)
	return &models.SessionInfo{
		SessionName:                "Mock Session",
		IsPaused:                   false,
		DayLength:                  50,
		NightLength:                10,
		PassedDays:                 randInt(100, 900),
		NumberOfDaysSinceLastDeath: randInt(0, 100),
		Hours:                      randInt(0, 24),
		Minutes:                    randInt(0, 60),
		Seconds:                    rand.Float64() * 60,
		IsDay:                      rand.Float64() > 0.3,
		TotalPlayDuration:          randInt(100000, 900000),
		TotalPlayDurationText:      fmt.Sprintf("%d:%02d:%02d", randInt(100, 900), randInt(0, 60), randInt(0, 60)),
	}, nil
}

func (c *Client) GetAddress() string {
	return "mock://localhost"
}

// ============================================================================
// Circuits
// ============================================================================

func (c *Client) ListCircuits(_ context.Context) ([]models.Circuit, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	type circuitConfig struct {
		id            string
		consBase      float64
		prodBase      float64
		capBase       float64
		batteryPct    float64
		batteryDiff   float64
		fuseTriggered bool
	}

	configs := []circuitConfig{
		{"1", 450e6, 520e6, 750e6, 72, 70e6, false},
		{"2", 180e6, 200e6, 300e6, 35, 20e6, false},
		{"3", 95e6, 85e6, 120e6, 8, -10e6, true},
		{"4", 1200e6, 1800e6, 2500e6, 88, 600e6, false},
		{"5", 50e6, 60e6, 80e6, 55, 10e6, false},
	}

	circuits := make([]models.Circuit, len(configs))
	for i, cfg := range configs {
		circuits[i] = models.Circuit{
			ID: cfg.id,
			Consumption: models.CircuitConsumption{
				Total: randRange(cfg.consBase, cfg.consBase*0.05),
				Max:   randRange(cfg.consBase*1.3, cfg.consBase*0.05),
			},
			Production: models.CircuitProduction{Total: randRange(cfg.prodBase, cfg.prodBase*0.05)},
			Capacity:   models.CircuitCapacity{Total: randRange(cfg.capBase, cfg.capBase*0.05)},
			Battery: models.CircuitBattery{
				Percentage:   randRange(cfg.batteryPct, 10),
				Capacity:     randRange(cfg.capBase*0.3, cfg.capBase*0.05),
				Differential: randRange(cfg.batteryDiff, math.Abs(cfg.batteryDiff)*0.2),
				UntilFull:    randRange(45, 30),
				UntilEmpty:   randRange(120, 60),
			},
			FuseTriggered: cfg.fuseTriggered,
		}
	}
	return circuits, nil
}

// ============================================================================
// Factory Stats
// ============================================================================

func (c *Client) GetFactoryStats(_ context.Context) (*models.FactoryStats, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	return &models.FactoryStats{
		TotalMachines: randInt(245, 20),
		Efficiency: models.MachineEfficiency{
			MachinesOperating: randInt(180, 15),
			MachinesIdle:      randInt(35, 10),
			MachinesPaused:    randInt(15, 5),
		},
	}, nil
}

// ============================================================================
// Production Stats
// ============================================================================

func (c *Client) GetProdStats(_ context.Context) (*models.ProdStats, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	itemConfigs := []itemProdConfig{
		// Minable ores
		{"Iron Ore", true, 154230, 10, 1200, 1500, 1150, 1500, 0.8, 0.1},
		{"Copper Ore", true, 98500, 10, 720, 900, 680, 900, 0.8, 0.1},
		{"Limestone", true, 67200, 15, 480, 600, 450, 600, 0.8, 0.1},
		{"Coal", true, 45600, 20, 360, 480, 340, 480, 0.75, 0.1},
		{"Caterium Ore", true, 23400, 25, 240, 300, 220, 300, 0.8, 0.1},
		{"Raw Quartz", true, 18900, 30, 180, 240, 170, 240, 0.75, 0.1},
		{"Sulfur", true, 12300, 40, 120, 180, 100, 180, 0.67, 0.1},
		{"Bauxite", true, 34500, 20, 300, 360, 280, 360, 0.83, 0.1},
		{"Uranium", true, 5600, 100, 30, 60, 25, 60, 0.5, 0.1},
		// Ingots
		{"Iron Ingot", false, 89000, 12, 900, 1200, 850, 1200, 0.75, 0.1},
		{"Copper Ingot", false, 56000, 15, 540, 720, 500, 720, 0.75, 0.1},
		{"Steel Ingot", false, 34000, 20, 360, 480, 340, 480, 0.75, 0.1},
		{"Aluminum Ingot", false, 12000, 40, 120, 180, 100, 180, 0.67, 0.1},
		{"Caterium Ingot", false, 8500, 50, 90, 120, 80, 120, 0.75, 0.1},
		// Basic parts
		{"Iron Plate", false, 45000, 18, 450, 600, 420, 600, 0.75, 0.1},
		{"Iron Rod", false, 38000, 20, 380, 480, 350, 480, 0.79, 0.1},
		{"Copper Sheet", false, 28000, 22, 270, 360, 250, 360, 0.75, 0.1},
		{"Steel Beam", false, 16000, 30, 180, 240, 160, 240, 0.75, 0.1},
		{"Steel Pipe", false, 14000, 32, 160, 240, 140, 240, 0.67, 0.1},
		{"Concrete", false, 32000, 20, 300, 450, 280, 450, 0.67, 0.1},
		{"Screw", false, 125000, 8, 1800, 2400, 1700, 2400, 0.75, 0.1},
		{"Wire", false, 98000, 10, 1200, 1500, 1100, 1500, 0.8, 0.1},
		{"Cable", false, 45000, 18, 450, 600, 420, 600, 0.75, 0.1},
		{"Quickwire", false, 22000, 30, 240, 300, 220, 300, 0.8, 0.1},
		// Intermediate
		{"Reinforced Iron Plate", false, 8500, 50, 90, 120, 80, 120, 0.75, 0.1},
		{"Modular Frame", false, 4200, 80, 45, 60, 40, 60, 0.75, 0.1},
		{"Heavy Modular Frame", false, 1200, 200, 12, 20, 10, 20, 0.6, 0.1},
		{"Rotor", false, 6800, 60, 72, 90, 65, 90, 0.8, 0.1},
		{"Stator", false, 5400, 70, 60, 75, 55, 75, 0.8, 0.1},
		{"Motor", false, 2800, 100, 30, 45, 25, 45, 0.67, 0.1},
		{"Encased Industrial Beam", false, 3600, 90, 40, 60, 35, 60, 0.67, 0.1},
		// Electronics
		{"Circuit Board", false, 4500, 80, 50, 75, 45, 75, 0.67, 0.1},
		{"Computer", false, 1800, 150, 18, 30, 15, 30, 0.6, 0.1},
		{"Supercomputer", false, 450, 400, 5, 10, 4, 10, 0.5, 0.1},
		{"AI Limiter", false, 2200, 120, 24, 36, 20, 36, 0.67, 0.1},
		{"High-Speed Connector", false, 1500, 180, 15, 24, 12, 24, 0.63, 0.1},
		// Oil products
		{"Plastic", false, 18000, 35, 200, 300, 180, 300, 0.67, 0.1},
		{"Rubber", false, 14000, 40, 150, 240, 130, 240, 0.63, 0.1},
		{"Fuel", false, 25000, 25, 280, 360, 260, 360, 0.78, 0.1},
		{"Turbofuel", false, 8000, 60, 90, 150, 80, 150, 0.6, 0.1},
		// Aluminum chain
		{"Aluminum Casing", false, 6000, 70, 65, 90, 55, 90, 0.72, 0.1},
		{"Alclad Aluminum Sheet", false, 4800, 85, 50, 75, 45, 75, 0.67, 0.1},
		{"Battery", false, 3200, 100, 35, 60, 30, 60, 0.58, 0.1},
		// Quartz chain
		{"Quartz Crystal", false, 7500, 55, 80, 120, 70, 120, 0.67, 0.1},
		{"Silica", false, 9500, 45, 100, 150, 90, 150, 0.67, 0.1},
		{"Crystal Oscillator", false, 1100, 200, 12, 20, 10, 20, 0.6, 0.1},
		// Advanced
		{"Electromagnetic Control Rod", false, 800, 250, 8, 15, 6, 15, 0.53, 0.1},
		{"Cooling System", false, 600, 300, 6, 12, 5, 12, 0.5, 0.1},
		{"Turbo Motor", false, 350, 500, 3.5, 6, 3, 6, 0.58, 0.1},
		{"Radio Control Unit", false, 500, 400, 5, 10, 4, 10, 0.5, 0.1},
	}

	items := make([]models.ItemProdStats, len(itemConfigs))
	for i, cfg := range itemConfigs {
		items[i] = generateItemProdStats(cfg)
	}

	return &models.ProdStats{
		MinableProducedPerMinute: randRange(3630, 100),
		MinableConsumedPerMinute: randRange(3420, 100),
		ItemsProducedPerMinute:   randRange(8500, 200),
		ItemsConsumedPerMinute:   randRange(7800, 200),
		Items:                    items,
	}, nil
}

// ============================================================================
// Generator Stats
// ============================================================================

func (c *Client) GetGeneratorStats(_ context.Context) (*models.GeneratorStats, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	return &models.GeneratorStats{
		Sources: map[models.PowerType]models.PowerSource{
			models.PowerTypeBiomass:    {Count: randInt(8, 4), TotalProduction: randRange(240, 40)},
			models.PowerTypeCoal:       {Count: randInt(24, 8), TotalProduction: randRange(1800, 200)},
			models.PowerTypeFuel:       {Count: randInt(18, 6), TotalProduction: randRange(2700, 300)},
			models.PowerTypeNuclear:    {Count: randInt(4, 2), TotalProduction: randRange(10000, 1000)},
			models.PowerTypeGeothermal: {Count: randInt(6, 3), TotalProduction: randRange(1200, 300)},
		},
	}, nil
}

// ============================================================================
// Machines
// ============================================================================

func (c *Client) GetMachines(_ context.Context) ([]models.Machine, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	machines := []models.Machine{
		// Factory machines - Smelters
		generateMachine(machineConfig{
			machineType: models.MachineTypeSmelter, category: models.MachineCategoryFactory, status: models.MachineStatusOperating,
			location: loc(5000, 500, 5000, 0),
			inputs:   []models.MachineProdStats{prodStatsRand("Iron Ore", 28, 2, 30, 450, 100, 0.93, 0.05)},
			outputs:  []models.MachineProdStats{prodStatsRand("Iron Ingot", 28, 2, 30, 120, 50, 0.93, 0.05)},
		}),
		generateMachine(machineConfig{
			machineType: models.MachineTypeSmelter, category: models.MachineCategoryFactory, status: models.MachineStatusOperating,
			location: loc(20000, 2200, 15000, 30),
			inputs:   []models.MachineProdStats{prodStatsRand("Copper Ore", 26, 4, 30, 380, 80, 0.87, 0.1)},
			outputs:  []models.MachineProdStats{prodStatsRand("Copper Ingot", 26, 4, 30, 95, 40, 0.87, 0.1)},
		}),
		generateMachine(machineConfig{
			machineType: models.MachineTypeSmelter, category: models.MachineCategoryFactory, status: models.MachineStatusIdle,
			location: loc(-15000, 1500, 20000, 45),
			inputs:   []models.MachineProdStats{prodStats("Caterium Ore", 0, 45, randRange(12, 8), 0)},
			outputs:  []models.MachineProdStats{prodStats("Caterium Ingot", 0, 15, randRange(5, 3), 0)},
		}),
		// Foundries
		generateMachine(machineConfig{
			machineType: models.MachineTypeFoundry, category: models.MachineCategoryFactory, status: models.MachineStatusOperating,
			location: loc(40000, 5500, 35000, 90),
			inputs: []models.MachineProdStats{
				prodStatsRand("Iron Ore", 42, 3, 45, 600, 150, 0.93, 0.05),
				prodStatsRand("Coal", 42, 3, 45, 500, 120, 0.93, 0.05),
			},
			outputs: []models.MachineProdStats{prodStatsRand("Steel Ingot", 42, 3, 45, 280, 80, 0.93, 0.05)},
		}),
		generateMachine(machineConfig{
			machineType: models.MachineTypeFoundry, category: models.MachineCategoryFactory, status: models.MachineStatusOperating,
			location: loc(50000, 8500, -20000, 270),
			inputs: []models.MachineProdStats{
				prodStatsRand("Aluminum Scrap", 85, 5, 90, 420, 100, 0.94, 0.04),
				prodStatsRand("Silica", 72, 3, 75, 350, 80, 0.96, 0.03),
			},
			outputs: []models.MachineProdStats{prodStatsRand("Aluminum Ingot", 28, 2, 30, 180, 60, 0.93, 0.05)},
		}),
		// Constructors
		generateMachine(machineConfig{
			machineType: models.MachineTypeConstructor, category: models.MachineCategoryFactory, status: models.MachineStatusOperating,
			location: loc(12000, 800, 8000, 90),
			inputs:   []models.MachineProdStats{prodStatsRand("Iron Ingot", 28, 2, 30, 200, 50, 0.93, 0.05)},
			outputs:  []models.MachineProdStats{prodStatsRand("Iron Plate", 18, 2, 20, 150, 40, 0.9, 0.08)},
		}),
		generateMachine(machineConfig{
			machineType: models.MachineTypeConstructor, category: models.MachineCategoryFactory, status: models.MachineStatusOperating,
			location: loc(28000, 3000, 22000, 120),
			inputs:   []models.MachineProdStats{prodStatsRand("Iron Rod", 9, 1, 10, 90, 25, 0.9, 0.08)},
			outputs:  []models.MachineProdStats{prodStatsRand("Screw", 36, 4, 40, 800, 200, 0.9, 0.08)},
		}),
		generateMachine(machineConfig{
			machineType: models.MachineTypeConstructor, category: models.MachineCategoryFactory, status: models.MachineStatusOperating,
			location: loc(-12000, 1000, 40000, 180),
			inputs:   []models.MachineProdStats{prodStatsRand("Copper Ingot", 14, 1, 15, 150, 40, 0.93, 0.05)},
			outputs:  []models.MachineProdStats{prodStatsRand("Wire", 28, 2, 30, 400, 100, 0.93, 0.05)},
		}),
		generateMachine(machineConfig{
			machineType: models.MachineTypeConstructor, category: models.MachineCategoryFactory, status: models.MachineStatusOperating,
			location: loc(55000, 9500, 45000, 150),
			inputs:   []models.MachineProdStats{prodStatsRand("Limestone", 42, 3, 45, 550, 120, 0.93, 0.05)},
			outputs:  []models.MachineProdStats{prodStatsRand("Concrete", 14, 1, 15, 300, 80, 0.93, 0.05)},
		}),
		// Assemblers
		generateMachine(machineConfig{
			machineType: models.MachineTypeAssembler, category: models.MachineCategoryFactory, status: models.MachineStatusOperating,
			location: loc(35000, 4000, 30000, 135),
			inputs: []models.MachineProdStats{
				prodStatsRand("Iron Plate", 28, 2, 30, 200, 50, 0.93, 0.05),
				prodStatsRand("Screw", 55, 5, 60, 600, 150, 0.92, 0.06),
			},
			outputs: []models.MachineProdStats{prodStatsRand("Reinforced Iron Plate", 4.5, 0.5, 5, 45, 15, 0.9, 0.08)},
		}),
		generateMachine(machineConfig{
			machineType: models.MachineTypeAssembler, category: models.MachineCategoryFactory, status: models.MachineStatusOperating,
			location: loc(60000, 10500, 50000, 140),
			inputs: []models.MachineProdStats{
				prodStatsRand("Rotor", 1.8, 0.2, 2, 18, 6, 0.9, 0.08),
				prodStatsRand("Stator", 1.8, 0.2, 2, 16, 6, 0.9, 0.08),
			},
			outputs: []models.MachineProdStats{prodStatsRand("Motor", 0.9, 0.1, 1, 10, 4, 0.9, 0.08)},
		}),
		generateMachine(machineConfig{
			machineType: models.MachineTypeAssembler, category: models.MachineCategoryFactory, status: models.MachineStatusOperating,
			location: loc(-30000, 1500, 55000, 200),
			inputs: []models.MachineProdStats{
				prodStatsRand("Circuit Board", 3.6, 0.4, 4, 35, 12, 0.9, 0.08),
				prodStatsRand("Quickwire", 45, 5, 50, 400, 100, 0.9, 0.08),
			},
			outputs: []models.MachineProdStats{prodStatsRand("AI Limiter", 0.9, 0.1, 1, 12, 5, 0.9, 0.08)},
		}),
		// Manufacturers
		generateMachine(machineConfig{
			machineType: models.MachineTypeManufacturer, category: models.MachineCategoryFactory, status: models.MachineStatusOperating,
			location: loc(58000, 11000, 48000, 225),
			inputs: []models.MachineProdStats{
				prodStatsRand("Modular Frame", 4.5, 0.5, 5, 45, 15, 0.9, 0.08),
				prodStatsRand("Steel Pipe", 28, 2, 30, 250, 60, 0.93, 0.05),
				prodStatsRand("Encased Industrial Beam", 9, 1, 10, 80, 25, 0.9, 0.08),
				prodStatsRand("Screw", 180, 20, 200, 1800, 400, 0.9, 0.08),
			},
			outputs: []models.MachineProdStats{prodStatsRand("Heavy Modular Frame", 0.9, 0.1, 1, 8, 4, 0.9, 0.08)},
		}),
		generateMachine(machineConfig{
			machineType: models.MachineTypeManufacturer, category: models.MachineCategoryFactory, status: models.MachineStatusOperating,
			location: loc(62000, 11500, 52000, 230),
			inputs: []models.MachineProdStats{
				prodStatsRand("Computer", 1.8, 0.2, 2, 15, 6, 0.9, 0.08),
				prodStatsRand("AI Limiter", 1.8, 0.2, 2, 18, 6, 0.9, 0.08),
				prodStatsRand("High-Speed Connector", 2.7, 0.3, 3, 25, 8, 0.9, 0.08),
				prodStatsRand("Plastic", 27, 3, 30, 260, 60, 0.9, 0.08),
			},
			outputs: []models.MachineProdStats{prodStatsRand("Supercomputer", 0.45, 0.05, 0.5, 5, 2, 0.9, 0.08)},
		}),
		// Refineries
		generateMachine(machineConfig{
			machineType: models.MachineTypeRefinery, category: models.MachineCategoryFactory, status: models.MachineStatusOperating,
			location: loc(-35000, 1200, 50000, 270),
			inputs:   []models.MachineProdStats{prodStatsRand("Crude Oil", 27, 3, 30, 0, 0, 0.9, 0.08)},
			outputs:  []models.MachineProdStats{prodStatsRand("Plastic", 18, 2, 20, 180, 50, 0.9, 0.08), prodStatsRand("Heavy Oil Residue", 9, 1, 10, 85, 25, 0.9, 0.08)},
		}),
		generateMachine(machineConfig{
			machineType: models.MachineTypeRefinery, category: models.MachineCategoryFactory, status: models.MachineStatusOperating,
			location: loc(-38000, 1300, 55000, 275),
			inputs:   []models.MachineProdStats{prodStatsRand("Heavy Oil Residue", 54, 6, 60, 0, 0, 0.9, 0.08)},
			outputs:  []models.MachineProdStats{prodStatsRand("Fuel", 36, 4, 40, 350, 80, 0.9, 0.08)},
		}),
		// Blenders
		generateMachine(machineConfig{
			machineType: models.MachineTypeBlender, category: models.MachineCategoryFactory, status: models.MachineStatusOperating,
			location: loc(52000, 9000, -15000, 315),
			inputs: []models.MachineProdStats{
				prodStatsRand("Bauxite", 108, 12, 120, 1000, 250, 0.9, 0.08),
				prodStatsRand("Water", 162, 18, 180, 0, 0, 0.9, 0.08),
			},
			outputs: []models.MachineProdStats{
				prodStatsRand("Alumina Solution", 108, 12, 120, 950, 200, 0.9, 0.08),
				prodStatsRand("Silica", 45, 5, 50, 400, 100, 0.9, 0.08),
			},
		}),
		// Generator machines - Biomass burners
		generateMachine(machineConfig{
			machineType: models.MachineTypeBiomassBurner, category: models.MachineCategoryGenerator, status: models.MachineStatusOperating,
			location: loc(8000, 5000, 3000, 0),
			inputs:   []models.MachineProdStats{prodStatsRand("Solid Biofuel", 18, 4, 24, 80, 40, 0.75, 0.15)},
			outputs:  []models.MachineProdStats{prodStatsRand("Power", 26, 4, 30, 0, 0, 0.87, 0.1)},
		}),
		generateMachine(machineConfig{
			machineType: models.MachineTypeBiomassBurner, category: models.MachineCategoryGenerator, status: models.MachineStatusIdle,
			location: loc(8500, 5100, 3500, 10),
			inputs:   []models.MachineProdStats{prodStats("Solid Biofuel", 0, 24, randRange(5, 10), 0)},
			outputs:  []models.MachineProdStats{prodStats("Power", 0, 30, 0, 0)},
		}),
		// Coal generators
		generateMachine(machineConfig{
			machineType: models.MachineTypeCoalGenerator, category: models.MachineCategoryGenerator, status: models.MachineStatusOperating,
			location: loc(25000, 2000, 5000, 45),
			inputs:   []models.MachineProdStats{prodStatsRand("Coal", 13, 2, 15, 200, 100, 0.87, 0.1), prodStatsRand("Water", 40, 5, 45, 0, 0, 0.89, 0.08)},
			outputs:  []models.MachineProdStats{prodStatsRand("Power", 65, 10, 75, 0, 0, 0.87, 0.1)},
		}),
		generateMachine(machineConfig{
			machineType: models.MachineTypeCoalGenerator, category: models.MachineCategoryGenerator, status: models.MachineStatusOperating,
			location: loc(25500, 2100, 5500, 50),
			inputs:   []models.MachineProdStats{prodStatsRand("Coal", 14, 1, 15, 350, 100, 0.93, 0.07), prodStatsRand("Water", 43, 2, 45, 0, 0, 0.96, 0.04)},
			outputs:  []models.MachineProdStats{prodStatsRand("Power", 72, 3, 75, 0, 0, 0.96, 0.04)},
		}),
		// Fuel generators
		generateMachine(machineConfig{
			machineType: models.MachineTypeFuelGenerator, category: models.MachineCategoryGenerator, status: models.MachineStatusOperating,
			location: loc(-25000, 1000, 45000, 180),
			inputs:   []models.MachineProdStats{prodStatsRand("Fuel", 10, 2, 12, 500, 200, 0.83, 0.12)},
			outputs:  []models.MachineProdStats{prodStatsRand("Power", 125, 25, 150, 0, 0, 0.83, 0.12)},
		}),
		generateMachine(machineConfig{
			machineType: models.MachineTypeFuelGenerator, category: models.MachineCategoryGenerator, status: models.MachineStatusOperating,
			location: loc(-26000, 1100, 46000, 185),
			inputs:   []models.MachineProdStats{prodStatsRand("Turbofuel", 3.5, 1, 4.5, 300, 150, 0.78, 0.15)},
			outputs:  []models.MachineProdStats{prodStatsRand("Power", 140, 20, 150, 0, 0, 0.93, 0.07)},
		}),
		// Nuclear
		generateMachine(machineConfig{
			machineType: models.MachineTypeNuclearPowerPlant, category: models.MachineCategoryGenerator, status: models.MachineStatusOperating,
			location: loc(-50000, 3000, -50000, 225),
			inputs:   []models.MachineProdStats{prodStatsRand("Uranium Fuel Rod", 0.18, 0.02, 0.2, 15, 10, 0.9, 0.08), prodStatsRand("Water", 280, 20, 300, 0, 0, 0.93, 0.05)},
			outputs:  []models.MachineProdStats{prodStatsRand("Power", 2300, 200, 2500, 0, 0, 0.92, 0.06)},
		}),
		generateMachine(machineConfig{
			machineType: models.MachineTypeNuclearPowerPlant, category: models.MachineCategoryGenerator, status: models.MachineStatusOperating,
			location: loc(-51000, 3100, -49000, 230),
			inputs:   []models.MachineProdStats{prodStatsRand("Uranium Fuel Rod", 0.19, 0.01, 0.2, 22, 8, 0.95, 0.05), prodStatsRand("Water", 290, 10, 300, 0, 0, 0.97, 0.03)},
			outputs:  []models.MachineProdStats{prodStatsRand("Power", 2400, 100, 2500, 0, 0, 0.96, 0.04)},
		}),
		// Geothermal
		generateMachine(machineConfig{
			machineType: models.MachineTypeGeothermalGenerator, category: models.MachineCategoryGenerator, status: models.MachineStatusOperating,
			location: loc(55000, 15000, 55000, 0),
			inputs:   []models.MachineProdStats{},
			outputs:  []models.MachineProdStats{prodStatsRand("Power", 180, 40, 200, 0, 0, 0.9, 0.1)},
		}),
		generateMachine(machineConfig{
			machineType: models.MachineTypeGeothermalGenerator, category: models.MachineCategoryGenerator, status: models.MachineStatusOperating,
			location: loc(60000, 18000, 60000, 90),
			inputs:   []models.MachineProdStats{},
			outputs:  []models.MachineProdStats{prodStatsRand("Power", 165, 35, 200, 0, 0, 0.83, 0.12)},
		}),
	}

	return machines, nil
}

// ============================================================================
// Sink Stats
// ============================================================================

func (c *Client) GetSinkStats(_ context.Context) (*models.SinkStats, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)
	return &models.SinkStats{
		TotalPoints:        randRange(1500000, 500000),
		Coupons:            randInt(200, 50),
		NextCouponProgress: randRange(0.3, 0.5),
		PointsPerMinute:    randRange(15000, 5000),
	}, nil
}

// ============================================================================
// Players
// ============================================================================

func (c *Client) ListPlayers(_ context.Context) ([]models.Player, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	type playerConfig struct {
		id     string
		name   string
		health float64
		items  []models.ItemStats
	}

	configs := []playerConfig{
		{"1", "Kyoshi", randRange(75, 25), []models.ItemStats{
			itemStats("Caterium Ingot", 200, 50), itemStats("Copper Sheet", 150, 30),
			itemStats("Quickwire", 500, 100), itemStats("AI Limiter", 25, 10),
		}},
		{"2", "ellaurgor", randRange(90, 10), []models.ItemStats{
			itemStats("Steel Beam", 100, 30), itemStats("Concrete", 300, 50),
			itemStats("Iron Plate", 250, 50), itemStats("Screw", 800, 200),
		}},
		{"3", "FactoryBot9000", randRange(60, 40), []models.ItemStats{
			itemStats("Heavy Modular Frame", 15, 10), itemStats("Motor", 40, 15),
			itemStats("Rotor", 60, 20), itemStats("Reinforced Iron Plate", 80, 25),
		}},
		{"4", "NuclearEngineer", 100, []models.ItemStats{
			itemStats("Uranium Fuel Rod", 10, 5), itemStats("Electromagnetic Control Rod", 20, 10),
			itemStats("Cooling System", 15, 8), itemStats("Heat Sink", 50, 20),
		}},
	}

	players := make([]models.Player, len(configs))
	for i, cfg := range configs {
		players[i] = models.Player{ID: cfg.id, Name: cfg.name, Health: cfg.health, Items: cfg.items}
	}
	return players, nil
}

// ============================================================================
// Train Stations & Trains
// ============================================================================

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

// ============================================================================
// Trucks & Truck Stations
// ============================================================================

var truckStationData = []struct {
	name string
	loc  models.Location
}{
	{"Main Factory Hub", loc(15000, 3000, 15000, 0)},
	{"Remote Mining Outpost", loc(60000, 20000, 60000, 180)},
	{"Oil Platform Alpha", loc(-55000, 1000, 55000, 270)},
	{"Sulfur Extraction Site", loc(50000, 15000, -45000, 135)},
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

// ============================================================================
// Drone Stations & Drones
// ============================================================================

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

// ============================================================================
// Infrastructure (Map visualization)
// ============================================================================

// generateSpline creates a spline path between two points with some curvature
func generateSpline(from, to models.Location, segments int) []models.Location {
	spline := make([]models.Location, segments+1)
	for i := 0; i <= segments; i++ {
		t := float64(i) / float64(segments)
		// Add some gentle curve by offsetting the midpoint
		midOffset := math.Sin(t*math.Pi) * 500 // Subtle curve
		spline[i] = models.Location{
			X:        lerp(from.X, to.X, t) + midOffset,
			Y:        lerp(from.Y, to.Y, t),
			Z:        lerp(from.Z, to.Z, t),
			Rotation: from.Rotation,
		}
	}
	return spline
}

func (c *Client) ListBelts(_ context.Context) ([]models.Belt, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	// Create belts connecting various factory machines
	belts := []models.Belt{
		// Smelter to Constructor belts (Iron line)
		{
			ID: "belt-1", Name: "Iron Ore Belt",
			Location0:  loc(5000, 500, 5000, 0),
			Location1:  loc(12000, 800, 8000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(5000, 500, 5000, 0), loc(12000, 800, 8000, 0), 8),
			Length:     8500, ItemsPerMinute: 270,
		},
		{
			ID: "belt-2", Name: "Iron Ingot Belt",
			Location0:  loc(12000, 800, 8000, 0),
			Location1:  loc(28000, 3000, 22000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(12000, 800, 8000, 0), loc(28000, 3000, 22000, 0), 10),
			Length:     22000, ItemsPerMinute: 180,
		},
		// Copper line
		{
			ID: "belt-3", Name: "Copper Ore Belt",
			Location0:  loc(20000, 2200, 15000, 0),
			Location1:  loc(-12000, 1000, 40000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(20000, 2200, 15000, 0), loc(-12000, 1000, 40000, 0), 12),
			Length:     35000, ItemsPerMinute: 240,
		},
		// Steel line to assemblers
		{
			ID: "belt-4", Name: "Steel to Assembler",
			Location0:  loc(40000, 5500, 35000, 0),
			Location1:  loc(35000, 4000, 30000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(40000, 5500, 35000, 0), loc(35000, 4000, 30000, 0), 6),
			Length:     7000, ItemsPerMinute: 120,
		},
		// Advanced manufacturing
		{
			ID: "belt-5", Name: "Computer Parts Belt",
			Location0:  loc(60000, 10500, 50000, 0),
			Location1:  loc(62000, 11500, 52000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(60000, 10500, 50000, 0), loc(62000, 11500, 52000, 0), 4),
			Length:     3000, ItemsPerMinute: 60,
		},
		// Concrete line
		{
			ID: "belt-6", Name: "Limestone Belt",
			Location0:  loc(55000, 9500, 45000, 0),
			Location1:  loc(58000, 11000, 48000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(55000, 9500, 45000, 0), loc(58000, 11000, 48000, 0), 5),
			Length:     5000, ItemsPerMinute: 450,
		},
	}

	return belts, nil
}

func (c *Client) ListPipes(_ context.Context) ([]models.Pipe, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	// Create pipes for oil processing and water
	pipes := []models.Pipe{
		// Oil refinery pipes
		{
			ID: "pipe-1", Name: "Crude Oil Pipe",
			Location0:  loc(-35000, 1200, 50000, 0),
			Location1:  loc(-38000, 1300, 55000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(-35000, 1200, 50000, 0), loc(-38000, 1300, 55000, 0), 6),
			Length:     6000, ItemsPerMinute: 300,
		},
		{
			ID: "pipe-2", Name: "Heavy Oil Residue Pipe",
			Location0:  loc(-38000, 1300, 55000, 0),
			Location1:  loc(-25000, 1000, 45000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(-38000, 1300, 55000, 0), loc(-25000, 1000, 45000, 0), 8),
			Length:     15000, ItemsPerMinute: 180,
		},
		// Water pipes for coal generators
		{
			ID: "pipe-3", Name: "Coal Generator Water",
			Location0:  loc(20000, 1500, 2000, 0),
			Location1:  loc(25000, 2000, 5000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(20000, 1500, 2000, 0), loc(25000, 2000, 5000, 0), 5),
			Length:     6000, ItemsPerMinute: 450,
		},
		// Aluminum processing water
		{
			ID: "pipe-4", Name: "Alumina Water Pipe",
			Location0:  loc(48000, 7500, -20000, 0),
			Location1:  loc(52000, 9000, -15000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(48000, 7500, -20000, 0), loc(52000, 9000, -15000, 0), 6),
			Length:     7000, ItemsPerMinute: 540,
		},
		// Nuclear water cooling
		{
			ID: "pipe-5", Name: "Nuclear Cooling Water",
			Location0:  loc(-55000, 2500, -52000, 0),
			Location1:  loc(-50000, 3000, -50000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(-55000, 2500, -52000, 0), loc(-50000, 3000, -50000, 0), 5),
			Length:     5500, ItemsPerMinute: 600,
		},
	}

	return pipes, nil
}

func (c *Client) ListPipeJunctions(_ context.Context) ([]models.PipeJunction, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	// Create pipe junctions at key intersection points
	junctions := []models.PipeJunction{
		{ID: "junction-1", Name: "Oil Hub", Location: loc(-36000, 1250, 52000, 0)},
		{ID: "junction-2", Name: "Water Distribution A", Location: loc(22000, 1800, 3500, 0)},
		{ID: "junction-3", Name: "Water Distribution B", Location: loc(50000, 8200, -17500, 0)},
		{ID: "junction-4", Name: "Nuclear Water Hub", Location: loc(-52000, 2700, -51000, 0)},
		{ID: "junction-5", Name: "Fuel Junction", Location: loc(-30000, 1100, 47000, 0)},
	}

	return junctions, nil
}

func (c *Client) ListSplitterMergers(_ context.Context) ([]models.SplitterMerger, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	// Create splitter/mergers at key junction points in the factory
	splitterMergers := []models.SplitterMerger{
		{
			ID: "sm-1", Type: models.SplitterMergerTypeConveyorSplitter,
			Location: loc(8000, 600, 6000, 0),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 7800, Y: 500, Z: 5800},
				Max: models.Location{X: 8200, Y: 700, Z: 6200},
			},
		},
		{
			ID: "sm-2", Type: models.SplitterMergerTypeConveyorMerger,
			Location: loc(15000, 1000, 12000, 45),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 14800, Y: 900, Z: 11800},
				Max: models.Location{X: 15200, Y: 1100, Z: 12200},
			},
		},
		{
			ID: "sm-3", Type: models.SplitterMergerTypeSmartSplitter,
			Location: loc(42000, 5200, 33000, 90),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 41800, Y: 5100, Z: 32800},
				Max: models.Location{X: 42200, Y: 5300, Z: 33200},
			},
		},
		{
			ID: "sm-4", Type: models.SplitterMergerTypeConveyorMerger,
			Location: loc(61000, 11000, 51000, 135),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 60800, Y: 10900, Z: 50800},
				Max: models.Location{X: 61200, Y: 11100, Z: 51200},
			},
		},
		{
			ID: "sm-5", Type: models.SplitterMergerTypeProgrammableSplitter,
			Location: loc(-33000, 1100, 52000, 180),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: -33200, Y: 1000, Z: 51800},
				Max: models.Location{X: -32800, Y: 1200, Z: 52200},
			},
		},
	}

	return splitterMergers, nil
}

func (c *Client) ListCables(_ context.Context) ([]models.Cable, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	// Create power cables connecting generators to machines
	cables := []models.Cable{
		// Coal generator power lines
		{
			ID: "cable-1", Name: "Coal Gen Power Line 1",
			Location0:  loc(25000, 2000, 5000, 0),
			Location1:  loc(12000, 800, 8000, 0),
			Connected0: true, Connected1: true,
			Length: 15000,
		},
		{
			ID: "cable-2", Name: "Coal Gen Power Line 2",
			Location0:  loc(25500, 2100, 5500, 0),
			Location1:  loc(28000, 3000, 22000, 0),
			Connected0: true, Connected1: true,
			Length: 17000,
		},
		// Fuel generator power lines
		{
			ID: "cable-3", Name: "Fuel Gen Power Line",
			Location0:  loc(-25000, 1000, 45000, 0),
			Location1:  loc(-35000, 1200, 50000, 0),
			Connected0: true, Connected1: true,
			Length: 12000,
		},
		// Nuclear power distribution
		{
			ID: "cable-4", Name: "Nuclear Power Line 1",
			Location0:  loc(-50000, 3000, -50000, 0),
			Location1:  loc(25000, 4000, 18000, 0),
			Connected0: true, Connected1: true,
			Length: 95000,
		},
		{
			ID: "cable-5", Name: "Nuclear Power Line 2",
			Location0:  loc(-51000, 3100, -49000, 0),
			Location1:  loc(55000, 10000, 45000, 0),
			Connected0: true, Connected1: true,
			Length: 135000,
		},
		// Local factory connections
		{
			ID: "cable-6", Name: "Factory Hub Power",
			Location0:  loc(35000, 4000, 30000, 0),
			Location1:  loc(40000, 5500, 35000, 0),
			Connected0: true, Connected1: true,
			Length: 8000,
		},
		{
			ID: "cable-7", Name: "Aluminum Plant Power",
			Location0:  loc(48000, 8000, -18000, 0),
			Location1:  loc(52000, 9000, -15000, 0),
			Connected0: true, Connected1: true,
			Length: 6000,
		},
	}

	return cables, nil
}

func (c *Client) ListTrainRails(_ context.Context) ([]models.TrainRail, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	// Create train rails connecting stations
	rails := []models.TrainRail{
		// Iron Mine Alpha to Copper Mine Beta
		{
			ID: "rail-1", Type: models.TrainRailTypeRailway,
			Location0:  loc(0, 0, 0, 0),
			Location1:  loc(18000, 2000, 12000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(0, 0, 0, 0), loc(18000, 2000, 12000, 0), 15),
			Length:     22000,
		},
		// Copper Mine Beta to Steel Foundry Central
		{
			ID: "rail-2", Type: models.TrainRailTypeRailway,
			Location0:  loc(18000, 2000, 12000, 0),
			Location1:  loc(38000, 5000, 32000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(18000, 2000, 12000, 0), loc(38000, 5000, 32000, 0), 18),
			Length:     28000,
		},
		// Steel Foundry Central to Main Storage Depot
		{
			ID: "rail-3", Type: models.TrainRailTypeRailway,
			Location0:  loc(38000, 5000, 32000, 0),
			Location1:  loc(25000, 4000, 18000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(38000, 5000, 32000, 0), loc(25000, 4000, 18000, 0), 12),
			Length:     18000,
		},
		// Main Storage Depot to Oil Refinery West
		{
			ID: "rail-4", Type: models.TrainRailTypeRailway,
			Location0:  loc(25000, 4000, 18000, 0),
			Location1:  loc(-30000, 1000, 48000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(25000, 4000, 18000, 0), loc(-30000, 1000, 48000, 0), 25),
			Length:     65000,
		},
		// Main Storage Depot to Aluminum Processing
		{
			ID: "rail-5", Type: models.TrainRailTypeRailway,
			Location0:  loc(25000, 4000, 18000, 0),
			Location1:  loc(48000, 8000, -18000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(25000, 4000, 18000, 0), loc(48000, 8000, -18000, 0), 20),
			Length:     45000,
		},
		// Aluminum Processing to Computer Factory Hub
		{
			ID: "rail-6", Type: models.TrainRailTypeRailway,
			Location0:  loc(48000, 8000, -18000, 0),
			Location1:  loc(55000, 10000, 45000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(48000, 8000, -18000, 0), loc(55000, 10000, 45000, 0), 25),
			Length:     65000,
		},
		// Main Storage Depot to Nuclear Facility
		{
			ID: "rail-7", Type: models.TrainRailTypeRailway,
			Location0:  loc(25000, 4000, 18000, 0),
			Location1:  loc(-50000, 3000, -50000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(25000, 4000, 18000, 0), loc(-50000, 3000, -50000, 0), 30),
			Length:     95000,
		},
		// Iron Mine Alpha to Main Storage Depot (return route)
		{
			ID: "rail-8", Type: models.TrainRailTypeRailway,
			Location0:  loc(0, 0, 0, 0),
			Location1:  loc(25000, 4000, 18000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(0, 0, 0, 0), loc(25000, 4000, 18000, 0), 15),
			Length:     30000,
		},
	}

	return rails, nil
}

func (c *Client) GetBelts(ctx context.Context) (models.Belts, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	belts, _ := c.ListBelts(ctx)
	splitterMergers, _ := c.ListSplitterMergers(ctx)

	return models.Belts{
		Belts:           belts,
		SplitterMergers: splitterMergers,
	}, nil
}

func (c *Client) GetPipes(ctx context.Context) (models.Pipes, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	pipes, _ := c.ListPipes(ctx)
	pipeJunctions, _ := c.ListPipeJunctions(ctx)

	return models.Pipes{
		Pipes:         pipes,
		PipeJunctions: pipeJunctions,
	}, nil
}

// ============================================================================
// Storage Containers
// ============================================================================

func (c *Client) ListStorageContainers(_ context.Context) ([]models.Storage, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	// Create storage containers spread across factory locations
	storages := []models.Storage{
		// Main factory storage area
		{
			ID:       "storage-1",
			Type:     models.StorageTypeIndustrialStorageContainer,
			Location: loc(25000, 4200, 18500, 0),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 24600, Y: 4000, Z: 18100},
				Max: models.Location{X: 25400, Y: 4400, Z: 18900},
			},
			Inventory: []models.ItemStats{
				itemStats("Iron Plate", 2400, 800),
				itemStats("Iron Rod", 1800, 600),
				itemStats("Screw", 8000, 2000),
			},
		},
		{
			ID:       "storage-2",
			Type:     models.StorageTypeIndustrialStorageContainer,
			Location: loc(25800, 4200, 18500, 0),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 25400, Y: 4000, Z: 18100},
				Max: models.Location{X: 26200, Y: 4400, Z: 18900},
			},
			Inventory: []models.ItemStats{
				itemStats("Copper Sheet", 1200, 400),
				itemStats("Wire", 4500, 1500),
				itemStats("Cable", 2000, 600),
			},
		},
		{
			ID:       "storage-3",
			Type:     models.StorageTypeStorageContainer,
			Location: loc(26600, 4200, 18500, 45),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 26300, Y: 4000, Z: 18200},
				Max: models.Location{X: 26900, Y: 4400, Z: 18800},
			},
			Inventory: []models.ItemStats{
				itemStats("Reinforced Iron Plate", 150, 50),
				itemStats("Modular Frame", 80, 30),
			},
		},
		// Computer factory storage
		{
			ID:       "storage-4",
			Type:     models.StorageTypeIndustrialStorageContainer,
			Location: loc(55500, 10200, 45500, 135),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 55100, Y: 10000, Z: 45100},
				Max: models.Location{X: 55900, Y: 10400, Z: 45900},
			},
			Inventory: []models.ItemStats{
				itemStats("Circuit Board", 400, 150),
				itemStats("Computer", 60, 25),
				itemStats("AI Limiter", 45, 20),
			},
		},
		// Steel foundry storage
		{
			ID:       "storage-5",
			Type:     models.StorageTypeIndustrialStorageContainer,
			Location: loc(38500, 5200, 32500, 90),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 38100, Y: 5000, Z: 32100},
				Max: models.Location{X: 38900, Y: 5400, Z: 32900},
			},
			Inventory: []models.ItemStats{
				itemStats("Steel Ingot", 1600, 500),
				itemStats("Steel Beam", 800, 300),
				itemStats("Steel Pipe", 600, 200),
			},
		},
		// Oil refinery storage
		{
			ID:       "storage-6",
			Type:     models.StorageTypeStorageContainer,
			Location: loc(-34000, 1400, 51000, 180),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: -34300, Y: 1200, Z: 50700},
				Max: models.Location{X: -33700, Y: 1600, Z: 51300},
			},
			Inventory: []models.ItemStats{
				itemStats("Plastic", 2200, 800),
				itemStats("Rubber", 1800, 600),
			},
		},
		// Personal storage boxes near spawn
		{
			ID:       "storage-7",
			Type:     models.StorageTypePersonalStorageBox,
			Location: loc(8200, 600, 3200, 0),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 8000, Y: 400, Z: 3000},
				Max: models.Location{X: 8400, Y: 800, Z: 3400},
			},
			Inventory: []models.ItemStats{
				itemStats("Solid Biofuel", 200, 50),
				itemStats("Biomass", 400, 100),
			},
		},
		// Blueprint storage for advanced items
		{
			ID:       "storage-8",
			Type:     models.StorageTypeBlueprintStorageBox,
			Location: loc(62500, 11700, 52500, 230),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 62200, Y: 11500, Z: 52200},
				Max: models.Location{X: 62800, Y: 11900, Z: 52800},
			},
			Inventory: []models.ItemStats{
				itemStats("Supercomputer", 15, 8),
				itemStats("Heavy Modular Frame", 25, 12),
				itemStats("Turbo Motor", 8, 4),
			},
		},
		// Dimensional depot uploader
		{
			ID:       "storage-9",
			Type:     models.StorageTypeDimensionalDepotUploader,
			Location: loc(26000, 4500, 19500, 0),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 25700, Y: 4300, Z: 19200},
				Max: models.Location{X: 26300, Y: 4700, Z: 19800},
			},
			Inventory: []models.ItemStats{
				itemStats("Motor", 35, 15),
				itemStats("Rotor", 60, 25),
				itemStats("Stator", 55, 20),
			},
		},
		// Nuclear facility storage
		{
			ID:       "storage-10",
			Type:     models.StorageTypeIndustrialStorageContainer,
			Location: loc(-49500, 3200, -49500, 225),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: -49900, Y: 3000, Z: -49900},
				Max: models.Location{X: -49100, Y: 3400, Z: -49100},
			},
			Inventory: []models.ItemStats{
				itemStats("Uranium Fuel Rod", 12, 6),
				itemStats("Electromagnetic Control Rod", 30, 15),
				itemStats("Encased Uranium Cell", 80, 40),
			},
		},
	}

	return storages, nil
}

// ============================================================================
// Tractors
// ============================================================================

var tractorStationData = []struct {
	name string
	loc  models.Location
}{
	{"Farm Outpost", loc(25000, 5000, 25000, 0)},
	{"Resource Depot", loc(40000, 8000, 40000, 180)},
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

// ============================================================================
// Explorers
// ============================================================================

var explorerStationData = []struct {
	name string
	loc  models.Location
}{
	{"Exploration Base", loc(35000, 12000, 35000, 0)},
	{"Remote Site Alpha", loc(70000, 25000, 70000, 180)},
	{"Remote Site Beta", loc(-30000, 8000, 50000, 90)},
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

// ============================================================================
// Vehicle Paths
// ============================================================================

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

// ============================================================================
// Space Elevator
// ============================================================================

func (c *Client) GetSpaceElevator(_ context.Context) (*models.SpaceElevator, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	// Simulate progress changing over time
	elapsed := float64(time.Now().UnixMilli()-now) / 1000.0
	baseProgress := math.Mod(elapsed/120.0, 1.0) // Complete cycle every 2 minutes

	return &models.SpaceElevator{
		Name:     "Space Elevator",
		Location: loc(5000, 500, 5000, 270),
		BoundingBox: models.BoundingBox{
			Min: models.Location{X: 2800, Y: -2220, Z: 5000},
			Max: models.Location{X: 7500, Y: 3220, Z: 105000},
		},
		CurrentPhase: []models.SpaceElevatorPhaseObjective{
			{
				Name:      "Smart Plating",
				Amount:    baseProgress * 50,
				TotalCost: 50,
			},
			{
				Name:      "Versatile Framework",
				Amount:    baseProgress * 50,
				TotalCost: 50,
			},
			{
				Name:      "Automated Wiring",
				Amount:    math.Max(0, (baseProgress-0.3)*50/0.7),
				TotalCost: 50,
			},
		},
		FullyUpgraded: false,
		UpgradeReady:  baseProgress >= 1.0,
	}, nil
}

// ============================================================================
// Radar Towers
// ============================================================================

func (c *Client) ListRadarTowers(_ context.Context) ([]models.RadarTower, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)
	return []models.RadarTower{
		{
			Name:         "Radar Tower",
			RevealRadius: 100000,
			Location: models.Location{
				X: 26000,
				Y: 4200,
				Z: 19000,
			},
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 25500, Y: 3700, Z: 19000},
				Max: models.Location{X: 26500, Y: 4700, Z: 30800},
			},
			Nodes: []models.ScannedResourceNode{
				{
					ID:           "BP_ResourceNode_Iron_1",
					Name:         "Iron Ore",
					ClassName:    "Desc_OreIron_C",
					Purity:       models.ResourceNodePurityPure,
					ResourceForm: "Solid",
					NodeType:     models.ResourceNodeTypeIronOre,
					Exploited:    true,
					Location:     models.Location{X: 2000, Y: 200, Z: 1500},
				},
				{
					ID:           "BP_ResourceNode_Copper_2",
					Name:         "Copper Ore",
					ClassName:    "Desc_OreCopper_C",
					Purity:       models.ResourceNodePurityNormal,
					ResourceForm: "Solid",
					NodeType:     models.ResourceNodeTypeCopperOre,
					Exploited:    true,
					Location:     models.Location{X: 17500, Y: 1900, Z: 11800},
				},
				{
					ID:           "BP_ResourceNode_Limestone_3",
					Name:         "Limestone",
					ClassName:    "Desc_Stone_C",
					Purity:       models.ResourceNodePurityNormal,
					ResourceForm: "Solid",
					NodeType:     models.ResourceNodeTypeLimestone,
					Exploited:    false,
					Location:     models.Location{X: 22000, Y: 3500, Z: 15000},
				},
			},
			Fauna: []models.ScannedFauna{
				{Name: models.FaunaTypeFluffyTailedHog, ClassName: "Desc_HogBasic_C", Amount: 4},
				{Name: models.FaunaTypeSpaceGiraffe, ClassName: "Desc_SpaceGiraffe_C", Amount: 2},
				{Name: models.FaunaTypeStinger, ClassName: "Desc_StingerSmall_C", Amount: 3},
			},
			Flora: []models.ScannedFlora{
				{Name: models.FloraTypePaleberry, ClassName: "Desc_BerryBush_C", Amount: 12},
				{Name: models.FloraTypeBaconAgaric, ClassName: "Desc_Shroom_C", Amount: 8},
				{Name: models.FloraTypeBerylNut, ClassName: "Desc_NutBush_C", Amount: 15},
			},
			Signal: []models.ScannedSignal{
				{Name: models.SignalTypeSomersloop, ClassName: "Desc_WAT1_C", Amount: 6},
				{Name: models.SignalTypeMercerSphere, ClassName: "Desc_WAT2_C", Amount: 14},
				{Name: models.SignalTypeBluePowerSlug, ClassName: "Desc_Crystal_C", Amount: 57},
				{Name: models.SignalTypeHardDrive, ClassName: "Desc_HardDrive_C", Amount: 5},
			},
		},
		{
			Name:         "Radar Tower",
			RevealRadius: 100000,
			Location: models.Location{
				X: 56000,
				Y: 10500,
				Z: 46000,
			},
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 55500, Y: 10000, Z: 46000},
				Max: models.Location{X: 56500, Y: 11000, Z: 57800},
			},
			Nodes: []models.ScannedResourceNode{
				{
					ID:           "BP_ResourceNode_Coal_4",
					Name:         "Coal",
					ClassName:    "Desc_Coal_C",
					Purity:       models.ResourceNodePurityPure,
					ResourceForm: "Solid",
					NodeType:     models.ResourceNodeTypeCoal,
					Exploited:    false,
					Location:     models.Location{X: 52000, Y: 9500, Z: 42000},
				},
				{
					ID:           "BP_ResourceNode_Caterium_5",
					Name:         "Caterium Ore",
					ClassName:    "Desc_OreCaterium_C",
					Purity:       models.ResourceNodePurityNormal,
					ResourceForm: "Solid",
					NodeType:     models.ResourceNodeTypeCateriumOre,
					Exploited:    false,
					Location:     models.Location{X: 58000, Y: 11200, Z: 48000},
				},
				{
					ID:           "BP_ResourceNode_Quartz_6",
					Name:         "Raw Quartz",
					ClassName:    "Desc_RawQuartz_C",
					Purity:       models.ResourceNodePurityImpure,
					ResourceForm: "Solid",
					NodeType:     models.ResourceNodeTypeRawQuartz,
					Exploited:    false,
					Location:     models.Location{X: 54500, Y: 10000, Z: 44500},
				},
			},
			Fauna: []models.ScannedFauna{
				{Name: models.FaunaTypeSpitter, ClassName: "Desc_Spitter_C", Amount: 6},
				{Name: models.FaunaTypeFlyingCrab, ClassName: "Desc_CrabHatcher_C", Amount: 3},
			},
			Flora: []models.ScannedFlora{
				{Name: models.FloraTypeMycelia, ClassName: "Desc_Mycelia_C", Amount: 22},
				{Name: models.FloraTypeBaconAgaric, ClassName: "Desc_Shroom_C", Amount: 9},
			},
			Signal: []models.ScannedSignal{
				{Name: models.SignalTypeYellowPowerSlug, ClassName: "Desc_Crystal_mk2_C", Amount: 12},
				{Name: models.SignalTypePurplePowerSlug, ClassName: "Desc_Crystal_mk3_C", Amount: 3},
				{Name: models.SignalTypeMercerSphere, ClassName: "Desc_WAT2_C", Amount: 8},
			},
		},
	}, nil
}
