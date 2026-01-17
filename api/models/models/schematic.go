package models

type SchematicCost struct {
	Name      string  `json:"name"`
	Amount    float64 `json:"amount"`
	TotalCost float64 `json:"totalCost"`
}

type Schematic struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	Tier        int             `json:"tier"`
	Type        string          `json:"type"`
	Purchased   bool            `json:"purchased"`
	Locked      bool            `json:"locked"`
	LockedPhase bool            `json:"lockedPhase"`
	Cost        []SchematicCost `json:"cost"`
}

func (s *Schematic) ToDTO() SchematicDTO {
	return *s
}
