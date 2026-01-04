package frm_client

import (
	"api/models/models"
	"api/service/frm_client/frm_models"
	"context"
	"fmt"
)

// ListResourceNodes fetches world resource node data
func (client *Client) ListResourceNodes(ctx context.Context) ([]models.ResourceNode, error) {
	var rawNodes []frm_models.ResourceNode
	err := client.makeSatisfactoryCallWithTimeout(ctx, "/getResourceNode", &rawNodes, infraApiTimeout)
	if err != nil {
		return nil, fmt.Errorf("failed to get resource nodes. details: %w", err)
	}

	nodes := make([]models.ResourceNode, len(rawNodes))
	for i, raw := range rawNodes {
		// Determine ResourceType from ClassName or Name
		resourceType := inferResourceType(raw.ClassName, raw.Name)

		nodes[i] = models.ResourceNode{
			ID:           raw.ID,
			Name:         raw.Name,
			ClassName:    raw.ClassName,
			Purity:       models.ResourceNodePurity(raw.Purity),
			ResourceForm: raw.ResourceForm,
			ResourceType: resourceType,
			NodeType:     models.NodeType(raw.NodeType),
			Exploited:    raw.Exploited,
			Location:     parseLocation(raw.Location),
		}
	}
	return nodes, nil
}

// inferResourceType determines the ResourceType from ClassName or Name
func inferResourceType(className, name string) models.ResourceType {
	// Map common patterns to resource types
	switch {
	case containsIgnoreCase(className, "Iron") || containsIgnoreCase(name, "Iron"):
		return models.ResourceTypeIronOre
	case containsIgnoreCase(className, "Copper") || containsIgnoreCase(name, "Copper"):
		return models.ResourceTypeCopperOre
	case containsIgnoreCase(className, "Limestone") || containsIgnoreCase(name, "Limestone"):
		return models.ResourceTypeLimestone
	case containsIgnoreCase(className, "Coal") || containsIgnoreCase(name, "Coal"):
		return models.ResourceTypeCoal
	case containsIgnoreCase(className, "SAM") || containsIgnoreCase(name, "SAM"):
		return models.ResourceTypeSAM
	case containsIgnoreCase(className, "Sulfur") || containsIgnoreCase(name, "Sulfur"):
		return models.ResourceTypeSulfur
	case containsIgnoreCase(className, "Caterium") || containsIgnoreCase(name, "Caterium"):
		return models.ResourceTypeCateriumOre
	case containsIgnoreCase(className, "Bauxite") || containsIgnoreCase(name, "Bauxite"):
		return models.ResourceTypeBauxite
	case containsIgnoreCase(className, "Quartz") || containsIgnoreCase(name, "Quartz"):
		return models.ResourceTypeRawQuartz
	case containsIgnoreCase(className, "Uranium") || containsIgnoreCase(name, "Uranium"):
		return models.ResourceTypeUranium
	case containsIgnoreCase(className, "Oil") || containsIgnoreCase(name, "Oil") || containsIgnoreCase(name, "Crude"):
		return models.ResourceTypeCrudeOil
	case containsIgnoreCase(className, "Geyser") || containsIgnoreCase(name, "Geyser"):
		return models.ResourceTypeGeyser
	case containsIgnoreCase(className, "Nitrogen") || containsIgnoreCase(name, "Nitrogen"):
		return models.ResourceTypeNitrogenGas
	default:
		return models.ResourceType(name) // Fallback to name
	}
}
