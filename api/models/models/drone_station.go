package models

type DroneStation struct {
	Name            string      `json:"name"`
	Fuel            *Fuel       `json:"fuel,omitempty"`
	BoundingBox     BoundingBox `json:"boundingBox"`
	IncomingRate    float64     `json:"incomingRate"`    // Average incoming items/minute
	OutgoingRate    float64     `json:"outgoingRate"`    // Average outgoing items/minute
	InputInventory  []ItemStats `json:"inputInventory"`  // Items being received
	OutputInventory []ItemStats `json:"outputInventory"` // Items being sent
	Location        `json:",inline" tstype:",extends"`
	CircuitIDs      `json:",inline" tstype:",extends"`
}

func (droneStation *DroneStation) ToDTO() DroneStationDTO {
	return *droneStation
}
