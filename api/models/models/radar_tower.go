package models

// Resource Node Purity
type ResourceNodePurity string

const (
	ResourceNodePurityImpure ResourceNodePurity = "Impure"
	ResourceNodePurityNormal ResourceNodePurity = "Normal"
	ResourceNodePurityPure   ResourceNodePurity = "Pure"
)

// ResourceType represents the type of resource (ore, liquid, gas)
type ResourceType string

const (
	ResourceTypeIronOre     ResourceType = "IronOre"
	ResourceTypeCopperOre   ResourceType = "CopperOre"
	ResourceTypeLimestone   ResourceType = "Limestone"
	ResourceTypeCoal        ResourceType = "Coal"
	ResourceTypeSAM         ResourceType = "SAM"
	ResourceTypeSulfur      ResourceType = "Sulfur"
	ResourceTypeCateriumOre ResourceType = "CateriumOre"
	ResourceTypeBauxite     ResourceType = "Bauxite"
	ResourceTypeRawQuartz   ResourceType = "RawQuartz"
	ResourceTypeUranium     ResourceType = "Uranium"
	ResourceTypeCrudeOil    ResourceType = "CrudeOil"
	ResourceTypeGeyser      ResourceType = "Geyser"
	ResourceTypeNitrogenGas ResourceType = "NitrogenGas"
)

// NodeType represents the deposit classification
type NodeType string

const (
	NodeTypeNode              NodeType = "Node"
	NodeTypeGeyser            NodeType = "Geyser"
	NodeTypeFrackingCore      NodeType = "Fracking Core"
	NodeTypeFrackingSatellite NodeType = "Fracking Satellite"
)

type FaunaType string

const (
	FaunaTypeLizardDoggo      FaunaType = "LizardDoggo"
	FaunaTypeFluffyTailedHog  FaunaType = "FluffyTailedHog"
	FaunaTypeSpitter          FaunaType = "Spitter"
	FaunaTypeStinger          FaunaType = "Stinger"
	FaunaTypeFlyingCrab       FaunaType = "FlyingCrab"
	FaunaTypeNonFlyingBird    FaunaType = "NonFlyingBird"
	FaunaTypeSpaceGiraffe     FaunaType = "SpaceGiraffe"
	FaunaTypeSporeFlower      FaunaType = "SporeFlower"
	FaunaTypeLeafBug          FaunaType = "LeafBug"
	FaunaTypeGrassSprite      FaunaType = "GrassSprite"
	FaunaTypeCaveBat          FaunaType = "CaveBat"
	FaunaTypeGiantFlyingManta FaunaType = "GiantFlyingManta"
	FaunaTypeLakeShark        FaunaType = "LakeShark"
	FaunaTypeWalker           FaunaType = "Walker"
)

type FloraType string

const (
	FloraTypeTree            FloraType = "Tree"
	FloraTypeLeaves          FloraType = "Leaves"
	FloraTypeFlowerPetals    FloraType = "FlowerPetals"
	FloraTypeBaconAgaric     FloraType = "BaconAgaric"
	FloraTypePaleberry       FloraType = "Paleberry"
	FloraTypeBerylNut        FloraType = "BerylNut"
	FloraTypeMycelia         FloraType = "Mycelia"
	FloraTypeVineLadder      FloraType = "VineLadder"
	FloraTypeBlueCapMushroom FloraType = "BlueCapMushroom"
	FloraTypePinkJellyfish   FloraType = "PinkJellyfish"
)

// Signal Types
type SignalType string

const (
	SignalTypeSomersloop      SignalType = "Somersloop"
	SignalTypeMercerSphere    SignalType = "Mercer Sphere"
	SignalTypeBluePowerSlug   SignalType = "Blue Power Slug"
	SignalTypeYellowPowerSlug SignalType = "Yellow Power Slug"
	SignalTypePurplePowerSlug SignalType = "Purple Power Slug"
	SignalTypeHardDrive       SignalType = "Hard Drive"
)

type ResourceNode struct {
	ID           string             `json:"id"`
	Name         string             `json:"name"`
	ClassName    string             `json:"className"`
	Purity       ResourceNodePurity `json:"purity"`
	ResourceForm string             `json:"resourceForm"`
	ResourceType ResourceType       `json:"resourceType"`
	NodeType     NodeType           `json:"nodeType"`
	Exploited    bool               `json:"exploited"`
	Location     `json:",inline" tstype:",extends"`
}

type ScannedFauna struct {
	Name      FaunaType `json:"name"`
	ClassName string    `json:"className"`
	Amount    int       `json:"amount"`
}

type ScannedFlora struct {
	Name      FloraType `json:"name"`
	ClassName string    `json:"className"`
	Amount    int       `json:"amount"`
}

type ScannedSignal struct {
	Name      SignalType `json:"name"`
	ClassName string     `json:"className"`
	Amount    int        `json:"amount"`
}

type RadarTower struct {
	ID           string          `json:"id"`
	RevealRadius float64         `json:"revealRadius"`
	Nodes        []ResourceNode  `json:"nodes"`
	Fauna        []ScannedFauna  `json:"fauna"`
	Flora        []ScannedFlora  `json:"flora"`
	Signal       []ScannedSignal `json:"signal"`
	BoundingBox  BoundingBox     `json:"boundingBox"`
	Location     `json:",inline" tstype:",extends"`
}
