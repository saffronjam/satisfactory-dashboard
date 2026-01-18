package v1

import (
	"api/service/session"
	"fmt"

	"github.com/gin-gonic/gin"
)

// GetSatisfactoryApiStatus godoc
// @Summary Get Satisfactory API Status
// @Description Get the status of the Satisfactory API from cached session state
// @Tags Status
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {object} models.SatisfactoryApiStatusDTO "Satisfactory API Status"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/satisfactoryApiStatus [get]
func GetSatisfactoryApiStatus(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

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

	state := session.GetCachedState(sessionID, sess.SessionName)
	requestContext.Ok(state.SatisfactoryApiStatus.ToDTO())
}
