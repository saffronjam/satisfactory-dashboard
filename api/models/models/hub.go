package models

type Hub struct {
	ID          string      `json:"id"`
	HubLevel    int         `json:"hubLevel"`
	BoundingBox BoundingBox `json:"boundingBox"`
	Location    `json:",inline" tstype:",extends"`
}
