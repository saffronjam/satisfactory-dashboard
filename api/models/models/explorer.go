package models

type ExplorerStatus string

const (
	ExplorerStatusSelfDriving   ExplorerStatus = "selfDriving"
	ExplorerStatusManualDriving ExplorerStatus = "manualDriving"
	ExplorerStatusParked        ExplorerStatus = "parked"
	ExplorerStatusUnknown       ExplorerStatus = "unknown"
)

type Explorer struct {
	ID         string         `json:"id"`
	Name       string         `json:"name"`
	Speed      float64        `json:"speed"`
	Status     ExplorerStatus `json:"status"`
	Fuel       *Fuel          `json:"fuel,omitempty"`
	Inventory  []ItemStats    `json:"inventory"`
	Location   `json:",inline" tstype:",extends"`
	CircuitIDs `json:",inline" tstype:",extends"`
}

func (explorer *Explorer) ToDTO() ExplorerDTO {
	return *explorer
}
