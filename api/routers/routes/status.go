package routes

import (
	v1 "api/routers/api/v1"
	"api/routers/api/v1/middleware"

	"github.com/gin-gonic/gin"
)

const (
	SatisfactoryApiStatusPath = "/v1/satisfactoryApiStatus"
	ClientIPPath              = "/v1/client-ip"
)

type StatusRoutingGroup struct{ RoutingGroupBase }

func StatusRoutes() *StatusRoutingGroup { return &StatusRoutingGroup{} }

func (group *StatusRoutingGroup) PrivateRoutes() []Route {
	stageCheck := []gin.HandlerFunc{middleware.RequireSessionReady()}
	return []Route{
		{Method: "GET", Pattern: SatisfactoryApiStatusPath, HandlerFunc: v1.GetSatisfactoryApiStatus, Middleware: stageCheck},
		{Method: "GET", Pattern: ClientIPPath, HandlerFunc: v1.GetClientIP},
	}
}
