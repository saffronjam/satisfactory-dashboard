package models

type TruckStatus string

const (
	TruckStatusSelfDriving   TruckStatus = "selfDriving"
	TruckStatusManualDriving TruckStatus = "manualDriving"
	TruckStatusParked        TruckStatus = "parked"
	TruckStatusUnknown       TruckStatus = "unknown"
)

type Truck struct {
	ID         string      `json:"id"`
	Name       string      `json:"name"`
	Speed      float64     `json:"speed"`
	Status     TruckStatus `json:"status"`
	Fuel       *Fuel       `json:"fuel,omitempty"`
	Inventory  []ItemStats `json:"inventory"`
	Location   `json:",inline" tstype:",extends"`
	CircuitIDs `json:",inline" tstype:",extends"`
}

func (truck *Truck) ToDTO() TruckDTO {
	return *truck
}
