package mock_client

import (
	"api/models/models"
	"api/pkg/log"
	"context"
	"fmt"
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
	Publish(ctx, models.SatisfactoryEventResourceNodes, c.ListResourceNodes, onEvent)
	return nil
}

// ============================================================================
// Basic Info
// ============================================================================

func (c *Client) GetSatisfactoryApiStatus(_ context.Context) (*models.SatisfactoryApiStatus, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)
	return &models.SatisfactoryApiStatus{PingMS: randInt(30, 25), Running: true}, nil
}

func (c *Client) GetAddress() string {
	return "mock://localhost"
}
