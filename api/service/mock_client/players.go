package mock_client

import (
	"api/models/models"
	"context"
	"math/rand"
	"time"
)

func (c *Client) ListPlayers(_ context.Context) ([]models.Player, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	type playerConfig struct {
		id     string
		name   string
		health float64
		items  []models.ItemStats
	}

	configs := []playerConfig{
		{"1", "Kyoshi", randRange(75, 25), []models.ItemStats{
			itemStats("Caterium Ingot", 200, 50), itemStats("Copper Sheet", 150, 30),
			itemStats("Quickwire", 500, 100), itemStats("AI Limiter", 25, 10),
		}},
		{"2", "ellaurgor", randRange(90, 10), []models.ItemStats{
			itemStats("Steel Beam", 100, 30), itemStats("Concrete", 300, 50),
			itemStats("Iron Plate", 250, 50), itemStats("Screws", 800, 200),
		}},
		{"3", "FactoryBot9000", randRange(60, 40), []models.ItemStats{
			itemStats("Heavy Modular Frame", 15, 10), itemStats("Motor", 40, 15),
			itemStats("Rotor", 60, 20), itemStats("Reinforced Iron Plate", 80, 25),
		}},
		{"4", "NuclearEngineer", 100, []models.ItemStats{
			itemStats("Uranium Fuel Rod", 10, 5), itemStats("Electromagnetic Control Rod", 20, 10),
			itemStats("Cooling System", 15, 8), itemStats("Heat Sink", 50, 20),
		}},
	}

	players := make([]models.Player, len(configs))
	for i, cfg := range configs {
		players[i] = models.Player{ID: cfg.id, Name: cfg.name, Health: cfg.health, Items: cfg.items}
	}
	return players, nil
}
