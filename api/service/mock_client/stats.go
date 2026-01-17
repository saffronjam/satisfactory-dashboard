package mock_client

import (
	"api/models/models"
	"context"
	"math/rand"
	"time"
)

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
		{"Screws", false, 125000, 8, 1800, 2400, 1700, 2400, 0.75, 0.1},
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

func (c *Client) GetSinkStats(_ context.Context) (*models.SinkStats, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)
	return &models.SinkStats{
		TotalPoints:        randRange(1500000, 500000),
		Coupons:            randInt(200, 50),
		NextCouponProgress: randRange(0.3, 0.5),
		PointsPerMinute:    randRange(15000, 5000),
	}, nil
}
