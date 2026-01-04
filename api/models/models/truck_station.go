package models

type TruckStation struct {
	Name            string      `json:"name"`
	BoundingBox     BoundingBox `json:"boundingBox"`
	TransferRate    float64     `json:"transferRate"`    // Current transfer rate
	MaxTransferRate float64     `json:"maxTransferRate"` // Max stacks/sec for all vehicles
	Inventory       []ItemStats `json:"inventory"`       // Station inventory
	CircuitID       int         `json:"circuitId"`
	Location        `json:",inline" tstype:",extends"`
	CircuitIDs      `json:",inline" tstype:",extends"`
}
