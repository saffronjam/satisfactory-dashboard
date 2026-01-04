package v1

import (
	"api/service/session"

	"github.com/gin-gonic/gin"
)

// GetMachines godoc
// @Summary Get Machines
// @Description Get machines from cached session state
// @Tags Machines
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {array} models.MachineDTO "Get machines"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/machines [get]
func GetMachines(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)
	requestContext.Ok(state.Machines)
}
