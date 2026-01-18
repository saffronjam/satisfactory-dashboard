package v1

import (
	"api/models/models"
	"api/service/session"
	"fmt"

	"github.com/gin-gonic/gin"
)

// ListBelts godoc
// @Summary List Belts
// @Description List all conveyor belts from cached session state
// @Tags Infrastructure
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {object} models.BeltsDTO "Belts and splitter/mergers"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/belts [get]
func ListBelts(ginContext *gin.Context) {
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

	beltsDto := models.BeltsDTO{
		Belts:           state.Belts,
		SplitterMergers: state.SplitterMergers,
	}

	requestContext.Ok(beltsDto)
}

// ListPipes godoc
// @Summary List Pipes
// @Description List all pipes from cached session state
// @Tags Infrastructure
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {object} models.PipesDTO "Pipes and junctions"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/pipes [get]
func ListPipes(ginContext *gin.Context) {
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

	pipesDto := models.PipesDTO{
		Pipes:        state.Pipes,
		PipeJunction: state.PipeJunctions,
	}

	requestContext.Ok(pipesDto)
}

// ListCables godoc
// @Summary List Cables
// @Description List all power cables from cached session state
// @Tags Infrastructure
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {array} models.CableDTO "List of cables"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/cables [get]
func ListCables(ginContext *gin.Context) {
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

	requestContext.Ok(state.Cables)
}

// ListTrainRails godoc
// @Summary List Train Rails
// @Description List all train rails from cached session state
// @Tags Infrastructure
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {array} models.TrainRailDTO "List of train rails"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/trainRails [get]
func ListTrainRails(ginContext *gin.Context) {
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

	requestContext.Ok(state.TrainRails)
}

// ListHypertubes godoc
// @Summary List Hypertubes
// @Description List all hypertubes and entrances from cached session state
// @Tags Infrastructure
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {object} models.Hypertubes "Hypertubes and entrances"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/hypertubes [get]
func ListHypertubes(ginContext *gin.Context) {
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

	hypertubesDto := models.Hypertubes{
		Hypertubes:         state.Hypertubes,
		HypertubeEntrances: state.HypertubeEntrances,
	}

	requestContext.Ok(hypertubesDto)
}
