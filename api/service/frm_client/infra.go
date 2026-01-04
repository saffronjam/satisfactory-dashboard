package frm_client

import (
	"api/models/models"
	"api/service/frm_client/frm_models"
	"context"
	"fmt"
	"sync"
)

// GetBelts fetches conveyor belt data and junctions
func (client *Client) GetBelts(ctx context.Context) (models.Belts, error) {
	var belts []models.Belt

	var wg sync.WaitGroup
	var mu sync.Mutex
	var firstError error

	wg.Add(2)

	// Fetch belts
	go func() {
		defer wg.Done()
		b, err := client.ListBelts(ctx)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = err
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		belts = b
		mu.Unlock()
	}()

	// Fetch splitter/mergers
	var splitterMergers []models.SplitterMerger
	go func() {
		defer wg.Done()
		sm, err := client.ListSplitterMergers(ctx)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = err
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		splitterMergers = sm
		mu.Unlock()
	}()

	wg.Wait()

	if firstError != nil {
		return models.Belts{}, firstError
	}

	return models.Belts{
		Belts:           belts,
		SplitterMergers: splitterMergers,
	}, nil
}

// ListBelts fetches conveyor belt data
func (client *Client) ListBelts(ctx context.Context) ([]models.Belt, error) {
	var rawBelts []frm_models.Belt
	err := client.makeSatisfactoryCallWithTimeout(ctx, "/getBelts", &rawBelts, infraApiTimeout)
	if err != nil {
		return nil, fmt.Errorf("failed to get belts. details: %w", err)
	}

	belts := make([]models.Belt, len(rawBelts))
	for i, raw := range rawBelts {
		splineData := make([]models.Location, len(raw.SplineData))
		for j, pt := range raw.SplineData {
			splineData[j] = models.Location{X: pt.X, Y: pt.Y, Z: pt.Z, Rotation: pt.Rotation}
		}

		belts[i] = models.Belt{
			ID:             raw.ID,
			Name:           raw.Name,
			Location0:      models.Location{X: raw.Location0.X, Y: raw.Location0.Y, Z: raw.Location0.Z, Rotation: raw.Location0.Rotation},
			Location1:      models.Location{X: raw.Location1.X, Y: raw.Location1.Y, Z: raw.Location1.Z, Rotation: raw.Location1.Rotation},
			Connected0:     raw.Connected0,
			Connected1:     raw.Connected1,
			SplineData:     splineData,
			Length:         raw.Length / 100, // Convert cm to m
			ItemsPerMinute: raw.ItemsPerMinute,
		}
	}
	return belts, nil
}

// GetPipes fetches pipe data and junctions
func (client *Client) GetPipes(ctx context.Context) (models.Pipes, error) {
	var pipes []models.Pipe

	var wg sync.WaitGroup
	var mu sync.Mutex
	var firstError error

	wg.Add(2)

	// Fetch pipes
	go func() {
		defer wg.Done()
		p, err := client.ListPipes(ctx)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = err
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		pipes = p
		mu.Unlock()
	}()

	// Fetch pipe junctions
	var junctions []models.PipeJunction
	go func() {
		defer wg.Done()
		j, err := client.ListPipeJunctions(ctx)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = err
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		junctions = j
		mu.Unlock()
	}()

	wg.Wait()

	if firstError != nil {
		return models.Pipes{}, firstError
	}

	return models.Pipes{
		Pipes:         pipes,
		PipeJunctions: junctions,
	}, nil
}

// ListPipes fetches pipe data
func (client *Client) ListPipes(ctx context.Context) ([]models.Pipe, error) {
	var rawPipes []frm_models.Pipe
	err := client.makeSatisfactoryCallWithTimeout(ctx, "/getPipes", &rawPipes, infraApiTimeout)
	if err != nil {
		return nil, fmt.Errorf("failed to get pipes. details: %w", err)
	}

	pipes := make([]models.Pipe, len(rawPipes))
	for i, raw := range rawPipes {
		splineData := make([]models.Location, len(raw.SplineData))
		for j, pt := range raw.SplineData {
			splineData[j] = models.Location{X: pt.X, Y: pt.Y, Z: pt.Z, Rotation: pt.Rotation}
		}

		pipes[i] = models.Pipe{
			ID:             raw.ID,
			Name:           raw.Name,
			Location0:      models.Location{X: raw.Location0.X, Y: raw.Location0.Y, Z: raw.Location0.Z, Rotation: raw.Location0.Rotation},
			Location1:      models.Location{X: raw.Location1.X, Y: raw.Location1.Y, Z: raw.Location1.Z, Rotation: raw.Location1.Rotation},
			Connected0:     raw.Connected0,
			Connected1:     raw.Connected1,
			SplineData:     splineData,
			Length:         raw.Length / 100, // Convert cm to m
			ItemsPerMinute: raw.ItemsPerMinute,
		}
	}
	return pipes, nil
}

// ListPipeJunctions fetches pipe junction data
func (client *Client) ListPipeJunctions(ctx context.Context) ([]models.PipeJunction, error) {
	var rawJunctions []frm_models.PipeJunction
	err := client.makeSatisfactoryCallWithTimeout(ctx, "/getPipeJunctions", &rawJunctions, infraApiTimeout)
	if err != nil {
		return nil, fmt.Errorf("failed to get pipe junctions. details: %w", err)
	}

	junctions := make([]models.PipeJunction, len(rawJunctions))
	for i, raw := range rawJunctions {
		junctions[i] = models.PipeJunction{
			ID:       raw.ID,
			Name:     raw.Name,
			Location: parseLocation(raw.Location),
		}
	}
	return junctions, nil
}

// ListSplitterMergers fetches splitter/merger data
func (client *Client) ListSplitterMergers(ctx context.Context) ([]models.SplitterMerger, error) {
	var rawSplitterMergers []frm_models.SplitterMerger
	err := client.makeSatisfactoryCallWithTimeout(ctx, "/getSplitterMerger", &rawSplitterMergers, infraApiTimeout)
	if err != nil {
		return nil, fmt.Errorf("failed to get splitter/mergers. details: %w", err)
	}

	splitterMergers := make([]models.SplitterMerger, len(rawSplitterMergers))
	for i, raw := range rawSplitterMergers {
		splitterMergers[i] = models.SplitterMerger{
			ID:          raw.ID,
			Type:        models.SplitterMergerType(raw.Name),
			Location:    parseLocation(raw.Location),
			BoundingBox: parseBoundingBox(raw.BoundingBox),
		}
	}
	return splitterMergers, nil
}

// ListCables fetches power cable data for map visualization
func (client *Client) ListCables(ctx context.Context) ([]models.Cable, error) {
	var rawCables []frm_models.Cable
	err := client.makeSatisfactoryCallWithTimeout(ctx, "/getCables", &rawCables, infraApiTimeout)
	if err != nil {
		return nil, fmt.Errorf("failed to get cables. details: %w", err)
	}

	cables := make([]models.Cable, len(rawCables))
	for i, raw := range rawCables {
		cables[i] = models.Cable{
			ID:         raw.ID,
			Name:       raw.Name,
			Location0:  models.Location{X: raw.Location0.X, Y: raw.Location0.Y, Z: raw.Location0.Z, Rotation: raw.Location0.Rotation},
			Location1:  models.Location{X: raw.Location1.X, Y: raw.Location1.Y, Z: raw.Location1.Z, Rotation: raw.Location1.Rotation},
			Connected0: raw.Connected0,
			Connected1: raw.Connected1,
			Length:     raw.Length / 100, // Convert cm to m
		}
	}
	return cables, nil
}

// ListTrainRails fetches train rail data
// NOTE: FRM /getTrainRails endpoint is currently broken, returning empty list
func (client *Client) ListTrainRails(ctx context.Context) ([]models.TrainRail, error) {
	// TODO: Re-enable when FRM fixes the /getTrainRails endpoint
	// var rawRails []TrainRail
	// err := client.makeSatisfactoryCall(ctx, "/getTrainRails", &rawRails)
	// if err != nil {
	// 	return nil, fmt.Errorf("failed to get train rails. details: %w", err)
	// }
	//
	// rails := make([]models.TrainRail, len(rawRails))
	// for i, raw := range rawRails {
	// 	splineData := make([]models.Location, len(raw.SplineData))
	// 	for j, pt := range raw.SplineData {
	// 		splineData[j] = models.Location{X: pt.X, Y: pt.Y, Z: pt.Z, Rotation: pt.Rotation}
	// 	}
	//
	// 	rails[i] = models.TrainRail{
	// 		ID:         raw.ID,
	// 		Type:       models.TrainRailType(raw.Name),
	// 		Location0:  models.Location{X: raw.Location0.X, Y: raw.Location0.Y, Z: raw.Location0.Z, Rotation: raw.Location0.Rotation},
	// 		Location1:  models.Location{X: raw.Location1.X, Y: raw.Location1.Y, Z: raw.Location1.Z, Rotation: raw.Location1.Rotation},
	// 		Connected0: raw.Connected0,
	// 		Connected1: raw.Connected1,
	// 		SplineData: splineData,
	// 		Length:     raw.Length / 100, // Convert cm to m
	// 	}
	// }
	// return rails, nil

	return []models.TrainRail{}, nil
}

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
		nodes := make([]models.ScannedResourceNode, len(raw.Nodes))
		for j, n := range raw.Nodes {
			nodes[j] = models.ScannedResourceNode{
				ID:           n.ID,
				Name:         n.Name,
				ClassName:    n.ClassName,
				Purity:       models.ResourceNodePurity(n.Purity),
				ResourceForm: n.ResourceForm,
				NodeType:     models.ResourceNodeType(n.NodeType),
				Exploited:    n.Exploited,
				Location:     models.Location{X: n.X, Y: n.Y, Z: n.Z},
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
			Name:         raw.Name,
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
