package v1

import (
	"api/models/models"
	"api/service/session"
	"strconv"

	"github.com/gin-gonic/gin"
)

// historyEnabledTypes defines which event types support historical data retrieval.
var historyEnabledTypes = map[string]bool{
	"circuits":       true,
	"generatorStats": true,
	"prodStats":      true,
	"factoryStats":   true,
	"sinkStats":      true,
}

// isHistoryEnabledType returns true if the given data type supports historical data.
func isHistoryEnabledType(dataType string) bool {
	return historyEnabledTypes[dataType]
}

// GetHistory godoc
// @Summary Get historical data for a session
// @Description Retrieves historical data points for the specified data type. Data is returned in ascending order by game-time ID. Use the `since` parameter for incremental fetching.
// @Tags History
// @Accept json
// @Produce json
// @Param id path string true "Session ID"
// @Param dataType path string true "Data type to retrieve history for" Enums(circuits, generatorStats, prodStats, factoryStats, sinkStats)
// @Param saveName query string false "Save name to query (defaults to current save)"
// @Param since query int false "Only return data points with gameTimeId greater than this value (default 0)"
// @Success 200 {object} models.HistoryChunk "Historical data chunk"
// @Failure 400 {object} models.ErrorResponse "Invalid parameters"
// @Failure 404 {object} models.ErrorResponse "Session not found"
// @Failure 500 {object} models.ErrorResponse "Internal Server Error"
// @Router /v1/sessions/{id}/history/{dataType} [get]
func GetHistory(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Param("id")
	if sessionID == "" {
		requestContext.UserError("Session ID is required")
		return
	}

	dataType := ginContext.Param("dataType")
	if dataType == "" {
		requestContext.UserError("Data type is required")
		return
	}

	if !isHistoryEnabledType(dataType) {
		requestContext.UserError("Invalid data type: " + dataType + " is not a history-enabled type")
		return
	}

	// Get session to validate it exists and get current save name
	existingSession, err := getSessionStore().Get(sessionID)
	if err != nil {
		requestContext.ServerError(err, err)
		return
	}
	if existingSession == nil {
		requestContext.NotFound("Session not found")
		return
	}

	// Get save name from query param or default to current save
	saveName := ginContext.Query("saveName")
	if saveName == "" {
		saveName = existingSession.SessionName
	}

	// Parse since parameter
	var sinceID int64
	sinceParam := ginContext.Query("since")
	if sinceParam != "" {
		parsed, err := strconv.ParseInt(sinceParam, 10, 64)
		if err != nil || parsed < 0 {
			requestContext.UserError("Invalid since parameter: must be a non-negative integer")
			return
		}
		sinceID = parsed
	}

	// Get history from cache
	historyChunk, err := session.GetHistory(sessionID, saveName, dataType, sinceID)
	if err != nil {
		requestContext.ServerError(err, err)
		return
	}

	requestContext.Ok(historyChunk)
}

// ListHistorySaves godoc
// @Summary List save names with history
// @Description Returns all save names that have historical data for this session
// @Tags History
// @Accept json
// @Produce json
// @Param id path string true "Session ID"
// @Success 200 {object} models.HistorySavesResponse "List of save names with history"
// @Failure 404 {object} models.ErrorResponse "Session not found"
// @Failure 500 {object} models.ErrorResponse "Internal Server Error"
// @Router /v1/sessions/{id}/history [get]
func ListHistorySaves(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	sessionID := ginContext.Param("id")
	if sessionID == "" {
		requestContext.UserError("Session ID is required")
		return
	}

	existingSession, err := getSessionStore().Get(sessionID)
	if err != nil {
		requestContext.ServerError(err, err)
		return
	}
	if existingSession == nil {
		requestContext.NotFound("Session not found")
		return
	}

	saveNames, err := session.GetHistorySaves(sessionID)
	if err != nil {
		requestContext.ServerError(err, err)
		return
	}

	requestContext.Ok(models.HistorySavesResponse{
		SaveNames:   saveNames,
		CurrentSave: existingSession.SessionName,
	})
}
