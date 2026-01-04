package models

type CircuitIDs struct {
	CircuitID      int  `json:"circuitId"`
	CircuitGroupID *int `json:"circuitGroupId,omitempty"`
}
