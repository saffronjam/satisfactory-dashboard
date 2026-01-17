package frm_client

import (
	"api/models/models"
	"api/service/frm_client/frm_models"
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"
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
		ID:            raw.ID,
		Name:          raw.Name,
		Location:      parseLocation(raw.Location),
		BoundingBox:   parseBoundingBox(raw.BoundingBox),
		CurrentPhase:  phases,
		FullyUpgraded: raw.FullyUpgraded,
		UpgradeReady:  raw.UpgradeReady,
	}, nil
}

// GetHub fetches HUB Terminal data including active milestone information
func (client *Client) GetHub(ctx context.Context) (*models.Hub, error) {
	var rawList []frm_models.HubTerminal
	err := client.makeSatisfactoryCallWithTimeout(ctx, "/getHubTerminal", &rawList, infraApiTimeout)
	if err != nil {
		return nil, fmt.Errorf("failed to get hub terminal: %w", err)
	}

	if len(rawList) == 0 {
		return nil, nil
	}
	raw := rawList[0]

	// If no hub exists, the ID will be empty
	if raw.ID == "" {
		return nil, nil
	}

	hub := &models.Hub{
		ID:                 raw.ID,
		Name:               raw.Name,
		HasActiveMilestone: raw.HasActiveMilestone,
		ShipDocked:         raw.ShipDock,
		Location:           parseLocation(raw.Location),
		BoundingBox:        parseBoundingBox(raw.BoundingBox),
	}

	// If ship is not docked, parse the return duration and convert to timestamp
	if !raw.ShipDock && raw.ShipReturn != "" && raw.ShipReturn != "00:00:00" {
		if duration := parseDuration(raw.ShipReturn); duration > 0 {
			returnTime := time.Now().Add(duration).UnixMilli()
			hub.ShipReturnTime = &returnTime
		}
	}

	// Only include milestone data if there's an active milestone
	if raw.HasActiveMilestone && raw.ActiveMilestone.Type != "No Milestone Selected" {
		costs := make([]models.HubMilestoneCost, len(raw.ActiveMilestone.Cost))
		for i, c := range raw.ActiveMilestone.Cost {
			// Bug in FRM api, Amount is same as TotalCost, so we use RemainingCost instead
			costs[i] = models.HubMilestoneCost{
				Name:          c.Name,
				Amount:        c.TotalCost - c.RemainingCost,
				RemainingCost: c.RemainingCost,
				TotalCost:     c.TotalCost,
			}
		}
		hub.ActiveMilestone = &models.HubMilestone{
			Name:     raw.ActiveMilestone.Name,
			TechTier: raw.ActiveMilestone.TechTier,
			Type:     raw.ActiveMilestone.Type,
			Cost:     costs,
		}
	}

	return hub, nil
}

// parseDuration parses a duration string in "HH:MM:SS" format and returns a time.Duration
func parseDuration(s string) time.Duration {
	parts := strings.Split(s, ":")
	if len(parts) != 3 {
		return 0
	}
	hours, err1 := strconv.Atoi(parts[0])
	minutes, err2 := strconv.Atoi(parts[1])
	seconds, err3 := strconv.Atoi(parts[2])
	if err1 != nil || err2 != nil || err3 != nil {
		return 0
	}
	return time.Duration(hours)*time.Hour + time.Duration(minutes)*time.Minute + time.Duration(seconds)*time.Second
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

		// Convert fauna (skip garbage data with "Unknown File Error")
		fauna := make([]models.ScannedFauna, 0, len(raw.Fauna))
		for _, f := range raw.Fauna {
			if containsIgnoreCase(f.Name, "Unknown File Error") {
				continue
			}
			fauna = append(fauna, models.ScannedFauna{
				Name:      models.FaunaType(f.Name),
				ClassName: f.ClassName,
				Amount:    f.Amount,
			})
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
