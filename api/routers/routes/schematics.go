package routes

import (
	v1 "api/routers/api/v1"
	"api/routers/api/v1/middleware"

	"github.com/gin-gonic/gin"
)

const (
	SchematicsPath = "/v1/schematics"
)

// SchematicsRoutingGroup handles routing for schematics/milestones endpoints.
type SchematicsRoutingGroup struct{ RoutingGroupBase }

// SchematicRoutes returns a new SchematicsRoutingGroup instance.
func SchematicRoutes() *SchematicsRoutingGroup { return &SchematicsRoutingGroup{} }

// PrivateRoutes returns the list of private routes for schematics.
func (group *SchematicsRoutingGroup) PrivateRoutes() []Route {
	stageCheck := []gin.HandlerFunc{middleware.RequireSessionReady()}
	return []Route{
		{Method: "GET", Pattern: SchematicsPath, HandlerFunc: v1.ListSchematics, Middleware: stageCheck},
	}
}
