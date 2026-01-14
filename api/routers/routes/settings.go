package routes

import (
	v1 "api/routers/api/v1"
)

const (
	SettingsPath = "/v1/settings"
)

type SettingsRoutingGroup struct{ RoutingGroupBase }

func SettingsRoutes() *SettingsRoutingGroup {
	return &SettingsRoutingGroup{}
}

func (group *SettingsRoutingGroup) PrivateRoutes() []Route {
	return []Route{
		{Method: "GET", Pattern: SettingsPath, HandlerFunc: v1.GetSettings},
		{Method: "PUT", Pattern: SettingsPath, HandlerFunc: v1.UpdateSettings},
	}
}
