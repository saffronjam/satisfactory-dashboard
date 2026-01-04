package mock_client

import (
	"api/models/models"
	"context"
	"math"
	"math/rand"
	"time"
)

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
