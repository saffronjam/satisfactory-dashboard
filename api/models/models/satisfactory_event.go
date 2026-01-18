package models

type SatisfactoryEventType string

const (
	SatisfactoryEventApiStatus       SatisfactoryEventType = "satisfactoryApiCheck"
	SatisfactoryEventCircuits        SatisfactoryEventType = "circuits"
	SatisfactoryEventFactoryStats    SatisfactoryEventType = "factoryStats"
	SatisfactoryEventProdStats       SatisfactoryEventType = "prodStats"
	SatisfactoryEventSinkStats       SatisfactoryEventType = "sinkStats"
	SatisfactoryEventPlayers         SatisfactoryEventType = "players"
	SatisfactoryEventGeneratorStats  SatisfactoryEventType = "generatorStats"
	SatisfactoryEventVehicles        SatisfactoryEventType = "vehicles"
	SatisfactoryEventVehicleStations SatisfactoryEventType = "vehicleStations"
	SatisfactoryEventSessionUpdate   SatisfactoryEventType = "sessionUpdate"
	SatisfactoryEventBelts           SatisfactoryEventType = "belts"
	SatisfactoryEventPipes           SatisfactoryEventType = "pipes"
	SatisfactoryEventTrainRails      SatisfactoryEventType = "trainRails"
	SatisfactoryEventCables          SatisfactoryEventType = "cables"
	SatisfactoryEventStorages        SatisfactoryEventType = "storages"
	SatisfactoryEventMachines        SatisfactoryEventType = "machines"
	SatisfactoryEventTractors        SatisfactoryEventType = "tractors"
	SatisfactoryEventExplorers       SatisfactoryEventType = "explorers"
	SatisfactoryEventVehiclePaths    SatisfactoryEventType = "vehiclePaths"
	SatisfactoryEventSpaceElevator   SatisfactoryEventType = "spaceElevator"
	SatisfactoryEventHub             SatisfactoryEventType = "hub"
	SatisfactoryEventRadarTowers     SatisfactoryEventType = "radarTowers"
	SatisfactoryEventResourceNodes   SatisfactoryEventType = "resourceNodes"
	SatisfactoryEventHypertubes      SatisfactoryEventType = "hypertubes"
	SatisfactoryEventSchematics      SatisfactoryEventType = "schematics"

	SatisfactoryEventKey string = "satisfactory_events"
)

type SatisfactoryEvent struct {
	Type       SatisfactoryEventType `json:"type"`
	Data       any                   `json:"data"`
	GameTimeID int64                 `json:"gameTimeId"` // Game time when event was captured (0 for non-history types)
}

type SseSatisfactoryEvent struct {
	SatisfactoryEvent `json:",inline" tstype:",extends"`
	ClientID          int64 `json:"clientId"`
}
