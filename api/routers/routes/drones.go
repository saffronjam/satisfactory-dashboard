package routes

import (
	v1 "api/routers/api/v1"
	"api/routers/api/v1/middleware"

	"github.com/gin-gonic/gin"
)

const (
	DronesPath        = "/v1/drones"
	DroneStationsPath = "/v1/droneStations"
	DroneSetupPath    = "/v1/droneSetup"
)

type DronesRoutingGroup struct{ RoutingGroupBase }

func DroneRoutes() *DronesRoutingGroup { return &DronesRoutingGroup{} }

func (group *DronesRoutingGroup) PublicRoutes() []Route {
	stageCheck := []gin.HandlerFunc{middleware.RequireSessionReady()}
	return []Route{
		{Method: "GET", Pattern: DronesPath, HandlerFunc: v1.ListDrones, Middleware: stageCheck},
		{Method: "GET", Pattern: DroneStationsPath, HandlerFunc: v1.ListDroneStations, Middleware: stageCheck},
		{Method: "GET", Pattern: DroneSetupPath, HandlerFunc: v1.GetDroneSetup, Middleware: stageCheck},
	}
}
