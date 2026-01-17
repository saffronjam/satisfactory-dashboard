package models

type SatisfactoryApiStatusDTO = SatisfactoryApiStatus
type CircuitDTO = Circuit
type DroneDTO = Drone
type DroneStationDTO = DroneStation
type ExplorerDTO = Explorer
type FactoryStatsDTO = FactoryStats
type GeneratorStatsDTO = GeneratorStats
type MachineDTO = Machine
type MachineProdStatsDTO = MachineProdStats
type PlayerDTO = Player
type ProdStatsDTO = ProdStats
type SinkStatsDTO = SinkStats
type TractorDTO = Tractor
type TrainDTO = Train
type TrainStationDTO = TrainStation
type TruckDTO = Truck
type VehiclePathDTO = VehiclePath
type StateDTO = State
type BeltDTO = Belt
type PipeDTO = Pipe
type PipeJunctionDTO = PipeJunction
type TrainRailDTO = TrainRail
type SplitterMergerDTO = SplitterMerger
type CableDTO = Cable
type VehiclesDTO = Vehicles
type VehicleStationsDTO = VehicleStations
type SchematicDTO = Schematic
type StorageDTO = Storage
type SpaceElevatorDTO = SpaceElevator
type HubDTO = Hub
type RadarTowerDTO = RadarTower

type DroneSetupDTO struct {
	Drones        []DroneDTO        `json:"drones"`
	DroneStations []DroneStationDTO `json:"droneStations"`
}

type TrainSetupDTO struct {
	Trains        []TrainDTO        `json:"trains"`
	TrainStations []TrainStationDTO `json:"trainStations"`
}

type BeltsDTO struct {
	Belts           []BeltDTO           `json:"belts"`
	SplitterMergers []SplitterMergerDTO `json:"splitterMerges"`
}

type PipesDTO struct {
	Pipes        []PipeDTO         `json:"pipes"`
	PipeJunction []PipeJunctionDTO `json:"pipeJunctions"`
}
