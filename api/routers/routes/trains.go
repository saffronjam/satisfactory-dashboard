package routes

import (
	v1 "api/routers/api/v1"
	"api/routers/api/v1/middleware"

	"github.com/gin-gonic/gin"
)

const (
	TrainsPath        = "/v1/trains"
	TrainStationsPath = "/v1/trainStations"
	TrainSetupPath    = "/v1/trainSetup"
)

type TrainsRoutingGroup struct{ RoutingGroupBase }

func TrainRoutes() *TrainsRoutingGroup { return &TrainsRoutingGroup{} }

func (group *TrainsRoutingGroup) PrivateRoutes() []Route {
	stageCheck := []gin.HandlerFunc{middleware.RequireSessionReady()}
	return []Route{
		{Method: "GET", Pattern: TrainsPath, HandlerFunc: v1.ListTrains, Middleware: stageCheck},
		{Method: "GET", Pattern: TrainStationsPath, HandlerFunc: v1.ListTrainStations, Middleware: stageCheck},
		{Method: "GET", Pattern: TrainSetupPath, HandlerFunc: v1.GetTrainSetup, Middleware: stageCheck},
	}
}
