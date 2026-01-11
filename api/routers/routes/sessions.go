package routes

import (
	v1 "api/routers/api/v1"
	"api/routers/api/v1/middleware"

	"github.com/gin-gonic/gin"
)

const (
	SessionsPath        = "/v1/sessions"
	SessionPath         = "/v1/sessions/:id"
	SessionValidatePath = "/v1/sessions/:id/validate"
	SessionPreviewPath  = "/v1/sessions/preview"
	SessionEventsPath   = "/v1/sessions/:id/events"
	SessionStatePath    = "/v1/sessions/:id/state"
)

type SessionsRoutingGroup struct{ RoutingGroupBase }

func SessionRoutes() *SessionsRoutingGroup { return &SessionsRoutingGroup{} }

func (group *SessionsRoutingGroup) PrivateRoutes() []Route {
	stageCheck := []gin.HandlerFunc{middleware.RequireSessionReady()}
	return []Route{
		{Method: "GET", Pattern: SessionsPath, HandlerFunc: v1.ListSessions},
		{Method: "POST", Pattern: SessionsPath, HandlerFunc: v1.CreateSession},
		{Method: "GET", Pattern: SessionPreviewPath, HandlerFunc: v1.PreviewSession},
		{Method: "GET", Pattern: SessionPath, HandlerFunc: v1.GetSession},
		{Method: "PATCH", Pattern: SessionPath, HandlerFunc: v1.UpdateSession},
		{Method: "DELETE", Pattern: SessionPath, HandlerFunc: v1.DeleteSession},
		{Method: "GET", Pattern: SessionValidatePath, HandlerFunc: v1.ValidateSession},
		{Method: "GET", Pattern: SessionEventsPath, HandlerFunc: v1.StartSessionEventsSSE, Middleware: []gin.HandlerFunc{middleware.SseSetup()}},
		{Method: "GET", Pattern: SessionStatePath, HandlerFunc: v1.GetSessionState, Middleware: stageCheck},
	}
}
