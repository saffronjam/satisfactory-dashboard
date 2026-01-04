package frm_client

import (
	"api/models/models"
	"api/service/frm_client/frm_models"
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
)

// ListCircuits fetches power circuit data
func (client *Client) ListCircuits(ctx context.Context) ([]models.Circuit, error) {
	var rawCircuits []frm_models.Circuit
	err := client.makeSatisfactoryCall(ctx, "/getPower", &rawCircuits)
	if err != nil {
		return nil, fmt.Errorf("failed to get circuits. details: %w", err)
	}

	circuits := make([]models.Circuit, 0, len(rawCircuits))
	for _, raw := range rawCircuits {
		// Helper function to parse HH:MM:SS to seconds
		parseTime := func(timeStr *string) float64 {
			if timeStr == nil || *timeStr == "" {
				return 0
			}
			parts := strings.Split(*timeStr, ":")
			if len(parts) != 3 {
				return 0
			}
			h, _ := strconv.Atoi(parts[0])
			m, _ := strconv.Atoi(parts[1])
			sec, _ := strconv.Atoi(parts[2])
			return float64(h*3600 + m*60 + sec)
		}

		secondsToFull := parseTime(raw.BatteryTimeFull)
		secondsToEmpty := parseTime(raw.BatteryTimeEmpty)

		circuit := models.Circuit{
			ID: raw.CircuitID,
			Consumption: models.CircuitConsumption{
				Total: raw.PowerConsumed * 1_000_000,    // MW to W
				Max:   raw.PowerMaxConsumed * 1_000_000, // MW to W
			},
			Production: models.CircuitProduction{
				Total: raw.PowerProduction * 1_000_000, // MW to W
			},
			Capacity: models.CircuitCapacity{
				Total: raw.PowerCapacity * 1_000_000, // MW to W
			},
			Battery: models.CircuitBattery{
				Percentage:   raw.BatteryPercent,
				Capacity:     raw.BatteryCapacity * 1_000_000,     // MWh to Wh? Check units
				Differential: raw.BatteryDifferential * 1_000_000, // MW to W
				UntilFull:    secondsToFull,
				UntilEmpty:   secondsToEmpty,
			},
			FuseTriggered: raw.FuseTriggered,
		}

		// Filter out circuits with no production (consistent with TS)
		if circuit.Production.Total > 0 {
			circuits = append(circuits, circuit)
		}
	}

	// Sort by largest production (consistent with TS)
	sort.Slice(circuits, func(i, j int) bool {
		return circuits[i].Production.Total > circuits[j].Production.Total
	})

	return circuits, nil
}
