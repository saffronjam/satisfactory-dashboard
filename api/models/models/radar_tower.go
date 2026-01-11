package models

type ResourceNodePurity string

const (
	ResourceNodePurityImpure ResourceNodePurity = "Impure"
	ResourceNodePurityNormal ResourceNodePurity = "Normal"
	ResourceNodePurityPure   ResourceNodePurity = "Pure"
)

type ResourceType string

const (
	ResourceTypeIronOre     ResourceType = "Iron Ore"
	ResourceTypeCopperOre   ResourceType = "Copper Ore"
	ResourceTypeLimestone   ResourceType = "Limestone"
	ResourceTypeCoal        ResourceType = "Coal"
	ResourceTypeSAM         ResourceType = "SAM"
	ResourceTypeSulfur      ResourceType = "Sulfur"
	ResourceTypeCateriumOre ResourceType = "Caterium Ore"
	ResourceTypeBauxite     ResourceType = "Bauxite"
	ResourceTypeRawQuartz   ResourceType = "Raw Quartz"
	ResourceTypeUranium     ResourceType = "Uranium"
	ResourceTypeCrudeOil    ResourceType = "Crude Oil"
	ResourceTypeGeyser      ResourceType = "Geyser"
	ResourceTypeNitrogenGas ResourceType = "Nitrogen Gas"
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
	FaunaTypeLizardDoggo      FaunaType = "Lizard Doggo"
	FaunaTypeFluffyTailedHog  FaunaType = "Fluffy-Tailed Hog"
	FaunaTypeSpitter          FaunaType = "Spitter"
	FaunaTypeStinger          FaunaType = "Stinger"
	FaunaTypeFlyingCrab       FaunaType = "Flying Crab"
	FaunaTypeNonFlyingBird    FaunaType = "Non-flying Bird"
	FaunaTypeSpaceGiraffe     FaunaType = "Space Giraffe-Tick-Penguin-Whale Thing"
	FaunaTypeSporeFlower      FaunaType = "Spore Flower"
	FaunaTypeLeafBug          FaunaType = "Leaf Bug"
	FaunaTypeGrassSprite      FaunaType = "Grass Sprite"
	FaunaTypeCaveBat          FaunaType = "Cave Bat"
	FaunaTypeGiantFlyingManta FaunaType = "Giant Flying Manta"
	FaunaTypeLakeShark        FaunaType = "Lake Shark"
	FaunaTypeWalker           FaunaType = "Walker"
)

type FloraType string

const (
	FloraTypeTree            FloraType = "Tree"
	FloraTypeLeaves          FloraType = "Leaves"
	FloraTypeFlowerPetals    FloraType = "Flower Petals"
	FloraTypeBaconAgaric     FloraType = "Bacon Agaric"
	FloraTypePaleberry       FloraType = "Paleberry"
	FloraTypeBerylNut        FloraType = "Beryl Nut"
	FloraTypeMycelia         FloraType = "Mycelia"
	FloraTypeVineLadder      FloraType = "Vines"
	FloraTypeBlueCapMushroom FloraType = "Blue Cap Mushroom"
	FloraTypePinkJellyfish   FloraType = "Pink Jellyfish"
)

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
