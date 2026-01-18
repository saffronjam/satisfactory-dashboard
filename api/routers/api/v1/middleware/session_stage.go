package middleware

import (
	"api/models/models"
	"api/models/models/status_codes"
	"api/service/session"
	"net/http"

	"github.com/gin-gonic/gin"
)

// RequireSessionReady middleware checks if the session is in "ready" stage
// and returns 425 Too Early if not. This prevents clients from accessing
// data endpoints before the session has finished initializing.
// It checks both query parameter "session_id" and path parameter "id".
func RequireSessionReady() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check query parameter first, then path parameter
		sessionID := c.Query("session_id")
		if sessionID == "" {
			sessionID = c.Param("id")
		}

		if sessionID == "" {
			// Let the handler deal with missing session_id
			c.Next()
			return
		}

		// Fetch session to get save name
		store := session.NewStore()
		sess, err := store.Get(sessionID)
		if err != nil || sess == nil {
			// Let the handler deal with missing/invalid session
			c.Next()
			return
		}

		if !session.IsSessionReady(sessionID, sess.SessionName) {
			c.JSON(http.StatusTooEarly, models.ErrorResponse{
				Errors: []models.ApiError{{
					Code: status_codes.GetMsg(status_codes.Error),
					Msg:  "Session is initializing. Please wait for all data to be cached.",
				}},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
