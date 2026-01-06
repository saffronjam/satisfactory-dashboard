package models

type Hypertube struct {
	ID          string      `json:"id"`
	Location0   Location    `json:"location0"`
	Location1   Location    `json:"location1"`
	SplineData  []Location  `json:"splineData"`
	BoundingBox BoundingBox `json:"boundingBox"`
}

type HypertubeEntrance struct {
	ID          string `json:"id"`
	Location    `json:",inline" tstype:",extends"`
	BoundingBox BoundingBox `json:"boundingBox"`
	PowerInfo   PowerInfo   `json:"powerInfo"`
}

type Hypertubes struct {
	Hypertubes         []Hypertube         `json:"hypertubes"`
	HypertubeEntrances []HypertubeEntrance `json:"hypertubeEntrances"`
}
