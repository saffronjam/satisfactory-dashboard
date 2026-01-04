package routes

import (
	v1 "api/routers/api/v1"
	"api/routers/api/v1/middleware"

	"github.com/gin-gonic/gin"
)

const (
	MachinesPath = "/v1/machines"
)

type MachinesRoutingGroup struct{ RoutingGroupBase }

func MachinesRoutes() *MachinesRoutingGroup { return &MachinesRoutingGroup{} }

func (group *MachinesRoutingGroup) PublicRoutes() []Route {
	stageCheck := []gin.HandlerFunc{middleware.RequireSessionReady()}
	return []Route{
		{Method: "GET", Pattern: MachinesPath, HandlerFunc: v1.GetMachines, Middleware: stageCheck},
	}
}
