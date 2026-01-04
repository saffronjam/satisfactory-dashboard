package models

type VehiclePathType string

const (
	VehiclePathTypeExplorer    VehiclePathType = "Explorer"
	VehiclePathTypeFactoryCart VehiclePathType = "Factory Cart"
	VehiclePathTypeTruck       VehiclePathType = "Truck"
	VehiclePathTypeTractor     VehiclePathType = "Tractor"
)

type VehiclePath struct {
	Name        string          `json:"name"`
	VehicleType VehiclePathType `json:"vehicleType"`
	PathLength  float64         `json:"pathLength"` // in meters
	Vertices    []Location      `json:"vertices"`
}

func (vp *VehiclePath) ToDTO() VehiclePathDTO {
	return *vp
}
