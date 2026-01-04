package frm_client

import (
	"api/models/models"
	"api/pkg/log"
	"api/service/frm_client/frm_models"
	"context"
	"fmt"
	"math"
	"sort"
	"sync"
)

// GetFactoryStats fetches efficiency statistics for factory machines
func (client *Client) GetFactoryStats(ctx context.Context) (*models.FactoryStats, error) {
	stats := models.FactoryStats{
		Efficiency: models.MachineEfficiency{},
	}

	// Helper to determine machine status based on FRM API boolean flags
	machineStatus := func(isConfigured, isProducing, isPaused bool) models.MachineStatus {
		if !isConfigured {
			return models.MachineStatusUnconfigured
		}
		if isPaused {
			return models.MachineStatusPaused
		}
		if isProducing {
			return models.MachineStatusOperating
		}
		return models.MachineStatusIdle
	}

	// Only fetch factory machines for efficiency stats (not extractors or generators)
	var rawFactories []frm_models.FactoryMachine
	err := client.makeSatisfactoryCall(ctx, "/getFactory", &rawFactories)
	if err != nil {
		return nil, fmt.Errorf("failed to get factory machines. details: %w", err)
	}

	for _, raw := range rawFactories {
		status := machineStatus(raw.IsConfigured, raw.IsProducing, raw.IsPaused)

		stats.TotalMachines++
		switch status {
		case models.MachineStatusOperating:
			stats.Efficiency.MachinesOperating++
		case models.MachineStatusIdle:
			stats.Efficiency.MachinesIdle++
		case models.MachineStatusPaused:
			stats.Efficiency.MachinesPaused++
		case models.MachineStatusUnconfigured:
			stats.Efficiency.MachinesUnconfigured++
		case models.MachineStatusUnknown:
			stats.Efficiency.MachinesUnknown++
		}
	}

	return &stats, nil
}

// GetProdStats fetches production and consumption statistics for items
func (client *Client) GetProdStats(ctx context.Context) (*models.ProdStats, error) {
	prodStats := models.ProdStats{
		Items: make([]models.ItemProdStats, 0),
	}
	var wg sync.WaitGroup
	var mu sync.Mutex
	var firstError error

	var rawProdData []frm_models.ProdStatItem
	var rawInvData []frm_models.WorldInvItem
	var rawCloudInvData []frm_models.CloudInvItem
	itemMap := make(map[string]int)      // Map Name -> Amount (world inventory)
	cloudItemMap := make(map[string]int) // Map Name -> Amount (cloud inventory)

	// Fetch Production Stats
	wg.Add(1)
	go func() {
		defer wg.Done()
		err := client.makeSatisfactoryCall(ctx, "/getProdStats", &rawProdData)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = fmt.Errorf("failed to get prod stats. details: %w", err)
			}
			mu.Unlock()
		}
	}()

	// Fetch World Inventory
	wg.Add(1)
	go func() {
		defer wg.Done()
		err := client.makeSatisfactoryCall(ctx, "/getWorldInv", &rawInvData)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = fmt.Errorf("failed to get world inventory. details: %w", err)
			}
			mu.Unlock()
			return // Don't proceed if inventory fetch failed
		}
		// Build map only if fetch succeeded
		mu.Lock()
		defer mu.Unlock()
		for _, item := range rawInvData {
			itemMap[item.Name] = item.Amount
		}
	}()

	// Fetch Cloud Inventory
	wg.Add(1)
	go func() {
		defer wg.Done()
		err := client.makeSatisfactoryCall(ctx, "/getCloudInv", &rawCloudInvData)
		if err != nil {
			// Cloud inventory is optional - don't fail the entire request
			log.Debugf("Failed to get cloud inventory: %v", err)
			return
		}
		// Build map only if fetch succeeded
		mu.Lock()
		defer mu.Unlock()
		for _, item := range rawCloudInvData {
			cloudItemMap[item.Name] = item.Amount
		}
	}()

	wg.Wait()

	if firstError != nil {
		return &models.ProdStats{}, firstError
	}

	// Process fetched data
	for _, item := range rawProdData {
		minable := client.isMinableResource(item.Name)
		count := itemMap[item.Name]           // Defaults to 0 if not found
		cloudCount := cloudItemMap[item.Name] // Defaults to 0 if not found

		if minable {
			prodStats.MinableProducedPerMinute += item.CurrentProd
			prodStats.MinableConsumedPerMinute += item.CurrentConsumed
		} else {
			prodStats.ItemsProducedPerMinute += item.CurrentProd
			prodStats.ItemsConsumedPerMinute += item.CurrentConsumed
		}

		prodStats.Items = append(prodStats.Items, models.ItemProdStats{
			ItemStats: models.ItemStats{
				Name:  item.Name,
				Count: float64(count), // Assuming count should be float64 in the model
			},
			ProducedPerMinute:   item.CurrentProd,
			MaxProducePerMinute: item.MaxProd,
			ProduceEfficiency:   item.ProdPercent / 100.0,
			ConsumedPerMinute:   item.CurrentConsumed,
			MaxConsumePerMinute: item.MaxConsumed,
			ConsumeEfficiency:   item.ConsPercent / 100.0,
			CloudCount:          float64(cloudCount),
			Minable:             minable,
		})
	}

	// Round totals
	prodStats.MinableProducedPerMinute = math.Round(prodStats.MinableProducedPerMinute)
	prodStats.MinableConsumedPerMinute = math.Round(prodStats.MinableConsumedPerMinute)
	prodStats.ItemsProducedPerMinute = math.Round(prodStats.ItemsProducedPerMinute)
	prodStats.ItemsConsumedPerMinute = math.Round(prodStats.ItemsConsumedPerMinute)

	// Sort items by produced per minute descending
	sort.Slice(prodStats.Items, func(i, j int) bool {
		return prodStats.Items[i].ProducedPerMinute > prodStats.Items[j].ProducedPerMinute
	})

	return &prodStats, nil
}

// GetGeneratorStats fetches aggregate generator power statistics by type
func (client *Client) GetGeneratorStats(ctx context.Context) (*models.GeneratorStats, error) {
	var rawGenerators []frm_models.Generator
	err := client.makeSatisfactoryCall(ctx, "/getGenerators", &rawGenerators)
	if err != nil {
		return &models.GeneratorStats{}, fmt.Errorf("failed to get generators. details: %w", err)
	}

	stats := models.GeneratorStats{
		Sources: make(map[models.PowerType]models.PowerSource),
	}

	currentPowerByType := func(gen *frm_models.Generator, genType models.PowerType) float64 {
		if genType == models.PowerTypeGeothermal {
			return gen.ProductionCapacity * 1_000_000
		}
		return gen.RegulatedDemandProd * 1_000_000
	}

	for _, raw := range rawGenerators {
		genType := client.blueprintGeneratorNameToType(raw.Name)
		if genType == models.PowerTypeUnknown {
			continue
		}

		power := currentPowerByType(&raw, genType)

		source, exists := stats.Sources[genType]
		if exists {
			source.Count++
			source.TotalProduction += power
			stats.Sources[genType] = source
		} else {
			stats.Sources[genType] = models.PowerSource{
				Count:           1,
				TotalProduction: power,
			}
		}
	}

	return &stats, nil
}

// GetSinkStats fetches Awesome Sink data
func (client *Client) GetSinkStats(ctx context.Context) (*models.SinkStats, error) {
	var rawSinkList []frm_models.SinkData
	err := client.makeSatisfactoryCall(ctx, "/getResourceSink", &rawSinkList)
	if err != nil {
		return &models.SinkStats{}, fmt.Errorf("failed to get sink stats. details: %w", err)
	}

	if len(rawSinkList) == 0 {
		return &models.SinkStats{}, nil
	}

	sink := rawSinkList[0] // Assume first item is the relevant one

	var pointsPerMin float64
	if len(sink.GraphPoints) > 0 {
		pointsPerMin = sink.GraphPoints[len(sink.GraphPoints)-1]
	}

	return &models.SinkStats{
		TotalPoints:        sink.TotalPoints,
		Coupons:            sink.NumCoupon,
		NextCouponProgress: sink.Percent,
		PointsPerMinute:    pointsPerMin,
	}, nil
}
