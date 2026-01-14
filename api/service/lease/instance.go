// Package lease provides distributed polling lease coordination across API instances.
package lease

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"api/pkg/db/key_value"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

// instanceBootTime captures the process start time once at package initialization.
var instanceBootTime = time.Now().UnixNano()

// nodeKeyPrefix is the Redis key prefix for instance heartbeat keys.
const nodeKeyPrefix = "poll:node:"

// HeartbeatData represents the JSON data stored in heartbeat keys.
// Node self-reports its status to the cluster.
type HeartbeatData struct {
	Status      string    `json:"status"`       // Current status: "init" or "online"
	StartupTime time.Time `json:"startup_time"` // When this instance started (for tracking)
}

// GenerateInstanceID creates a unique identifier for this API instance.
// If nodeName is provided (non-empty), uses it directly instead of generating.
// Otherwise generates: {hostname}-{bootTimestamp}-{randomSuffix}
// Example: api-7fd8c9-1736598400000000000-a1b2c3d4
//
// The auto-generated ID is globally unique and never reused across process restarts because:
// - hostname identifies the machine/container
// - bootTimestamp is nanosecond-precision process start time
// - randomSuffix adds 8 hex chars from a UUID for collision resistance
func GenerateInstanceID(nodeName string) string {
	// If custom node name provided, use it directly
	if nodeName != "" {
		return nodeName
	}

	// Generate unique ID
	hostname, err := os.Hostname()
	if err != nil {
		hostname = "unknown"
	}

	randomSuffix := uuid.New().String()[:8]

	return fmt.Sprintf("%s-%d-%s", hostname, instanceBootTime, randomSuffix)
}

// nodeKey returns the Redis key for an instance's heartbeat.
func nodeKey(instanceID string) string {
	return nodeKeyPrefix + instanceID
}

// RegisterHeartbeat registers this instance in Redis by setting the heartbeat key with TTL.
// This should be called once when the instance starts with "init" status.
// The heartbeat key pattern is poll:node:{instanceID} with heartbeat data as JSON value.
func RegisterHeartbeat(ctx context.Context, client *key_value.Client, instanceID string, ttl time.Duration) error {
	key := nodeKey(instanceID)
	data := HeartbeatData{
		Status:      "init",
		StartupTime: time.Now(),
	}
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("marshal heartbeat data: %w", err)
	}
	return client.RedisClient.Set(ctx, key, jsonData, ttl).Err()
}

// RefreshHeartbeat refreshes the TTL on an existing heartbeat key with the current status.
// This should be called periodically (every HeartbeatInterval) to maintain presence.
// The node self-reports its current status ("init" or "online").
func RefreshHeartbeat(ctx context.Context, client *key_value.Client, instanceID string, status string, startupTime time.Time, ttl time.Duration) error {
	key := nodeKey(instanceID)
	data := HeartbeatData{
		Status:      status,
		StartupTime: startupTime,
	}
	jsonData, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("marshal heartbeat data: %w", err)
	}
	return client.RedisClient.Set(ctx, key, jsonData, ttl).Err()
}

// RemoveHeartbeat removes the heartbeat key for this instance.
// This should be called during graceful shutdown.
func RemoveHeartbeat(ctx context.Context, client *key_value.Client, instanceID string) error {
	key := nodeKey(instanceID)
	return client.RedisClient.Del(ctx, key).Err()
}

// GetLiveNodes returns all instance IDs with active heartbeats.
// Uses Redis SCAN to iterate over poll:node:* keys without blocking.
// Returns the instance IDs extracted from the key names (stripping the prefix).
func GetLiveNodes(ctx context.Context, client *key_value.Client) ([]string, error) {
	pattern := nodeKeyPrefix + "*"
	var instanceIDs []string

	iter := client.RedisClient.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()
		instanceID := key[len(nodeKeyPrefix):]
		instanceIDs = append(instanceIDs, instanceID)
	}

	if err := iter.Err(); err != nil {
		return nil, fmt.Errorf("scan poll:node:* keys: %w", err)
	}

	return instanceIDs, nil
}

// GetNodeStatus reads the node's self-reported status from Redis.
// Returns "init", "online", or "offline".
func GetNodeStatus(ctx context.Context, client *key_value.Client, instanceID string) (string, error) {
	key := nodeKey(instanceID)
	val, err := client.RedisClient.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			// Node doesn't exist (heartbeat expired)
			return "offline", nil
		}
		return "", fmt.Errorf("get heartbeat: %w", err)
	}

	// Parse JSON heartbeat data
	var data HeartbeatData
	if err := json.Unmarshal([]byte(val), &data); err != nil {
		return "", fmt.Errorf("unmarshal heartbeat data: %w", err)
	}

	return data.Status, nil
}
