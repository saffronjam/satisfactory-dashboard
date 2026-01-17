package routes

import (
	v1 "api/routers/api/v1"
	"api/routers/api/v1/middleware"

	"github.com/gin-gonic/gin"
)

const (
	StoragesPath      = "/v1/storages"
	TractorsPath      = "/v1/tractors"
	ExplorersPath     = "/v1/explorers"
	VehiclePathsPath  = "/v1/vehiclePaths"
	SpaceElevatorPath = "/v1/spaceElevator"
	HubPath           = "/v1/hub"
	RadarTowersPath   = "/v1/radarTowers"
)

type WorldRoutingGroup struct{ RoutingGroupBase }

func WorldRoutes() *WorldRoutingGroup { return &WorldRoutingGroup{} }

func (group *WorldRoutingGroup) PrivateRoutes() []Route {
	stageCheck := []gin.HandlerFunc{middleware.RequireSessionReady()}
	return []Route{
		{Method: "GET", Pattern: StoragesPath, HandlerFunc: v1.ListStorages, Middleware: stageCheck},
		{Method: "GET", Pattern: TractorsPath, HandlerFunc: v1.ListTractors, Middleware: stageCheck},
		{Method: "GET", Pattern: ExplorersPath, HandlerFunc: v1.ListExplorers, Middleware: stageCheck},
		{Method: "GET", Pattern: VehiclePathsPath, HandlerFunc: v1.ListVehiclePaths, Middleware: stageCheck},
		{Method: "GET", Pattern: SpaceElevatorPath, HandlerFunc: v1.GetSpaceElevator, Middleware: stageCheck},
		{Method: "GET", Pattern: HubPath, HandlerFunc: v1.GetHub, Middleware: stageCheck},
		{Method: "GET", Pattern: RadarTowersPath, HandlerFunc: v1.ListRadarTowers, Middleware: stageCheck},
	}
}
