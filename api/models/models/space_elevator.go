package models

type SpaceElevatorPhaseObjective struct {
	Name      string  `json:"name"`
	Amount    float64 `json:"amount"`
	TotalCost float64 `json:"totalCost"`
}

type SpaceElevator struct {
	Name          string                        `json:"name"`
	BoundingBox   BoundingBox                   `json:"boundingBox"`
	CurrentPhase  []SpaceElevatorPhaseObjective `json:"currentPhase"`
	FullyUpgraded bool                          `json:"fullyUpgraded"`
	UpgradeReady  bool                          `json:"upgradeReady"`
	Location      `json:",inline" tstype:",extends"`
}
