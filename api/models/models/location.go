package models

type Location struct {
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	Z        float64 `json:"z"`
	Rotation float64 `json:"rotation"`
}

type BoundingBox struct {
	Min Location `json:"min"`
	Max Location `json:"max"`
}
