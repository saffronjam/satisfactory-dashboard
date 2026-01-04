package frm_client

import (
	"api/models/models"
	"api/service/frm_client/frm_models"
	"context"
	"fmt"
	"sort"
)

// ListPlayers fetches online player data
func (client *Client) ListPlayers(ctx context.Context) ([]models.Player, error) {
	var rawPlayers []frm_models.Player
	err := client.makeSatisfactoryCall(ctx, "/getPlayer", &rawPlayers)
	if err != nil {
		return nil, fmt.Errorf("failed to get players. details: %w", err)
	}

	players := make([]models.Player, 0, len(rawPlayers))
	for _, raw := range rawPlayers {
		// Filter out players without names
		if raw.Name == "" {
			continue
		}

		playerItems := make([]models.ItemStats, len(raw.Inventory))
		for i, item := range raw.Inventory {
			playerItems[i] = models.ItemStats{
				Name:  item.Name,
				Count: item.Amount,
			}
		}
		// Sort items by count descending
		sort.Slice(playerItems, func(i, j int) bool {
			return playerItems[i].Count > playerItems[j].Count
		})

		players = append(players, models.Player{
			ID:       raw.Id,
			Name:     raw.Name,
			Health:   raw.PlayerHP,
			Items:    playerItems,
			Location: parseLocation(raw.Location),
		})
	}

	return players, nil
}
