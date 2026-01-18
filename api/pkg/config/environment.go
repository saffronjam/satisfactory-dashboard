package config

import (
	"fmt"
	"os"
	"sigs.k8s.io/yaml"
	"strconv"
)

func SetupEnvironment(appMode string) error {
	makeError := func(err error) error {
		return fmt.Errorf("failed to set up environment. details: %w", err)
	}

	filepath, ok := os.LookupEnv("SATISFACTORY_DASHBOARD_API_CONFIG_FILE")
	if !ok || filepath == "" {
		filepath = "config.local.yml"
	}

	yamlFile, err := os.ReadFile(filepath)
	if err != nil {
		return makeError(err)
	}

	err = yaml.Unmarshal(yamlFile, &Config)
	if err != nil {
		return makeError(err)
	}

	Config.Mode = appMode
	Config.Filepath = filepath

	bootstrapPassword, ok := os.LookupEnv("SD_BOOTSTRAP_PASSWORD")
	if !ok || bootstrapPassword == "" {
		bootstrapPassword = "change-me"
	}
	Config.Auth.BootstrapPassword = bootstrapPassword

	// Load node name override from environment
	if nodeName := os.Getenv("SD_NODE_NAME"); nodeName != "" {
		Config.NodeName = nodeName
		fmt.Printf("Using custom node name from SD_NODE_NAME: %s\n", nodeName)
	}

	// Load port override from environment
	if portStr := os.Getenv("SD_API_PORT"); portStr != "" {
		port, err := strconv.Atoi(portStr)
		if err != nil {
			return makeError(fmt.Errorf("invalid SD_API_PORT: %w", err))
		}
		Config.Port = port
		fmt.Printf("Using custom API port from SD_API_PORT: %d\n", port)
	}

	// Load max sample game duration from environment (required)
	maxSampleDurationStr, ok := os.LookupEnv("SD_MAX_SAMPLE_GAME_DURATION")
	if !ok || maxSampleDurationStr == "" {
		return makeError(fmt.Errorf("SD_MAX_SAMPLE_GAME_DURATION environment variable is required but not set"))
	}
	maxSampleDuration, err := strconv.ParseInt(maxSampleDurationStr, 10, 64)
	if err != nil {
		return makeError(fmt.Errorf("invalid SD_MAX_SAMPLE_GAME_DURATION: %w", err))
	}
	if maxSampleDuration <= 0 {
		return makeError(fmt.Errorf("SD_MAX_SAMPLE_GAME_DURATION must be a positive integer, got: %d", maxSampleDuration))
	}
	Config.MaxSampleGameDuration = maxSampleDuration
	fmt.Printf("Using max sample game duration from SD_MAX_SAMPLE_GAME_DURATION: %d seconds\n", maxSampleDuration)

	return nil
}
