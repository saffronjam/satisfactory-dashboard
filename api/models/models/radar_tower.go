package models

// Resource Node Purity
type ResourceNodePurity string

const (
	ResourceNodePurityImpure ResourceNodePurity = "Impure"
	ResourceNodePurityNormal ResourceNodePurity = "Normal"
	ResourceNodePurityPure   ResourceNodePurity = "Pure"
)

type ResourceNodeType string

const (
	ResourceNodeTypeIronOre     ResourceNodeType = "IronOre"
	ResourceNodeTypeCopperOre   ResourceNodeType = "CopperOre"
	ResourceNodeTypeLimestone   ResourceNodeType = "Limestone"
	ResourceNodeTypeCoal        ResourceNodeType = "Coal"
	ResourceNodeTypeSAM         ResourceNodeType = "SAM"
	ResourceNodeTypeSulfur      ResourceNodeType = "Sulfur"
	ResourceNodeTypeCateriumOre ResourceNodeType = "CateriumOre"
	ResourceNodeTypeBauxite     ResourceNodeType = "Bauxite"
	ResourceNodeTypeRawQuartz   ResourceNodeType = "RawQuartz"
	ResourceNodeTypeUranium     ResourceNodeType = "Uranium"
	ResourceNodeTypeCrudeOil    ResourceNodeType = "CrudeOil"
	ResourceNodeTypeGeyser      ResourceNodeType = "Geyser"
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

type ScannedResourceNode struct {
	ID           string             `json:"id"`
	Name         string             `json:"name"`
	ClassName    string             `json:"className"`
	Purity       ResourceNodePurity `json:"purity"`
	ResourceForm string             `json:"resourceForm"`
	NodeType     ResourceNodeType   `json:"nodeType"`
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
	Name         string                `json:"name"`
	RevealRadius float64               `json:"revealRadius"`
	Nodes        []ScannedResourceNode `json:"nodes"`
	Fauna        []ScannedFauna        `json:"fauna"`
	Flora        []ScannedFlora        `json:"flora"`
	Signal       []ScannedSignal       `json:"signal"`
	BoundingBox  BoundingBox           `json:"boundingBox"`
	Location     `json:",inline" tstype:",extends"`
}
