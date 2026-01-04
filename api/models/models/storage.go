package models

type StorageType string

const (
	StorageTypeBlueprintStorageBox        StorageType = "Blueprint Storage Box"
	StorageTypeDimensionalDepotUploader   StorageType = "Dimensional Depot Uploader"
	StorageTypeIndustrialStorageContainer StorageType = "Industrial Storage Container"
	StorageTypePersonalStorageBox         StorageType = "Personal Storage Box"
	StorageTypeStorageContainer           StorageType = "Storage Container"
)

type Storage struct {
	ID          string      `json:"id"`
	Type        StorageType `json:"type"`
	Inventory   []ItemStats `json:"inventory"`
	BoundingBox BoundingBox `json:"boundingBox"`
	Location    `json:",inline" tstype:",extends"`
}
