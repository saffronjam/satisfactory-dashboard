package models

type State struct {
	SatisfactoryApiStatus SatisfactoryApiStatus `json:"satisfactoryApiStatus"`

	FactoryStats   FactoryStats   `json:"factoryStats"`
	ProdStats      ProdStats      `json:"prodStats"`
	GeneratorStats GeneratorStats `json:"generatorStats"`
	SinkStats      SinkStats      `json:"sinkStats"`

	Circuits      []Circuit      `json:"circuits"`
	Players       []Player       `json:"players"`
	Drones        []Drone        `json:"drones"`
	Trains        []Train        `json:"trains"`
	TrainStations []TrainStation `json:"trainStations"`
	DroneStations []DroneStation `json:"droneStations"`

	Belts           []Belt           `json:"belts"`
	Pipes           []Pipe           `json:"pipes"`
	PipeJunctions   []PipeJunction   `json:"pipeJunctions"`
	TrainRails      []TrainRail      `json:"trainRails"`
	SplitterMergers []SplitterMerger `json:"splitterMergers"`
	Cables          []Cable          `json:"cables"`
	Storages        []Storage        `json:"storages"`
	Machines        []Machine        `json:"machines"`
	Tractors        []Tractor        `json:"tractors"`
	Explorers       []Explorer       `json:"explorers"`
	VehiclePaths    []VehiclePath    `json:"vehiclePaths"`
	SpaceElevator   *SpaceElevator   `json:"spaceElevator"`
	RadarTowers     []RadarTower     `json:"radarTowers"`
	ResourceNodes   []ResourceNode   `json:"resourceNodes"`
}

func (state *State) ToDTO() StateDTO {
	return *state
}
