package mock_client

import (
	"api/models/models"
	"context"
	"math"
	"math/rand"
	"time"
)

// generateSpline creates a spline path between two points with some curvature
func generateSpline(from, to models.Location, segments int) []models.Location {
	spline := make([]models.Location, segments+1)
	for i := 0; i <= segments; i++ {
		t := float64(i) / float64(segments)
		// Add some gentle curve by offsetting the midpoint
		midOffset := math.Sin(t*math.Pi) * 500 // Subtle curve
		spline[i] = models.Location{
			X:        lerp(from.X, to.X, t) + midOffset,
			Y:        lerp(from.Y, to.Y, t),
			Z:        lerp(from.Z, to.Z, t),
			Rotation: from.Rotation,
		}
	}
	return spline
}

func (c *Client) ListBelts(_ context.Context) ([]models.Belt, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	// Create belts connecting various factory machines
	belts := []models.Belt{
		// Smelter to Constructor belts (Iron line)
		{
			ID: "belt-1", Name: "Iron Ore Belt",
			Location0:  loc(5000, 500, 5000, 0),
			Location1:  loc(12000, 800, 8000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(5000, 500, 5000, 0), loc(12000, 800, 8000, 0), 8),
			Length:     8500, ItemsPerMinute: 270,
		},
		{
			ID: "belt-2", Name: "Iron Ingot Belt",
			Location0:  loc(12000, 800, 8000, 0),
			Location1:  loc(28000, 3000, 22000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(12000, 800, 8000, 0), loc(28000, 3000, 22000, 0), 10),
			Length:     22000, ItemsPerMinute: 180,
		},
		// Copper line
		{
			ID: "belt-3", Name: "Copper Ore Belt",
			Location0:  loc(20000, 2200, 15000, 0),
			Location1:  loc(-12000, 1000, 40000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(20000, 2200, 15000, 0), loc(-12000, 1000, 40000, 0), 12),
			Length:     35000, ItemsPerMinute: 240,
		},
		// Steel line to assemblers
		{
			ID: "belt-4", Name: "Steel to Assembler",
			Location0:  loc(40000, 5500, 35000, 0),
			Location1:  loc(35000, 4000, 30000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(40000, 5500, 35000, 0), loc(35000, 4000, 30000, 0), 6),
			Length:     7000, ItemsPerMinute: 120,
		},
		// Advanced manufacturing
		{
			ID: "belt-5", Name: "Computer Parts Belt",
			Location0:  loc(60000, 10500, 50000, 0),
			Location1:  loc(62000, 11500, 52000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(60000, 10500, 50000, 0), loc(62000, 11500, 52000, 0), 4),
			Length:     3000, ItemsPerMinute: 60,
		},
		// Concrete line
		{
			ID: "belt-6", Name: "Limestone Belt",
			Location0:  loc(55000, 9500, 45000, 0),
			Location1:  loc(58000, 11000, 48000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(55000, 9500, 45000, 0), loc(58000, 11000, 48000, 0), 5),
			Length:     5000, ItemsPerMinute: 450,
		},
	}

	return belts, nil
}

func (c *Client) GetBelts(ctx context.Context) (models.Belts, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	belts, _ := c.ListBelts(ctx)
	splitterMergers, _ := c.ListSplitterMergers(ctx)

	return models.Belts{
		Belts:           belts,
		SplitterMergers: splitterMergers,
	}, nil
}

func (c *Client) ListPipes(_ context.Context) ([]models.Pipe, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	// Create pipes for oil processing and water
	pipes := []models.Pipe{
		// Oil refinery pipes
		{
			ID: "pipe-1", Name: "Crude Oil Pipe",
			Location0:  loc(-35000, 1200, 50000, 0),
			Location1:  loc(-38000, 1300, 55000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(-35000, 1200, 50000, 0), loc(-38000, 1300, 55000, 0), 6),
			Length:     6000, ItemsPerMinute: 300,
		},
		{
			ID: "pipe-2", Name: "Heavy Oil Residue Pipe",
			Location0:  loc(-38000, 1300, 55000, 0),
			Location1:  loc(-25000, 1000, 45000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(-38000, 1300, 55000, 0), loc(-25000, 1000, 45000, 0), 8),
			Length:     15000, ItemsPerMinute: 180,
		},
		// Water pipes for coal generators
		{
			ID: "pipe-3", Name: "Coal Generator Water",
			Location0:  loc(20000, 1500, 2000, 0),
			Location1:  loc(25000, 2000, 5000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(20000, 1500, 2000, 0), loc(25000, 2000, 5000, 0), 5),
			Length:     6000, ItemsPerMinute: 450,
		},
		// Aluminum processing water
		{
			ID: "pipe-4", Name: "Alumina Water Pipe",
			Location0:  loc(48000, 7500, -20000, 0),
			Location1:  loc(52000, 9000, -15000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(48000, 7500, -20000, 0), loc(52000, 9000, -15000, 0), 6),
			Length:     7000, ItemsPerMinute: 540,
		},
		// Nuclear water cooling
		{
			ID: "pipe-5", Name: "Nuclear Cooling Water",
			Location0:  loc(-55000, 2500, -52000, 0),
			Location1:  loc(-50000, 3000, -50000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(-55000, 2500, -52000, 0), loc(-50000, 3000, -50000, 0), 5),
			Length:     5500, ItemsPerMinute: 600,
		},
	}

	return pipes, nil
}

func (c *Client) GetPipes(ctx context.Context) (models.Pipes, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	pipes, _ := c.ListPipes(ctx)
	pipeJunctions, _ := c.ListPipeJunctions(ctx)

	return models.Pipes{
		Pipes:         pipes,
		PipeJunctions: pipeJunctions,
	}, nil
}

func (c *Client) ListPipeJunctions(_ context.Context) ([]models.PipeJunction, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	// Create pipe junctions at key intersection points
	junctions := []models.PipeJunction{
		{ID: "junction-1", Name: "Oil Hub", Location: loc(-36000, 1250, 52000, 0)},
		{ID: "junction-2", Name: "Water Distribution A", Location: loc(22000, 1800, 3500, 0)},
		{ID: "junction-3", Name: "Water Distribution B", Location: loc(50000, 8200, -17500, 0)},
		{ID: "junction-4", Name: "Nuclear Water Hub", Location: loc(-52000, 2700, -51000, 0)},
		{ID: "junction-5", Name: "Fuel Junction", Location: loc(-30000, 1100, 47000, 0)},
	}

	return junctions, nil
}

func (c *Client) ListSplitterMergers(_ context.Context) ([]models.SplitterMerger, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	// Create splitter/mergers at key junction points in the factory
	splitterMergers := []models.SplitterMerger{
		{
			ID: "sm-1", Type: models.SplitterMergerTypeConveyorSplitter,
			Location: loc(8000, 600, 6000, 0),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 7800, Y: 500, Z: 5800},
				Max: models.Location{X: 8200, Y: 700, Z: 6200},
			},
		},
		{
			ID: "sm-2", Type: models.SplitterMergerTypeConveyorMerger,
			Location: loc(15000, 1000, 12000, 45),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 14800, Y: 900, Z: 11800},
				Max: models.Location{X: 15200, Y: 1100, Z: 12200},
			},
		},
		{
			ID: "sm-3", Type: models.SplitterMergerTypeSmartSplitter,
			Location: loc(42000, 5200, 33000, 90),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 41800, Y: 5100, Z: 32800},
				Max: models.Location{X: 42200, Y: 5300, Z: 33200},
			},
		},
		{
			ID: "sm-4", Type: models.SplitterMergerTypeConveyorMerger,
			Location: loc(61000, 11000, 51000, 135),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: 60800, Y: 10900, Z: 50800},
				Max: models.Location{X: 61200, Y: 11100, Z: 51200},
			},
		},
		{
			ID: "sm-5", Type: models.SplitterMergerTypeProgrammableSplitter,
			Location: loc(-33000, 1100, 52000, 180),
			BoundingBox: models.BoundingBox{
				Min: models.Location{X: -33200, Y: 1000, Z: 51800},
				Max: models.Location{X: -32800, Y: 1200, Z: 52200},
			},
		},
	}

	return splitterMergers, nil
}

func (c *Client) ListTrainRails(_ context.Context) ([]models.TrainRail, error) {
	time.Sleep(time.Duration(rand.Float64()*50) * time.Millisecond)

	// Create train rails connecting stations
	rails := []models.TrainRail{
		// Iron Mine Alpha to Copper Mine Beta
		{
			ID: "rail-1", Type: models.TrainRailTypeRailway,
			Location0:  loc(0, 0, 0, 0),
			Location1:  loc(18000, 2000, 12000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(0, 0, 0, 0), loc(18000, 2000, 12000, 0), 15),
			Length:     22000,
		},
		// Copper Mine Beta to Steel Foundry Central
		{
			ID: "rail-2", Type: models.TrainRailTypeRailway,
			Location0:  loc(18000, 2000, 12000, 0),
			Location1:  loc(38000, 5000, 32000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(18000, 2000, 12000, 0), loc(38000, 5000, 32000, 0), 18),
			Length:     28000,
		},
		// Steel Foundry Central to Main Storage Depot
		{
			ID: "rail-3", Type: models.TrainRailTypeRailway,
			Location0:  loc(38000, 5000, 32000, 0),
			Location1:  loc(25000, 4000, 18000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(38000, 5000, 32000, 0), loc(25000, 4000, 18000, 0), 12),
			Length:     18000,
		},
		// Main Storage Depot to Oil Refinery West
		{
			ID: "rail-4", Type: models.TrainRailTypeRailway,
			Location0:  loc(25000, 4000, 18000, 0),
			Location1:  loc(-30000, 1000, 48000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(25000, 4000, 18000, 0), loc(-30000, 1000, 48000, 0), 25),
			Length:     65000,
		},
		// Main Storage Depot to Aluminum Processing
		{
			ID: "rail-5", Type: models.TrainRailTypeRailway,
			Location0:  loc(25000, 4000, 18000, 0),
			Location1:  loc(48000, 8000, -18000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(25000, 4000, 18000, 0), loc(48000, 8000, -18000, 0), 20),
			Length:     45000,
		},
		// Aluminum Processing to Computer Factory Hub
		{
			ID: "rail-6", Type: models.TrainRailTypeRailway,
			Location0:  loc(48000, 8000, -18000, 0),
			Location1:  loc(55000, 10000, 45000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(48000, 8000, -18000, 0), loc(55000, 10000, 45000, 0), 25),
			Length:     65000,
		},
		// Main Storage Depot to Nuclear Facility
		{
			ID: "rail-7", Type: models.TrainRailTypeRailway,
			Location0:  loc(25000, 4000, 18000, 0),
			Location1:  loc(-50000, 3000, -50000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(25000, 4000, 18000, 0), loc(-50000, 3000, -50000, 0), 30),
			Length:     95000,
		},
		// Iron Mine Alpha to Main Storage Depot (return route)
		{
			ID: "rail-8", Type: models.TrainRailTypeRailway,
			Location0:  loc(0, 0, 0, 0),
			Location1:  loc(25000, 4000, 18000, 0),
			Connected0: true, Connected1: true,
			SplineData: generateSpline(loc(0, 0, 0, 0), loc(25000, 4000, 18000, 0), 15),
			Length:     30000,
		},
	}

	return rails, nil
}
