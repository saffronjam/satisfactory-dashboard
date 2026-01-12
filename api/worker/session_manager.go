package worker

import (
	"api/models/models"
	"api/pkg/db/key_value"
	"api/pkg/log"
	"api/service"
	"api/service/client"
	"api/service/lease"
	"api/service/session"
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"
)

// publisherState tracks the state of a session's publisher
type publisherState struct {
	cancel         context.CancelFunc
	isDisconnected bool
}

var (
	globalLeaseManager   lease.LeaseManager
	globalLeaseManagerMu sync.RWMutex
)

// SetGlobalLeaseManager stores the lease manager for access by API handlers.
func SetGlobalLeaseManager(lm lease.LeaseManager) {
	globalLeaseManagerMu.Lock()
	defer globalLeaseManagerMu.Unlock()
	globalLeaseManager = lm
}

// GetGlobalLeaseManager returns the global lease manager instance.
// Returns nil if the lease manager has not been initialized.
func GetGlobalLeaseManager() lease.LeaseManager {
	globalLeaseManagerMu.RLock()
	defer globalLeaseManagerMu.RUnlock()
	return globalLeaseManager
}

// SessionManager manages publishers for multiple sessions
type SessionManager struct {
	store        *session.Store
	kvClient     *key_value.Client
	leaseManager lease.LeaseManager
	publishers   map[string]*publisherState // sessionID -> publisher state
	mu           sync.RWMutex
}

// NewSessionManager creates a new session manager with the given lease manager.
// The lease manager coordinates distributed polling across multiple API instances.
func NewSessionManager(leaseManager lease.LeaseManager) *SessionManager {
	return &SessionManager{
		store:        session.NewStore(),
		kvClient:     key_value.New(),
		leaseManager: leaseManager,
		publishers:   make(map[string]*publisherState),
	}
}

// Start initializes the session manager and starts publishers for existing sessions
func (sm *SessionManager) Start(ctx context.Context) {
	log.Infoln("Starting session manager...")

	// Load existing sessions and start publishers
	sessions, err := sm.store.List()
	if err != nil {
		log.PrettyError(fmt.Errorf("failed to load sessions: %w", err))
		return
	}

	log.Infof("Found %d existing sessions", len(sessions))
	for _, sess := range sessions {
		if !sess.IsPaused {
			sm.StartSession(ctx, sess)
		} else {
			log.Infof("Skipping paused session: %s (%s)", sess.Name, sess.ID)
		}
	}

	// Keep the manager running and periodically check for new sessions
	go sm.watchForNewSessions(ctx)

	<-ctx.Done()
	log.Infoln("Session manager stopped")
}

// watchForNewSessions periodically checks for new sessions that need publishers
func (sm *SessionManager) watchForNewSessions(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			sessions, err := sm.store.List()
			if err != nil {
				log.PrettyError(fmt.Errorf("failed to list sessions: %w", err))
				continue
			}

			sm.mu.RLock()
			for _, sess := range sessions {
				_, isRunning := sm.publishers[sess.ID]

				if sess.IsPaused && isRunning {
					// Session was paused - stop the publisher
					sm.mu.RUnlock()
					log.Infof("Stopping publisher for paused session: %s (%s)", sess.Name, sess.ID)
					sm.StopSession(sess.ID)
					sm.mu.RLock()
				} else if !sess.IsPaused && !isRunning {
					// Session is not paused and not running - start it
					sm.mu.RUnlock()
					sm.StartSession(ctx, sess)
					sm.mu.RLock()
				}
			}

			// Check for deleted sessions
			for sessionID := range sm.publishers {
				found := false
				for _, sess := range sessions {
					if sess.ID == sessionID {
						found = true
						break
					}
				}
				if !found {
					sm.mu.RUnlock()
					sm.StopSession(sessionID)
					sm.mu.RLock()
				}
			}
			sm.mu.RUnlock()
		}
	}
}

// StartSession starts a publisher for the given session if the lease can be acquired.
// The lease manager coordinates distributed polling across multiple API instances,
// ensuring each session is polled by exactly one instance at a time.
func (sm *SessionManager) StartSession(parentCtx context.Context, sess *models.Session) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	// Check if already running
	if _, exists := sm.publishers[sess.ID]; exists {
		log.Warnf("Publisher for session %s already running", sess.ID)
		return
	}

	// Try to acquire the lease before spawning the publisher
	acquired, err := sm.leaseManager.TryAcquire(parentCtx, sess.ID)
	if err != nil {
		log.Warnf("Failed to acquire lease for session %s: %v", sess.ID, err)
		return
	}
	if !acquired {
		log.Debugf("Lease for session %s held by another instance, skipping", sess.ID)
		return
	}

	ctx, cancel := context.WithCancel(parentCtx)
	sm.publishers[sess.ID] = &publisherState{
		cancel:         cancel,
		isDisconnected: sess.IsDisconnected,
	}

	log.Infof("Starting publisher for session: %s (%s)", sess.Name, sess.ID)

	go sm.publishLoop(ctx, sess)
}

// StopSession stops the publisher for the given session
func (sm *SessionManager) StopSession(sessionID string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	if state, exists := sm.publishers[sessionID]; exists {
		state.cancel()
		delete(sm.publishers, sessionID)
		log.Infof("Stopped publisher for session: %s", sessionID)
	}
}

// Stop performs graceful shutdown of the session manager.
// It stops the lease manager, releasing all owned leases and removing the heartbeat,
// allowing other instances to take over polling immediately.
func (sm *SessionManager) Stop() {
	log.Infoln("Stopping session manager...")

	if err := sm.leaseManager.Stop(); err != nil {
		log.Warnf("Failed to stop lease manager: %v", err)
	}

	sm.mu.Lock()
	for sessionID, state := range sm.publishers {
		state.cancel()
		delete(sm.publishers, sessionID)
	}
	sm.mu.Unlock()

	log.Infoln("Session manager stopped gracefully")
}

// publishLoop runs the event publishing loop for a session
func (sm *SessionManager) publishLoop(ctx context.Context, sess *models.Session) {
	channelKey := fmt.Sprintf("%s:%s", models.SatisfactoryEventKey, sess.ID)

	// Create the appropriate client for this session
	var apiClient client.Client
	if sess.IsMock {
		apiClient = service.NewMockClient()
	} else {
		frmClient := service.NewClientWithAddress(sess.Address)

		// Set up disconnection callback
		frmClient.SetDisconnectedCallback(func() {
			log.Infof("Session is offline: %s (%s)", sess.Name, sess.ID)
			sm.transitionToDisconnected(sess.ID)
		})

		apiClient = frmClient
	}

	handler := func(event *models.SatisfactoryEvent) {
		// Check lease ownership before processing each poll result
		if !sm.leaseManager.IsOwned(sess.ID) {
			// Lease is not owned. Check if it's uncertain or lost entirely.
			if sm.leaseManager.IsUncertain(sess.ID) {
				// Lease state is uncertain (renewal failed). Pause polling by
				// skipping this event but keep the publisher running for recovery.
				log.Debugf("Lease uncertain for session %s, pausing poll processing", sess.ID)
				return
			}
			// Lease is not owned and not uncertain - it was taken by another instance
			log.Infof("Lease lost for session %s, stopping publisher", sess.ID)
			sm.StopSession(sess.ID)
			return
		}
		toPublish := []models.SatisfactoryEvent{*event}

		switch event.Type {
		case models.SatisfactoryEventApiStatus:
			// Update session online status
			status := event.Data.(*models.SatisfactoryApiStatus)
			if err := sm.store.UpdateOnlineStatus(sess.ID, status.Running); err != nil {
				log.Warnf("Failed to update session online status: %v", err)
			}

			// Check if we should reconnect (session became online while in disconnected mode)
			if status.Running && sess.IsDisconnected {
				sm.transitionToConnected(sess.ID)
			}
		}

		for _, e := range toPublish {
			asJson, err := json.Marshal(e)
			if err != nil {
				log.PrettyError(fmt.Errorf("failed to marshal event for session %s: %w", sess.ID, err))
				return
			}

			// Cache the event data for /state endpoint (no expiration - updated by polling)
			cacheKey := fmt.Sprintf("state:%s:%s", sess.ID, e.Type)
			eventData, cacheErr := json.Marshal(e.Data)
			if cacheErr == nil {
				if setErr := sm.kvClient.Set(cacheKey, string(eventData), 0); setErr != nil {
					log.Warnf("Failed to cache event %s for session %s: %v", e.Type, sess.ID, setErr)
				}
			}

			// Publish to SSE subscribers
			err = sm.kvClient.Publish(channelKey, asJson)
			if err != nil {
				log.PrettyError(fmt.Errorf("failed to publish event for session %s: %w", sess.ID, err))
			}
		}
	}

	// Start session info monitor in background
	go sm.monitorSessionInfo(ctx, sess, apiClient, channelKey)

	// Verify lease ownership strictly (query Redis) before starting to poll.
	// This ensures we still own the lease after setup, preventing duplicate polling
	// during the window between lease acquisition and poll start.
	owned, err := sm.leaseManager.IsOwnedStrict(ctx, sess.ID)
	if err != nil {
		log.Warnf("Failed to verify lease ownership for session %s: %v", sess.ID, err)
		sm.StopSession(sess.ID)
		return
	}
	if !owned {
		log.Infof("Lease lost before poll start for session %s, stopping publisher", sess.ID)
		sm.StopSession(sess.ID)
		return
	}

	log.Infof("Poll start: instance=%s session=%s", sm.leaseManager.InstanceID(), sess.ID)

	// Choose polling mode based on disconnected state
	if sess.IsDisconnected {
		log.Infof("Starting in disconnected mode: %s (%s)", sess.Name, sess.ID)
		err = apiClient.SetupLightPolling(ctx, handler)
	} else {
		err = apiClient.SetupEventStream(ctx, handler)
	}

	if err != nil {
		log.PrettyError(fmt.Errorf("failed to set up polling for session %s: %w", sess.ID, err))
		// Mark session as offline
		_ = sm.store.UpdateOnlineStatus(sess.ID, false)
		return
	}

	// Wait for context cancellation
	<-ctx.Done()
	log.Infof("Publisher stopped for session: %s (%s)", sess.Name, sess.ID)
}

// monitorSessionInfo periodically fetches session info and publishes updates when changed
func (sm *SessionManager) monitorSessionInfo(ctx context.Context, sess *models.Session, apiClient client.Client, channelKey string) {
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	lastSessionName := sess.SessionName

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			fetchCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
			sessionInfo, err := apiClient.GetSessionInfo(fetchCtx)
			cancel()

			if err != nil {
				log.Debugf("Failed to fetch session info for %s: %v", sess.ID, err)
				continue
			}

			// Check if session name changed
			if sessionInfo.SessionName != lastSessionName {
				log.Infof("Session info changed for %s: %s -> %s", sess.ID, lastSessionName, sessionInfo.SessionName)
				lastSessionName = sessionInfo.SessionName

				// Update in Redis
				currentSession, err := sm.store.Get(sess.ID)
				if err != nil {
					log.Warnf("Failed to get session %s for update: %v", sess.ID, err)
					continue
				}
				if currentSession != nil {
					currentSession.SessionName = sessionInfo.SessionName
					if err := sm.store.Update(currentSession); err != nil {
						log.Warnf("Failed to update session %s: %v", sess.ID, err)
						continue
					}

					// Publish session update event
					event := models.SatisfactoryEvent{
						Type: models.SatisfactoryEventSessionUpdate,
						Data: currentSession,
					}
					asJson, err := json.Marshal(event)
					if err != nil {
						log.Warnf("Failed to marshal session update event: %v", err)
						continue
					}
					if err := sm.kvClient.Publish(channelKey, asJson); err != nil {
						log.Warnf("Failed to publish session update event: %v", err)
					}
				}
			}
		}
	}
}

// transitionToDisconnected marks a session as disconnected and restarts in light polling mode
func (sm *SessionManager) transitionToDisconnected(sessionID string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	sess, err := sm.store.Get(sessionID)
	if err != nil || sess == nil {
		log.Warnf("Failed to get session %s for disconnection: %v", sessionID, err)
		return
	}

	sess.IsDisconnected = true
	sess.IsOnline = false
	if err := sm.store.Update(sess); err != nil {
		log.Warnf("Failed to mark session %s as disconnected: %v", sessionID, err)
		return
	}

	if state, exists := sm.publishers[sessionID]; exists {
		state.isDisconnected = true
	}

	log.Infof("Restarting session %s in disconnected mode", sessionID)
	sm.restartPublisherLocked(sessionID, sess)
}

// transitionToConnected marks a session as connected and restarts in full polling mode
func (sm *SessionManager) transitionToConnected(sessionID string) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	sess, err := sm.store.Get(sessionID)
	if err != nil || sess == nil {
		log.Warnf("Failed to get session %s for reconnection: %v", sessionID, err)
		return
	}

	sess.IsDisconnected = false
	sess.IsOnline = true
	if err := sm.store.Update(sess); err != nil {
		log.Warnf("Failed to mark session %s as connected: %v", sessionID, err)
		return
	}

	if state, exists := sm.publishers[sessionID]; exists {
		state.isDisconnected = false
	}

	log.Infof("Restarting session %s in connected mode", sessionID)
	sm.restartPublisherLocked(sessionID, sess)
}

// restartPublisherLocked cancels the current publisher and starts a new one
// Assumes lock is already held by caller
func (sm *SessionManager) restartPublisherLocked(sessionID string, sess *models.Session) {
	// Cancel existing publisher
	if state, exists := sm.publishers[sessionID]; exists {
		state.cancel()
		delete(sm.publishers, sessionID)
	}

	// Start new publisher with updated session state
	ctx, cancel := context.WithCancel(context.Background())
	sm.publishers[sessionID] = &publisherState{
		cancel:         cancel,
		isDisconnected: sess.IsDisconnected,
	}

	go sm.publishLoop(ctx, sess)
}

// SessionManagerWorker is the worker function that starts the session manager
func SessionManagerWorker(ctx context.Context) {
	kvClient := key_value.New()
	logger := log.GetBaseLogger()
	leaseManager := lease.NewLeaseManager(kvClient, lease.DefaultLeaseConfig(), logger)

	if err := leaseManager.Start(ctx); err != nil {
		log.PrettyError(fmt.Errorf("failed to start lease manager: %w", err))
		return
	}

	// Store globally for API handlers
	SetGlobalLeaseManager(leaseManager)

	manager := NewSessionManager(leaseManager)
	manager.Start(ctx)
	manager.Stop()
}
