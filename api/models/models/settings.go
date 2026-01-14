// Package models provides the data models for the Satisfactory Dashboard API.
package models

import (
	"fmt"

	"go.uber.org/zap/zapcore"
)

// LogLevel represents valid log levels
type LogLevel string

const (
	LogLevelTrace   LogLevel = "Trace"
	LogLevelDebug   LogLevel = "Debug"
	LogLevelInfo    LogLevel = "Info"
	LogLevelWarning LogLevel = "Warning"
	LogLevelError   LogLevel = "Error"
)

// ValidLogLevels contains all valid log level values
var ValidLogLevels = []LogLevel{
	LogLevelTrace,
	LogLevelDebug,
	LogLevelInfo,
	LogLevelWarning,
	LogLevelError,
}

// ToZapLevel converts LogLevel to zapcore.Level
func (l LogLevel) ToZapLevel() (zapcore.Level, error) {
	switch l {
	case LogLevelTrace:
		return zapcore.DebugLevel, nil // Zap doesn't have Trace, use Debug
	case LogLevelDebug:
		return zapcore.DebugLevel, nil
	case LogLevelInfo:
		return zapcore.InfoLevel, nil
	case LogLevelWarning:
		return zapcore.WarnLevel, nil
	case LogLevelError:
		return zapcore.ErrorLevel, nil
	default:
		return zapcore.InfoLevel, fmt.Errorf("invalid log level: %s", l)
	}
}

// IsValid checks if the log level is valid
func (l LogLevel) IsValid() bool {
	for _, valid := range ValidLogLevels {
		if l == valid {
			return true
		}
	}
	return false
}

// Settings represents global application settings
type Settings struct {
	LogLevel LogLevel `json:"logLevel"` // Current log level
}

// DefaultSettings returns the default settings
func DefaultSettings() *Settings {
	return &Settings{
		LogLevel: LogLevelInfo,
	}
}

// Validate checks if settings are valid
func (s *Settings) Validate() error {
	if !s.LogLevel.IsValid() {
		return fmt.Errorf("invalid log level: %s. Valid values: %v", s.LogLevel, ValidLogLevels)
	}
	return nil
}

// SettingsChange represents a change to settings
type SettingsChange struct {
	Field    string      `json:"field"`    // e.g., "logLevel"
	OldValue interface{} `json:"oldValue"` // Previous value
	NewValue interface{} `json:"newValue"` // New value
}

// SettingsChangedEvent is published to Redis pub/sub when settings change
type SettingsChangedEvent struct {
	Settings Settings         `json:"settings"` // Full new settings
	Changes  []SettingsChange `json:"changes"`  // List of what changed
}

// ComputeSettingsDiff compares old and new settings and returns changes
func ComputeSettingsDiff(oldSettings, newSettings *Settings) []SettingsChange {
	var changes []SettingsChange

	if oldSettings.LogLevel != newSettings.LogLevel {
		changes = append(changes, SettingsChange{
			Field:    "logLevel",
			OldValue: oldSettings.LogLevel,
			NewValue: newSettings.LogLevel,
		})
	}

	return changes
}
