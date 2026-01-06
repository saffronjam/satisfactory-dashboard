package frm_client

import (
	"api/models/models"
	"api/service/frm_client/frm_models"
)

func parseBoundingBox(box frm_models.BoundingBox) models.BoundingBox {
	return models.BoundingBox{
		Min: models.Location{X: box.Min.X, Y: box.Min.Y, Z: box.Min.Z},
		Max: models.Location{X: box.Max.X, Y: box.Max.Y, Z: box.Max.Z},
	}
}

func parseLocation(loc frm_models.Location) models.Location {
	return models.Location{
		X:        loc.X,
		Y:        loc.Y,
		Z:        loc.Z,
		Rotation: loc.Rotation,
	}
}

func parseCircuitIDsFromPowerInfo(powerInfo frm_models.PowerInfo) models.CircuitIDs {
	return models.CircuitIDs{
		CircuitID:      powerInfo.CircuitID,
		CircuitGroupID: &powerInfo.CircuitGroupID,
	}
}

func parseCircuitIDs(circuitID int) models.CircuitIDs {
	return models.CircuitIDs{
		CircuitID: circuitID,
	}
}

func parsePowerInfo(powerInfo frm_models.PowerInfo) models.PowerInfo {
	return models.PowerInfo{
		CircuitID:        powerInfo.CircuitID,
		CircuitGroupID:   powerInfo.CircuitGroupID,
		PowerConsumed:    powerInfo.PowerConsumed,
		MaxPowerConsumed: powerInfo.MaxPowerConsumed,
	}
}
