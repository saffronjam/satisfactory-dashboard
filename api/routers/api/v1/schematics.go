package v1

import (
	"api/models/models"
	"api/service/session"

	"github.com/gin-gonic/gin"
)

// ListSchematics godoc
// @Summary List Schematics
// @Description List all schematics/milestones from cached session state
// @Tags Schematics
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {array} models.SchematicDTO "List of schematics"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/schematics [get]
func ListSchematics(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)

	schematicsDto := make([]models.SchematicDTO, len(state.Schematics))
	for i, schematic := range state.Schematics {
		schematicsDto[i] = schematic.ToDTO()
	}

	requestContext.Ok(schematicsDto)
}
