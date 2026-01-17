package frm_client

import (
	"api/models/models"
	"api/service/frm_client/frm_models"
	"context"
	"fmt"
)

// ListSchematics fetches schematic data from the FRM API and filters to milestones only.
func (client *Client) ListSchematics(ctx context.Context) ([]models.Schematic, error) {
	var rawSchematics []frm_models.Schematic
	err := client.makeSatisfactoryCall(ctx, "/getSchematics", &rawSchematics)
	if err != nil {
		return nil, fmt.Errorf("failed to get schematics: %w", err)
	}

	// Filter to milestones only and convert to model type
	schematics := make([]models.Schematic, 0, len(rawSchematics))
	for _, raw := range rawSchematics {
		if raw.Type != "Milestone" {
			continue
		}

		// Convert cost items
		cost := make([]models.SchematicCost, 0, len(raw.Cost))
		for _, c := range raw.Cost {
			cost = append(cost, models.SchematicCost{
				Name:      c.Name,
				Amount:    c.Amount,
				TotalCost: c.TotalCost,
			})
		}

		schematics = append(schematics, models.Schematic{
			ID:          raw.ID,
			Name:        raw.Name,
			Tier:        raw.TechTier,
			Type:        raw.Type,
			Purchased:   raw.Purchased,
			Locked:      raw.Locked,
			LockedPhase: raw.LockedPhase,
			Cost:        cost,
		})
	}

	return schematics, nil
}
