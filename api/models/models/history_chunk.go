package models

// HistoryChunk is an API response containing a batch of historical data points.
// Returned by the history endpoint to provide clients with time-series data.
type HistoryChunk struct {
	DataType string      `json:"dataType"` // The data type requested
	SaveName string      `json:"saveName"` // The save name these points belong to
	LatestID int64       `json:"latestId"` // Highest GameTimeID in the chunk (for client tracking)
	Points   []DataPoint `json:"points"`   // Array of data points, ordered by GameTimeID ascending
}

// HistorySavesResponse is an API response listing all save names with historical data.
type HistorySavesResponse struct {
	SaveNames   []string `json:"saveNames"`   // List of save names that have history data
	CurrentSave string   `json:"currentSave"` // Currently active save name for the session
}
