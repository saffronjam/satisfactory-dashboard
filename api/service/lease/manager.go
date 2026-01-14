// Package lease provides distributed polling lease coordination across API instances.
package lease

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"api/pkg/db/key_value"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
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

	// IsUncertain checks if the lease for the given session is in an uncertain state.
	// An uncertain state means renewal failed but the lease may still be valid.
	// Polling should pause (not stop) when uncertain until state is confirmed.
	IsUncertain(sessionID string) bool

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

	// GetLeaseInfo returns detailed information about a lease owned by this instance.
	// Returns nil if the lease is not owned by this instance.
	GetLeaseInfo(sessionID string) *LeaseInfo

	// GetLeaseOwner queries Redis to get the current owner of a lease.
	// Returns empty string if the lease is not currently owned by any instance.
	// Returns error if Redis query fails.
	GetLeaseOwner(ctx context.Context, sessionID string) (string, error)

	// CheckNodeReady checks if a specific node is in "online" status and ready.
	// Returns true if the node's self-reported status is "online", false otherwise.
	CheckNodeReady(ctx context.Context, instanceID string) (bool, error)

	// GetLeaseValue queries Redis to get the full lease value including timestamps.
	// Returns RedisLeaseValue with owner ID and timestamps, or error if not found.
	// Expects JSON format as returned by RedisLeaseValue.Marshal().
	GetLeaseValue(ctx context.Context, sessionID string) (RedisLeaseValue, error)
}

// leaseKeyPrefix is the Redis key prefix for session lease keys.
const leaseKeyPrefix = "poll:lease:"

// leaseManager is the concrete implementation of LeaseManager.
type leaseManager struct {
	instanceID string
	client     *key_value.Client
	config     LeaseConfig
	logger     *zap.Logger

	// Self-reported status tracking
	status      string        // Current status: "init" or "online"
	startupTime time.Time     // When this instance started
	statusMu    sync.RWMutex  // Protects status field

	// ownedLeases tracks leases currently held by this instance.
	// Map key is sessionID, value is LeaseInfo.
	ownedLeases map[string]LeaseInfo
	mu          sync.RWMutex

	// cachedNodes is the periodically refreshed list of live node IDs.
	// Used by rendezvous hashing to avoid querying Redis on every call.
	cachedNodes   []string
	cachedNodesMu sync.RWMutex

	// Lifecycle management
	ctx    context.Context
	cancel context.CancelFunc
	wg     sync.WaitGroup
}

// NewLeaseManager creates a new LeaseManager with the given Redis client and configuration.
// If nodeName is provided (non-empty), it will be used as the instance ID.
// Otherwise, the instance ID is generated automatically to ensure uniqueness across process restarts.
// Call Start() to begin heartbeat and lease management loops.
func NewLeaseManager(client *key_value.Client, config LeaseConfig, logger *zap.Logger, nodeName string) LeaseManager {
	return &leaseManager{
		instanceID:  GenerateInstanceID(nodeName),
		client:      client,
		config:      config,
		logger:      logger.Named("lease"),
		status:      "init",
		startupTime: time.Now(),
		ownedLeases: make(map[string]LeaseInfo),
	}
}

// NewLeaseManagerWithID creates a new LeaseManager with a specific instance ID.
// This is primarily useful for testing where a predictable ID is needed.
func NewLeaseManagerWithID(instanceID string, client *key_value.Client, config LeaseConfig, logger *zap.Logger) LeaseManager {
	return &leaseManager{
		instanceID:  instanceID,
		client:      client,
		config:      config,
		logger:      logger.Named("lease"),
		status:      "init",
		startupTime: time.Now(),
		ownedLeases: make(map[string]LeaseInfo),
	}
}

// InstanceID returns this instance's unique identifier.
func (m *leaseManager) InstanceID() string {
	return m.instanceID
}

// IsReady returns true if this instance is in "online" status and ready
// to accept new leases and participate in rebalancing.
func (m *leaseManager) IsReady() bool {
	m.statusMu.RLock()
	defer m.statusMu.RUnlock()
	return m.status == "online"
}

// GetLeaseInfo returns detailed information about a lease owned by this instance.
// Returns nil if the lease is not owned by this instance.
func (m *leaseManager) GetLeaseInfo(sessionID string) *LeaseInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if info, exists := m.ownedLeases[sessionID]; exists {
		infoCopy := info
		return &infoCopy
	}
	return nil
}

// GetLeaseOwner queries Redis to get the current owner of a lease.
// Returns empty string if the lease is not currently owned by any instance.
// Returns error if Redis query fails.
func (m *leaseManager) GetLeaseOwner(ctx context.Context, sessionID string) (string, error) {
	key := leaseKey(sessionID)
	value, err := m.client.Get(key)
	if err != nil {
		if errors.Is(err, redis.Nil) {
			// Key doesn't exist - no owner
			return "", nil
		}
		return "", fmt.Errorf("get lease owner: %w", err)
	}

	// Parse lease value (handles both old and new format)
	leaseValue, err := ParseRedisLeaseValue(value)
	if err != nil {
		return "", fmt.Errorf("parse lease value: %w", err)
	}

	return leaseValue.OwnerID, nil
}

// CheckNodeReady checks if a specific node is in "online" status and ready.
// Returns true if the node's self-reported status is "online", false otherwise.
func (m *leaseManager) CheckNodeReady(ctx context.Context, instanceID string) (bool, error) {
	status, err := GetNodeStatus(ctx, m.client, instanceID)
	if err != nil {
		return false, err
	}
	return status == "online", nil
}

// GetLeaseValue queries Redis to get the full lease value including timestamps.
// Returns RedisLeaseValue with owner ID and timestamps.
// Backward compatible: handles both old format (plain instanceID) and new format (JSON).
func (m *leaseManager) GetLeaseValue(ctx context.Context, sessionID string) (RedisLeaseValue, error) {
	key := leaseKey(sessionID)
	value, err := m.client.RedisClient.Get(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			// Key doesn't exist - return empty value
			return RedisLeaseValue{}, nil
		}
		return RedisLeaseValue{}, fmt.Errorf("get lease value: %w", err)
	}

	// Parse lease value (handles both old and new format)
	leaseValue, err := ParseRedisLeaseValue(value)
	if err != nil {
		return RedisLeaseValue{}, fmt.Errorf("parse lease value: %w", err)
	}

	return leaseValue, nil
}

// leaseKey returns the Redis key for a session's polling lease.
func leaseKey(sessionID string) string {
	return leaseKeyPrefix + sessionID
}

// Start begins the heartbeat and lease management background loops.
// It registers the initial heartbeat, performs initial node discovery, and starts four background goroutines:
// 1. Status transition loop: transitions from "init" to "online" after 10 seconds
// 2. Heartbeat loop: refreshes this instance's presence in Redis
// 3. Renewal loop: renews all owned leases to prevent TTL expiry
// 4. Node discovery loop: refreshes the cached list of live nodes for rendezvous hashing
// Must be called before any lease operations. Returns error if initial heartbeat fails.
func (m *leaseManager) Start(ctx context.Context) error {
	// Register initial heartbeat with "init" status
	if err := RegisterHeartbeat(ctx, m.client, m.instanceID, m.config.HeartbeatTTL); err != nil {
		return fmt.Errorf("register initial heartbeat: %w", err)
	}

	m.ctx, m.cancel = context.WithCancel(context.Background())

	if err := m.refreshCachedNodes(); err != nil {
		m.logger.Warn("initial node discovery failed",
			zap.String("instance_id", m.instanceID),
			zap.Error(err),
		)
	}

	m.logger.Info("lease manager started",
		zap.String("instance_id", m.instanceID),
		zap.Duration("heartbeat_interval", m.config.HeartbeatInterval),
		zap.Duration("renewal_interval", m.config.RenewalInterval),
		zap.Duration("node_discovery_interval", m.config.NodeDiscoveryInterval),
	)

	// Start status transition loop first
	m.wg.Add(1)
	go m.statusTransitionLoop()

	// Start other background loops
	m.wg.Add(3)
	go m.heartbeatLoop()
	go m.renewalLoop()
	go m.nodeDiscoveryLoop()

	return nil
}

// statusTransitionLoop waits for the grace period (10 seconds) then transitions
// this instance from "init" to "online" status. During "init" phase, the node
// keeps existing leases but cannot acquire new ones. After transition to "online",
// the node can participate fully in lease acquisition and rebalancing.
func (m *leaseManager) statusTransitionLoop() {
	defer m.wg.Done()

	// Wait for 10 seconds grace period
	gracePeriod := 10 * time.Second
	timer := time.NewTimer(gracePeriod)
	defer timer.Stop()

	select {
	case <-m.ctx.Done():
		return
	case <-timer.C:
		// Transition from "init" to "online"
		m.statusMu.Lock()
		m.status = "online"
		m.statusMu.Unlock()

		m.logger.Info("node status transitioned to online",
			zap.String("instance_id", m.instanceID),
			zap.Duration("grace_period", gracePeriod),
		)
	}
}

// heartbeatLoop periodically refreshes this instance's heartbeat in Redis.
// Reports the current self-reported status ("init" or "online") to the cluster.
func (m *leaseManager) heartbeatLoop() {
	defer m.wg.Done()

	ticker := time.NewTicker(m.config.HeartbeatInterval)
	defer ticker.Stop()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			// Read current status
			m.statusMu.RLock()
			currentStatus := m.status
			m.statusMu.RUnlock()

			// Refresh heartbeat with current status
			if err := RefreshHeartbeat(m.ctx, m.client, m.instanceID, currentStatus, m.startupTime, m.config.HeartbeatTTL); err != nil {
				m.logger.Warn("heartbeat refresh failed",
					zap.String("instance_id", m.instanceID),
					zap.Error(err),
				)
			}
		}
	}
}

// nodeDiscoveryLoop periodically refreshes the cached list of live nodes.
// This enables rendezvous hashing to use a consistent view of the cluster
// without querying Redis on every preferred owner calculation.
func (m *leaseManager) nodeDiscoveryLoop() {
	defer m.wg.Done()

	ticker := time.NewTicker(m.config.NodeDiscoveryInterval)
	defer ticker.Stop()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			if err := m.refreshCachedNodes(); err != nil {
				m.logger.Warn("node discovery refresh failed",
					zap.String("instance_id", m.instanceID),
					zap.Error(err),
				)
			}
		}
	}
}

// refreshCachedNodes queries Redis for live nodes and updates the cache.
func (m *leaseManager) refreshCachedNodes() error {
	nodes, err := GetLiveNodes(m.ctx, m.client)
	if err != nil {
		return err
	}

	m.cachedNodesMu.Lock()
	m.cachedNodes = nodes
	m.cachedNodesMu.Unlock()

	m.logger.Debug("node discovery refreshed",
		zap.String("instance_id", m.instanceID),
		zap.Int("node_count", len(nodes)),
		zap.Strings("nodes", nodes),
	)

	return nil
}

// getCachedNodes returns the current cached list of live nodes.
// Falls back to querying Redis if cache is empty.
func (m *leaseManager) getCachedNodes(ctx context.Context) ([]string, error) {
	m.cachedNodesMu.RLock()
	nodes := m.cachedNodes
	m.cachedNodesMu.RUnlock()

	if len(nodes) > 0 {
		return nodes, nil
	}

	return GetLiveNodes(ctx, m.client)
}

// renewalLoop periodically renews all leases owned by this instance,
// attempts to re-acquire uncertain leases, and releases leases when
// this instance is no longer the preferred owner.
func (m *leaseManager) renewalLoop() {
	defer m.wg.Done()

	ticker := time.NewTicker(m.config.RenewalInterval)
	defer ticker.Stop()

	for {
		select {
		case <-m.ctx.Done():
			return
		case <-ticker.C:
			m.renewOwnedLeases()
			m.reacquireUncertainLeases()
			m.releaseNonPreferredLeases()
		}
	}
}

// renewOwnedLeases iterates over all owned leases and renews them.
func (m *leaseManager) renewOwnedLeases() {
	m.mu.RLock()
	sessionIDs := make([]string, 0, len(m.ownedLeases))
	for sessionID := range m.ownedLeases {
		sessionIDs = append(sessionIDs, sessionID)
	}
	m.mu.RUnlock()

	for _, sessionID := range sessionIDs {
		if err := m.renewLease(sessionID); err != nil {
			m.logger.Warn("lease renewal failed",
				zap.String("session_id", sessionID),
				zap.String("instance_id", m.instanceID),
				zap.Error(err),
			)
		}
	}
}

// reacquireUncertainLeases attempts to re-acquire leases that are in uncertain state.
// For each uncertain lease, it checks if this instance still owns it in Redis.
// If owned, renews the lease and restores it to owned state.
// If not owned (another instance has it or it expired), removes it from tracked leases.
func (m *leaseManager) reacquireUncertainLeases() {
	uncertainLeases := m.UncertainLeases()
	if len(uncertainLeases) == 0 {
		return
	}

	for _, info := range uncertainLeases {
		m.tryReacquireLease(info.SessionID)
	}
}

// tryReacquireLease attempts to re-acquire a single uncertain lease.
// It first checks if this instance still owns the lease in Redis.
// If yes, it renews the lease. If no (expired or taken by another), removes it from tracking.
func (m *leaseManager) tryReacquireLease(sessionID string) {
	key := leaseKey(sessionID)

	value, err := m.client.RedisClient.Get(m.ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			m.removeLeaseLocked(sessionID)
			return
		}
		m.logger.Warn("failed to check lease owner during re-acquisition",
			zap.String("session_id", sessionID),
			zap.String("instance_id", m.instanceID),
			zap.Error(err),
		)
		return
	}

	// Parse lease value (handles both old and new format)
	leaseValue, err := ParseRedisLeaseValue(value)
	if err != nil {
		m.logger.Warn("failed to parse lease value during re-acquisition",
			zap.String("session_id", sessionID),
			zap.String("instance_id", m.instanceID),
			zap.Error(err),
		)
		m.removeLeaseLocked(sessionID)
		return
	}

	if leaseValue.OwnerID == m.instanceID {
		// Get current acquired time (preserve it across renewals)
		m.mu.RLock()
		acquiredAt := m.ownedLeases[sessionID].AcquiredAt
		m.mu.RUnlock()

		// Create JSON lease value with updated lastRenewedAt
		now := time.Now()
		newLeaseValue := RedisLeaseValue{
			OwnerID:       m.instanceID,
			AcquiredAt:    acquiredAt,
			LastRenewedAt: now,
		}
		valueStr, err := newLeaseValue.Marshal()
		if err != nil {
			m.logger.Warn("failed to marshal lease value during re-acquisition",
				zap.String("session_id", sessionID),
				zap.String("instance_id", m.instanceID),
				zap.Error(err),
			)
			return
		}

		ttlMs := m.config.LeaseTTL.Milliseconds()
		result, err := renewScript.Run(m.ctx, m.client.RedisClient, []string{key}, m.instanceID, ttlMs, valueStr).Int()
		if err != nil {
			m.logger.Warn("failed to renew lease during re-acquisition",
				zap.String("session_id", sessionID),
				zap.String("instance_id", m.instanceID),
				zap.Error(err),
			)
			return
		}

		if result == 1 {
			m.mu.Lock()
			info, exists := m.ownedLeases[sessionID]
			if exists {
				now := time.Now()
				info.State = LeaseStateOwned
				info.LastRenewedAt = now
				info.UncertainSince = time.Time{}
				m.ownedLeases[sessionID] = info

				m.logger.Info("lease re-acquired from uncertain state",
					zap.String("session_id", sessionID),
					zap.String("instance_id", m.instanceID),
				)
			}
			m.mu.Unlock()
		} else {
			m.removeLeaseLocked(sessionID)
		}
	} else {
		m.removeLeaseLocked(sessionID)
	}
}

// releaseNonPreferredLeases voluntarily releases leases where this instance
// is no longer the preferred owner. This enables faster rebalancing when
// new instances join the cluster. Per FR-015, non-preferred owners should
// release leases so the preferred owner can acquire them promptly.
func (m *leaseManager) releaseNonPreferredLeases() {
	m.mu.RLock()
	sessionIDs := make([]string, 0, len(m.ownedLeases))
	for sessionID, info := range m.ownedLeases {
		if info.State == LeaseStateOwned {
			sessionIDs = append(sessionIDs, sessionID)
		}
	}
	m.mu.RUnlock()

	if len(sessionIDs) == 0 {
		return
	}

	for _, sessionID := range sessionIDs {
		isPreferred, err := m.IsPreferredOwner(m.ctx, sessionID)
		if err != nil {
			m.logger.Warn("failed to check preferred owner during rebalance",
				zap.String("session_id", sessionID),
				zap.String("instance_id", m.instanceID),
				zap.Error(err),
			)
			continue
		}

		if !isPreferred {
			// Check if preferred owner is online before releasing
			// This prevents churning when new instances are still in "init" phase
			preferredOwner, err := m.PreferredOwner(m.ctx, sessionID)
			if err != nil {
				m.logger.Warn("failed to get preferred owner during rebalance",
					zap.String("session_id", sessionID),
					zap.String("instance_id", m.instanceID),
					zap.Error(err),
				)
				continue
			}

			// Check preferred owner's self-reported status
			preferredStatus, err := GetNodeStatus(m.ctx, m.client, preferredOwner)
			if err != nil || preferredStatus != "online" {
				m.logger.Debug("preferred owner not online, keeping lease",
					zap.String("session_id", sessionID),
					zap.String("instance_id", m.instanceID),
					zap.String("preferred_owner", preferredOwner),
					zap.String("preferred_status", preferredStatus),
				)
				continue
			}

			// Preferred owner is online, release this lease
			if err := m.Release(m.ctx, sessionID); err != nil {
				m.logger.Warn("failed to voluntarily release non-preferred lease",
					zap.String("session_id", sessionID),
					zap.String("instance_id", m.instanceID),
					zap.Error(err),
				)
				continue
			}

			m.logger.Info("lease released for rebalancing",
				zap.String("session_id", sessionID),
				zap.String("instance_id", m.instanceID),
				zap.String("preferred_owner", preferredOwner),
				zap.String("reason", "not_preferred_owner"),
			)
		}
	}
}

// removeLeaseLocked removes a lease from tracking when it's no longer owned.
// This is called when a lease expired via TTL or was taken by another instance.
// Logs the removal for observability per FR-021.
func (m *leaseManager) removeLeaseLocked(sessionID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.ownedLeases[sessionID]; exists {
		delete(m.ownedLeases, sessionID)
		m.logger.Info("lease released",
			zap.String("session_id", sessionID),
			zap.String("instance_id", m.instanceID),
			zap.String("reason", "ttl_expiry"),
		)
	}
}

// renewLease renews a single lease using the atomic Lua script.
// On success, resets the lease state to owned. On failure, marks the lease as uncertain
// with a timestamp for tracking how long it has been in that state.
func (m *leaseManager) renewLease(sessionID string) error {
	key := leaseKey(sessionID)
	ttlMs := m.config.LeaseTTL.Milliseconds()
	now := time.Now()

	// Get current acquired time (preserve it across renewals)
	m.mu.RLock()
	acquiredAt := m.ownedLeases[sessionID].AcquiredAt
	m.mu.RUnlock()

	// Create JSON lease value with updated lastRenewedAt
	leaseValue := RedisLeaseValue{
		OwnerID:       m.instanceID,
		AcquiredAt:    acquiredAt,
		LastRenewedAt: now,
	}
	valueStr, err := leaseValue.Marshal()
	if err != nil {
		return fmt.Errorf("marshal lease value: %w", err)
	}

	result, err := renewScript.Run(m.ctx, m.client.RedisClient, []string{key}, m.instanceID, ttlMs, valueStr).Int()
	if err != nil {
		m.markLeaseUncertain(sessionID)
		return fmt.Errorf("run renew script: %w", err)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	info, exists := m.ownedLeases[sessionID]
	if !exists {
		return nil
	}

	if result == 1 {
		now := time.Now()
		info.LastRenewedAt = now
		info.State = LeaseStateOwned
		info.UncertainSince = time.Time{}
		m.ownedLeases[sessionID] = info

		m.logger.Debug("lease renewed",
			zap.String("session_id", sessionID),
			zap.String("instance_id", m.instanceID),
			zap.Duration("ttl", m.config.LeaseTTL),
		)
	} else {
		m.markLeaseUncertainLocked(sessionID, &info)
		return fmt.Errorf("lease no longer owned by this instance")
	}

	return nil
}

// markLeaseUncertain marks a lease as uncertain when renewal fails.
// This is used when we cannot confirm lease ownership (e.g., Redis error).
func (m *leaseManager) markLeaseUncertain(sessionID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	info, exists := m.ownedLeases[sessionID]
	if !exists {
		return
	}
	m.markLeaseUncertainLocked(sessionID, &info)
}

// markLeaseUncertainLocked marks a lease as uncertain. Caller must hold m.mu lock.
// Only sets UncertainSince if transitioning from a non-uncertain state.
func (m *leaseManager) markLeaseUncertainLocked(sessionID string, info *LeaseInfo) {
	if info.State != LeaseStateUncertain {
		info.UncertainSince = time.Now()
	}
	info.State = LeaseStateUncertain
	m.ownedLeases[sessionID] = *info

	m.logger.Warn("lease state uncertain",
		zap.String("session_id", sessionID),
		zap.String("instance_id", m.instanceID),
		zap.Time("uncertain_since", info.UncertainSince),
	)
}

// Stop releases all owned leases and stops background loops.
// Should be called during graceful shutdown. First releases all owned leases,
// then removes the heartbeat, and finally stops the background goroutines.
func (m *leaseManager) Stop() error {
	if m.cancel == nil {
		return nil
	}

	m.mu.RLock()
	sessionIDs := make([]string, 0, len(m.ownedLeases))
	for sessionID := range m.ownedLeases {
		sessionIDs = append(sessionIDs, sessionID)
	}
	m.mu.RUnlock()

	ctx := context.Background()
	for _, sessionID := range sessionIDs {
		key := leaseKey(sessionID)
		result, err := releaseScript.Run(ctx, m.client.RedisClient, []string{key}, m.instanceID).Int()
		if err != nil {
			m.logger.Warn("failed to release lease during shutdown",
				zap.String("session_id", sessionID),
				zap.String("instance_id", m.instanceID),
				zap.Error(err),
			)
		} else if result == 1 {
			m.logger.Info("lease released",
				zap.String("session_id", sessionID),
				zap.String("instance_id", m.instanceID),
				zap.String("reason", "shutdown"),
			)
		}
	}

	m.mu.Lock()
	m.ownedLeases = make(map[string]LeaseInfo)
	m.mu.Unlock()

	if err := RemoveHeartbeat(ctx, m.client, m.instanceID); err != nil {
		m.logger.Warn("failed to remove heartbeat during shutdown",
			zap.String("instance_id", m.instanceID),
			zap.Error(err),
		)
	}

	m.cancel()
	m.wg.Wait()

	m.logger.Info("lease manager stopped",
		zap.String("instance_id", m.instanceID),
		zap.Int("leases_released", len(sessionIDs)),
	)

	return nil
}

// TryAcquire attempts to acquire a lease for the given session.
// Uses SET NX PX for atomic acquisition. Returns (true, nil) if lease was acquired
// or already owned by this instance. Returns (false, nil) if another instance owns it.
// Preferred owners (determined by rendezvous hashing) always attempt acquisition.
// Non-preferred owners only acquire as fallback when the lease is unowned.
func (m *leaseManager) TryAcquire(ctx context.Context, sessionID string) (bool, error) {
	m.mu.RLock()
	info, alreadyOwned := m.ownedLeases[sessionID]
	if alreadyOwned && info.State == LeaseStateOwned {
		m.mu.RUnlock()
		return true, nil
	}
	m.mu.RUnlock()

	// Don't acquire new leases during "init" phase
	// This prevents session churning when instances restart
	if !m.IsReady() {
		m.statusMu.RLock()
		currentStatus := m.status
		m.statusMu.RUnlock()

		m.logger.Debug("not ready to acquire lease (init phase)",
			zap.String("session_id", sessionID),
			zap.String("instance_id", m.instanceID),
			zap.String("status", currentStatus),
		)
		return false, nil
	}

	isPreferred, err := m.IsPreferredOwner(ctx, sessionID)
	if err != nil {
		m.logger.Warn("failed to check preferred owner status",
			zap.String("session_id", sessionID),
			zap.String("instance_id", m.instanceID),
			zap.Error(err),
		)
	}

	if !isPreferred {
		key := leaseKey(sessionID)
		currentValue, err := m.client.RedisClient.Get(ctx, key).Result()
		if err == nil && currentValue != "" {
			// Parse lease value to get owner (handles both old and new format)
			leaseValue, parseErr := ParseRedisLeaseValue(currentValue)
			if parseErr == nil && leaseValue.OwnerID != "" {
				m.logger.Debug("lease not acquired, non-preferred owner deferring to current holder",
					zap.String("session_id", sessionID),
					zap.String("instance_id", m.instanceID),
					zap.String("current_owner", leaseValue.OwnerID),
				)
				return false, nil
			}
		}
	}

	key := leaseKey(sessionID)
	now := time.Now()

	// Create JSON lease value with timestamps
	leaseValue := RedisLeaseValue{
		OwnerID:       m.instanceID,
		AcquiredAt:    now,
		LastRenewedAt: now,
	}
	valueStr, err := leaseValue.Marshal()
	if err != nil {
		return false, fmt.Errorf("marshal lease value: %w", err)
	}

	acquired, err := m.client.RedisClient.SetNX(ctx, key, valueStr, m.config.LeaseTTL).Result()
	if err != nil {
		m.logger.Warn("lease acquire failed",
			zap.String("session_id", sessionID),
			zap.String("instance_id", m.instanceID),
			zap.Error(err),
		)
		return false, fmt.Errorf("acquire lease: %w", err)
	}

	if acquired {
		m.mu.Lock()
		m.ownedLeases[sessionID] = LeaseInfo{
			SessionID:     sessionID,
			OwnerID:       m.instanceID,
			State:         LeaseStateOwned,
			AcquiredAt:    now,
			LastRenewedAt: now,
		}
		m.mu.Unlock()

		m.logger.Info("lease acquired",
			zap.String("session_id", sessionID),
			zap.String("instance_id", m.instanceID),
			zap.Bool("is_preferred_owner", isPreferred),
		)
		return true, nil
	}

	m.logger.Debug("lease not acquired, owned by another instance",
		zap.String("session_id", sessionID),
		zap.String("instance_id", m.instanceID),
	)
	return false, nil
}

// Release voluntarily releases a lease for the given session.
// Uses Lua script for atomic conditional DEL - only deletes if this instance owns the lease.
// Returns nil if release succeeded or if this instance did not own the lease (idempotent).
// Returns error only on Redis operation failure.
func (m *leaseManager) Release(ctx context.Context, sessionID string) error {
	key := leaseKey(sessionID)

	result, err := releaseScript.Run(ctx, m.client.RedisClient, []string{key}, m.instanceID).Int()
	if err != nil {
		return fmt.Errorf("release lease: %w", err)
	}

	m.mu.Lock()
	delete(m.ownedLeases, sessionID)
	m.mu.Unlock()

	if result == 1 {
		m.logger.Info("lease released",
			zap.String("session_id", sessionID),
			zap.String("instance_id", m.instanceID),
			zap.String("reason", "voluntary"),
		)
	}

	return nil
}

// IsOwned checks if this instance currently owns the lease for the given session.
// Uses cached state; does not query Redis. Returns false if the lease is not owned
// or if the lease state is uncertain (e.g., after a renewal failure).
func (m *leaseManager) IsOwned(sessionID string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	info, exists := m.ownedLeases[sessionID]
	if !exists {
		return false
	}
	return info.State == LeaseStateOwned
}

// IsUncertain checks if the lease for the given session is in an uncertain state.
// An uncertain state means renewal failed but the lease may still be valid.
// Returns false if the session is not tracked or is in any other state.
func (m *leaseManager) IsUncertain(sessionID string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()

	info, exists := m.ownedLeases[sessionID]
	if !exists {
		return false
	}
	return info.State == LeaseStateUncertain
}

// OwnedSessions returns session IDs for all leases owned by this instance.
// Uses cached state; only returns sessions with LeaseStateOwned state.
func (m *leaseManager) OwnedSessions() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	sessions := make([]string, 0, len(m.ownedLeases))
	for sessionID, info := range m.ownedLeases {
		if info.State == LeaseStateOwned {
			sessions = append(sessions, sessionID)
		}
	}
	return sessions
}

// UncertainLeases returns LeaseInfo for all leases in uncertain state.
// Used to identify leases that need re-acquisition attempts.
func (m *leaseManager) UncertainLeases() []LeaseInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var uncertain []LeaseInfo
	for _, info := range m.ownedLeases {
		if info.State == LeaseStateUncertain {
			uncertain = append(uncertain, info)
		}
	}
	return uncertain
}

// IsOwnedStrict checks lease ownership by querying Redis directly.
// Use before critical operations when cached state might be stale.
// Returns (true, nil) if this instance owns the lease in Redis.
// Returns (false, nil) if the lease doesn't exist or is owned by another instance.
// Returns (false, error) if Redis operation fails.
func (m *leaseManager) IsOwnedStrict(ctx context.Context, sessionID string) (bool, error) {
	key := leaseKey(sessionID)

	value, err := m.client.RedisClient.Get(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return false, nil
		}
		return false, fmt.Errorf("check lease ownership: %w", err)
	}

	// Parse lease value (handles both old and new format)
	leaseValue, err := ParseRedisLeaseValue(value)
	if err != nil {
		return false, fmt.Errorf("parse lease value: %w", err)
	}

	return leaseValue.OwnerID == m.instanceID, nil
}

// GetLiveNodes returns instance IDs of all instances with active heartbeats.
// Implemented in T006 (delegates to package function).
func (m *leaseManager) GetLiveNodes(ctx context.Context) ([]string, error) {
	return GetLiveNodes(ctx, m.client)
}

// PreferredOwner determines which instance should own the given session
// based on rendezvous hashing of currently live nodes.
// Uses the cached node list for performance; falls back to Redis if cache is empty.
// Returns empty string if no live nodes are found.
func (m *leaseManager) PreferredOwner(ctx context.Context, sessionID string) (string, error) {
	nodes, err := m.getCachedNodes(ctx)
	if err != nil {
		return "", fmt.Errorf("get live nodes: %w", err)
	}

	return ComputePreferredOwner(sessionID, nodes), nil
}

// IsPreferredOwner returns true if this instance is the preferred owner
// for the given session based on rendezvous hashing of current live nodes.
// Uses the cached node list for performance; falls back to Redis if cache is empty.
// Returns (false, nil) if no live nodes are found.
func (m *leaseManager) IsPreferredOwner(ctx context.Context, sessionID string) (bool, error) {
	preferred, err := m.PreferredOwner(ctx, sessionID)
	if err != nil {
		return false, err
	}

	return preferred == m.instanceID, nil
}
