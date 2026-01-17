package models

// HubMilestoneCost represents an item required for milestone completion
type HubMilestoneCost struct {
	Name          string  `json:"name"`
	Amount        float64 `json:"amount"`        // Amount submitted so far
	RemainingCost float64 `json:"remainingCost"` // How much left to submit
	TotalCost     float64 `json:"totalCost"`     // Total required
}

// HubMilestone represents the active milestone at the HUB
type HubMilestone struct {
	Name     string             `json:"name"`
	TechTier int                `json:"techTier"`
	Type     string             `json:"type"` // "Milestone" or "No Milestone Selected"
	Cost     []HubMilestoneCost `json:"cost"`
}

// Hub represents the HUB Terminal
type Hub struct {
	ID                 string        `json:"id"`
	Name               string        `json:"name"`
	HasActiveMilestone bool          `json:"hasActiveMilestone"`
	ActiveMilestone    *HubMilestone `json:"activeMilestone,omitempty"`
	ShipDocked         bool          `json:"shipDocked"`               // Is ship currently docked?
	ShipReturnTime     *int64        `json:"shipReturnTime,omitempty"` // Unix timestamp (ms) when ship returns, null if docked
	BoundingBox        BoundingBox   `json:"boundingBox"`
	Location           `json:",inline" tstype:",extends"`
}
