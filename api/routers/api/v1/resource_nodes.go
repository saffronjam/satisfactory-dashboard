package v1

import (
	"api/service/session"

	"github.com/gin-gonic/gin"
)

// ListResourceNodes godoc
// @Summary List Resource Nodes
// @Description List all world resource nodes from cached session state
// @Tags Resources
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {array} models.ResourceNode "List of resource nodes"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/resourceNodes [get]
func ListResourceNodes(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)

	requestContext.Ok(state.ResourceNodes)
}
