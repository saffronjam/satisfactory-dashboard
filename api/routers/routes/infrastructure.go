package routes

import (
	v1 "api/routers/api/v1"
	"api/routers/api/v1/middleware"

	"github.com/gin-gonic/gin"
)

const (
	BeltsPath      = "/v1/belts"
	PipesPath      = "/v1/pipes"
	CablesPath     = "/v1/cables"
	TrainRailsPath = "/v1/trainRails"
	HypertubesPath = "/v1/hypertubes"
)

type InfrastructureRoutingGroup struct{ RoutingGroupBase }

func InfrastructureRoutes() *InfrastructureRoutingGroup { return &InfrastructureRoutingGroup{} }

func (group *InfrastructureRoutingGroup) PublicRoutes() []Route {
	stageCheck := []gin.HandlerFunc{middleware.RequireSessionReady()}
	return []Route{
		{Method: "GET", Pattern: BeltsPath, HandlerFunc: v1.ListBelts, Middleware: stageCheck},
		{Method: "GET", Pattern: PipesPath, HandlerFunc: v1.ListPipes, Middleware: stageCheck},
		{Method: "GET", Pattern: CablesPath, HandlerFunc: v1.ListCables, Middleware: stageCheck},
		{Method: "GET", Pattern: TrainRailsPath, HandlerFunc: v1.ListTrainRails, Middleware: stageCheck},
		{Method: "GET", Pattern: HypertubesPath, HandlerFunc: v1.ListHypertubes, Middleware: stageCheck},
	}
}
