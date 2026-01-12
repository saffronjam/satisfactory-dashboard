package routes

import (
	v1 "api/routers/api/v1"
)

const (
	NodesPath = "/v1/nodes"
)

type NodesRoutingGroup struct{ RoutingGroupBase }

func NodeRoutes() *NodesRoutingGroup { return &NodesRoutingGroup{} }

func (group *NodesRoutingGroup) PublicRoutes() []Route {
	return []Route{
		{Method: "GET", Pattern: NodesPath, HandlerFunc: v1.GetNodes},
	}
}
