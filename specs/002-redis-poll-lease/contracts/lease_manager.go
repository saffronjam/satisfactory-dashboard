// Package contracts defines the interface contracts for the distributed polling lease system.
// This file serves as the design contract; actual implementation goes in api/service/lease/.
package contracts

import (
	"context"
	"time"
)

// LeaseManager coordinates distributed polling leases across API instances.
// It ensures each session is polled by exactly one instance at a time.
type LeaseManager interface {
	// Start begins the heartbeat and lease management background loops.
	// Must be called before any other methods.
	// Returns error if Redis connection fails.
	Start(ctx context.Context) error

	// Stop releases all owned leases and stops background loops.
	// Should be called during graceful shutdown.
	Stop() error

	// TryAcquire attempts to acquire a lease for the given session.
	// Returns (true, nil) if lease acquired or already owned by this instance.
	// Returns (false, nil) if lease is owned by another instance.
	// Returns (false, error) if Redis operation fails.
	TryAcquire(ctx context.Context, sessionID string) (bool, error)

	// Release voluntarily releases a lease for the given session.
	// Only succeeds if this instance owns the lease.
	// Returns nil even if lease was not owned (idempotent).
	// Returns error only on Redis failure.
	Release(ctx context.Context, sessionID string) error

	// IsOwned checks if this instance currently owns the lease for the given session.
	// Uses cached state; does not query Redis.
	// Returns false if lease state is uncertain (renewal failed).
	IsOwned(sessionID string) bool

	// IsOwnedStrict checks lease ownership by querying Redis.
	// Use before critical operations when cached state might be stale.
	IsOwnedStrict(ctx context.Context, sessionID string) (bool, error)

	// OwnedSessions returns session IDs for all leases owned by this instance.
	// Uses cached state.
	OwnedSessions() []string

	// GetLiveNodes returns instance IDs of all instances with active heartbeats.
	// Queries Redis SCAN for poll:node:* keys.
	GetLiveNodes(ctx context.Context) ([]string, error)

	// PreferredOwner determines which instance should own the given session
	// based on rendezvous hashing of currently live nodes.
	// Returns this instance's ID if it is the preferred owner.
	PreferredOwner(ctx context.Context, sessionID string) (string, error)

	// IsPreferredOwner returns true if this instance is the preferred owner
	// for the given session based on current live nodes.
	IsPreferredOwner(ctx context.Context, sessionID string) (bool, error)

	// InstanceID returns this instance's unique identifier.
	InstanceID() string
}

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
	LeaseEventAcquired      LeaseEventType = "acquired"
	LeaseEventAcquireFailed LeaseEventType = "acquire_failed"
	LeaseEventRenewed       LeaseEventType = "renewed"
	LeaseEventRenewFailed   LeaseEventType = "renew_failed"
	LeaseEventReleased      LeaseEventType = "released"
	LeaseEventExpired       LeaseEventType = "expired"
	LeaseEventTakenOver     LeaseEventType = "taken_over"
)

// LeaseEvent represents a lease lifecycle event for structured logging.
type LeaseEvent struct {
	Type       LeaseEventType
	SessionID  string
	InstanceID string
	Timestamp  time.Time
	Error      error // nil for successful events
}
