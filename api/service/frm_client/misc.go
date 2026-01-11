package frm_client

import (
	"api/models/models"
	"api/service/frm_client/frm_models"
	"context"
	"fmt"
	"strings"
)

// ListStorageContainers fetches storage container inventory data
func (client *Client) ListStorageContainers(ctx context.Context) ([]models.Storage, error) {
	var rawStorages []frm_models.Storage
	err := client.makeSatisfactoryCallWithTimeout(ctx, "/getStorageInv", &rawStorages, infraApiTimeout)
	if err != nil {
		return nil, fmt.Errorf("failed to get storage containers. details: %w", err)
	}

	storages := make([]models.Storage, len(rawStorages))
	for i, raw := range rawStorages {
		inventory := make([]models.ItemStats, len(raw.Inventory))
		for j, item := range raw.Inventory {
			inventory[j] = models.ItemStats{
				Name:  item.Name,
				Count: float64(item.Amount),
			}
		}

		storages[i] = models.Storage{
			ID:          raw.ID,
			Type:        models.StorageType(raw.Name),
			Location:    parseLocation(raw.Location),
			BoundingBox: parseBoundingBox(raw.BoundingBox),
			Inventory:   inventory,
		}
	}
	return storages, nil
}

// GetSpaceElevator fetches space elevator data (single object, not array)
func (client *Client) GetSpaceElevator(ctx context.Context) (*models.SpaceElevator, error) {
	var rawList []frm_models.SpaceElevator
	err := client.makeSatisfactoryCallWithTimeout(ctx, "/getSpaceElevator", &rawList, infraApiTimeout)
	if err != nil {
		return nil, fmt.Errorf("failed to get space elevator. details: %w", err)
	}

	if len(rawList) == 0 {
		return nil, nil
	}
	raw := rawList[0]

	// If no space elevator exists, the ID will be empty
	if raw.ID == "" {
		return nil, nil
	}

	phases := make([]models.SpaceElevatorPhaseObjective, len(raw.CurrentPhase))
	for i, p := range raw.CurrentPhase {
		phases[i] = models.SpaceElevatorPhaseObjective{
			Name:      p.Name,
			Amount:    p.Amount,
			TotalCost: p.TotalCost,
		}
	}

	return &models.SpaceElevator{
		Name:          raw.Name,
		Location:      parseLocation(raw.Location),
		BoundingBox:   parseBoundingBox(raw.BoundingBox),
		CurrentPhase:  phases,
		FullyUpgraded: raw.FullyUpgraded,
		UpgradeReady:  raw.UpgradeReady,
	}, nil
}

// GetHub fetches HUB data (single object, not array)
func (client *Client) GetHub(ctx context.Context) (*models.Hub, error) {
	var rawList []frm_models.Hub
	err := client.makeSatisfactoryCallWithTimeout(ctx, "/getTradingPost", &rawList, infraApiTimeout)
	if err != nil {
		return nil, fmt.Errorf("failed to get hub. details: %w", err)
	}

	if len(rawList) == 0 {
		return nil, nil
	}
	raw := rawList[0]

	// If no hub exists, the ID will be empty
	if raw.ID == "" {
		return nil, nil
	}

	return &models.Hub{
		ID:          raw.ID,
		HubLevel:    raw.HubLevel,
		Location:    parseLocation(raw.Location),
		BoundingBox: parseBoundingBox(raw.BoundingBox),
	}, nil
}

// ListRadarTowers fetches radar tower data
func (client *Client) ListRadarTowers(ctx context.Context) ([]models.RadarTower, error) {
	var rawTowers []frm_models.RadarTower
	err := client.makeSatisfactoryCallWithTimeout(ctx, "/getRadarTower", &rawTowers, infraApiTimeout)
	if err != nil {
		return nil, fmt.Errorf("failed to get radar towers. details: %w", err)
	}

	towers := make([]models.RadarTower, len(rawTowers))
	for i, raw := range rawTowers {
		// Convert scanned resource nodes
		nodes := make([]models.ResourceNode, len(raw.Nodes))
		for j, n := range raw.Nodes {
			nodes[j] = models.ResourceNode{
				ID:           n.ID,
				Name:         n.Name,
				ClassName:    n.ClassName,
				Purity:       models.ResourceNodePurity(n.Purity),
				ResourceForm: n.ResourceForm,
				ResourceType: models.ResourceType(n.NodeType), // In radar context, NodeType is the resource type
				NodeType:     models.NodeTypeNode,             // Radar scanned nodes are always "Node" type
				Exploited:    n.Exploited,
				Location:     parseLocation(n.Location),
			}
		}

		// Convert fauna
		fauna := make([]models.ScannedFauna, len(raw.Fauna))
		for j, f := range raw.Fauna {
			fauna[j] = models.ScannedFauna{
				Name:      models.FaunaType(f.Name),
				ClassName: f.ClassName,
				Amount:    f.Amount,
			}
		}

		// Convert flora
		flora := make([]models.ScannedFlora, len(raw.Flora))
		for j, f := range raw.Flora {
			flora[j] = models.ScannedFlora{
				Name:      models.FloraType(f.Name),
				ClassName: f.ClassName,
				Amount:    f.Amount,
			}
		}

		// Convert signals
		signals := make([]models.ScannedSignal, len(raw.Signal))
		for j, s := range raw.Signal {
			signals[j] = models.ScannedSignal{
				Name:      models.SignalType(s.Name),
				ClassName: s.ClassName,
				Amount:    s.Amount,
			}
		}

		towers[i] = models.RadarTower{
			ID:           raw.ID,
			RevealRadius: raw.RevealRadius / 100, // Convert cm to m
			Nodes:        nodes,
			Fauna:        fauna,
			Flora:        flora,
			Signal:       signals,
			Location:     parseLocation(raw.Location),
			BoundingBox:  parseBoundingBox(raw.BoundingBox),
		}
	}
	return towers, nil
}

// containsIgnoreCase checks if s contains substr (case-insensitive)
func containsIgnoreCase(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}
