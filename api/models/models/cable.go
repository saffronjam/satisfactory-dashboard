package models

type Cable struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Location0  Location `json:"location0"`
	Location1  Location `json:"location1"`
	Connected0 bool     `json:"connected0"`
	Connected1 bool     `json:"connected1"`
	Length     float64  `json:"length"`
}
