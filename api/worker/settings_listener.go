package worker

import (
	"api/models/models"
	"api/pkg/db/key_value"
	"api/pkg/log"
	"api/service/settings"
	"context"
	"encoding/json"
	"fmt"
)

// SettingsListenerWorker subscribes to settings changes and applies them
func SettingsListenerWorker(ctx context.Context) {
	kvClient := key_value.New()
	logger := log.Get("settings-listener")
	settingsService := settings.NewService()

	logger.Infoln("Starting settings listener worker...")

	// Load initial settings from Redis
	currentSettings, err := settingsService.Get()
	if err != nil {
		log.PrettyError(fmt.Errorf("failed to load initial settings: %w", err))
		// Continue with defaults
		currentSettings = models.DefaultSettings()
	}

	// Apply initial log level
	zapLevel, err := currentSettings.LogLevel.ToZapLevel()
	if err != nil {
		logger.Warnf("Invalid initial log level %s: %v", currentSettings.LogLevel, err)
	} else {
		log.SetLogLevel(zapLevel)
		logger.Infof("Initial log level set to: %s", currentSettings.LogLevel)
	}

	// Subscribe to settings changes
	handler := func(payload string) {
		logger.Debugf("Received settings change event: %s", payload)

		var event models.SettingsChangedEvent
		if err := json.Unmarshal([]byte(payload), &event); err != nil {
			log.PrettyError(fmt.Errorf("failed to unmarshal settings event: %w", err))
			return
		}

		// Apply each change
		for _, change := range event.Changes {
			switch change.Field {
			case "logLevel":
				newLevel, ok := change.NewValue.(string)
				if !ok {
					logger.Warnf("Invalid log level type: %T", change.NewValue)
					continue
				}

				logLevel := models.LogLevel(newLevel)
				zapLevel, err := logLevel.ToZapLevel()
				if err != nil {
					logger.Warnf("Invalid log level %s: %v", newLevel, err)
					continue
				}

				log.SetLogLevel(zapLevel)
				logger.Infof("Log level changed: %s → %s", change.OldValue, change.NewValue)

			default:
				logger.Debugf("Unknown settings field: %s", change.Field)
			}
		}

		logger.Infof("Applied %d settings changes", len(event.Changes))
	}

	// Start listening (non-blocking)
	if err := kvClient.AddListener(ctx, settings.SettingsChangedChan, handler); err != nil {
		log.PrettyError(fmt.Errorf("failed to add settings listener: %w", err))
		return
	}

	logger.Infoln("Settings listener started successfully")

	// Block until context is cancelled
	<-ctx.Done()
	logger.Infoln("Settings listener worker stopped")
}
