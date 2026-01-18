package v1

import (
	"api/models/models"
	"api/service/session"
	"fmt"

	"github.com/gin-gonic/gin"
)

// ListPlayers godoc
// @Summary List Players
// @Description List all players from cached session state
// @Tags Players
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {array} models.PlayerDTO "List of players"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/players [get]
func ListPlayers(ginContext *gin.Context) {
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

	playersDto := make([]models.PlayerDTO, len(state.Players))
	for i, player := range state.Players {
		playersDto[i] = player.ToDTO()
	}

	requestContext.Ok(playersDto)
}
