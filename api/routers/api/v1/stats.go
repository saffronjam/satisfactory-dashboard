package v1

import (
	"api/service/session"

	"github.com/gin-gonic/gin"
)

// GetFactoryStats godoc
// @Summary Get Factory Stats
// @Description Get factory stats from cached session state
// @Tags Stats
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {object} models.FactoryStatsDTO "Get factory stats"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/factoryStats [get]
func GetFactoryStats(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)
	requestContext.Ok(state.FactoryStats.ToDTO())
}

// GetGeneratorStats godoc
// @Summary Get Generator Stats
// @Description Get generator stats from cached session state
// @Tags Stats
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {object} models.GeneratorStatsDTO "Get generator stats"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/generatorStats [get]
func GetGeneratorStats(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)
	requestContext.Ok(state.GeneratorStats.ToDTO())
}

// GetProdStats godoc
// @Summary Get Prod Stats
// @Description Get prod stats from cached session state
// @Tags Stats
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {object} models.ProdStatsDTO "Get prod stats"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/prodStats [get]
func GetProdStats(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)
	requestContext.Ok(state.ProdStats.ToDTO())
}

// GetSinkStats godoc
// @Summary Get Sink Stats
// @Description Get sink stats from cached session state
// @Tags Stats
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {object} models.SinkStatsDTO "Get sink stats"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/sinkStats [get]
func GetSinkStats(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)
	requestContext.Ok(state.SinkStats.ToDTO())
}
