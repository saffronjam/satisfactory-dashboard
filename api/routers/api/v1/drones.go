package v1

import (
	"api/models/models"
	"api/service/session"

	"github.com/gin-gonic/gin"
)

// ListDrones godoc
// @Summary List Drones
// @Description List all drones from cached session state
// @Tags Drones
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {array} models.DroneDTO "List of drones"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/drones [get]
func ListDrones(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)

	dronesDto := make([]models.DroneDTO, len(state.Drones))
	for i, drone := range state.Drones {
		dronesDto[i] = drone.ToDTO()
	}

	requestContext.Ok(dronesDto)
}

// ListDroneStations godoc
// @Summary List DroneStations
// @Description List all droneStations from cached session state
// @Tags Drones
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {array} models.DroneStationDTO "List of drone stations"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/droneStations [get]
func ListDroneStations(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)

	droneStationsDto := make([]models.DroneStationDTO, len(state.DroneStations))
	for i, droneStation := range state.DroneStations {
		droneStationsDto[i] = droneStation.ToDTO()
	}

	requestContext.Ok(droneStationsDto)
}

// GetDroneSetup godoc
// @Summary Get Drone Setup
// @Description List all drones and drone stations from cached session state
// @Tags Drones
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {object} models.DroneSetupDTO "List of both drones and drone stations"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/droneSetup [get]
func GetDroneSetup(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)

	droneSetupDto := models.DroneSetupDTO{
		Drones:        state.Drones,
		DroneStations: state.DroneStations,
	}

	requestContext.Ok(droneSetupDto)
}
