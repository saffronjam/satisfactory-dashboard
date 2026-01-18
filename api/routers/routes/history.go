package routes

import (
	v1 "api/routers/api/v1"
	"api/routers/api/v1/middleware"

	"github.com/gin-gonic/gin"
)

const (
	HistoryPath      = "/v1/sessions/:id/history/:dataType"
	HistorySavesPath = "/v1/sessions/:id/history"
)

// HistoryRoutingGroup defines routes for historical data retrieval.
type HistoryRoutingGroup struct{ RoutingGroupBase }

// HistoryRoutes returns a new HistoryRoutingGroup instance.
func HistoryRoutes() *HistoryRoutingGroup { return &HistoryRoutingGroup{} }

// PrivateRoutes returns the private routes for history endpoints.
func (group *HistoryRoutingGroup) PrivateRoutes() []Route {
	stageCheck := []gin.HandlerFunc{middleware.RequireSessionReady()}
	return []Route{
		{Method: "GET", Pattern: HistorySavesPath, HandlerFunc: v1.ListHistorySaves, Middleware: stageCheck},
		{Method: "GET", Pattern: HistoryPath, HandlerFunc: v1.GetHistory, Middleware: stageCheck},
	}
}
