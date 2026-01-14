package settings

import (
	"api/models/models"
	"api/pkg/db/key_value"
	"encoding/json"
	"fmt"
)

const (
	SettingsKey         = "global:settings"
	SettingsChangedChan = "settings_changed"
)

// Service manages global settings
type Service struct {
	kvClient *key_value.Client
}

// NewService creates a new settings service
func NewService() *Service {
	return &Service{
		kvClient: key_value.New(),
	}
}

// Get retrieves current settings from Redis
func (s *Service) Get() (*models.Settings, error) {
	data, err := s.kvClient.Get(SettingsKey)
	if err != nil {
		return nil, fmt.Errorf("failed to get settings from Redis: %w", err)
	}

	// If no settings exist, return defaults
	if data == "" {
		defaults := models.DefaultSettings()
		// Store defaults in Redis for consistency
		if err := s.initializeDefaults(defaults); err != nil {
			return nil, fmt.Errorf("failed to initialize default settings: %w", err)
		}
		return defaults, nil
	}

	var settings models.Settings
	if err := json.Unmarshal([]byte(data), &settings); err != nil {
		return nil, fmt.Errorf("failed to unmarshal settings: %w", err)
	}

	return &settings, nil
}

// Update updates settings in Redis and publishes changes
func (s *Service) Update(newSettings *models.Settings) (*models.SettingsChangedEvent, error) {
	// Validate new settings
	if err := newSettings.Validate(); err != nil {
		return nil, err
	}

	// Get current settings for diff computation
	oldSettings, err := s.Get()
	if err != nil {
		return nil, fmt.Errorf("failed to get current settings: %w", err)
	}

	// Compute what changed
	changes := models.ComputeSettingsDiff(oldSettings, newSettings)

	// Marshal and store new settings (no expiration)
	data, err := json.Marshal(newSettings)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal settings: %w", err)
	}

	if err := s.kvClient.Set(SettingsKey, string(data), 0); err != nil {
		return nil, fmt.Errorf("failed to store settings in Redis: %w", err)
	}

	// Create event with full settings and changes
	event := &models.SettingsChangedEvent{
		Settings: *newSettings,
		Changes:  changes,
	}

	// Publish event to all instances (only if there were changes)
	if len(changes) > 0 {
		eventData, err := json.Marshal(event)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal settings event: %w", err)
		}

		if err := s.kvClient.Publish(SettingsChangedChan, string(eventData)); err != nil {
			return nil, fmt.Errorf("failed to publish settings change: %w", err)
		}
	}

	return event, nil
}

// initializeDefaults stores default settings in Redis
func (s *Service) initializeDefaults(defaults *models.Settings) error {
	data, err := json.Marshal(defaults)
	if err != nil {
		return fmt.Errorf("failed to marshal default settings: %w", err)
	}

	return s.kvClient.Set(SettingsKey, string(data), 0)
}
