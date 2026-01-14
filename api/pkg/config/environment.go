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

	return nil
}
