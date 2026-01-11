package v1

import (
	"api/models/models"
	"api/service/auth"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
)

const (
	// Cookie name for the access token
	accessTokenCookie = "sd_access_token"
)

var (
	authService     *auth.Service
	rateLimiter     *auth.RateLimiter
	authServiceOnce sync.Once
)

// getAuthService returns the auth service singleton, initializing it on first call.
// This defers creation until after db.Setup() has been called in main.go.
func getAuthService() *auth.Service {
	authServiceOnce.Do(func() {
		authService = auth.NewService()
		rateLimiter = auth.NewRateLimiter()
	})
	return authService
}

// getRateLimiter returns the rate limiter singleton.
func getRateLimiter() *auth.RateLimiter {
	getAuthService() // Ensure initialization
	return rateLimiter
}

// Login godoc
// @Summary Login
// @Description Authenticate with the access key and receive an access token cookie
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body models.LoginRequest true "Login credentials"
// @Success 200 {object} models.LoginResponse "Login successful"
// @Failure 400 {object} models.ErrorResponse "Bad Request - password required"
// @Failure 401 {object} models.ErrorResponse "Unauthorized - invalid password"
// @Failure 429 {object} models.ErrorResponse "Too Many Requests - rate limited"
// @Failure 500 {object} models.ErrorResponse "Internal Server Error"
// @Router /v1/auth/login [post]
func Login(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)
	svc := getAuthService()
	limiter := getRateLimiter()

	clientIP := getClientIP(ginContext)
	if !limiter.Allow(clientIP) {
		requestContext.ErrorResponse(http.StatusTooManyRequests, http.StatusTooManyRequests, "Too many login attempts. Please try again later.")
		return
	}

	var req models.LoginRequest
	if err := ginContext.ShouldBindJSON(&req); err != nil {
		requestContext.UserError("Password is required")
		return
	}

	valid, err := svc.ValidatePassword(req.Password)
	if err != nil {
		requestContext.Unauthorized("Invalid password")
		return
	}

	if !valid {
		requestContext.Unauthorized("Invalid password")
		return
	}

	token, err := svc.GenerateToken()
	if err != nil {
		requestContext.ServerError(err, err)
		return
	}

	if err := svc.StoreToken(token, clientIP); err != nil {
		requestContext.ServerError(err, err)
		return
	}

	ttlSeconds := int(auth.GetTokenTTL().Seconds())
	ginContext.SetCookie(
		accessTokenCookie,
		token,
		ttlSeconds,
		"/",
		"",
		false,
		true,
	)

	usedDefault := svc.IsDefaultPassword(req.Password)
	requestContext.Ok(models.LoginResponse{
		Success:             true,
		UsedDefaultPassword: usedDefault,
	})
}

// GetStatus godoc
// @Summary Get Auth Status
// @Description Check the current authentication status by validating the access token cookie
// @Tags Auth
// @Accept json
// @Produce json
// @Success 200 {object} models.AuthStatusResponse "Authentication status"
// @Router /v1/auth/status [get]
func GetStatus(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)
	svc := getAuthService()

	cookie, err := ginContext.Cookie(accessTokenCookie)
	if err != nil || cookie == "" {
		requestContext.Ok(models.AuthStatusResponse{
			Authenticated: false,
		})
		return
	}

	tokenData, err := svc.ValidateToken(cookie)
	if err != nil || tokenData == nil {
		requestContext.Ok(models.AuthStatusResponse{
			Authenticated: false,
		})
		return
	}

	usedDefault := svc.IsUsingDefaultPassword()
	requestContext.Ok(models.AuthStatusResponse{
		Authenticated:       true,
		UsedDefaultPassword: usedDefault,
	})
}

// ChangePassword godoc
// @Summary Change Password
// @Description Change the dashboard access key after verifying the current password
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body models.ChangePasswordRequest true "Password change request"
// @Success 200 {object} models.ChangePasswordResponse "Password changed successfully"
// @Failure 400 {object} models.ErrorResponse "Bad Request - missing required fields"
// @Failure 401 {object} models.ErrorResponse "Unauthorized - current password incorrect"
// @Failure 500 {object} models.ErrorResponse "Internal Server Error"
// @Router /v1/auth/change-password [post]
func ChangePassword(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)
	svc := getAuthService()

	var req models.ChangePasswordRequest
	if err := ginContext.ShouldBindJSON(&req); err != nil {
		requestContext.UserError("Current password and new password are required")
		return
	}

	err := svc.ChangePassword(req.CurrentPassword, req.NewPassword)
	if err != nil {
		if err.Error() == "current password is incorrect" {
			requestContext.Unauthorized("Current password is incorrect")
			return
		}
		requestContext.ServerError(err, err)
		return
	}

	requestContext.Ok(models.ChangePasswordResponse{
		Success: true,
		Message: "Password changed successfully",
	})
}

// Logout godoc
// @Summary Logout
// @Description Invalidate the current session by deleting the access token and clearing the cookie
// @Tags Auth
// @Accept json
// @Produce json
// @Success 200 {object} models.LogoutResponse "Logout successful"
// @Failure 500 {object} models.ErrorResponse "Internal Server Error"
// @Router /v1/auth/logout [post]
func Logout(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)
	svc := getAuthService()

	cookie, err := ginContext.Cookie(accessTokenCookie)
	if err == nil && cookie != "" {
		if err := svc.DeleteToken(cookie); err != nil {
			requestContext.ServerError(err, err)
			return
		}
	}

	ginContext.SetCookie(
		accessTokenCookie,
		"",
		-1,
		"/",
		"",
		false,
		true,
	)

	requestContext.Ok(models.LogoutResponse{
		Success: true,
	})
}
