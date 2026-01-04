package mock_client

import (
	"api/models/models"
	"context"
	"math"
	"math/rand"
	"time"
)

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

func (c *Client) ListRadarTowers(_ context.Context) ([]models.RadarTower, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)
	return []models.RadarTower{
		{
			ID:           "Radar Tower 1",
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
			Nodes: []models.ResourceNode{
				{
					ID:           "BP_ResourceNode_Iron_1",
					Name:         "Iron Ore",
					ClassName:    "Desc_OreIron_C",
					Purity:       models.ResourceNodePurityPure,
					ResourceForm: "Solid",
					ResourceType: models.ResourceTypeIronOre,
					NodeType:     models.NodeTypeNode,
					Exploited:    true,
					Location:     models.Location{X: 2000, Y: 200, Z: 1500},
				},
				{
					ID:           "BP_ResourceNode_Copper_2",
					Name:         "Copper Ore",
					ClassName:    "Desc_OreCopper_C",
					Purity:       models.ResourceNodePurityNormal,
					ResourceForm: "Solid",
					ResourceType: models.ResourceTypeCopperOre,
					NodeType:     models.NodeTypeNode,
					Exploited:    true,
					Location:     models.Location{X: 17500, Y: 1900, Z: 11800},
				},
				{
					ID:           "BP_ResourceNode_Limestone_3",
					Name:         "Limestone",
					ClassName:    "Desc_Stone_C",
					Purity:       models.ResourceNodePurityNormal,
					ResourceForm: "Solid",
					ResourceType: models.ResourceTypeLimestone,
					NodeType:     models.NodeTypeNode,
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
			ID:           "Radar Tower 2",
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
			Nodes: []models.ResourceNode{
				{
					ID:           "BP_ResourceNode_Coal_4",
					Name:         "Coal",
					ClassName:    "Desc_Coal_C",
					Purity:       models.ResourceNodePurityPure,
					ResourceForm: "Solid",
					ResourceType: models.ResourceTypeCoal,
					NodeType:     models.NodeTypeNode,
					Exploited:    false,
					Location:     models.Location{X: 52000, Y: 9500, Z: 42000},
				},
				{
					ID:           "BP_ResourceNode_Caterium_5",
					Name:         "Caterium Ore",
					ClassName:    "Desc_OreCaterium_C",
					Purity:       models.ResourceNodePurityNormal,
					ResourceForm: "Solid",
					ResourceType: models.ResourceTypeCateriumOre,
					NodeType:     models.NodeTypeNode,
					Exploited:    false,
					Location:     models.Location{X: 58000, Y: 11200, Z: 48000},
				},
				{
					ID:           "BP_ResourceNode_Quartz_6",
					Name:         "Raw Quartz",
					ClassName:    "Desc_RawQuartz_C",
					Purity:       models.ResourceNodePurityImpure,
					ResourceForm: "Solid",
					ResourceType: models.ResourceTypeRawQuartz,
					NodeType:     models.NodeTypeNode,
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
