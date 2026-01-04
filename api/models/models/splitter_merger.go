package models

type SplitterMergerType string

const (
	SplitterMergerTypeConveyorMerger       SplitterMergerType = "Conveyor Merger"
	SplitterMergerTypeConveyorSplitter     SplitterMergerType = "Conveyor Splitter"
	SplitterMergerTypeProgrammableSplitter SplitterMergerType = "Programmable Splitter"
	SplitterMergerTypeSmartSplitter        SplitterMergerType = "Smart Splitter"
)

type SplitterMerger struct {
	ID          string             `json:"id"`
	Type        SplitterMergerType `json:"type"`
	Location    `json:",inline" tstype:",extends"`
	BoundingBox BoundingBox `json:"boundingBox"`
}
