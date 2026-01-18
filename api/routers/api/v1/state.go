package v1

import (
	"api/service/session"
	"fmt"

	"github.com/gin-gonic/gin"
)

// GetSessionState godoc
// @Summary Get Full State for a Session
// @Description Get full state for a specific session from cache
// @Tags Sessions
// @Accept json
// @Produce json
// @Param id path string true "Session ID"
// @Success 200 {object} models.StateDTO "Full state"
// @Failure 404 {object} models.ErrorResponse "Session not found"
// @Router /v1/sessions/{id}/state [get]
func GetSessionState(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Param("id")
	if sessionID == "" {
		requestContext.UserError("Session ID is required")
		return
	}

	// Verify the session exists
	store := session.NewStore()
	sess, err := store.Get(sessionID)
	if err != nil {
		requestContext.ServerError(fmt.Errorf("failed to get session: %w", err), err)
		return
	}
	if sess == nil {
		requestContext.NotFound("Session not found")
		return
	}

	// Read from cache only - returns empty/default state on cache miss
	// SSE events will populate the data as they arrive
	state := session.GetCachedState(sessionID, sess.SessionName)
	requestContext.Ok(state.ToDTO())
}
