package models

type PowerInfo struct {
	CircuitID        int     `json:"circuitId"`
	CircuitGroupID   int     `json:"circuitGroupId"`
	PowerConsumed    float64 `json:"powerConsumed"`
	MaxPowerConsumed float64 `json:"maxPowerConsumed"`
}
