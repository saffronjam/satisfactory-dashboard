package v1

import (
	"api/models/models"
	"api/service/settings"
	"fmt"
	"sync"

	"github.com/gin-gonic/gin"
)

var (
	settingsService     *settings.Service
	settingsServiceOnce sync.Once
)

func getSettingsService() *settings.Service {
	settingsServiceOnce.Do(func() {
		settingsService = settings.NewService()
	})
	return settingsService
}

// GetSettings godoc
// @Summary Get Settings
// @Description Get current global settings
// @Tags Settings
// @Accept json
// @Produce json
// @Success 200 {object} models.Settings "Current settings"
// @Failure 500 {object} models.ErrorResponse "Internal Server Error"
// @Router /v1/settings [get]
func GetSettings(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	currentSettings, err := getSettingsService().Get()
	if err != nil {
		requestContext.ServerError(fmt.Errorf("failed to get settings: %w", err), err)
		return
	}

	requestContext.Ok(currentSettings)
}

// UpdateSettings godoc
// @Summary Update Settings
// @Description Update global settings. Changes apply immediately to all instances.
// @Tags Settings
// @Accept json
// @Produce json
// @Param request body models.Settings true "New settings"
// @Success 200 {object} models.Settings "Updated settings"
// @Failure 400 {object} models.ErrorResponse "Bad Request"
// @Failure 500 {object} models.ErrorResponse "Internal Server Error"
// @Router /v1/settings [put]
func UpdateSettings(ginContext *gin.Context) {
	requestContext := NewRequestContext(ginContext)

	var newSettings models.Settings
	if err := ginContext.ShouldBindJSON(&newSettings); err != nil {
		requestContext.UserError("Invalid request body: " + err.Error())
		return
	}

	// Update settings (this will validate, diff, store, and publish)
	event, err := getSettingsService().Update(&newSettings)
	if err != nil {
		requestContext.ServerError(fmt.Errorf("failed to update settings: %w", err), err)
		return
	}

	// Return updated settings
	requestContext.Ok(event.Settings)
}
