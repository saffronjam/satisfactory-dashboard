package middleware

import (
	"api/models/models"
	"api/models/models/status_codes"
	"api/service/auth"
	"net/http"

	"github.com/gin-gonic/gin"
)

const (
	// CookieName is the name of the HTTP-only cookie containing the access token.
	CookieName = "sd_access_token"
)

// RequireAuth returns a middleware that validates the access token from the
// cookie and refreshes its TTL on each successful request. It returns 401
// Unauthorized if the token is missing or invalid.
func RequireAuth(authService *auth.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(CookieName)
		if err != nil || token == "" {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Errors: []models.ApiError{{
					Code: status_codes.GetMsg(status_codes.Error),
					Msg:  "Authentication required",
				}},
			})
			c.Abort()
			return
		}

		tokenData, err := authService.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Errors: []models.ApiError{{
					Code: status_codes.GetMsg(status_codes.Error),
					Msg:  "Authentication error",
				}},
			})
			c.Abort()
			return
		}

		if tokenData == nil {
			c.JSON(http.StatusUnauthorized, models.ErrorResponse{
				Errors: []models.ApiError{{
					Code: status_codes.GetMsg(status_codes.Error),
					Msg:  "Session expired",
				}},
			})
			c.Abort()
			return
		}

		// Refresh token TTL to implement sliding expiration
		if err := authService.RefreshToken(token); err != nil {
			// Log error but don't fail the request - validation succeeded
			// The token will eventually expire if refresh keeps failing
		}

		// Store token in context for handlers that need it (e.g., logout)
		c.Set("auth_token", token)

		c.Next()
	}
}
