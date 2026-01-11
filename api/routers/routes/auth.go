package routes

import v1 "api/routers/api/v1"

const (
	AuthLoginPath          = "/v1/auth/login"
	AuthLogoutPath         = "/v1/auth/logout"
	AuthStatusPath         = "/v1/auth/status"
	AuthChangePasswordPath = "/v1/auth/change-password"
)

// AuthRoutingGroup provides routing configuration for authentication endpoints.
type AuthRoutingGroup struct{ RoutingGroupBase }

// AuthRoutes creates a new AuthRoutingGroup instance.
func AuthRoutes() *AuthRoutingGroup { return &AuthRoutingGroup{} }

// PublicRoutes returns authentication routes that do not require authentication.
// These include login (to obtain a token) and status (to check if authenticated).
func (group *AuthRoutingGroup) PublicRoutes() []Route {
	return []Route{
		{Method: "POST", Pattern: AuthLoginPath, HandlerFunc: v1.Login},
		{Method: "GET", Pattern: AuthStatusPath, HandlerFunc: v1.GetStatus},
	}
}

// PrivateRoutes returns authentication routes that require a valid token.
// These include logout and password change operations.
func (group *AuthRoutingGroup) PrivateRoutes() []Route {
	return []Route{
		{Method: "POST", Pattern: AuthChangePasswordPath, HandlerFunc: v1.ChangePassword},
		{Method: "POST", Pattern: AuthLogoutPath, HandlerFunc: v1.Logout},
	}
}
