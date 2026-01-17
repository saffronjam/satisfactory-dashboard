package mock_client

import (
	"api/models/models"
	"context"
	"math/rand"
	"time"
)

var schematicData = []models.Schematic{
	{
		ID: "schematic-1", Name: "Base Building", Tier: 0, Type: "Milestone", Purchased: true,
		Cost: []models.SchematicCost{
			{Name: "Iron Rod", Amount: 10, TotalCost: 10},
			{Name: "Iron Plate", Amount: 10, TotalCost: 10},
		},
	},
	{
		ID: "schematic-2", Name: "Logistics", Tier: 0, Type: "Milestone", Purchased: true,
		Cost: []models.SchematicCost{
			{Name: "Iron Rod", Amount: 20, TotalCost: 20},
			{Name: "Iron Plate", Amount: 20, TotalCost: 20},
		},
	},
	{
		ID: "schematic-3", Name: "Field Research", Tier: 1, Type: "Milestone", Purchased: true,
		Cost: []models.SchematicCost{
			{Name: "Wire", Amount: 50, TotalCost: 50},
			{Name: "Cable", Amount: 20, TotalCost: 20},
			{Name: "Iron Rod", Amount: 30, TotalCost: 30},
		},
	},
	{
		ID: "schematic-4", Name: "Part Assembly", Tier: 2, Type: "Milestone", Purchased: true,
		Cost: []models.SchematicCost{
			{Name: "Copper Sheet", Amount: 100, TotalCost: 100},
			{Name: "Rotor", Amount: 25, TotalCost: 25},
		},
	},
	{
		ID: "schematic-5", Name: "Obstacle Clearing", Tier: 2, Type: "Milestone", Purchased: true,
		Cost: []models.SchematicCost{
			{Name: "Cable", Amount: 100, TotalCost: 100},
			{Name: "Steel Beam", Amount: 50, TotalCost: 50},
		},
	},
	{
		ID: "schematic-6", Name: "Basic Steel Production", Tier: 3, Type: "Milestone", Purchased: true,
		Cost: []models.SchematicCost{
			{Name: "Steel Beam", Amount: 100, TotalCost: 100},
			{Name: "Steel Pipe", Amount: 100, TotalCost: 100},
		},
	},
	{
		ID: "schematic-7", Name: "Vehicular Transport", Tier: 3, Type: "Milestone", Purchased: true,
		Cost: []models.SchematicCost{
			{Name: "Modular Frame", Amount: 25, TotalCost: 25},
			{Name: "Motor", Amount: 10, TotalCost: 10},
		},
	},
	{
		ID: "schematic-8", Name: "Advanced Steel Production", Tier: 4, Type: "Milestone", Purchased: true,
		Cost: []models.SchematicCost{
			{Name: "Encased Industrial Beam", Amount: 50, TotalCost: 50},
			{Name: "Steel Pipe", Amount: 200, TotalCost: 200},
		},
	},
	{
		ID: "schematic-9", Name: "Improved Melee Combat", Tier: 4, Type: "Milestone", Purchased: true,
		Cost: []models.SchematicCost{
			{Name: "Rotor", Amount: 100, TotalCost: 100},
			{Name: "Cable", Amount: 200, TotalCost: 200},
		},
	},
	{
		ID: "schematic-10", Name: "Oil Processing", Tier: 5, Type: "Milestone", Purchased: true,
		Cost: []models.SchematicCost{
			{Name: "Plastic", Amount: 100, TotalCost: 100},
			{Name: "Rubber", Amount: 100, TotalCost: 100},
			{Name: "Heavy Modular Frame", Amount: 10, TotalCost: 10},
		},
	},
	{
		ID: "schematic-11", Name: "Industrial Manufacturing", Tier: 5, Type: "Milestone", Purchased: true,
		Cost: []models.SchematicCost{
			{Name: "Computer", Amount: 50, TotalCost: 50},
			{Name: "Heavy Modular Frame", Amount: 25, TotalCost: 25},
		},
	},
	{
		ID: "schematic-12", Name: "Monorail Train Technology", Tier: 6, Type: "Milestone", Purchased: false,
		Cost: []models.SchematicCost{
			{Name: "Heavy Modular Frame", Amount: 0, TotalCost: 75},
			{Name: "Motor", Amount: 0, TotalCost: 100},
			{Name: "Computer", Amount: 0, TotalCost: 50},
		},
	},
	{
		ID: "schematic-13", Name: "Pipeline Engineering Mk.2", Tier: 6, Type: "Milestone", Purchased: false,
		Cost: []models.SchematicCost{
			{Name: "Steel Pipe", Amount: 0, TotalCost: 500},
			{Name: "Encased Industrial Beam", Amount: 0, TotalCost: 100},
		},
	},
	{
		ID: "schematic-14", Name: "Bauxite Refinement", Tier: 7, Type: "Milestone", Purchased: false, LockedPhase: true,
		Cost: []models.SchematicCost{
			{Name: "Aluminum Ingot", Amount: 0, TotalCost: 100},
			{Name: "Radio Control Unit", Amount: 0, TotalCost: 25},
		},
	},
	{
		ID: "schematic-15", Name: "Aeronautical Engineering", Tier: 8, Type: "Milestone", Purchased: false, LockedPhase: true,
		Cost: []models.SchematicCost{
			{Name: "Aluminum Casing", Amount: 0, TotalCost: 200},
			{Name: "Supercomputer", Amount: 0, TotalCost: 10},
		},
	},
	{
		ID: "schematic-16", Name: "Nuclear Power", Tier: 8, Type: "Milestone", Purchased: false, LockedPhase: true,
		Cost: []models.SchematicCost{
			{Name: "Uranium", Amount: 0, TotalCost: 100},
			{Name: "Electromagnetic Control Rod", Amount: 0, TotalCost: 50},
		},
	},
	{
		ID: "schematic-17", Name: "Particle Enrichment", Tier: 9, Type: "Milestone", Purchased: false, Locked: true,
		Cost: []models.SchematicCost{
			{Name: "Nuclear Pasta", Amount: 0, TotalCost: 100},
			{Name: "Supercomputer", Amount: 0, TotalCost: 50},
		},
	},
	{
		ID: "schematic-18", Name: "Quantum Encoding", Tier: 9, Type: "Milestone", Purchased: false, Locked: true,
		Cost: []models.SchematicCost{
			{Name: "Superposition Oscillator", Amount: 0, TotalCost: 50},
			{Name: "Nuclear Pasta", Amount: 0, TotalCost: 200},
		},
	},
}

// ListSchematics returns mock schematic data for testing unlock states.
func (c *Client) ListSchematics(_ context.Context) ([]models.Schematic, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)
	schematics := make([]models.Schematic, len(schematicData))
	copy(schematics, schematicData)
	return schematics, nil
}
