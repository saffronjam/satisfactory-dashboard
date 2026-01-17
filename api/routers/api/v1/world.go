package v1

import (
	"api/service/session"

	"github.com/gin-gonic/gin"
)

// ListStorages godoc
// @Summary List Storages
// @Description List all storage containers from cached session state
// @Tags World
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {array} models.StorageDTO "List of storages"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/storages [get]
func ListStorages(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)

	requestContext.Ok(state.Storages)
}

// ListTractors godoc
// @Summary List Tractors
// @Description List all tractors from cached session state
// @Tags World
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {array} models.TractorDTO "List of tractors"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/tractors [get]
func ListTractors(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)

	requestContext.Ok(state.Tractors)
}

// ListExplorers godoc
// @Summary List Explorers
// @Description List all explorers from cached session state
// @Tags World
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {array} models.ExplorerDTO "List of explorers"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/explorers [get]
func ListExplorers(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)

	requestContext.Ok(state.Explorers)
}

// ListVehiclePaths godoc
// @Summary List Vehicle Paths
// @Description List all vehicle paths from cached session state
// @Tags World
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {array} models.VehiclePathDTO "List of vehicle paths"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/vehiclePaths [get]
func ListVehiclePaths(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)

	requestContext.Ok(state.VehiclePaths)
}

// GetSpaceElevator godoc
// @Summary Get Space Elevator
// @Description Get the space elevator from cached session state
// @Tags World
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {object} models.SpaceElevatorDTO "Space elevator"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/spaceElevator [get]
func GetSpaceElevator(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)

	requestContext.Ok(state.SpaceElevator)
}

// GetHub godoc
// @Summary Get Hub
// @Description Get the hub from cached session state
// @Tags World
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {object} models.HubDTO "Hub"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/hub [get]
func GetHub(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)

	requestContext.Ok(state.Hub)
}

// ListRadarTowers godoc
// @Summary List Radar Towers
// @Description List all radar towers from cached session state
// @Tags World
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {array} models.RadarTowerDTO "List of radar towers"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/radarTowers [get]
func ListRadarTowers(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)

	requestContext.Ok(state.RadarTowers)
}
