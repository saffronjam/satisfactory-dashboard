// Package lease provides distributed polling lease coordination across API instances.
package lease

import (
	"encoding/json"
	"fmt"
	"time"
)

// LeaseState represents the current state of a lease from this instance's perspective.
type LeaseState int

const (
	// LeaseStateUnknown indicates the lease state has not been determined.
	LeaseStateUnknown LeaseState = iota

	// LeaseStateOwned indicates this instance holds the lease.
	LeaseStateOwned

	// LeaseStateOther indicates another instance holds the lease.
	LeaseStateOther

	// LeaseStateUncertain indicates renewal failed and ownership is unclear.
	// Polling should pause until state is confirmed.
	LeaseStateUncertain
)

// String returns a human-readable representation of the lease state.
func (s LeaseState) String() string {
	switch s {
	case LeaseStateOwned:
		return "owned"
	case LeaseStateOther:
		return "other"
	case LeaseStateUncertain:
		return "uncertain"
	default:
		return "unknown"
	}
}

// LeaseInfo contains metadata about a specific lease.
type LeaseInfo struct {
	// SessionID is the session this lease controls.
	SessionID string

	// OwnerID is the instance ID of the current owner (may be empty if unowned).
	OwnerID string

	// State is this instance's view of the lease.
	State LeaseState

	// AcquiredAt is when this instance acquired the lease (zero if not owned).
	AcquiredAt time.Time

	// LastRenewedAt is when this instance last renewed the lease (zero if not owned).
	LastRenewedAt time.Time

	// UncertainSince is when the lease entered uncertain state (zero if not uncertain).
	// Used to track how long a lease has been uncertain for re-acquisition attempts.
	UncertainSince time.Time
}

// LeaseConfig contains configuration for the lease manager.
type LeaseConfig struct {
	// LeaseTTL is the time-to-live for lease keys. Default: 30s.
	LeaseTTL time.Duration

	// RenewalInterval is how often to renew owned leases. Default: 10s (TTL/3).
	RenewalInterval time.Duration

	// HeartbeatTTL is the time-to-live for heartbeat keys. Default: 30s.
	HeartbeatTTL time.Duration

	// HeartbeatInterval is how often to refresh heartbeat. Default: 10s.
	HeartbeatInterval time.Duration

	// NodeDiscoveryInterval is how often to refresh live node list. Default: 10s.
	NodeDiscoveryInterval time.Duration
}

// DefaultLeaseConfig returns the default configuration.
func DefaultLeaseConfig() LeaseConfig {
	return LeaseConfig{
		LeaseTTL:              30 * time.Second,
		RenewalInterval:       10 * time.Second,
		HeartbeatTTL:          30 * time.Second,
		HeartbeatInterval:     10 * time.Second,
		NodeDiscoveryInterval: 10 * time.Second,
	}
}

// LeaseEventType represents the type of lease event for logging.
type LeaseEventType string

const (
	// LeaseEventAcquired indicates a lease was successfully acquired.
	LeaseEventAcquired LeaseEventType = "acquired"

	// LeaseEventAcquireFailed indicates a lease acquisition attempt failed.
	LeaseEventAcquireFailed LeaseEventType = "acquire_failed"

	// LeaseEventRenewed indicates a lease was successfully renewed.
	LeaseEventRenewed LeaseEventType = "renewed"

	// LeaseEventRenewFailed indicates a lease renewal attempt failed.
	LeaseEventRenewFailed LeaseEventType = "renew_failed"

	// LeaseEventReleased indicates a lease was voluntarily released.
	LeaseEventReleased LeaseEventType = "released"

	// LeaseEventExpired indicates a lease expired due to TTL.
	LeaseEventExpired LeaseEventType = "expired"

	// LeaseEventTakenOver indicates another instance took over the lease.
	LeaseEventTakenOver LeaseEventType = "taken_over"
)

// LeaseEvent represents a lease lifecycle event for structured logging.
type LeaseEvent struct {
	// Type is the kind of event that occurred.
	Type LeaseEventType

	// SessionID is the session affected by this event.
	SessionID string

	// InstanceID is the instance involved in this event.
	InstanceID string

	// Timestamp is when the event occurred.
	Timestamp time.Time

	// Error contains the error if this is a failure event (nil for successful events).
	Error error
}

// RedisLeaseValue represents the JSON value stored in Redis lease keys.
// This structure enables storing timestamps alongside owner information,
// allowing all nodes to display lease metadata without being the owner.
type RedisLeaseValue struct {
	// OwnerID is the instance ID that owns this lease.
	OwnerID string `json:"owner_id"`

	// AcquiredAt is when the lease was first acquired.
	AcquiredAt time.Time `json:"acquired_at"`

	// LastRenewedAt is when the lease was last successfully renewed.
	LastRenewedAt time.Time `json:"last_renewed_at"`
}

// Marshal converts the RedisLeaseValue to a JSON string for storage in Redis.
func (v RedisLeaseValue) Marshal() (string, error) {
	data, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// ParseRedisLeaseValue parses a Redis lease value string into a RedisLeaseValue struct.
// Expects JSON format as returned by RedisLeaseValue.Marshal().
func ParseRedisLeaseValue(value string) (RedisLeaseValue, error) {
	var v RedisLeaseValue
	if err := json.Unmarshal([]byte(value), &v); err != nil {
		return RedisLeaseValue{}, fmt.Errorf("parse lease value: %w", err)
	}
	return v, nil
}
