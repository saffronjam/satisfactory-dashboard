package mock_client

import (
	"api/models/models"
	"context"
	"math/rand"
	"time"
)

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
