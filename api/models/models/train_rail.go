package models

type TrainRailType string

const (
	TrainRailTypeRailway TrainRailType = "Railway"
)

type TrainRail struct {
	ID         string        `json:"id"`
	Type       TrainRailType `json:"type"`
	Location0  Location      `json:"location0"`
	Location1  Location      `json:"location1"`
	Connected0 bool          `json:"connected0"`
	Connected1 bool          `json:"connected1"`
	SplineData []Location    `json:"splineData"`
	Length     float64       `json:"length"`
}

func (rail *TrainRail) ToDTO() TrainRailDTO {
	return *rail
}
