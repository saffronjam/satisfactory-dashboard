// Package lease provides distributed polling lease coordination across API instances.
package lease

import (
	"context"
	"fmt"
	"os"
	"time"

	"api/pkg/db/key_value"

	"github.com/google/uuid"
)

// instanceBootTime captures the process start time once at package initialization.
var instanceBootTime = time.Now().UnixNano()

// nodeKeyPrefix is the Redis key prefix for instance heartbeat keys.
const nodeKeyPrefix = "poll:node:"

// heartbeatValue is the presence indicator stored in heartbeat keys.
const heartbeatValue = "1"

// GenerateInstanceID creates a unique identifier for this API instance.
// Format: {hostname}-{bootTimestamp}-{randomSuffix}
// Example: api-7fd8c9-1736598400000000000-a1b2c3d4
//
// The ID is globally unique and never reused across process restarts because:
// - hostname identifies the machine/container
// - bootTimestamp is nanosecond-precision process start time
// - randomSuffix adds 8 hex chars from a UUID for collision resistance
func GenerateInstanceID() string {
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
// This should be called once when the instance starts.
// The heartbeat key pattern is poll:node:{instanceID} with a presence indicator value.
func RegisterHeartbeat(ctx context.Context, client *key_value.Client, instanceID string, ttl time.Duration) error {
	key := nodeKey(instanceID)
	return client.RedisClient.Set(ctx, key, heartbeatValue, ttl).Err()
}

// RefreshHeartbeat refreshes the TTL on an existing heartbeat key.
// This should be called periodically (every HeartbeatInterval) to maintain presence.
// If the key doesn't exist, it will be created.
func RefreshHeartbeat(ctx context.Context, client *key_value.Client, instanceID string, ttl time.Duration) error {
	key := nodeKey(instanceID)
	return client.RedisClient.Set(ctx, key, heartbeatValue, ttl).Err()
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
