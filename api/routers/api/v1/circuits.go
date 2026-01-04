package v1

import (
	"api/models/models"
	"api/service/session"

	"github.com/gin-gonic/gin"
)

// ListCircuits godoc
// @Summary List Circuits
// @Description List all circuits from cached session state
// @Tags Circuits
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {array} models.CircuitDTO "List of circuits"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/circuits [get]
func ListCircuits(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)

	circuitsDto := make([]models.CircuitDTO, len(state.Circuits))
	for i, circuit := range state.Circuits {
		circuitsDto[i] = circuit.ToDTO()
	}

	requestContext.Ok(circuitsDto)
}
