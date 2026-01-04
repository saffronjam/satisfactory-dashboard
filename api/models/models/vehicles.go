package models

type Vehicles struct {
	Trains    []Train    `json:"trains"`
	Drones    []Drone    `json:"drones"`
	Trucks    []Truck    `json:"trucks"`
	Tractors  []Tractor  `json:"tractors"`
	Explorers []Explorer `json:"explorers"`
}

type VehicleStations struct {
	TrainStations []TrainStation `json:"trainStations"`
	DroneStations []DroneStation `json:"droneStations"`
	TruckStations []TruckStation `json:"truckStations"`
}
