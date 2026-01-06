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

// GetHypertubes fetches hypertube data and entrances
func (client *Client) GetHypertubes(ctx context.Context) (models.Hypertubes, error) {
	var hypertubes []models.Hypertube

	var wg sync.WaitGroup
	var mu sync.Mutex
	var firstError error

	wg.Add(2)

	// Fetch hypertubes
	go func() {
		defer wg.Done()
		h, err := client.ListHypertubes(ctx)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = err
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		hypertubes = h
		mu.Unlock()
	}()

	// Fetch hypertube entrances
	var entrances []models.HypertubeEntrance
	go func() {
		defer wg.Done()
		e, err := client.ListHypertubeEntrances(ctx)
		if err != nil {
			mu.Lock()
			if firstError == nil {
				firstError = err
			}
			mu.Unlock()
			return
		}
		mu.Lock()
		entrances = e
		mu.Unlock()
	}()

	wg.Wait()

	if firstError != nil {
		return models.Hypertubes{}, firstError
	}

	return models.Hypertubes{
		Hypertubes:         hypertubes,
		HypertubeEntrances: entrances,
	}, nil
}

// ListHypertubes fetches hypertube data
func (client *Client) ListHypertubes(ctx context.Context) ([]models.Hypertube, error) {
	var rawHypertubes []frm_models.Hypertube
	err := client.makeSatisfactoryCallWithTimeout(ctx, "/getHypertube", &rawHypertubes, infraApiTimeout)
	if err != nil {
		return nil, fmt.Errorf("failed to get hypertubes. details: %w", err)
	}

	hypertubes := make([]models.Hypertube, len(rawHypertubes))
	for i, raw := range rawHypertubes {
		splineData := make([]models.Location, len(raw.SplineData))
		for j, pt := range raw.SplineData {
			splineData[j] = models.Location{X: pt.X, Y: pt.Y, Z: pt.Z, Rotation: pt.Rotation}
		}

		hypertubes[i] = models.Hypertube{
			ID:          raw.ID,
			Location0:   models.Location{X: raw.Location0.X, Y: raw.Location0.Y, Z: raw.Location0.Z, Rotation: raw.Location0.Rotation},
			Location1:   models.Location{X: raw.Location1.X, Y: raw.Location1.Y, Z: raw.Location1.Z, Rotation: raw.Location1.Rotation},
			SplineData:  splineData,
			BoundingBox: parseBoundingBox(raw.BoundingBox),
		}
	}
	return hypertubes, nil
}

// ListHypertubeEntrances fetches hypertube entrance data
func (client *Client) ListHypertubeEntrances(ctx context.Context) ([]models.HypertubeEntrance, error) {
	var rawEntrances []frm_models.HypertubeEntrance
	err := client.makeSatisfactoryCallWithTimeout(ctx, "/getHyperEntrance", &rawEntrances, infraApiTimeout)
	if err != nil {
		return nil, fmt.Errorf("failed to get hypertube entrances. details: %w", err)
	}

	entrances := make([]models.HypertubeEntrance, len(rawEntrances))
	for i, raw := range rawEntrances {
		entrances[i] = models.HypertubeEntrance{
			ID:          raw.ID,
			Location:    parseLocation(raw.Location),
			BoundingBox: parseBoundingBox(raw.BoundingBox),
			PowerInfo:   parsePowerInfo(raw.PowerInfo),
		}
	}
	return entrances, nil
}
