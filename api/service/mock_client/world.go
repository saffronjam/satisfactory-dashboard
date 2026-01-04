package mock_client

import (
	"api/models/models"
	"context"
	"math/rand"
	"time"
)

func (c *Client) ListResourceNodes(_ context.Context) ([]models.ResourceNode, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)
	return []models.ResourceNode{
		// Pure Iron Ore nodes
		{
			ID:           "ResourceNode_Iron_Pure_1",
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
			ID:           "ResourceNode_Iron_Pure_2",
			Name:         "Iron Ore",
			ClassName:    "Desc_OreIron_C",
			Purity:       models.ResourceNodePurityPure,
			ResourceForm: "Solid",
			ResourceType: models.ResourceTypeIronOre,
			NodeType:     models.NodeTypeNode,
			Exploited:    true,
			Location:     models.Location{X: 3500, Y: 400, Z: 1800},
		},
		// Normal Iron Ore nodes
		{
			ID:           "ResourceNode_Iron_Normal_1",
			Name:         "Iron Ore",
			ClassName:    "Desc_OreIron_C",
			Purity:       models.ResourceNodePurityNormal,
			ResourceForm: "Solid",
			ResourceType: models.ResourceTypeIronOre,
			NodeType:     models.NodeTypeNode,
			Exploited:    false,
			Location:     models.Location{X: 5000, Y: 600, Z: 2000},
		},
		// Copper Ore nodes
		{
			ID:           "ResourceNode_Copper_Normal_1",
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
			ID:           "ResourceNode_Copper_Impure_1",
			Name:         "Copper Ore",
			ClassName:    "Desc_OreCopper_C",
			Purity:       models.ResourceNodePurityImpure,
			ResourceForm: "Solid",
			ResourceType: models.ResourceTypeCopperOre,
			NodeType:     models.NodeTypeNode,
			Exploited:    false,
			Location:     models.Location{X: 18500, Y: 2100, Z: 12000},
		},
		// Limestone nodes
		{
			ID:           "ResourceNode_Limestone_Normal_1",
			Name:         "Limestone",
			ClassName:    "Desc_Stone_C",
			Purity:       models.ResourceNodePurityNormal,
			ResourceForm: "Solid",
			ResourceType: models.ResourceTypeLimestone,
			NodeType:     models.NodeTypeNode,
			Exploited:    false,
			Location:     models.Location{X: 22000, Y: 3500, Z: 15000},
		},
		{
			ID:           "ResourceNode_Limestone_Pure_1",
			Name:         "Limestone",
			ClassName:    "Desc_Stone_C",
			Purity:       models.ResourceNodePurityPure,
			ResourceForm: "Solid",
			ResourceType: models.ResourceTypeLimestone,
			NodeType:     models.NodeTypeNode,
			Exploited:    true,
			Location:     models.Location{X: 23000, Y: 3800, Z: 15500},
		},
		// Coal nodes
		{
			ID:           "ResourceNode_Coal_Pure_1",
			Name:         "Coal",
			ClassName:    "Desc_Coal_C",
			Purity:       models.ResourceNodePurityPure,
			ResourceForm: "Solid",
			ResourceType: models.ResourceTypeCoal,
			NodeType:     models.NodeTypeNode,
			Exploited:    false,
			Location:     models.Location{X: 52000, Y: 9500, Z: 42000},
		},
		// Caterium Ore nodes
		{
			ID:           "ResourceNode_Caterium_Normal_1",
			Name:         "Caterium Ore",
			ClassName:    "Desc_OreCaterium_C",
			Purity:       models.ResourceNodePurityNormal,
			ResourceForm: "Solid",
			ResourceType: models.ResourceTypeCateriumOre,
			NodeType:     models.NodeTypeNode,
			Exploited:    false,
			Location:     models.Location{X: 58000, Y: 11200, Z: 48000},
		},
		// Raw Quartz nodes
		{
			ID:           "ResourceNode_Quartz_Impure_1",
			Name:         "Raw Quartz",
			ClassName:    "Desc_RawQuartz_C",
			Purity:       models.ResourceNodePurityImpure,
			ResourceForm: "Solid",
			ResourceType: models.ResourceTypeRawQuartz,
			NodeType:     models.NodeTypeNode,
			Exploited:    false,
			Location:     models.Location{X: 54500, Y: 10000, Z: 44500},
		},
		// Crude Oil - liquid resource with fracking satellite
		{
			ID:           "ResourceNode_CrudeOil_Normal_1",
			Name:         "Crude Oil",
			ClassName:    "Desc_LiquidOil_C",
			Purity:       models.ResourceNodePurityNormal,
			ResourceForm: "Liquid",
			ResourceType: models.ResourceTypeCrudeOil,
			NodeType:     models.NodeTypeNode,
			Exploited:    true,
			Location:     models.Location{X: 70000, Y: 15000, Z: 50000},
		},
		// Geyser for geothermal power
		{
			ID:           "ResourceNode_Geyser_1",
			Name:         "Geyser",
			ClassName:    "Desc_Geyser_C",
			Purity:       models.ResourceNodePurityNormal,
			ResourceForm: "Heat",
			ResourceType: models.ResourceTypeGeyser,
			NodeType:     models.NodeTypeGeyser,
			Exploited:    false,
			Location:     models.Location{X: 80000, Y: 20000, Z: 55000},
		},
		// Sulfur nodes
		{
			ID:           "ResourceNode_Sulfur_Normal_1",
			Name:         "Sulfur",
			ClassName:    "Desc_Sulfur_C",
			Purity:       models.ResourceNodePurityNormal,
			ResourceForm: "Solid",
			ResourceType: models.ResourceTypeSulfur,
			NodeType:     models.NodeTypeNode,
			Exploited:    false,
			Location:     models.Location{X: 45000, Y: 8000, Z: 35000},
		},
		// Bauxite nodes
		{
			ID:           "ResourceNode_Bauxite_Normal_1",
			Name:         "Bauxite",
			ClassName:    "Desc_OreBauxite_C",
			Purity:       models.ResourceNodePurityNormal,
			ResourceForm: "Solid",
			ResourceType: models.ResourceTypeBauxite,
			NodeType:     models.NodeTypeNode,
			Exploited:    false,
			Location:     models.Location{X: 90000, Y: 25000, Z: 60000},
		},
		// Uranium nodes
		{
			ID:           "ResourceNode_Uranium_Impure_1",
			Name:         "Uranium",
			ClassName:    "Desc_OreUranium_C",
			Purity:       models.ResourceNodePurityImpure,
			ResourceForm: "Solid",
			ResourceType: models.ResourceTypeUranium,
			NodeType:     models.NodeTypeNode,
			Exploited:    false,
			Location:     models.Location{X: 100000, Y: 30000, Z: 70000},
		},
		// SAM nodes
		{
			ID:           "ResourceNode_SAM_Normal_1",
			Name:         "SAM",
			ClassName:    "Desc_SAM_C",
			Purity:       models.ResourceNodePurityNormal,
			ResourceForm: "Solid",
			ResourceType: models.ResourceTypeSAM,
			NodeType:     models.NodeTypeNode,
			Exploited:    false,
			Location:     models.Location{X: 95000, Y: 28000, Z: 65000},
		},
	}, nil
}
