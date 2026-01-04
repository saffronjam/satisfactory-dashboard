package models

type TractorStatus string

const (
	TractorStatusSelfDriving   TractorStatus = "selfDriving"
	TractorStatusManualDriving TractorStatus = "manualDriving"
	TractorStatusParked        TractorStatus = "parked"
	TractorStatusUnknown       TractorStatus = "unknown"
)

type Tractor struct {
	ID         string        `json:"id"`
	Name       string        `json:"name"`
	Speed      float64       `json:"speed"`
	Status     TractorStatus `json:"status"`
	Fuel       *Fuel         `json:"fuel,omitempty"`
	Inventory  []ItemStats   `json:"inventory"`
	Location   `json:",inline" tstype:",extends"`
	CircuitIDs `json:",inline" tstype:",extends"`
}

func (tractor *Tractor) ToDTO() TractorDTO {
	return *tractor
}
