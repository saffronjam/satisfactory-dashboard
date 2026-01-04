package routes

import (
	v1 "api/routers/api/v1"
	"api/routers/api/v1/middleware"

	"github.com/gin-gonic/gin"
)

const (
	CircuitsPath = "/v1/circuits"
)

type CircuitsRoutingGroup struct{ RoutingGroupBase }

func CircuitRoutes() *CircuitsRoutingGroup { return &CircuitsRoutingGroup{} }

func (group *CircuitsRoutingGroup) PublicRoutes() []Route {
	stageCheck := []gin.HandlerFunc{middleware.RequireSessionReady()}
	return []Route{
		{Method: "GET", Pattern: CircuitsPath, HandlerFunc: v1.ListCircuits, Middleware: stageCheck},
	}
}
