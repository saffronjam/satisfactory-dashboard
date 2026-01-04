package models

type TrainStationPlatformType string

const (
	TrainStationPlatformTypeFreight      TrainStationPlatformType = "freight"
	TrainStationPlatformTypeFluidFreight TrainStationPlatformType = "fluidFreight"
)

type TrainStationPlatformMode string

const (
	TrainStationPlatformModeImport TrainStationPlatformMode = "import"
	TrainStationPlatformModeExport TrainStationPlatformMode = "export"
)

type TrainStationPlatformStatus string

const (
	TrainStationPlatformStatusIdle    TrainStationPlatformStatus = "idle"
	TrainStationPlatformStatusDocking TrainStationPlatformStatus = "docking"
)

type TrainStationPlatform struct {
	Type         TrainStationPlatformType   `json:"type"`
	Mode         TrainStationPlatformMode   `json:"mode"`
	Status       TrainStationPlatformStatus `json:"status"`
	BoundingBox  BoundingBox                `json:"boundingBox"`
	Inventory    []ItemStats                `json:"inventory"`
	TransferRate float64                    `json:"transferRate"` // Solid items rate
	InflowRate   float64                    `json:"inflowRate"`   // Fluid incoming rate
	OutflowRate  float64                    `json:"outflowRate"`  // Fluid outgoing rate
	Location     `json:",inline" tstype:",extends"`
}

type TrainStation struct {
	Name        string                 `json:"name"`
	BoundingBox BoundingBox            `json:"boundingBox"`
	Platforms   []TrainStationPlatform `json:"platforms"`
	Location    `json:",inline" tstype:",extends"`
	CircuitIDs  `json:",inline" tstype:",extends"`
}

func (trainStation *TrainStation) ToDTO() TrainStationDTO {
	return *trainStation
}
