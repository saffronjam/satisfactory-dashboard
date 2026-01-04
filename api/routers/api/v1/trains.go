package v1

import (
	"api/models/models"
	"api/service/session"

	"github.com/gin-gonic/gin"
)

// ListTrains godoc
// @Summary List Trains
// @Description List all trains from cached session state
// @Tags Trains
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {array} models.TrainDTO "List of trains"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/trains [get]
func ListTrains(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)

	trainsDto := make([]models.TrainDTO, len(state.Trains))
	for i, train := range state.Trains {
		trainsDto[i] = train.ToDTO()
	}

	requestContext.Ok(trainsDto)
}

// ListTrainStations godoc
// @Summary List TrainStations
// @Description List all trainStations from cached session state
// @Tags Trains
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {array} models.TrainStationDTO "List of train stations"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/trainStations [get]
func ListTrainStations(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)

	trainStationsDto := make([]models.TrainStationDTO, len(state.TrainStations))
	for i, trainStation := range state.TrainStations {
		trainStationsDto[i] = trainStation.ToDTO()
	}

	requestContext.Ok(trainStationsDto)
}

// GetTrainSetup godoc
// @Summary Get TrainSetup
// @Description List all trains and train stations from cached session state
// @Tags Trains
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {object} models.TrainSetupDTO "List of trains and train stations"
// @Success 400 {object} models.ErrorResponse "Bad Request"
// @Router /v1/trainSetup [get]
func GetTrainSetup(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Query("session_id")
	if sessionID == "" {
		requestContext.UserError("session_id query parameter is required")
		return
	}

	state := session.GetCachedState(sessionID)

	trainSetupDto := models.TrainSetupDTO{
		Trains:        state.Trains,
		TrainStations: state.TrainStations,
	}

	requestContext.Ok(trainSetupDto)
}
