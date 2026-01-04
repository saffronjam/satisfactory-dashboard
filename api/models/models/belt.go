package models

type Belt struct {
	ID             string     `json:"id"`
	Name           string     `json:"name"`
	Location0      Location   `json:"location0"`
	Location1      Location   `json:"location1"`
	Connected0     bool       `json:"connected0"`
	Connected1     bool       `json:"connected1"`
	SplineData     []Location `json:"splineData"`
	Length         float64    `json:"length"`
	ItemsPerMinute float64    `json:"itemsPerMinute"`
}

func (belt *Belt) ToDTO() BeltDTO {
	return *belt
}

type Belts struct {
	Belts           []Belt           `json:"belts"`
	SplitterMergers []SplitterMerger `json:"splitterMergers"`
}
