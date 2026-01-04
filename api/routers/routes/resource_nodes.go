package routes

import (
	v1 "api/routers/api/v1"
	"api/routers/api/v1/middleware"

	"github.com/gin-gonic/gin"
)

const (
	ResourceNodesPath = "/v1/resourceNodes"
)

type ResourceNodesRoutingGroup struct{ RoutingGroupBase }

func ResourceNodesRoutes() *ResourceNodesRoutingGroup { return &ResourceNodesRoutingGroup{} }

func (group *ResourceNodesRoutingGroup) PublicRoutes() []Route {
	stageCheck := []gin.HandlerFunc{middleware.RequireSessionReady()}
	return []Route{
		{Method: "GET", Pattern: ResourceNodesPath, HandlerFunc: v1.ListResourceNodes, Middleware: stageCheck},
	}
}
